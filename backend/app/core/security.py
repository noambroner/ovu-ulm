from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import asyncpg
from urllib.parse import urlparse, unquote
import logging
from pydantic import BaseModel
from datetime import datetime, timedelta
import secrets

from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

# JWT Configuration
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

# Database connection pool
db_pool = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    first_name: str | None
    last_name: str | None
    preferred_language: str
    role: str
    status: str
    current_joined_at: datetime | None
    scheduled_deactivation_at: datetime | None

def parse_database_url(url: str):
    """Parse DATABASE_URL into connection parameters"""
    parsed = urlparse(url)
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "user": parsed.username,
        "password": unquote(parsed.password) if parsed.password else None,
        "database": parsed.path.lstrip("/")
    }

async def get_db_pool():
    """Get or create database connection pool"""
    global db_pool
    if db_pool is None:
        db_params = parse_database_url(settings.DATABASE_URL)
        db_pool = await asyncpg.create_pool(
            **db_params,
            min_size=2,
            max_size=settings.DATABASE_POOL_SIZE,
            timeout=settings.DATABASE_POOL_TIMEOUT,
            ssl=False
        )
    return db_pool

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get current user from JWT token
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
        
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            user = await conn.fetchrow(
                """
                SELECT id, username, email, role, first_name, last_name, preferred_language, status, current_joined_at, scheduled_deactivation_at
                FROM users WHERE id = $1 AND is_active = true
                """,
                int(user_id)
            )
        
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        
        return UserResponse(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")


async def create_access_token(user_id: int, expires_delta: timedelta = None) -> str:
    """
    Create JWT access token for a user
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access"
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


async def create_refresh_token(user_id: int, device_info: str = None, ip_address: str = None) -> dict:
    """
    Create and store refresh token in database
    Returns: dict with token and expires_at
    """
    pool = await get_db_pool()
    
    # Get user-specific token settings or use defaults
    async with pool.acquire() as conn:
        settings_row = await conn.fetchrow(
            "SELECT refresh_token_expire_days FROM token_settings WHERE user_id = $1",
            user_id
        )
    
    expire_days = settings_row['refresh_token_expire_days'] if settings_row else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expires_at = datetime.utcnow() + timedelta(days=expire_days)
    
    # Generate secure random token
    token = secrets.token_urlsafe(64)
    
    # Store in database
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id, token, expires_at, device_info, ip_address
        )
    
    return {
        "token": token,
        "expires_at": expires_at
    }


async def verify_refresh_token(token: str) -> int:
    """
    Verify refresh token and return user_id
    Raises HTTPException if invalid
    """
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        token_row = await conn.fetchrow(
            """
            SELECT user_id, expires_at, revoked 
            FROM refresh_tokens 
            WHERE token = $1
            """,
            token
        )
    
    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    if token_row['revoked']:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )
    
    if token_row['expires_at'] < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    
    return token_row['user_id']


async def revoke_refresh_token(token: str):
    """
    Revoke a refresh token
    """
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE refresh_tokens 
            SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
            WHERE token = $1
            """,
            token
        )


async def revoke_all_user_tokens(user_id: int):
    """
    Revoke all refresh tokens for a user (e.g., on logout from all devices)
    """
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE refresh_tokens 
            SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND revoked = FALSE
            """,
            user_id
        )
