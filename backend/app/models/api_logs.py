"""
API Logs Models
Models for tracking Backend and Frontend API requests
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class APILogBackend(Base):
    """Backend API Request/Response Logs"""
    __tablename__ = "api_logs_backend"

    id = Column(Integer, primary_key=True, index=True)
    
    # Request Information
    method = Column(String(10), nullable=False, index=True)
    endpoint = Column(Text, nullable=False)
    path = Column(String(500), nullable=False)
    query_params = Column(Text)
    request_body = Column(Text)
    request_headers = Column(Text)
    
    # User Information
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(100))
    user_ip = Column(String(50))
    user_agent = Column(Text)
    
    # Request Source Information
    origin = Column(String(255))  # Domain that made the request (e.g., https://ulm-rct.ovu.co.il)
    referer = Column(Text)  # Full URL that made the request
    app_source = Column(String(100), index=True)  # Application identifier (e.g., ulm-react-web, ulm-flutter-mobile)
    
    # Response Information
    status_code = Column(Integer, index=True)
    response_body = Column(Text)
    response_headers = Column(Text)
    
    # Timing
    request_time = Column(DateTime(timezone=True), server_default=func.now())
    response_time = Column(DateTime(timezone=True))
    duration_ms = Column(Integer)
    
    # Additional Info
    error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def __repr__(self):
        return f"<APILogBackend(id={self.id}, method={self.method}, endpoint={self.endpoint}, status={self.status_code})>"


class APILogFrontend(Base):
    """Frontend API Call Logs"""
    __tablename__ = "api_logs_frontend"

    id = Column(Integer, primary_key=True, index=True)
    
    # Request Information
    method = Column(String(10), nullable=False, index=True)
    url = Column(Text, nullable=False)
    endpoint = Column(String(500), nullable=False)
    request_body = Column(Text)
    request_headers = Column(Text)
    
    # User Information
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(100))
    session_id = Column(String(100))
    
    # Request Source Information
    origin = Column(String(255))  # Domain that made the request
    referer = Column(Text)  # Full URL that made the request
    app_source = Column(String(100), index=True)  # Application identifier
    
    # Response Information
    status_code = Column(Integer, index=True)
    response_body = Column(Text)
    response_headers = Column(Text)
    success = Column(Boolean, default=False)
    
    # Timing
    request_time = Column(DateTime(timezone=True), server_default=func.now())
    response_time = Column(DateTime(timezone=True))
    duration_ms = Column(Integer)
    
    # Additional Info
    error_message = Column(Text)
    browser_info = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def __repr__(self):
        return f"<APILogFrontend(id={self.id}, method={self.method}, endpoint={self.endpoint}, status={self.status_code})>"

