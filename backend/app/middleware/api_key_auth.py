"""
API Key Authentication Middleware
==================================
Middleware for authenticating and validating API keys.

Created: 2025-11-08
"""
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.api_keys import APIKey


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to authenticate and validate API keys.
    
    This middleware:
    1. Checks for API key in X-API-Key header
    2. Validates the key against the database
    3. Checks expiration, status, IP whitelist, and rate limits
    4. Sets request.state with API key information
    5. Updates last_used_at timestamp
    """
    
    async def dispatch(self, request: Request, call_next):
        """Process the request"""
        
        # Extract API key from headers
        api_key_raw = self.extract_api_key(request)
        
        if api_key_raw:
            # Validate and authenticate the API key
            api_key_info = await self.validate_api_key(api_key_raw, request)
            
            if api_key_info:
                # API key is valid - set request state
                request.state.api_key_id = api_key_info.id
                request.state.api_key_name = api_key_info.key_name
                request.state.app_source = f"api-key:{api_key_info.key_name}"
                request.state.is_integration = True
                request.state.api_key_scopes = api_key_info.scopes or []
                
                # Check if endpoint is allowed
                if not api_key_info.is_endpoint_allowed(str(request.url.path)):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"API key '{api_key_info.api_key_prefix}' is not allowed to access this endpoint"
                    )
                
                # Update last used timestamp (async, don't wait)
                # We'll do this in a background task to not slow down the request
                request.state.should_update_api_key_usage = True
            else:
                # API key is invalid
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid, expired, or revoked API key",
                    headers={"WWW-Authenticate": "ApiKey"}
                )
        else:
            # No API key provided - check for X-App-Source header
            x_app_source = request.headers.get("X-App-Source", "unknown")
            request.state.app_source = x_app_source
            request.state.is_integration = not x_app_source.startswith('ulm-')
            request.state.api_key_id = None
            request.state.api_key_name = None
        
        # Process the request
        response = await call_next(request)
        
        # Update API key usage after response (if needed)
        if hasattr(request.state, "should_update_api_key_usage") and request.state.should_update_api_key_usage:
            await self.update_api_key_usage(
                request.state.api_key_id,
                request.client.host if request.client else None,
                str(request.url.path),
                response.status_code >= 200 and response.status_code < 400
            )
        
        return response
    
    def extract_api_key(self, request: Request) -> Optional[str]:
        """
        Extract API key from request headers.
        
        Supports two formats:
        1. X-API-Key: ulm_live_abc123...
        2. Authorization: ApiKey ulm_live_abc123...
        """
        # Check X-API-Key header (preferred)
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return api_key
        
        # Check Authorization header with ApiKey scheme
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("ApiKey "):
            return auth_header.replace("ApiKey ", "", 1)
        
        return None
    
    async def validate_api_key(
        self,
        api_key_raw: str,
        request: Request
    ) -> Optional[APIKey]:
        """
        Validate an API key.
        
        Returns APIKey object if valid, None otherwise.
        """
        try:
            async with AsyncSessionLocal() as session:
                # Hash the provided key
                api_key_hash = hashlib.sha256(api_key_raw.encode()).hexdigest()
                
                # Look up in database
                result = await session.execute(
                    select(APIKey).where(
                        APIKey.api_key_hash == api_key_hash
                    )
                )
                api_key = result.scalar_one_or_none()
                
                if not api_key:
                    # Key not found
                    return None
                
                # Check if key is active
                if api_key.status != 'active':
                    return None
                
                # Check if key is expired
                if api_key.expires_at and api_key.expires_at < datetime.utcnow():
                    # Mark as expired
                    api_key.status = 'expired'
                    await session.commit()
                    return None
                
                # Check IP whitelist (if configured)
                if api_key.allowed_ips and len(api_key.allowed_ips) > 0:
                    client_ip = request.client.host if request.client else None
                    if client_ip and not api_key.is_ip_allowed(client_ip):
                        return None
                
                # TODO: Check rate limiting (implement with Redis later)
                # For now, we'll skip rate limiting
                
                return api_key
                
        except Exception as e:
            # Log error (don't expose details to client)
            print(f"Error validating API key: {e}")
            return None
    
    async def update_api_key_usage(
        self,
        api_key_id: int,
        client_ip: Optional[str],
        endpoint: str,
        success: bool
    ):
        """
        Update API key usage statistics.
        
        This is called after the request completes.
        """
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(APIKey).where(APIKey.id == api_key_id)
                )
                api_key = result.scalar_one_or_none()
                
                if api_key:
                    # Update counters
                    api_key.total_requests_count += 1
                    if success:
                        api_key.successful_requests_count += 1
                    else:
                        api_key.failed_requests_count += 1
                    
                    # Update last used info
                    api_key.last_used_at = datetime.utcnow()
                    api_key.last_request_ip = client_ip
                    api_key.last_request_endpoint = endpoint
                    
                    await session.commit()
        except Exception as e:
            # Log error but don't fail the request
            print(f"Error updating API key usage: {e}")


# Helper function to check if current request is using API key
def is_api_key_request(request: Request) -> bool:
    """Check if the current request is using an API key"""
    return hasattr(request.state, "api_key_id") and request.state.api_key_id is not None


# Helper function to get API key ID from request
def get_api_key_id(request: Request) -> Optional[int]:
    """Get API key ID from request state"""
    return getattr(request.state, "api_key_id", None)


# Helper function to check if API key has specific scope
def api_key_has_scope(request: Request, required_scope: str) -> bool:
    """
    Check if the current API key has a specific scope.
    
    Usage in route:
        if not api_key_has_scope(request, "users:write"):
            raise HTTPException(403, "Insufficient permissions")
    """
    if not is_api_key_request(request):
        # Not an API key request - allow (will be handled by regular auth)
        return True
    
    scopes = getattr(request.state, "api_key_scopes", [])
    
    # Check for direct scope match
    if required_scope in scopes:
        return True
    
    # Check for wildcard scopes
    for scope in scopes:
        if scope.endswith(':*'):
            prefix = scope[:-1]  # Remove '*'
            if required_scope.startswith(prefix):
                return True
    
    return False

