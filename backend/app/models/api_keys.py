"""
API Keys Models
===============
SQLAlchemy models for API Keys Management System.

Created: 2025-11-08
"""
from sqlalchemy import Column, Integer, String, Text, BigInteger, Boolean, TIMESTAMP, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import List, Optional
from app.core.database import Base


class APIKey(Base):
    """
    API Key Model
    
    Stores API keys for external applications and integrations.
    Keys are hashed using SHA256 - never store plain keys!
    """
    __tablename__ = "api_keys"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info
    key_name = Column(String(100), nullable=False, comment="Application name")
    api_key_hash = Column(String(64), unique=True, nullable=False, index=True, comment="SHA256 hash of API key")
    api_key_prefix = Column(String(20), nullable=False, comment="First 8 chars for display")
    app_type = Column(String(50), default='integration', comment="Type: mobile/web/integration/bot/service")
    
    # Owner Information
    owner_name = Column(String(100), comment="Owner/Contact name")
    owner_email = Column(String(255), comment="Contact email")
    description = Column(Text, comment="Purpose/description of usage")
    
    # Permissions & Scopes
    scopes = Column(JSON, default=list, comment="Array of permission scopes")
    allowed_endpoints = Column(JSON, default=list, comment="Array of allowed endpoints")
    
    # Rate Limiting
    rate_limit_per_minute = Column(Integer, default=60, comment="Max requests per minute")
    rate_limit_per_hour = Column(Integer, default=1000, comment="Max requests per hour")
    rate_limit_per_day = Column(Integer, default=10000, comment="Max requests per day")
    
    # IP Whitelisting
    allowed_ips = Column(JSON, default=list, comment="IP whitelist - empty = all IPs allowed")
    
    # Status & Lifecycle
    status = Column(String(20), default='active', nullable=False, index=True,
                   comment="Status: active/suspended/revoked/expired")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    last_used_at = Column(TIMESTAMP, nullable=True, comment="Last time key was used")
    expires_at = Column(TIMESTAMP, nullable=True, comment="Expiration date")
    revoked_at = Column(TIMESTAMP, nullable=True, comment="When was it revoked")
    revoked_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    revoke_reason = Column(Text, nullable=True, comment="Why was it revoked")
    
    # Usage Statistics
    total_requests_count = Column(BigInteger, default=0, comment="Total number of requests")
    successful_requests_count = Column(BigInteger, default=0, comment="Successful requests (2xx)")
    failed_requests_count = Column(BigInteger, default=0, comment="Failed requests (4xx, 5xx)")
    last_request_ip = Column(String(45), nullable=True, comment="Last IP address used")
    last_request_endpoint = Column(String(255), nullable=True, comment="Last endpoint called")
    
    # Metadata
    notes = Column(Text, nullable=True, comment="Internal notes")
    tags = Column(JSON, default=list, comment="Tags for organization")
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_user_id], backref="created_api_keys")
    revoked_by = relationship("User", foreign_keys=[revoked_by_user_id], backref="revoked_api_keys")
    usage_stats = relationship("APIKeyUsageStats", back_populates="api_key", cascade="all, delete-orphan")
    audit_logs = relationship("APIKeyAuditLog", back_populates="api_key", cascade="all, delete-orphan")
    
    # Table constraints
    __table_args__ = (
        CheckConstraint("status IN ('active', 'suspended', 'revoked', 'expired')", name='check_status'),
    )
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.key_name}', status='{self.status}')>"
    
    def to_dict(self, include_sensitive: bool = False):
        """
        Convert to dictionary
        
        Args:
            include_sensitive: If True, includes sensitive data (for admin use only)
        """
        data = {
            "id": self.id,
            "key_name": self.key_name,
            "api_key_prefix": self.api_key_prefix,
            "app_type": self.app_type,
            "owner_name": self.owner_name,
            "owner_email": self.owner_email,
            "description": self.description,
            "scopes": self.scopes or [],
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "rate_limit_per_hour": self.rate_limit_per_hour,
            "rate_limit_per_day": self.rate_limit_per_day,
            "total_requests_count": self.total_requests_count,
            "successful_requests_count": self.successful_requests_count,
            "failed_requests_count": self.failed_requests_count,
            "tags": self.tags or [],
        }
        
        if include_sensitive:
            data.update({
                "allowed_endpoints": self.allowed_endpoints or [],
                "allowed_ips": self.allowed_ips or [],
                "created_by_user_id": self.created_by_user_id,
                "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
                "revoked_by_user_id": self.revoked_by_user_id,
                "revoke_reason": self.revoke_reason,
                "last_request_ip": self.last_request_ip,
                "last_request_endpoint": self.last_request_endpoint,
                "notes": self.notes,
            })
        
        return data
    
    def is_active(self) -> bool:
        """Check if API key is active and not expired"""
        if self.status != 'active':
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True
    
    def has_scope(self, scope: str) -> bool:
        """Check if API key has specific scope"""
        if not self.scopes:
            return False
        
        # Direct match
        if scope in self.scopes:
            return True
        
        # Wildcard match (e.g., 'admin:*' grants 'admin:users')
        for key_scope in self.scopes:
            if key_scope.endswith(':*'):
                prefix = key_scope[:-1]  # Remove '*'
                if scope.startswith(prefix):
                    return True
        
        return False
    
    def is_ip_allowed(self, ip: str) -> bool:
        """Check if IP is whitelisted (empty list = all IPs allowed)"""
        if not self.allowed_ips or len(self.allowed_ips) == 0:
            return True
        return ip in self.allowed_ips
    
    def is_endpoint_allowed(self, endpoint: str) -> bool:
        """Check if endpoint is allowed (empty list = all endpoints allowed)"""
        if not self.allowed_endpoints or len(self.allowed_endpoints) == 0:
            return True
        
        # Exact match
        if endpoint in self.allowed_endpoints:
            return True
        
        # Wildcard match (e.g., '/api/v1/users/*' allows '/api/v1/users/123')
        for allowed in self.allowed_endpoints:
            if allowed.endswith('/*'):
                prefix = allowed[:-1]  # Remove '*'
                if endpoint.startswith(prefix):
                    return True
        
        return False


