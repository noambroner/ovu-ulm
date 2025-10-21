from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from app.core.database import Base


class UserActivityHistory(Base):
    """
    User Activity History Model
    Tracks all periods of user activity (join/leave cycles)
    """
    __tablename__ = "user_activity_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Activity period
    joined_at = Column(DateTime(timezone=True), nullable=False)
    left_at = Column(DateTime(timezone=True), nullable=True)
    
    # Scheduling information
    scheduled_left_at = Column(DateTime(timezone=True), nullable=True)
    actual_left_at = Column(DateTime(timezone=True), nullable=True)
    
    # Action details
    action_type = Column(String(30), nullable=False, index=True)
    # Possible values: 'activated', 'deactivated_immediate', 'deactivated_scheduled',
    #                  'schedule_cancelled', 'auto_deactivated', 'reactivated'
    
    performed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="activity_history")
    performed_by = relationship("User", foreign_keys=[performed_by_id])
    
    # Table constraints
    __table_args__ = (
        CheckConstraint('left_at IS NULL OR left_at >= joined_at', name='check_date_range'),
    )

    def __repr__(self):
        return f"<UserActivityHistory(user_id={self.user_id}, action={self.action_type}, joined={self.joined_at})>"

    @property
    def duration_days(self):
        """Calculate duration in days"""
        if self.left_at is None:
            end_time = datetime.now(timezone.utc)
        else:
            end_time = self.left_at
        
        delta = end_time - self.joined_at
        return delta.total_seconds() / 86400  # Convert to days

    @property
    def is_current(self):
        """Check if this is the current active period"""
        return self.left_at is None


class ScheduledUserAction(Base):
    """
    Scheduled User Actions Model
    Manages scheduled operations like future deactivations
    """
    __tablename__ = "scheduled_user_actions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(30), nullable=False)  # 'deactivate', 'activate'
    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    reason = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default='pending', nullable=False, index=True)
    # Possible values: 'pending', 'executed', 'cancelled', 'failed'
    executed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="scheduled_actions")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<ScheduledUserAction(user_id={self.user_id}, action={self.action_type}, status={self.status})>"

    @property
    def is_overdue(self):
        """Check if the scheduled action is overdue"""
        if self.status != 'pending':
            return False
        return datetime.now(timezone.utc) > self.scheduled_for

    @property
    def time_until_execution(self):
        """Get time remaining until execution in seconds"""
        if self.status != 'pending':
            return None
        delta = self.scheduled_for - datetime.now(timezone.utc)
        return max(0, delta.total_seconds())








