"""
API Key Management Routes
=========================
REST API endpoints for managing API keys.

Created: 2025-11-08
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, validator
import secrets
import hashlib

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.api_keys import APIKey, APIKeyAuditLog
from app.models.users import User

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class APIKeyCreate(BaseModel):
    """Schema for creating a new API key"""
    key_name: str
    app_type: Optional[str] = "integration"
    owner_name: Optional[str] = None
    owner_email: Optional[EmailStr] = None
    description: Optional[str] = None
    scopes: Optional[List[str]] = []
    allowed_endpoints: Optional[List[str]] = []
    rate_limit_per_minute: Optional[int] = 60
    rate_limit_per_hour: Optional[int] = 1000
    rate_limit_per_day: Optional[int] = 10000
    allowed_ips: Optional[List[str]] = []
    expires_in_days: Optional[int] = None  # NULL = no expiration
    tags: Optional[List[str]] = []
    notes: Optional[str] = None
    
    @validator('key_name')
    def validate_key_name(cls, v):
        if not v or len(v) < 3:
            raise ValueError('key_name must be at least 3 characters')
        if len(v) > 100:
            raise ValueError('key_name must be less than 100 characters')
        return v
    
    @validator('scopes')
    def validate_scopes(cls, v):
        valid_scopes = [
            'users:read', 'users:write', 'users:delete',
            'logs:read', 'logs:write',
            'admin:*', 'read:*', 'write:*'
        ]
        for scope in v:
            # Check if it's a valid scope or wildcard pattern
            if scope not in valid_scopes and not any(scope.startswith(vs.replace(':*', ':')) for vs in valid_scopes if vs.endswith(':*')):
                # Allow any scope for now, but warn
                pass
        return v


class APIKeyUpdate(BaseModel):
    """Schema for updating an API key"""
    key_name: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[EmailStr] = None
    description: Optional[str] = None
    scopes: Optional[List[str]] = None
    allowed_endpoints: Optional[List[str]] = None
    rate_limit_per_minute: Optional[int] = None
    rate_limit_per_hour: Optional[int] = None
    rate_limit_per_day: Optional[int] = None
    allowed_ips: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class APIKeyResponse(BaseModel):
    """Schema for API key response (without sensitive data)"""
    id: int
    key_name: str
    api_key_prefix: str
    app_type: str
    owner_name: Optional[str]
    owner_email: Optional[str]
    status: str
    created_at: datetime
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    total_requests_count: int
    rate_limit_per_minute: int
    tags: List[str]
    
    class Config:
        from_attributes = True


class APIKeyCreateResponse(BaseModel):
    """Schema for API key creation response (includes the actual key!)"""
    id: int
    key_name: str
    api_key: str  # ⚠️ Only returned once!
    api_key_prefix: str
    app_type: str
    status: str
    created_at: datetime
    scopes: List[str]
    rate_limit_per_minute: int
    
    class Config:
        from_attributes = True


class APIKeyRevokeRequest(BaseModel):
    """Schema for revoking an API key"""
    reason: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def generate_api_key() -> tuple[str, str, str]:
    """
    Generate a new API key
    
    Returns:
        tuple: (api_key, api_key_hash, api_key_prefix)
    """
    # Generate random key: ulm_live_<32 random chars>
    random_part = secrets.token_urlsafe(32)[:32]  # 32 chars
    api_key = f"ulm_live_{random_part}"
    
    # Hash the key using SHA256
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Prefix for display (first 12 chars + ...)
    api_key_prefix = api_key[:12] + "..."
    
    return api_key, api_key_hash, api_key_prefix


async def log_audit_event(
    db: AsyncSession,
    api_key_id: int,
    event_type: str,
    event_description: str,
    user: User,
    request: Request,
    changes: Optional[dict] = None
):
    """Log an audit event for API key"""
    audit_log = APIKeyAuditLog(
        api_key_id=api_key_id,
        event_type=event_type,
        event_description=event_description,
        performed_by_user_id=user.id,
        performed_by_username=user.username,
        changes=changes,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(audit_log)
    await db.commit()


# ============================================================================
# API Endpoints
# ============================================================================

@router.get(
    "/api-keys",
    response_model=List[APIKeyResponse],
    summary="List all API keys",
    description="Get a list of all API keys with filtering options"
)
async def list_api_keys(
    status: Optional[str] = None,
    app_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all API keys"""
    
    # Build query
    query = select(APIKey).order_by(desc(APIKey.created_at))
    
    # Apply filters
    if status:
        query = query.where(APIKey.status == status)
    if app_type:
        query = query.where(APIKey.app_type == app_type)
    
    # Pagination
    query = query.offset(skip).limit(limit)
    
    # Execute
    result = await db.execute(query)
    api_keys = result.scalars().all()
    
    return [APIKeyResponse.model_validate(key) for key in api_keys]


