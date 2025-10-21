from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from app.core.database import Base


class User(Base):
    """User Model with Status and Scheduling Support"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), default='user', nullable=False)
    preferred_language = Column(String(10), default='he')
    is_verified = Column(Boolean, default=False)
    
    # Status and scheduling fields
    status = Column(String(30), default='active', nullable=False, index=True)
    # Possible values: 'active', 'scheduled_deactivation', 'inactive'
    
    current_joined_at = Column(DateTime(timezone=True), server_default=func.now())
    current_left_at = Column(DateTime(timezone=True), nullable=True)
    
    scheduled_deactivation_at = Column(DateTime(timezone=True), nullable=True, index=True)
    scheduled_deactivation_reason = Column(Text, nullable=True)
    scheduled_deactivation_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], remote_side=[id])
    scheduled_by = relationship("User", foreign_keys=[scheduled_deactivation_by_id], remote_side=[id])
    activity_history = relationship("UserActivityHistory", back_populates="user", foreign_keys="[UserActivityHistory.user_id]")
    scheduled_actions = relationship("ScheduledUserAction", back_populates="user", foreign_keys="[ScheduledUserAction.user_id]")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, status={self.status})>"

    @property
    def is_active(self):
        """Check if user is currently active"""
        return self.status in ['active', 'scheduled_deactivation']

    @property
    def is_inactive(self):
        """Check if user is inactive"""
        return self.status == 'inactive'

    @property
    def has_scheduled_deactivation(self):
        """Check if user has a scheduled deactivation"""
        return self.status == 'scheduled_deactivation' and self.scheduled_deactivation_at is not None

    @property
    def days_until_deactivation(self):
        """Get days remaining until deactivation"""
        if not self.has_scheduled_deactivation:
            return None
        delta = self.scheduled_deactivation_at - datetime.now(timezone.utc)
        return delta.total_seconds() / 86400

    @property
    def hours_until_deactivation(self):
        """Get hours remaining until deactivation"""
        if not self.has_scheduled_deactivation:
            return None
        delta = self.scheduled_deactivation_at - datetime.now(timezone.utc)
        return delta.total_seconds() / 3600

    @property
    def status_display(self):
        """Get user-friendly status display"""
        if self.status == 'active':
            return 'פעיל'
        elif self.status == 'scheduled_deactivation':
            if self.scheduled_deactivation_at:
                return f'מתוזמן להשבתה ב-{self.scheduled_deactivation_at.strftime("%d/%m/%Y %H:%M")}'
            return 'מתוזמן להשבתה'
        elif self.status == 'inactive':
            return 'לא פעיל'
        return 'לא ידוע'

    @property
    def full_name(self):
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username

    def get_current_activity_period(self, session):
        """Get the current activity period (where left_at is NULL)"""
        from app.models.user_activity import UserActivityHistory
        return session.query(UserActivityHistory).filter(
            UserActivityHistory.user_id == self.id,
            UserActivityHistory.left_at.is_(None)
        ).first()

    def get_activity_history(self, session, limit=None):
        """Get user's activity history"""
        from app.models.user_activity import UserActivityHistory
        query = session.query(UserActivityHistory).filter(
            UserActivityHistory.user_id == self.id
        ).order_by(UserActivityHistory.joined_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()

    def get_pending_scheduled_actions(self, session):
        """Get pending scheduled actions for this user"""
        from app.models.user_activity import ScheduledUserAction
        return session.query(ScheduledUserAction).filter(
            ScheduledUserAction.user_id == self.id,
            ScheduledUserAction.status == 'pending'
        ).order_by(ScheduledUserAction.scheduled_for).all()








