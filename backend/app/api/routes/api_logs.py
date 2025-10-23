"""
API Logs Routes
Provides endpoints to view API logs from Backend and Frontend
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.api_logs import APILogBackend, APILogFrontend

router = APIRouter()


from pydantic import BaseModel
from typing import List

class FrontendLogEntry(BaseModel):
    """Frontend log entry schema"""
    method: str
    url: str
    endpoint: str
    request_body: Optional[str] = None
    request_headers: Optional[str] = None
    user_id: Optional[int] = None
    username: Optional[str] = None
    session_id: Optional[str] = None
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    response_headers: Optional[str] = None
    success: bool = False
    request_time: str
    response_time: str
    duration_ms: int
    error_message: Optional[str] = None
    browser_info: Optional[str] = None

class FrontendLogBatch(BaseModel):
    """Batch of frontend logs"""
    logs: List[FrontendLogEntry]


@router.get(
    "/logs/backend",
    summary="Get Backend API logs",
    description="Returns paginated Backend API request/response logs with filtering options.",
    response_description="List of Backend API logs"
)
async def get_backend_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    method: Optional[str] = Query(None, description="Filter by HTTP method (GET, POST, etc.)"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint path"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    status_code: Optional[int] = Query(None, description="Filter by response status code"),
    min_duration: Optional[int] = Query(None, description="Minimum duration in milliseconds"),
    hours: Optional[int] = Query(24, description="Get logs from last N hours"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get Backend API logs with filtering and pagination.
    
    Supports filtering by:
    - HTTP method
    - Endpoint path
    - User ID
    - Status code
    - Duration
    - Time range
    
    Requires authentication.
    """
    try:
        # Build base query
        query = select(APILogBackend)
        
        # Time filter
        if hours:
            time_threshold = datetime.utcnow() - timedelta(hours=hours)
            query = query.where(APILogBackend.request_time >= time_threshold)
        
        # Method filter
        if method:
            query = query.where(APILogBackend.method == method.upper())
        
        # Endpoint filter (partial match)
        if endpoint:
            query = query.where(APILogBackend.endpoint.ilike(f"%{endpoint}%"))
        
        # User filter
        if user_id:
            query = query.where(APILogBackend.user_id == user_id)
        
        # Status code filter
        if status_code:
            query = query.where(APILogBackend.status_code == status_code)
        
        # Duration filter
        if min_duration:
            query = query.where(APILogBackend.duration_ms >= min_duration)
        
        # Get total count
        count_query = select(func.count()).select_from(APILogBackend)
        if hours:
            count_query = count_query.where(APILogBackend.request_time >= time_threshold)
        if method:
            count_query = count_query.where(APILogBackend.method == method.upper())
        if endpoint:
            count_query = count_query.where(APILogBackend.endpoint.ilike(f"%{endpoint}%"))
        if user_id:
            count_query = count_query.where(APILogBackend.user_id == user_id)
        if status_code:
            count_query = count_query.where(APILogBackend.status_code == status_code)
        if min_duration:
            count_query = count_query.where(APILogBackend.duration_ms >= min_duration)
        
        result = await db.execute(count_query)
        total = result.scalar()
        
        # Add pagination and ordering (newest first)
        query = query.order_by(desc(APILogBackend.created_at)).offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        logs = result.scalars().all()
        
        # Convert to dict
        logs_data = []
        for log in logs:
            logs_data.append({
                "id": log.id,
                "method": log.method,
                "endpoint": log.endpoint,
                "path": log.path,
                "query_params": log.query_params,
                "request_body": log.request_body[:500] if log.request_body else None,  # Limit body size
                "user_id": log.user_id,
                "username": log.username,
                "user_ip": log.user_ip,
                "user_agent": log.user_agent,
                "status_code": log.status_code,
                "response_body": log.response_body[:500] if log.response_body else None,  # Limit body size
                "request_time": log.request_time.isoformat() if log.request_time else None,
                "response_time": log.response_time.isoformat() if log.response_time else None,
                "duration_ms": log.duration_ms,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            })
        
        return {
            "success": True,
            "logs": logs_data,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(logs_data)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch backend logs: {str(e)}")


@router.get(
    "/logs/frontend",
    summary="Get Frontend API logs",
    description="Returns paginated Frontend API call logs with filtering options.",
    response_description="List of Frontend API logs"
)
async def get_frontend_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    method: Optional[str] = Query(None, description="Filter by HTTP method"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    hours: Optional[int] = Query(24, description="Get logs from last N hours"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get Frontend API logs with filtering and pagination.
    
    Supports filtering by:
    - HTTP method
    - Endpoint
    - User ID
    - Success status
    - Time range
    
    Requires authentication.
    """
    try:
        # Build base query
        query = select(APILogFrontend)
        
        # Time filter
        if hours:
            time_threshold = datetime.utcnow() - timedelta(hours=hours)
            query = query.where(APILogFrontend.request_time >= time_threshold)
        
        # Method filter
        if method:
            query = query.where(APILogFrontend.method == method.upper())
        
        # Endpoint filter
        if endpoint:
            query = query.where(APILogFrontend.endpoint.ilike(f"%{endpoint}%"))
        
        # User filter
        if user_id:
            query = query.where(APILogFrontend.user_id == user_id)
        
        # Success filter
        if success is not None:
            query = query.where(APILogFrontend.success == success)
        
        # Get total count
        count_query = select(func.count()).select_from(APILogFrontend)
        if hours:
            count_query = count_query.where(APILogFrontend.request_time >= time_threshold)
        if method:
            count_query = count_query.where(APILogFrontend.method == method.upper())
        if endpoint:
            count_query = count_query.where(APILogFrontend.endpoint.ilike(f"%{endpoint}%"))
        if user_id:
            count_query = count_query.where(APILogFrontend.user_id == user_id)
        if success is not None:
            count_query = count_query.where(APILogFrontend.success == success)
        
        result = await db.execute(count_query)
        total = result.scalar()
        
        # Add pagination and ordering
        query = query.order_by(desc(APILogFrontend.created_at)).offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        logs = result.scalars().all()
        
        # Convert to dict
        logs_data = []
        for log in logs:
            logs_data.append({
                "id": log.id,
                "method": log.method,
                "url": log.url,
                "endpoint": log.endpoint,
                "request_body": log.request_body[:500] if log.request_body else None,
                "user_id": log.user_id,
                "username": log.username,
                "session_id": log.session_id,
                "status_code": log.status_code,
                "response_body": log.response_body[:500] if log.response_body else None,
                "success": log.success,
                "request_time": log.request_time.isoformat() if log.request_time else None,
                "response_time": log.response_time.isoformat() if log.response_time else None,
                "duration_ms": log.duration_ms,
                "error_message": log.error_message,
                "browser_info": log.browser_info,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            })
        
        return {
            "success": True,
            "logs": logs_data,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(logs_data)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch frontend logs: {str(e)}")


@router.post(
    "/logs/frontend/batch",
    summary="Save batch of Frontend logs",
    description="Receives and saves a batch of Frontend API logs.",
    response_description="Success status"
)
async def save_frontend_logs_batch(
    batch: FrontendLogBatch,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Save a batch of Frontend API logs.
    
    Accepts multiple log entries and saves them efficiently.
    
    Authentication not required (logs may be sent before login).
    """
    try:
        saved_count = 0
        
        for log_entry in batch.logs:
            # Parse timestamps
            try:
                request_time = datetime.fromisoformat(log_entry.request_time.replace('Z', '+00:00'))
                response_time = datetime.fromisoformat(log_entry.response_time.replace('Z', '+00:00'))
            except:
                request_time = datetime.utcnow()
                response_time = datetime.utcnow()
            
            # Create log record
            log_record = APILogFrontend(
                method=log_entry.method,
                url=log_entry.url,
                endpoint=log_entry.endpoint,
                request_body=log_entry.request_body,
                request_headers=log_entry.request_headers,
                user_id=log_entry.user_id,
                username=log_entry.username,
                session_id=log_entry.session_id,
                status_code=log_entry.status_code,
                response_body=log_entry.response_body,
                response_headers=log_entry.response_headers,
                success=log_entry.success,
                request_time=request_time,
                response_time=response_time,
                duration_ms=log_entry.duration_ms,
                error_message=log_entry.error_message,
                browser_info=log_entry.browser_info
            )
            
            db.add(log_record)
            saved_count += 1
        
        await db.commit()
        
        return {
            "success": True,
            "saved": saved_count,
            "message": f"Successfully saved {saved_count} log entries"
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save frontend logs: {str(e)}")


@router.get(
    "/logs/stats",
    summary="Get API logs statistics",
    description="Returns summary statistics about API usage.",
    response_description="API usage statistics"
)
async def get_logs_stats(
    hours: int = Query(24, description="Get stats from last N hours"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get API logs statistics.
    
    Returns counts by method, status code, and time range.
    
    Requires authentication.
    """
    try:
        time_threshold = datetime.utcnow() - timedelta(hours=hours)
        
        # Backend stats
        backend_total = await db.execute(
            select(func.count()).select_from(APILogBackend).where(APILogBackend.request_time >= time_threshold)
        )
        backend_count = backend_total.scalar()
        
        backend_errors = await db.execute(
            select(func.count()).select_from(APILogBackend).where(
                APILogBackend.request_time >= time_threshold,
                APILogBackend.status_code >= 400
            )
        )
        backend_error_count = backend_errors.scalar()
        
        # Frontend stats
        frontend_total = await db.execute(
            select(func.count()).select_from(APILogFrontend).where(APILogFrontend.request_time >= time_threshold)
        )
        frontend_count = frontend_total.scalar()
        
        frontend_failures = await db.execute(
            select(func.count()).select_from(APILogFrontend).where(
                APILogFrontend.request_time >= time_threshold,
                APILogFrontend.success == False
            )
        )
        frontend_failure_count = frontend_failures.scalar()
        
        return {
            "success": True,
            "hours": hours,
            "stats": {
                "backend": {
                    "total_requests": backend_count,
                    "errors": backend_error_count,
                    "success_rate": round((1 - (backend_error_count / backend_count if backend_count > 0 else 0)) * 100, 2)
                },
                "frontend": {
                    "total_requests": frontend_count,
                    "failures": frontend_failure_count,
                    "success_rate": round((1 - (frontend_failure_count / frontend_count if frontend_count > 0 else 0)) * 100, 2)
                },
                "total_requests": backend_count + frontend_count
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

