from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from app.models.user import User
from app.models.user_activity import UserActivityHistory, ScheduledUserAction
from app.schemas.user_activity import (
    UserStatus, ActionType, ScheduledActionStatus,
    UserActivityHistoryCreate, ScheduledUserActionCreate,
    UserStatusInfo, UserActivitySummary, SystemActivityStats
)
from fastapi import HTTPException, status


class UserStatusService:
    """Service for managing user status and activity"""

    @staticmethod
    def create_user_activation(
        db: Session,
        user_id: int,
        performed_by_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> UserActivityHistory:
        """Create activation record when a user is created or reactivated"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update user status
        user.status = UserStatus.ACTIVE
        user.current_joined_at = datetime.now(timezone.utc)
        user.current_left_at = None
        user.scheduled_deactivation_at = None
        user.scheduled_deactivation_reason = None
        user.scheduled_deactivation_by_id = None

        # Create activity history record
        activity = UserActivityHistory(
            user_id=user_id,
            joined_at=datetime.now(timezone.utc),
            action_type=ActionType.ACTIVATED,
            performed_by_id=performed_by_id,
            reason=reason
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity

    @staticmethod
    def deactivate_user_immediately(
        db: Session,
        user_id: int,
        performed_by_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> UserActivityHistory:
        """Deactivate user immediately"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.status == UserStatus.INACTIVE:
            raise HTTPException(status_code=400, detail="User is already inactive")

        # Cancel any pending scheduled actions
        pending_actions = db.query(ScheduledUserAction).filter(
            ScheduledUserAction.user_id == user_id,
            ScheduledUserAction.status == ScheduledActionStatus.PENDING
        ).all()
        for action in pending_actions:
            action.status = ScheduledActionStatus.CANCELLED

        # Update user status
        now = datetime.now(timezone.utc)
        user.status = UserStatus.INACTIVE
        user.current_left_at = now
        user.scheduled_deactivation_at = None
        user.scheduled_deactivation_reason = None
        user.scheduled_deactivation_by_id = None

        # Update current activity period
        current_period = db.query(UserActivityHistory).filter(
            UserActivityHistory.user_id == user_id,
            UserActivityHistory.left_at.is_(None)
        ).first()

        if current_period:
            current_period.left_at = now
            current_period.actual_left_at = now

        # Create new history record
        activity = UserActivityHistory(
            user_id=user_id,
            joined_at=user.current_joined_at,
            left_at=now,
            actual_left_at=now,
            action_type=ActionType.DEACTIVATED_IMMEDIATE,
            performed_by_id=performed_by_id,
            reason=reason
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity

    @staticmethod
    def schedule_user_deactivation(
        db: Session,
        user_id: int,
        scheduled_for: datetime,
        performed_by_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> ScheduledUserAction:
        """Schedule a future deactivation"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.status == UserStatus.INACTIVE:
            raise HTTPException(status_code=400, detail="Cannot schedule deactivation for inactive user")

        if scheduled_for <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

        # Cancel any existing scheduled deactivations
        existing_schedules = db.query(ScheduledUserAction).filter(
            ScheduledUserAction.user_id == user_id,
            ScheduledUserAction.status == ScheduledActionStatus.PENDING,
            ScheduledUserAction.action_type == 'deactivate'
        ).all()
        for schedule in existing_schedules:
            schedule.status = ScheduledActionStatus.CANCELLED

        # Update user
        user.status = UserStatus.SCHEDULED_DEACTIVATION
        user.scheduled_deactivation_at = scheduled_for
        user.scheduled_deactivation_reason = reason
        user.scheduled_deactivation_by_id = performed_by_id

        # Create scheduled action
        scheduled_action = ScheduledUserAction(
            user_id=user_id,
            action_type='deactivate',
            scheduled_for=scheduled_for,
            reason=reason,
            created_by_id=performed_by_id,
            status=ScheduledActionStatus.PENDING
        )
        db.add(scheduled_action)

        # Create activity history record
        activity = UserActivityHistory(
            user_id=user_id,
            joined_at=user.current_joined_at,
            scheduled_left_at=scheduled_for,
            action_type=ActionType.DEACTIVATED_SCHEDULED,
            performed_by_id=performed_by_id,
            reason=reason
        )
        db.add(activity)

        db.commit()
        db.refresh(scheduled_action)
        return scheduled_action

    @staticmethod
    def cancel_scheduled_deactivation(
        db: Session,
        user_id: int,
        performed_by_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> UserActivityHistory:
        """Cancel a scheduled deactivation"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.status != UserStatus.SCHEDULED_DEACTIVATION:
            raise HTTPException(status_code=400, detail="User does not have a scheduled deactivation")

        # Cancel pending scheduled actions
        pending_actions = db.query(ScheduledUserAction).filter(
            ScheduledUserAction.user_id == user_id,
            ScheduledUserAction.status == ScheduledActionStatus.PENDING,
            ScheduledUserAction.action_type == 'deactivate'
        ).all()
        for action in pending_actions:
            action.status = ScheduledActionStatus.CANCELLED

        # Update user status back to active
        user.status = UserStatus.ACTIVE
        user.scheduled_deactivation_at = None
        user.scheduled_deactivation_reason = None
        user.scheduled_deactivation_by_id = None

        # Create activity history record
        activity = UserActivityHistory(
            user_id=user_id,
            joined_at=user.current_joined_at,
            action_type=ActionType.SCHEDULE_CANCELLED,
            performed_by_id=performed_by_id,
            reason=reason
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity

    @staticmethod
    def reactivate_user(
        db: Session,
        user_id: int,
        performed_by_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> UserActivityHistory:
        """Reactivate an inactive user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.status != UserStatus.INACTIVE:
            raise HTTPException(status_code=400, detail="User is not inactive")

        # Update user status
        now = datetime.now(timezone.utc)
        user.status = UserStatus.ACTIVE
        user.current_joined_at = now
        user.current_left_at = None

        # Create new activity history record
        activity = UserActivityHistory(
            user_id=user_id,
            joined_at=now,
            action_type=ActionType.REACTIVATED,
            performed_by_id=performed_by_id,
            reason=reason
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity

    @staticmethod
    def execute_scheduled_deactivation(
        db: Session,
        scheduled_action_id: int
    ) -> bool:
        """Execute a scheduled deactivation (called by scheduler)"""
        try:
            scheduled_action = db.query(ScheduledUserAction).filter(
                ScheduledUserAction.id == scheduled_action_id
            ).first()

            if not scheduled_action:
                return False

            if scheduled_action.status != ScheduledActionStatus.PENDING:
                return False

            user = db.query(User).filter(User.id == scheduled_action.user_id).first()
            if not user:
                scheduled_action.status = ScheduledActionStatus.FAILED
                scheduled_action.error_message = "User not found"
                db.commit()
                return False

            # Perform deactivation
            now = datetime.now(timezone.utc)
            user.status = UserStatus.INACTIVE
            user.current_left_at = now
            user.scheduled_deactivation_at = None
            user.scheduled_deactivation_reason = None
            user.scheduled_deactivation_by_id = None

            # Update current activity period
            current_period = db.query(UserActivityHistory).filter(
                UserActivityHistory.user_id == user.id,
                UserActivityHistory.left_at.is_(None)
            ).first()

            if current_period:
                current_period.left_at = now
                current_period.actual_left_at = now

            # Create history record
            activity = UserActivityHistory(
                user_id=user.id,
                joined_at=user.current_joined_at,
                left_at=now,
                scheduled_left_at=scheduled_action.scheduled_for,
                actual_left_at=now,
                action_type=ActionType.AUTO_DEACTIVATED,
                performed_by_id=scheduled_action.created_by_id,
                reason=scheduled_action.reason
            )
            db.add(activity)

            # Update scheduled action
            scheduled_action.status = ScheduledActionStatus.EXECUTED
            scheduled_action.executed_at = now

            db.commit()
            return True

        except Exception as e:
            db.rollback()
            if scheduled_action:
                scheduled_action.status = ScheduledActionStatus.FAILED
                scheduled_action.error_message = str(e)
                db.commit()
            return False

    @staticmethod
    def get_user_status_info(db: Session, user_id: int) -> UserStatusInfo:
        """Get comprehensive status information for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserStatusInfo(
            user_id=user.id,
            username=user.username,
            status=user.status,
            status_display=user.status_display,
            is_active=user.is_active,
            current_joined_at=user.current_joined_at,
            current_left_at=user.current_left_at,
            scheduled_deactivation_at=user.scheduled_deactivation_at,
            scheduled_deactivation_reason=user.scheduled_deactivation_reason,
            days_until_deactivation=user.days_until_deactivation,
            hours_until_deactivation=user.hours_until_deactivation
        )

    @staticmethod
    def get_user_activity_history(
        db: Session,
        user_id: int,
        limit: Optional[int] = None
    ) -> List[UserActivityHistory]:
        """Get activity history for a user"""
        query = db.query(UserActivityHistory).filter(
            UserActivityHistory.user_id == user_id
        ).order_by(UserActivityHistory.joined_at.desc())

        if limit:
            query = query.limit(limit)

        return query.all()

    @staticmethod
    def get_pending_deactivations(db: Session) -> List[ScheduledUserAction]:
        """Get all pending scheduled deactivations"""
        return db.query(ScheduledUserAction).filter(
            ScheduledUserAction.status == ScheduledActionStatus.PENDING,
            ScheduledUserAction.action_type == 'deactivate'
        ).order_by(ScheduledUserAction.scheduled_for).all()

    @staticmethod
    def get_overdue_actions(db: Session) -> List[ScheduledUserAction]:
        """Get overdue scheduled actions"""
        now = datetime.now(timezone.utc)
        return db.query(ScheduledUserAction).filter(
            ScheduledUserAction.status == ScheduledActionStatus.PENDING,
            ScheduledUserAction.scheduled_for <= now
        ).all()

    @staticmethod
    def get_system_activity_stats(db: Session) -> SystemActivityStats:
        """Get system-wide activity statistics"""
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.status == UserStatus.ACTIVE).count()
        inactive_users = db.query(User).filter(User.status == UserStatus.INACTIVE).count()
        scheduled_deactivations = db.query(User).filter(
            User.status == UserStatus.SCHEDULED_DEACTIVATION
        ).count()
        pending_scheduled_actions = db.query(ScheduledUserAction).filter(
            ScheduledUserAction.status == ScheduledActionStatus.PENDING
        ).count()

        now = datetime.now(timezone.utc)
        overdue_actions = db.query(ScheduledUserAction).filter(
            ScheduledUserAction.status == ScheduledActionStatus.PENDING,
            ScheduledUserAction.scheduled_for <= now
        ).count()

        return SystemActivityStats(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            scheduled_deactivations=scheduled_deactivations,
            pending_scheduled_actions=pending_scheduled_actions,
            overdue_actions=overdue_actions
        )

