"""
Development Journal Models
Models for tracking development sessions, steps, and system state
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class DevelopmentSession(Base):
    """Development Session (יומן פיתוח)"""
    __tablename__ = "development_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Session Info
    title = Column(String(500), nullable=False)
    summary = Column(Text)
    
    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time = Column(DateTime(timezone=True))
    
    # Next Steps
    instructions_for_next = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<DevelopmentSession(id={self.id}, title={self.title})>"


class DevelopmentStep(Base):
    """Development Step (צעד פיתוח)"""
    __tablename__ = "development_steps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Session Reference
    session_id = Column(Integer, ForeignKey("development_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Step Order
    step_number = Column(Integer, nullable=False)
    
    # Step Content
    user_prompt = Column(Text, nullable=False)
    ai_understanding = Column(Text)
    ai_actions = Column(Text)
    result = Column(Text)
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def __repr__(self):
        return f"<DevelopmentStep(id={self.id}, session_id={self.session_id}, step={self.step_number})>"


class SystemState(Base):
    """System State (מצב מערכת)"""
    __tablename__ = "system_states"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Session Reference
    session_id = Column(Integer, ForeignKey("development_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # State
    state_at_start = Column(Text, nullable=False)
    state_at_end = Column(Text)
    
    # Changes Summary
    changes_summary = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<SystemState(id={self.id}, session_id={self.session_id})>"

