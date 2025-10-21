"""
Refresh Token Model
"""
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class RefreshToken(BaseModel):
    """Refresh Token database model"""
    id: int
    user_id: int
    token: str
    expires_at: datetime
    created_at: datetime
    revoked: bool = False
    revoked_at: Optional[datetime] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None


class RefreshTokenCreate(BaseModel):
    """Schema for creating a new refresh token"""
    user_id: int
    token: str
    expires_at: datetime
    device_info: Optional[str] = None
    ip_address: Optional[str] = None


class TokenSettings(BaseModel):
    """User token settings"""
    id: int
    user_id: int
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    updated_at: datetime
    updated_by: Optional[int] = None


class TokenSettingsUpdate(BaseModel):
    """Schema for updating token settings"""
    access_token_expire_minutes: Optional[int] = None
    refresh_token_expire_days: Optional[int] = None

