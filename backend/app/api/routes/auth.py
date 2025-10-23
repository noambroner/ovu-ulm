"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
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
    verify_password,
    UserResponse
)

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request schema"""
    username: str = Field(..., description="User's username or email", example="user@example.com")
    password: str = Field(..., description="User's password", example="SecurePassword123!")
    
    class Config:
        schema_extra = {
            "example": {
                "username": "user@example.com",
                "password": "SecurePassword123!"
            }
        }


class LoginResponse(BaseModel):
    """Login response schema"""
    access_token: str = Field(..., description="JWT access token for API authentication")
    refresh_token: str = Field(..., description="Refresh token to obtain new access tokens")
    token_type: str = Field(default="bearer", description="Token type (always 'bearer')")
    user: dict = Field(..., description="User profile information")
    
    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
                "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
                "token_type": "bearer",
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "username": "user@example.com",
                    "email": "user@example.com",
                    "role": "user",
                    "first_name": "John",
                    "last_name": "Doe",
                    "preferred_language": "he",
                    "status": "active"
                }
            }
        }


class RefreshRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str = Field(..., description="Valid refresh token obtained from login", example="550e8400-e29b-41d4-a716-446655440000")
    
    class Config:
        schema_extra = {
            "example": {
                "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class RefreshResponse(BaseModel):
    """Refresh token response schema"""
    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type (always 'bearer')")
    
    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
                "token_type": "bearer"
            }
        }


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User Login",
    description="""
    Login endpoint for user authentication.
    
    **Process:**
    - Validates username and password
    - Checks user status and activation
    - Generates JWT access token and refresh token
    - Returns user information along with tokens
    
    **Token Settings:**
    - Access token expiration is customizable per user (default: 15 minutes)
    - Refresh token expiration is customizable per user (default: 7 days)
    
    **Security:**
    - Password is hashed and verified
    - Device info and IP address are logged
    - Only active users can login
    """,
    response_description="Login successful with tokens and user data",
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
                        "token_type": "bearer",
                        "user": {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "username": "user@example.com",
                            "email": "user@example.com",
                            "role": "user",
                            "first_name": "John",
                            "last_name": "Doe",
                            "preferred_language": "he",
                            "status": "active"
                        }
                    }
                }
            }
        },
        401: {
            "description": "Invalid credentials or inactive user",
            "content": {
                "application/json": {
                    "example": {"detail": "Incorrect username or password"}
                }
            }
        }
    }
)
async def login(login_data: LoginRequest, request: Request):
    """User login endpoint - Returns access_token and refresh_token"""
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
    
    # Verify password
    if not verify_password(login_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
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


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh Access Token",
    description="""
    Refresh the access token using a valid refresh token.
    
    **Process:**
    - Validates the refresh token
    - Checks if token is not expired or revoked
    - Generates new access token with user-specific expiration time
    
    **Use Case:**
    - When access token expires, use this endpoint to get a new one without re-login
    - Maintains user session without requiring credentials again
    
    **Security:**
    - Refresh token is validated against database
    - Revoked tokens are rejected
    - Each refresh token has expiration time
    """,
    response_description="New access token generated successfully",
    responses={
        200: {
            "description": "Token refreshed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer"
                    }
                }
            }
        },
        401: {
            "description": "Invalid or expired refresh token",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid refresh token"}
                }
            }
        }
    }
)
async def refresh_access_token(refresh_data: RefreshRequest):
    """Refresh access token using refresh token"""
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


@router.post(
    "/logout",
    summary="User Logout",
    description="""
    Logout endpoint - revokes refresh token(s) to invalidate user sessions.
    
    **Two Modes:**
    1. **Single Device Logout** - Provide refresh_token to logout from specific device
    2. **All Devices Logout** - Don't provide refresh_token to logout from all devices
    
    **Process:**
    - Validates user authentication via access token (Bearer token in header)
    - Revokes specified refresh token or all user's refresh tokens
    - Invalidates sessions to prevent further token refresh
    
    **Security:**
    - Requires valid access token
    - Revoked tokens cannot be used to generate new access tokens
    - Useful for security incidents or device loss
    """,
    response_description="Logout successful",
    responses={
        200: {
            "description": "Logout successful",
            "content": {
                "application/json": {
                    "examples": {
                        "single_device": {
                            "summary": "Single device logout",
                            "value": {"message": "Logged out successfully"}
                        },
                        "all_devices": {
                            "summary": "All devices logout",
                            "value": {"message": "Logged out from all devices"}
                        }
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - invalid or missing access token",
            "content": {
                "application/json": {
                    "example": {"detail": "Could not validate credentials"}
                }
            }
        }
    }
)
async def logout(
    refresh_token: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Logout endpoint - revokes refresh token(s)"""
    if refresh_token:
        await revoke_refresh_token(refresh_token)
        return {"message": "Logged out successfully"}
    else:
        await revoke_all_user_tokens(current_user.id)
        return {"message": "Logged out from all devices"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User",
    description="""
    Get current authenticated user information.
    
    **Purpose:**
    - Retrieve user profile data for the currently authenticated user
    - Verify user session is valid
    - Get updated user information without re-login
    
    **Authentication:**
    - Requires valid access token in Authorization header
    - Format: `Authorization: Bearer <access_token>`
    
    **Use Cases:**
    - Display user profile in UI
    - Verify user permissions and role
    - Check user status and preferences
    - Validate session before sensitive operations
    """,
    response_description="Current user information",
    responses={
        200: {
            "description": "User information retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "username": "user@example.com",
                        "email": "user@example.com",
                        "role": "user",
                        "first_name": "John",
                        "last_name": "Doe",
                        "preferred_language": "he",
                        "status": "active"
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - invalid or missing access token",
            "content": {
                "application/json": {
                    "example": {"detail": "Could not validate credentials"}
                }
            }
        }
    }
)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

