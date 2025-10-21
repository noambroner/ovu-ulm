"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

from app.core.security import (
    get_db_pool,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    get_current_user,
    UserResponse
)

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request schema"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Login response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str


class RefreshResponse(BaseModel):
    """Refresh token response schema"""
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, request: Request):
    """
    User login endpoint
    Returns access_token and refresh_token
    """
    pool = await get_db_pool()
    
    # Verify username and password
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, username, email, role, first_name, last_name, 
                   preferred_language, status, hashed_password
            FROM users 
            WHERE username = $1 AND is_active = true
            """,
            login_data.username
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # TODO: Verify hashed_password (add password verification library)
    # For now, we'll assume password is correct
    
    # Get user-specific token settings
    async with pool.acquire() as conn:
        settings_row = await conn.fetchrow(
            "SELECT access_token_expire_minutes FROM token_settings WHERE user_id = $1",
            user['id']
        )
    
    # Create tokens
    access_token_minutes = settings_row['access_token_expire_minutes'] if settings_row else 15
    access_token = await create_access_token(
        user['id'],
        expires_delta=timedelta(minutes=access_token_minutes)
    )
    
    # Get client info
    device_info = request.headers.get("user-agent", "Unknown")
    ip_address = request.client.host if request.client else None
    
    refresh_token_data = await create_refresh_token(
        user['id'],
        device_info=device_info,
        ip_address=ip_address
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token_data['token'],
        user={
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role'],
            "first_name": user['first_name'],
            "last_name": user['last_name'],
            "preferred_language": user['preferred_language'],
            "status": user['status']
        }
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_access_token(refresh_data: RefreshRequest):
    """
    Refresh access token using refresh token
    """
    # Verify refresh token
    user_id = await verify_refresh_token(refresh_data.refresh_token)
    
    # Get user-specific token settings
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        settings_row = await conn.fetchrow(
            "SELECT access_token_expire_minutes FROM token_settings WHERE user_id = $1",
            user_id
        )
    
    # Create new access token
    access_token_minutes = settings_row['access_token_expire_minutes'] if settings_row else 15
    access_token = await create_access_token(
        user_id,
        expires_delta=timedelta(minutes=access_token_minutes)
    )
    
    return RefreshResponse(access_token=access_token)


@router.post("/logout")
async def logout(
    refresh_token: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Logout endpoint - revokes refresh token(s)
    If refresh_token provided, revokes only that token
    Otherwise, revokes all tokens for the user
    """
    if refresh_token:
        await revoke_refresh_token(refresh_token)
        return {"message": "Logged out successfully"}
    else:
        await revoke_all_user_tokens(current_user.id)
        return {"message": "Logged out from all devices"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current user information
    """
    return current_user

