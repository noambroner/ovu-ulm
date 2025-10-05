from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_activity import UserActivityHistory, ScheduledUserAction
from app.schemas.user_activity import (
    DeactivateUserRequest,
    CancelScheduleRequest,
    ReactivateUserRequest,
    DeactivationResponse,
    UserStatusInfo,
    UserActivityHistoryResponse,
    ScheduledUserActionResponse,
    UserActivitySummary,
    SystemActivityStats,
    UserStatus
)
from app.services.user_status_service import UserStatusService

router = APIRouter(prefix="/users", tags=["user-status"])


@router.post("/{user_id}/deactivate", response_model=DeactivationResponse)
async def deactivate_user(
    user_id: int,
    request: DeactivateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deactivate a user immediately or schedule future deactivation
    
    - **deactivation_type**: 'immediate' or 'scheduled'
    - **scheduled_date**: Required if type is 'scheduled', must be in the future
    - **reason**: Optional reason for deactivation
    """
    try:
        if request.deactivation_type == "immediate":
            activity = await UserStatusService.deactivate_user_immediately(
                db=db,
                user_id=user_id,
                performed_by_id=current_user.id,
                reason=request.reason
            )
            return DeactivationResponse(
                success=True,
                message="User deactivated successfully",
                user_status=UserStatus.INACTIVE,
                scheduled_for=None
            )
        
        elif request.deactivation_type == "scheduled":
            if not request.scheduled_date:
                raise HTTPException(
                    status_code=400,
                    detail="scheduled_date is required for scheduled deactivation"
                )
            
            scheduled_action = await UserStatusService.schedule_user_deactivation(
                db=db,
                user_id=user_id,
                scheduled_for=request.scheduled_date,
                performed_by_id=current_user.id,
                reason=request.reason
            )
            return DeactivationResponse(
                success=True,
                message=f"User deactivation scheduled for {request.scheduled_date}",
                user_status=UserStatus.SCHEDULED_DEACTIVATION,
                scheduled_for=scheduled_action.scheduled_for
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid deactivation_type. Must be 'immediate' or 'scheduled'"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/cancel-schedule", response_model=DeactivationResponse)
async def cancel_scheduled_deactivation(
    user_id: int,
    request: CancelScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a scheduled deactivation and return user to active status
    """
    try:
        activity = await UserStatusService.cancel_scheduled_deactivation(
            db=db,
            user_id=user_id,
            performed_by_id=current_user.id,
            reason=request.reason
        )
        return DeactivationResponse(
            success=True,
            message="Scheduled deactivation cancelled successfully",
            user_status=UserStatus.ACTIVE,
            scheduled_for=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/reactivate", response_model=DeactivationResponse)
async def reactivate_user(
    user_id: int,
    request: ReactivateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reactivate an inactive user
    """
    try:
        activity = await UserStatusService.reactivate_user(
            db=db,
            user_id=user_id,
            performed_by_id=current_user.id,
            reason=request.reason
        )
        return DeactivationResponse(
            success=True,
            message="User reactivated successfully",
            user_status=UserStatus.ACTIVE,
            scheduled_for=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/status", response_model=UserStatusInfo)
async def get_user_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive status information for a user
    """
    try:
        return await UserStatusService.get_user_status_info(db, user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/activity-history", response_model=List[UserActivityHistoryResponse])
async def get_user_activity_history(
    user_id: int,
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get activity history for a user
    """
    try:
        activities = await UserStatusService.get_user_activity_history(db, user_id, limit)
        
        result = []
        for activity in activities:
            performed_by_username = None
            if activity.performed_by_id:
                from sqlalchemy import select
                stmt = select(User).where(User.id == activity.performed_by_id)
                result_performer = await db.execute(stmt)
                performer = result_performer.scalar_one_or_none()
                if performer:
                    performed_by_username = performer.username
            
            result.append(UserActivityHistoryResponse(
                id=activity.id,
                user_id=activity.user_id,
                joined_at=activity.joined_at,
                left_at=activity.left_at,
                scheduled_left_at=activity.scheduled_left_at,
                actual_left_at=activity.actual_left_at,
                action_type=activity.action_type,
                performed_by_id=activity.performed_by_id,
                performed_by_username=performed_by_username,
                reason=activity.reason,
                duration_days=activity.duration_days,
                is_current=activity.is_current,
                created_at=activity.created_at
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/scheduled-actions", response_model=List[ScheduledUserActionResponse])
async def get_user_scheduled_actions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all scheduled actions for a user
    """
    try:
        actions = db.query(ScheduledUserAction).filter(
            ScheduledUserAction.user_id == user_id
        ).order_by(ScheduledUserAction.scheduled_for.desc()).all()
        
        result = []
        for action in actions:
            result.append(ScheduledUserActionResponse(
                id=action.id,
                user_id=action.user_id,
                action_type=action.action_type,
                scheduled_for=action.scheduled_for,
                reason=action.reason,
                created_by_id=action.created_by_id,
                status=action.status,
                executed_at=action.executed_at,
                error_message=action.error_message,
                created_at=action.created_at,
                is_overdue=action.is_overdue,
                time_until_execution=action.time_until_execution
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/activity", response_model=SystemActivityStats)
async def get_system_activity_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get system-wide activity statistics
    Requires admin role
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    
    try:
        return await UserStatusService.get_system_activity_stats(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-deactivations", response_model=List[ScheduledUserActionResponse])
async def get_pending_deactivations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all pending scheduled deactivations
    Requires admin role
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    
    try:
        actions = await UserStatusService.get_pending_deactivations(db)
        
        result = []
        for action in actions:
            result.append(ScheduledUserActionResponse(
                id=action.id,
                user_id=action.user_id,
                action_type=action.action_type,
                scheduled_for=action.scheduled_for,
                reason=action.reason,
                created_by_id=action.created_by_id,
                status=action.status,
                executed_at=action.executed_at,
                error_message=action.error_message,
                created_at=action.created_at,
                is_overdue=action.is_overdue,
                time_until_execution=action.time_until_execution
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