@router.post(
    "/api-keys",
    response_model=APIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new API key",
    description="Generate a new API key for external integrations. ⚠️ The API key is only shown once!"
)
async def create_api_key(
    key_data: APIKeyCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new API key"""
    
    # Generate API key
    api_key, api_key_hash, api_key_prefix = generate_api_key()
    
    # Calculate expiration date
    expires_at = None
    if key_data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)
    
    # Create API key object
    new_key = APIKey(
        key_name=key_data.key_name,
        api_key_hash=api_key_hash,
        api_key_prefix=api_key_prefix,
        app_type=key_data.app_type,
        owner_name=key_data.owner_name,
        owner_email=key_data.owner_email,
        description=key_data.description,
        scopes=key_data.scopes,
        allowed_endpoints=key_data.allowed_endpoints,
        rate_limit_per_minute=key_data.rate_limit_per_minute,
        rate_limit_per_hour=key_data.rate_limit_per_hour,
        rate_limit_per_day=key_data.rate_limit_per_day,
        allowed_ips=key_data.allowed_ips,
        expires_at=expires_at,
        tags=key_data.tags,
        notes=key_data.notes,
        created_by_user_id=current_user.id,
        status='active'
    )
    
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)
    
    # Log audit event
    await log_audit_event(
        db=db,
        api_key_id=new_key.id,
        event_type='created',
        event_description=f"API key '{key_data.key_name}' created",
        user=current_user,
        request=request
    )
    
    # Return response with the actual key (only time it's shown!)
    return APIKeyCreateResponse(
        id=new_key.id,
        key_name=new_key.key_name,
        api_key=api_key,  # ⚠️ Only returned once!
        api_key_prefix=new_key.api_key_prefix,
        app_type=new_key.app_type,
        status=new_key.status,
        created_at=new_key.created_at,
        scopes=new_key.scopes or [],
        rate_limit_per_minute=new_key.rate_limit_per_minute
    )


@router.get(
    "/api-keys/{key_id}",
    response_model=APIKeyResponse,
    summary="Get API key details",
    description="Get detailed information about a specific API key"
)
async def get_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get API key by ID"""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return APIKeyResponse.model_validate(api_key)


@router.patch(
    "/api-keys/{key_id}",
    response_model=APIKeyResponse,
    summary="Update API key",
    description="Update API key settings (name, scopes, rate limits, etc.)"
)
async def update_api_key(
    key_id: int,
    key_data: APIKeyUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update API key"""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Track changes for audit log
    changes = {}
    update_data = key_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if hasattr(api_key, field):
            old_value = getattr(api_key, field)
            if old_value != value:
                changes[field] = {"old": old_value, "new": value}
                setattr(api_key, field, value)
    
    if changes:
        await db.commit()
        await db.refresh(api_key)
        
        # Log audit event
        await log_audit_event(
            db=db,
            api_key_id=api_key.id,
            event_type='updated',
            event_description=f"API key '{api_key.key_name}' updated",
            user=current_user,
            request=request,
            changes=changes
        )
    
    return APIKeyResponse.model_validate(api_key)


@router.post(
    "/api-keys/{key_id}/revoke",
    response_model=APIKeyResponse,
    summary="Revoke API key",
    description="Permanently revoke an API key (cannot be undone)"
)
async def revoke_api_key(
    key_id: int,
    revoke_data: APIKeyRevokeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke API key"""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    if api_key.status == 'revoked':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key is already revoked"
        )
    
    # Revoke the key
    api_key.status = 'revoked'
    api_key.revoked_at = datetime.utcnow()
    api_key.revoked_by_user_id = current_user.id
    api_key.revoke_reason = revoke_data.reason
    
    await db.commit()
    await db.refresh(api_key)
    
    # Log audit event
    await log_audit_event(
        db=db,
        api_key_id=api_key.id,
        event_type='revoked',
        event_description=f"API key '{api_key.key_name}' revoked. Reason: {revoke_data.reason}",
        user=current_user,
        request=request
    )
    
    return APIKeyResponse.model_validate(api_key)


@router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete API key",
    description="Permanently delete an API key and all associated data"
)
async def delete_api_key(
    key_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete API key"""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    key_name = api_key.key_name
    
    # Delete the key (cascade will delete usage stats and audit logs)
    await db.delete(api_key)
    await db.commit()
    
    return None  # 204 No Content


@router.get(
    "/api-keys/{key_id}/audit-log",
    summary="Get API key audit log",
    description="Get the complete audit trail for an API key"
)
async def get_api_key_audit_log(
    key_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get audit log for API key"""
    # Check if key exists
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Get audit logs
    result = await db.execute(
        select(APIKeyAuditLog)
        .where(APIKeyAuditLog.api_key_id == key_id)
        .order_by(desc(APIKeyAuditLog.created_at))
        .offset(skip)
        .limit(limit)
    )
    audit_logs = result.scalars().all()
    
    return [log.to_dict() for log in audit_logs]


@router.get(
    "/api-keys/stats/summary",
    summary="Get API keys statistics summary",
    description="Get aggregated statistics across all API keys"
)
async def get_api_keys_stats_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get API keys statistics summary"""
    
    # Total keys by status
    result = await db.execute(
        select(
            APIKey.status,
            func.count(APIKey.id).label('count')
        ).group_by(APIKey.status)
    )
    status_counts = {row.status: row.count for row in result.all()}
    
    # Total requests
    result = await db.execute(
        select(func.sum(APIKey.total_requests_count))
    )
    total_requests = result.scalar() or 0
    
    # Active keys usage
    result = await db.execute(
        select(APIKey).where(APIKey.status == 'active').order_by(desc(APIKey.total_requests_count)).limit(5)
    )
    top_keys = result.scalars().all()
    
    return {
        "total_keys": sum(status_counts.values()),
        "status_counts": status_counts,
        "total_requests": total_requests,
        "top_active_keys": [
            {
                "id": key.id,
                "key_name": key.key_name,
                "total_requests": key.total_requests_count,
                "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None
            }
            for key in top_keys
        ]
    }

