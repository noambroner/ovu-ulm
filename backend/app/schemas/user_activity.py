from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional
from enum import Enum


class UserStatus(str, Enum):
    """User status enum"""
    ACTIVE = "active"
    SCHEDULED_DEACTIVATION = "scheduled_deactivation"
    INACTIVE = "inactive"


class ActionType(str, Enum):
    """Action type enum"""
    ACTIVATED = "activated"
    DEACTIVATED_IMMEDIATE = "deactivated_immediate"
    DEACTIVATED_SCHEDULED = "deactivated_scheduled"
    SCHEDULE_CANCELLED = "schedule_cancelled"
    AUTO_DEACTIVATED = "auto_deactivated"
    REACTIVATED = "reactivated"


class ScheduledActionStatus(str, Enum):
    """Scheduled action status enum"""
    PENDING = "pending"
    EXECUTED = "executed"
    CANCELLED = "cancelled"
    FAILED = "failed"


# ===== User Activity History Schemas =====

class UserActivityHistoryBase(BaseModel):
    """Base schema for user activity history"""
    joined_at: datetime
    left_at: Optional[datetime] = None
    scheduled_left_at: Optional[datetime] = None
    actual_left_at: Optional[datetime] = None
    action_type: ActionType
    reason: Optional[str] = None


class UserActivityHistoryCreate(UserActivityHistoryBase):
    """Schema for creating activity history"""
    user_id: int
    performed_by_id: Optional[int] = None


class UserActivityHistoryResponse(UserActivityHistoryBase):
    """Schema for activity history response"""
    id: int
    user_id: int
    performed_by_id: Optional[int] = None
    performed_by_username: Optional[str] = None
    duration_days: Optional[float] = None
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Scheduled Action Schemas =====

class ScheduledUserActionBase(BaseModel):
    """Base schema for scheduled actions"""
    action_type: str
    scheduled_for: datetime
    reason: Optional[str] = None

    @validator('scheduled_for')
    def scheduled_for_must_be_future(cls, v):
        if v <= datetime.now(v.tzinfo):
            raise ValueError('scheduled_for must be in the future')
        return v


class ScheduledUserActionCreate(ScheduledUserActionBase):
    """Schema for creating scheduled action"""
    user_id: int
    created_by_id: Optional[int] = None


class ScheduledUserActionResponse(ScheduledUserActionBase):
    """Schema for scheduled action response"""
    id: int
    user_id: int
    created_by_id: Optional[int] = None
    status: ScheduledActionStatus
    executed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    is_overdue: bool
    time_until_execution: Optional[float] = None

    class Config:
        from_attributes = True


# ===== User Status Schemas =====

class UserStatusInfo(BaseModel):
    """Comprehensive user status information"""
    user_id: int
    username: str
    status: UserStatus
    status_display: str
    is_active: bool
    current_joined_at: Optional[datetime] = None
    current_left_at: Optional[datetime] = None
    scheduled_deactivation_at: Optional[datetime] = None
    scheduled_deactivation_reason: Optional[str] = None
    days_until_deactivation: Optional[float] = None
    hours_until_deactivation: Optional[float] = None

    class Config:
        from_attributes = True


# ===== Action Request Schemas =====

class DeactivateUserRequest(BaseModel):
    """Request schema for deactivating a user"""
    deactivation_type: str = Field(..., description="'immediate' or 'scheduled'")
    scheduled_date: Optional[datetime] = Field(None, description="Required if type is 'scheduled'")
    reason: Optional[str] = Field(None, description="Reason for deactivation")

    @validator('scheduled_date')
    def validate_scheduled_date(cls, v, values):
        if values.get('deactivation_type') == 'scheduled':
            if v is None:
                raise ValueError('scheduled_date is required for scheduled deactivation')
            if v <= datetime.now(v.tzinfo if v.tzinfo else None):
                raise ValueError('scheduled_date must be in the future')
        return v


class CancelScheduleRequest(BaseModel):
    """Request schema for cancelling scheduled deactivation"""
    reason: Optional[str] = Field(None, description="Reason for cancellation")


class ReactivateUserRequest(BaseModel):
    """Request schema for reactivating a user"""
    reason: Optional[str] = Field(None, description="Reason for reactivation")


class DeactivationResponse(BaseModel):
    """Response schema for deactivation actions"""
    success: bool
    message: str
    user_status: UserStatus
    scheduled_for: Optional[datetime] = None


# ===== Activity Summary Schemas =====

class UserActivitySummary(BaseModel):
    """Summary of user activity"""
    user_id: int
    username: str
    total_activations: int
    total_active_days: float
    current_status: UserStatus
    activity_periods: list[UserActivityHistoryResponse]

    class Config:
        from_attributes = True


class SystemActivityStats(BaseModel):
    """System-wide activity statistics"""
    total_users: int
    active_users: int
    inactive_users: int
    scheduled_deactivations: int
    pending_scheduled_actions: int
    overdue_actions: int








