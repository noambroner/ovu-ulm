"""
Token Settings routes - User control over token expiration times
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core.security import get_db_pool, get_current_user, UserResponse

router = APIRouter()


class TokenSettingsResponse(BaseModel):
    """Token settings response schema"""
    access_token_expire_minutes: int = Field(..., description="Access token expiration time in minutes (5-1440)", example=15)
    refresh_token_expire_days: int = Field(..., description="Refresh token expiration time in days (1-90)", example=7)
    
    class Config:
        schema_extra = {
            "example": {
                "access_token_expire_minutes": 15,
                "refresh_token_expire_days": 7
            }
        }


class TokenSettingsUpdateRequest(BaseModel):
    """Token settings update request"""
    access_token_expire_minutes: Optional[int] = Field(
        None, 
        ge=5, 
        le=1440, 
        description="Access token expiration in minutes (5-1440 = 5min to 24hrs)",
        example=30
    )
    refresh_token_expire_days: Optional[int] = Field(
        None, 
        ge=1, 
        le=90, 
        description="Refresh token expiration in days (1-90 days)",
        example=14
    )
    
    class Config:
        schema_extra = {
            "example": {
                "access_token_expire_minutes": 30,
                "refresh_token_expire_days": 14
            }
        }


@router.get(
    "/",
    response_model=TokenSettingsResponse,
    summary="Get Token Settings",
    description="""
    Get current user's token expiration settings.
    
    **Returns:**
    - Access token expiration time (in minutes)
    - Refresh token expiration time (in days)
    
    **Default Values:**
    - Access Token: 15 minutes
    - Refresh Token: 7 days
    
    **Authentication:**
    - Requires valid access token
    - Each user has their own settings
    
    **Use Cases:**
    - Display current settings in user preferences UI
    - Validate token expiration times before update
    - Check if user has customized settings
    """,
    response_description="Current token settings for the user",
    responses={
        200: {
            "description": "Token settings retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "access_token_expire_minutes": 15,
                        "refresh_token_expire_days": 7
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - invalid or missing access token"
        }
    }
)
async def get_token_settings(current_user: UserResponse = Depends(get_current_user)):
    """Get current user's token settings"""
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        settings = await conn.fetchrow(
            """
            SELECT access_token_expire_minutes, refresh_token_expire_days
            FROM token_settings
            WHERE user_id = $1
            """,
            current_user.id
        )
    
    if not settings:
        # Return defaults
        return TokenSettingsResponse(
            access_token_expire_minutes=15,
            refresh_token_expire_days=7
        )
    
    return TokenSettingsResponse(
        access_token_expire_minutes=settings['access_token_expire_minutes'],
        refresh_token_expire_days=settings['refresh_token_expire_days']
    )


@router.put(
    "/",
    response_model=TokenSettingsResponse,
    summary="Update Token Settings",
    description="""
    Update token expiration settings for the current user.
    
    **Customizable Settings:**
    - Access token expiration: 5-1440 minutes (5 min to 24 hours)
    - Refresh token expiration: 1-90 days
    
    **Behavior:**
    - Can update one or both settings
    - Creates settings if they don't exist
    - Updates are applied to future tokens only
    - Existing tokens keep their original expiration
    
    **Security Considerations:**
    - Shorter access tokens = more secure but frequent refreshes needed
    - Longer refresh tokens = convenient but higher risk if compromised
    - Find balance based on security requirements
    
    **Recommendations:**
    - High security apps: 5-15 min access, 1-7 days refresh
    - Normal apps: 15-60 min access, 7-30 days refresh
    - Low security apps: 60-1440 min access, 30-90 days refresh
    """,
    response_description="Updated token settings",
    responses={
        200: {
            "description": "Token settings updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "access_token_expire_minutes": 30,
                        "refresh_token_expire_days": 14
                    }
                }
            }
        },
        400: {
            "description": "Bad request - invalid values or no fields to update",
            "content": {
                "application/json": {
                    "example": {"detail": "No fields to update"}
                }
            }
        },
        401: {
            "description": "Unauthorized - invalid or missing access token"
        },
        422: {
            "description": "Validation error - values out of allowed range",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "access_token_expire_minutes"],
                                "msg": "ensure this value is greater than or equal to 5",
                                "type": "value_error.number.not_ge"
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def update_token_settings(
    settings_update: TokenSettingsUpdateRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update token expiration settings for current user"""
    pool = await get_db_pool()
    
    # Build update query dynamically
    updates = []
    params = [current_user.id]
    param_num = 2
    
    if settings_update.access_token_expire_minutes is not None:
        updates.append(f"access_token_expire_minutes = ${param_num}")
        params.append(settings_update.access_token_expire_minutes)
        param_num += 1
    
    if settings_update.refresh_token_expire_days is not None:
        updates.append(f"refresh_token_expire_days = ${param_num}")
        params.append(settings_update.refresh_token_expire_days)
        param_num += 1
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    updates.append(f"updated_at = CURRENT_TIMESTAMP")
    updates.append(f"updated_by = $1")
    
    query = f"""
        UPDATE token_settings
        SET {", ".join(updates)}
        WHERE user_id = $1
        RETURNING access_token_expire_minutes, refresh_token_expire_days
    """
    
    async with pool.acquire() as conn:
        updated = await conn.fetchrow(query, *params)
    
    if not updated:
        # Settings don't exist, create them
        async with pool.acquire() as conn:
            updated = await conn.fetchrow(
                """
                INSERT INTO token_settings (user_id, access_token_expire_minutes, refresh_token_expire_days, updated_by)
                VALUES ($1, $2, $3, $1)
                RETURNING access_token_expire_minutes, refresh_token_expire_days
                """,
                current_user.id,
                settings_update.access_token_expire_minutes or 15,
                settings_update.refresh_token_expire_days or 7
            )
    
    return TokenSettingsResponse(
        access_token_expire_minutes=updated['access_token_expire_minutes'],
        refresh_token_expire_days=updated['refresh_token_expire_days']
    )


@router.post(
    "/reset",
    summary="Reset Token Settings to Defaults",
    description="""
    Reset token expiration settings to system defaults.
    
    **Default Values:**
    - Access Token: 15 minutes
    - Refresh Token: 7 days
    
    **Use Cases:**
    - Revert custom settings after testing
    - Return to recommended secure settings
    - Fix issues caused by extreme custom values
    
    **Behavior:**
    - Resets both access and refresh token expiration times
    - Creates default settings if none exist
    - Changes apply to future tokens only
    - Current tokens remain valid until original expiration
    
    **Authentication:**
    - Requires valid access token
    """,
    response_description="Settings reset successfully",
    responses={
        200: {
            "description": "Token settings reset to defaults",
            "content": {
                "application/json": {
                    "example": {"message": "Token settings reset to defaults"}
                }
            }
        },
        401: {
            "description": "Unauthorized - invalid or missing access token"
        }
    }
)
async def reset_token_settings(current_user: UserResponse = Depends(get_current_user)):
    """Reset token settings to defaults (15 minutes / 7 days)"""
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE token_settings
            SET access_token_expire_minutes = 15,
                refresh_token_expire_days = 7,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $1
            WHERE user_id = $1
            """,
            current_user.id
        )
    
    return {"message": "Token settings reset to defaults"}

