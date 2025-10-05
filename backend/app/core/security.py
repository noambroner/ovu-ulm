from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import asyncpg
from urllib.parse import urlparse, unquote
import logging
from pydantic import BaseModel
from datetime import datetime

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
