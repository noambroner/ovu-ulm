"""
API Logger Middleware
Logs all API requests and responses to database using background tasks
"""
import time
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.background import BackgroundTask
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.models.api_logs import APILogBackend


class APILoggerMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests and responses"""
    
    async def dispatch(self, request: Request, call_next):
        # Start timing
        start_time = time.time()
        request_time = datetime.now(timezone.utc)
        
        # Extract request information
        method = request.method
        path = str(request.url.path)
        query_params = str(dict(request.query_params)) if request.query_params else None
        user_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Extract user info from state (set by auth middleware)
        user_id = None
        username = None
        if hasattr(request.state, "user"):
            user_id = getattr(request.state.user, "id", None)
            username = getattr(request.state.user, "username", None)
        
        # Get request headers (filter sensitive data)
        request_headers = dict(request.headers)
        # Remove sensitive headers
        for sensitive_key in ["authorization", "cookie", "x-api-key"]:
            if sensitive_key in request_headers:
                request_headers[sensitive_key] = "[REDACTED]"
        request_headers_str = json.dumps(request_headers)
        
        # Call the endpoint and get response
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        response_time = datetime.now(timezone.utc)
        
        # Extract response information
        status_code = response.status_code
        
        # Get response headers
        response_headers = dict(response.headers)
        response_headers_str = json.dumps(response_headers)
        
        # Only log if it's a JSON API response (not health checks, static files, etc.)
        should_log = (
            path.startswith("/api/") and
            not path.endswith("/health") and
            not path.endswith("/ready")
        )
        
        if should_log:
            # Add background task to save log AFTER response is sent
            response.background = BackgroundTask(
                self._save_log,
                method=method,
                endpoint=path,
                path=path,
                query_params=query_params,
                request_body=None,
                request_headers=request_headers_str,
                user_id=user_id,
                username=username,
                user_ip=user_ip,
                user_agent=user_agent,
                status_code=status_code,
                response_headers=response_headers_str,
                request_time=request_time,
                response_time=response_time,
                duration_ms=duration_ms,
                error_message=None
            )
        
        return response
    
    async def _save_log(self, **kwargs):
        """Save log entry to database (runs in background after response is sent)"""
        try:
            async with AsyncSessionLocal() as session:
                log_entry = APILogBackend(**kwargs)
                session.add(log_entry)
                await session.commit()
        except Exception as e:
            # Don't let logging errors crash the app
            print(f"Failed to save API log: {str(e)}")
