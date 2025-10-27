"""
User Preferences Models
======================
Models for storing user preferences and search history for DataGrid components.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class UserDataGridPreference(Base):
    """
    Store user preferences for DataGrid components.
    
    Each user can have one set of preferences per DataGrid (identified by datagrid_key).
    Preferences include filters, sort, column widths, etc.
    """
    __tablename__ = "user_datagrid_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    datagrid_key = Column(String(100), nullable=False, index=True)
    preferences = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship to user (optional, if you have a User model)
    # user = relationship("User", back_populates="datagrid_preferences")
    
    def __repr__(self):
        return f"<UserDataGridPreference(user_id={self.user_id}, key={self.datagrid_key})>"


class UserSearchHistory(Base):
    """
    Store search and filter history for users.
    
    Keeps track of the last 100 searches/filters per user per DataGrid.
    Auto-cleanup is handled by database trigger.
    """
    __tablename__ = "user_search_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    datagrid_key = Column(String(100), nullable=False, index=True)
    search_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationship to user (optional)
    # user = relationship("User", back_populates="search_history")
    
    def __repr__(self):
        return f"<UserSearchHistory(user_id={self.user_id}, key={self.datagrid_key}, created={self.created_at})>"

