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


@router.post(
    "/{user_id}/deactivate",
    response_model=DeactivationResponse,
    summary="Deactivate User",
    description="""
    Deactivate a user immediately or schedule future deactivation.
    
    **Two Modes:**
    1. **Immediate Deactivation** - User is deactivated right away
    2. **Scheduled Deactivation** - User will be deactivated at a future date/time
    
    **Request Fields:**
    - `deactivation_type`: Must be 'immediate' or 'scheduled'
    - `scheduled_date`: Required for scheduled type, must be in the future (ISO 8601 format)
    - `reason`: Optional text explaining the deactivation
    
    **Effects:**
    - User cannot login after deactivation
    - User status changes to 'inactive' or 'scheduled_deactivation'
    - Activity history is recorded
    - Admin notification is triggered
    
    **Authentication:**
    - Requires valid access token
    - Typically requires admin role
    """,
    responses={
        200: {
            "description": "User deactivation successful or scheduled",
            "content": {
                "application/json": {
                    "examples": {
                        "immediate": {
                            "summary": "Immediate deactivation",
                            "value": {
                                "success": True,
                                "message": "User deactivated successfully",
                                "user_status": "inactive",
                                "scheduled_for": None
                            }
                        },
                        "scheduled": {
                            "summary": "Scheduled deactivation",
                            "value": {
                                "success": True,
                                "message": "User deactivation scheduled for 2025-10-30T10:00:00Z",
                                "user_status": "scheduled_deactivation",
                                "scheduled_for": "2025-10-30T10:00:00Z"
                            }
                        }
                    }
                }
            }
        },
        400: {
            "description": "Bad request - invalid parameters"
        },
        401: {
            "description": "Unauthorized"
        },
        500: {
            "description": "Internal server error"
        }
    }
)
async def deactivate_user(
    user_id: int,
    request: DeactivateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a user immediately or schedule future deactivation"""
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


@router.post(
    "/{user_id}/cancel-schedule",
    response_model=DeactivationResponse,
    summary="Cancel Scheduled Deactivation",
    description="""
    Cancel a scheduled deactivation and return user to active status.
    
    **Purpose:**
    - Reverts a previously scheduled deactivation
    - User returns to 'active' status immediately
    - Scheduled action is marked as cancelled
    
    **Use Cases:**
    - User contract extended
    - Decision changed before scheduled date
    - Error in scheduling
    
    **Request Fields:**
    - `reason`: Optional explanation for cancellation
    
    **Effects:**
    - User status returns to 'active'
    - Scheduled action record is updated to 'cancelled'
    - Activity history is updated
    
    **Authentication:**
    - Requires valid access token
    - Typically requires admin role
    """,
    responses={
        200: {
            "description": "Scheduled deactivation cancelled successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Scheduled deactivation cancelled successfully",
                        "user_status": "active",
                        "scheduled_for": None
                    }
                }
            }
        },
        400: {
            "description": "Bad request - no scheduled deactivation found"
        },
        401: {
            "description": "Unauthorized"
        }
    }
)
async def cancel_scheduled_deactivation(
    user_id: int,
    request: CancelScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a scheduled deactivation and return user to active status"""
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


@router.post(
    "/{user_id}/reactivate",
    response_model=DeactivationResponse,
    summary="Reactivate User",
    description="""
    Reactivate an inactive user to restore access.
    
    **Purpose:**
    - Restore access for previously deactivated users
    - User can login again after reactivation
    - Clears inactive status
    
    **Prerequisites:**
    - User must be in 'inactive' status
    - Cannot reactivate active users
    
    **Request Fields:**
    - `reason`: Optional explanation for reactivation (e.g., "Contract renewed", "Error corrected")
    
    **Effects:**
    - User status changes to 'active'
    - User can login immediately
    - Activity history is updated
    - New activity period starts
    
    **Use Cases:**
    - Contract renewal
    - Temporary suspension ended
    - Mistaken deactivation corrected
    
    **Authentication:**
    - Requires valid access token
    - Typically requires admin role
    """,
    responses={
        200: {
            "description": "User reactivated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "User reactivated successfully",
                        "user_status": "active",
                        "scheduled_for": None
                    }
                }
            }
        },
        400: {
            "description": "Bad request - user is not inactive or already active"
        },
        401: {
            "description": "Unauthorized"
        },
        404: {
            "description": "User not found"
        }
    }
)
async def reactivate_user(
    user_id: int,
    request: ReactivateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reactivate an inactive user"""
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


@router.get(
    "/{user_id}/status",
    response_model=UserStatusInfo,
    summary="Get User Status",
    description="""
    Get comprehensive status information for a specific user.
    
    **Returns:**
    - Current user status (active, inactive, scheduled_deactivation)
    - Current activity period details
    - Next scheduled action (if any)
    - Duration statistics
    
    **Status Types:**
    - `active`: User can login and use the system
    - `inactive`: User is deactivated and cannot login
    - `scheduled_deactivation`: User is active but scheduled for deactivation
    
    **Use Cases:**
    - Display user status in admin panel
    - Check before performing status changes
    - Show status badges in UI
    - Audit user access state
    
    **Authentication:**
    - Requires valid access token
    """,
    responses={
        200: {
            "description": "User status information retrieved successfully"
        },
        401: {
            "description": "Unauthorized"
        },
        404: {
            "description": "User not found"
        }
    }
)
async def get_user_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive status information for a user"""
    try:
        return await UserStatusService.get_user_status_info(db, user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{user_id}/activity-history",
    response_model=List[UserActivityHistoryResponse],
    summary="Get User Activity History",
    description="""
    Get complete activity history for a user.
    
    **Returns:**
    - All activity periods (join/leave events)
    - Who performed each action
    - Reasons for deactivations/reactivations
    - Duration of each period
    - Scheduled vs actual dates
    
    **Query Parameters:**
    - `limit`: Optional limit on number of records (most recent first)
    
    **Activity Record Details:**
    - `joined_at`: When user joined/activated
    - `left_at`: Planned/scheduled leaving date
    - `actual_left_at`: Actual deactivation timestamp
    - `action_type`: deactivate, reactivate, schedule, cancel
    - `performed_by`: Username of admin who performed action
    - `reason`: Explanation for the action
    - `duration_days`: Length of activity period
    - `is_current`: Whether this is the current active period
    
    **Use Cases:**
    - Audit trail of user status changes
    - Display timeline in user profile
    - Track who made changes and when
    - Analyze user access patterns
    
    **Authentication:**
    - Requires valid access token
    """,
    responses={
        200: {
            "description": "Activity history retrieved successfully"
        },
        401: {
            "description": "Unauthorized"
        },
        404: {
            "description": "User not found"
        }
    }
)
async def get_user_activity_history(
    user_id: int,
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get activity history for a user"""
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


@router.get(
    "/{user_id}/scheduled-actions",
    response_model=List[ScheduledUserActionResponse],
    summary="Get User Scheduled Actions",
    description="""
    Get all scheduled actions (past and future) for a specific user.
    
    **Returns:**
    - All scheduled actions for the user
    - Status of each action (pending, completed, cancelled, failed)
    - Time until execution for pending actions
    - Execution results and error messages
    
    **Action Statuses:**
    - `pending`: Waiting to be executed
    - `completed`: Successfully executed
    - `cancelled`: Manually cancelled before execution
    - `failed`: Execution attempted but failed
    
    **Action Types:**
    - `deactivate`: Scheduled user deactivation
    - Future: May include other action types
    
    **Returned Fields:**
    - `action_type`: Type of scheduled action
    - `scheduled_for`: When the action is/was scheduled
    - `reason`: Why the action was scheduled
    - `created_by_id`: Admin who scheduled it
    - `status`: Current status
    - `executed_at`: When it was actually executed (if completed)
    - `error_message`: Error details (if failed)
    - `is_overdue`: Whether scheduled time has passed
    - `time_until_execution`: Countdown to scheduled time
    
    **Use Cases:**
    - Display upcoming scheduled actions in user profile
    - Review past scheduled actions for audit
    - Check if user has pending deactivation
    - Monitor scheduler execution status
    
    **Authentication:**
    - Requires valid access token
    """,
    responses={
        200: {
            "description": "Scheduled actions retrieved successfully"
        },
        401: {
            "description": "Unauthorized"
        },
        404: {
            "description": "User not found"
        }
    }
)
async def get_user_scheduled_actions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all scheduled actions for a user"""
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


@router.get(
    "/stats/activity",
    response_model=SystemActivityStats,
    summary="Get System Activity Statistics",
    description="""
    Get system-wide user activity statistics.
    
    **Returns:**
    - Total users count
    - Active users count
    - Inactive users count
    - Users with scheduled deactivations
    - Total activity history records
    - Pending scheduled actions
    - Recent activity trends
    
    **Use Cases:**
    - Admin dashboard statistics
    - Monitor system health
    - Track user lifecycle patterns
    - Generate reports on user activity
    
    **Authorization:**
    - **Requires admin role**
    - Regular users will receive 403 Forbidden
    
    **Authentication:**
    - Requires valid access token
    """,
    responses={
        200: {
            "description": "System statistics retrieved successfully"
        },
        401: {
            "description": "Unauthorized - invalid or missing access token"
        },
        403: {
            "description": "Forbidden - admin privileges required",
            "content": {
                "application/json": {
                    "example": {"detail": "Admin privileges required"}
                }
            }
        }
    }
)
async def get_system_activity_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system-wide activity statistics - Requires admin role"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    
    try:
        return await UserStatusService.get_system_activity_stats(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/pending-deactivations",
    response_model=List[ScheduledUserActionResponse],
    summary="Get Pending Deactivations",
    description="""
    Get all pending scheduled deactivations across the system.
    
    **Returns:**
    - All scheduled deactivations with status 'pending'
    - Sorted by scheduled time
    - Includes user information
    - Shows time until execution
    - Highlights overdue actions
    
    **Use Cases:**
    - Admin dashboard to monitor upcoming deactivations
    - Identify overdue scheduled actions
    - Plan administrative tasks
    - Audit scheduled deactivations
    
    **Returned Information:**
    - User ID and details
    - Scheduled deactivation time
    - Reason for scheduling
    - Who created the schedule
    - Time until execution
    - Whether it's overdue
    
    **Authorization:**
    - **Requires admin role**
    - Regular users will receive 403 Forbidden
    
    **Authentication:**
    - Requires valid access token
    
    **Notes:**
    - Only shows 'pending' actions (not completed/cancelled/failed)
    - Useful for proactive management of user lifecycle
    - Can help identify scheduling issues if actions are overdue
    """,
    responses={
        200: {
            "description": "Pending deactivations retrieved successfully"
        },
        401: {
            "description": "Unauthorized - invalid or missing access token"
        },
        403: {
            "description": "Forbidden - admin privileges required",
            "content": {
                "application/json": {
                    "example": {"detail": "Admin privileges required"}
                }
            }
        }
    }
)
async def get_pending_deactivations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending scheduled deactivations - Requires admin role"""
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