class APIKeyUsageStats(Base):
    """
    API Key Usage Statistics Model
    
    Stores hourly usage statistics for each API key.
    """
    __tablename__ = "api_key_usage_stats"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey('api_keys.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Time Dimension
    date = Column(TIMESTAMP, nullable=False, index=True, comment="Date of usage")
    hour = Column(Integer, nullable=False, comment="Hour (0-23)")
    
    # Request Statistics
    requests_count = Column(Integer, default=0, comment="Total requests in this hour")
    successful_requests = Column(Integer, default=0, comment="2xx responses")
    client_errors = Column(Integer, default=0, comment="4xx responses")
    server_errors = Column(Integer, default=0, comment="5xx responses")
    
    # Performance Metrics
    avg_response_time_ms = Column(Integer, nullable=True, comment="Average response time")
    min_response_time_ms = Column(Integer, nullable=True, comment="Fastest response")
    max_response_time_ms = Column(Integer, nullable=True, comment="Slowest response")
    
    # Endpoints Hit
    unique_endpoints_count = Column(Integer, default=0, comment="Number of different endpoints called")
    top_endpoints = Column(JSON, default=list, comment="Top 5 endpoints called")
    
    # Traffic Sources
    unique_ips_count = Column(Integer, default=0, comment="Number of different IPs")
    top_ips = Column(JSON, default=list, comment="Top IPs")
    
    # Data Transfer
    total_bytes_sent = Column(BigInteger, default=0, comment="Response data sent (bytes)")
    total_bytes_received = Column(BigInteger, default=0, comment="Request data received (bytes)")
    
    # Metadata
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    api_key = relationship("APIKey", back_populates="usage_stats")
    
    # Table constraints
    __table_args__ = (
        CheckConstraint("hour >= 0 AND hour <= 23", name='check_hour_range'),
    )
    
    def __repr__(self):
        return f"<APIKeyUsageStats(api_key_id={self.api_key_id}, date={self.date}, hour={self.hour})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "api_key_id": self.api_key_id,
            "date": self.date.isoformat() if self.date else None,
            "hour": self.hour,
            "requests_count": self.requests_count,
            "successful_requests": self.successful_requests,
            "client_errors": self.client_errors,
            "server_errors": self.server_errors,
            "avg_response_time_ms": self.avg_response_time_ms,
            "min_response_time_ms": self.min_response_time_ms,
            "max_response_time_ms": self.max_response_time_ms,
            "unique_endpoints_count": self.unique_endpoints_count,
            "top_endpoints": self.top_endpoints or [],
            "unique_ips_count": self.unique_ips_count,
            "top_ips": self.top_ips or [],
            "total_bytes_sent": self.total_bytes_sent,
            "total_bytes_received": self.total_bytes_received,
        }


class APIKeyAuditLog(Base):
    """
    API Key Audit Log Model
    
    Audit trail for API key lifecycle events and changes.
    """
    __tablename__ = "api_key_audit_log"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey('api_keys.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Event Information
    event_type = Column(String(50), nullable=False, index=True,
                       comment="Event type: created/revoked/suspended/reactivated/updated")
    event_description = Column(Text, comment="Detailed description")
    
    # Actor Information
    performed_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    performed_by_username = Column(String(100), comment="Username (denormalized for history)")
    
    # Changes (for update events)
    changes = Column(JSON, nullable=True, comment='{"field": {"old": "value", "new": "value"}}')
    
    # Context
    ip_address = Column(String(45), comment="IP of the user who made the change")
    user_agent = Column(Text, comment="Browser/client info")
    
    # Timestamp
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    
    # Relationships
    api_key = relationship("APIKey", back_populates="audit_logs")
    performed_by = relationship("User", backref="api_key_audit_actions")
    
    def __repr__(self):
        return f"<APIKeyAuditLog(id={self.id}, event_type='{self.event_type}', api_key_id={self.api_key_id})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "api_key_id": self.api_key_id,
            "event_type": self.event_type,
            "event_description": self.event_description,
            "performed_by_user_id": self.performed_by_user_id,
            "performed_by_username": self.performed_by_username,
            "changes": self.changes,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

