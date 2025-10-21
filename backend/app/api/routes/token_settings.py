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
    access_token_expire_minutes: int
    refresh_token_expire_days: int


class TokenSettingsUpdateRequest(BaseModel):
    """Token settings update request"""
    access_token_expire_minutes: Optional[int] = Field(None, ge=5, le=1440, description="5 minutes to 24 hours")
    refresh_token_expire_days: Optional[int] = Field(None, ge=1, le=90, description="1 to 90 days")


@router.get("/", response_model=TokenSettingsResponse)
async def get_token_settings(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current user's token settings
    """
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


@router.put("/", response_model=TokenSettingsResponse)
async def update_token_settings(
    settings_update: TokenSettingsUpdateRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update token expiration settings for current user
    """
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


@router.post("/reset")
async def reset_token_settings(current_user: UserResponse = Depends(get_current_user)):
    """
    Reset token settings to defaults (15 minutes / 7 days)
    """
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

