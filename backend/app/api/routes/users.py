"""
Users API Routes
Provides endpoints to manage and view users
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/users",
    summary="Get list of all users",
    description="Returns a list of all users in the system with their details.",
    response_description="List of users with pagination info"
)
async def get_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    search: Optional[str] = Query(None, description="Search term to filter users"),
    status: Optional[str] = Query(None, description="Filter by status: active, inactive, scheduled_deactivation"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get all users with optional filtering and pagination.
    
    Supports:
    - Pagination (skip/limit)
    - Search by username, email, first_name, last_name
    - Filter by status
    
    Requires authentication.
    """
    try:
        # Build base query
        query = select(User)
        
        # Add search filter
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (User.username.ilike(search_filter)) |
                (User.email.ilike(search_filter)) |
                (User.first_name.ilike(search_filter)) |
                (User.last_name.ilike(search_filter))
            )
        
        # Add status filter
        if status:
            query = query.where(User.status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(User)
        if search:
            search_filter = f"%{search}%"
            count_query = count_query.where(
                (User.username.ilike(search_filter)) |
                (User.email.ilike(search_filter)) |
                (User.first_name.ilike(search_filter)) |
                (User.last_name.ilike(search_filter))
            )
        if status:
            count_query = count_query.where(User.status == status)
        
        result = await db.execute(count_query)
        total = result.scalar()
        
        # Add pagination and ordering
        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        users = result.scalars().all()
        
        # Convert to dict
        users_data = []
        for user in users:
            user_dict = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "role": user.role,
                "preferred_language": user.preferred_language,
                "is_verified": user.is_verified,
                "status": user.status,
                "current_joined_at": user.current_joined_at.isoformat() if user.current_joined_at else None,
                "current_left_at": user.current_left_at.isoformat() if user.current_left_at else None,
                "scheduled_deactivation_at": user.scheduled_deactivation_at.isoformat() if user.scheduled_deactivation_at else None,
                "scheduled_deactivation_reason": user.scheduled_deactivation_reason,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "has_scheduled_deactivation": user.has_scheduled_deactivation,
            }
            users_data.append(user_dict)
        
        return {
            "success": True,
            "users": users_data,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(users_data)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")


@router.get(
    "/users/{user_id}",
    summary="Get user by ID",
    description="Returns detailed information about a specific user.",
    response_description="User details"
)
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a specific user by ID.
    
    Requires authentication.
    """
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "role": user.role,
                "preferred_language": user.preferred_language,
                "is_verified": user.is_verified,
                "status": user.status,
                "current_joined_at": user.current_joined_at.isoformat() if user.current_joined_at else None,
                "current_left_at": user.current_left_at.isoformat() if user.current_left_at else None,
                "scheduled_deactivation_at": user.scheduled_deactivation_at.isoformat() if user.scheduled_deactivation_at else None,
                "scheduled_deactivation_reason": user.scheduled_deactivation_reason,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "has_scheduled_deactivation": user.has_scheduled_deactivation,
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")


@router.get(
    "/users/stats/summary",
    summary="Get users statistics",
    description="Returns summary statistics about users in the system.",
    response_description="User statistics"
)
async def get_users_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get summary statistics about users.
    
    Returns counts by status, role, and verification status.
    
    Requires authentication.
    """
    try:
        # Total users
        total_result = await db.execute(select(func.count()).select_from(User))
        total_users = total_result.scalar()
        
        # Active users
        active_result = await db.execute(
            select(func.count()).select_from(User).where(User.status == 'active')
        )
        active_users = active_result.scalar()
        
        # Inactive users
        inactive_result = await db.execute(
            select(func.count()).select_from(User).where(User.status == 'inactive')
        )
        inactive_users = inactive_result.scalar()
        
        # Scheduled deactivation
        scheduled_result = await db.execute(
            select(func.count()).select_from(User).where(User.status == 'scheduled_deactivation')
        )
        scheduled_users = scheduled_result.scalar()
        
        # Verified users
        verified_result = await db.execute(
            select(func.count()).select_from(User).where(User.is_verified == True)
        )
        verified_users = verified_result.scalar()
        
        return {
            "success": True,
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": inactive_users,
                "scheduled_deactivation_users": scheduled_users,
                "verified_users": verified_users,
                "unverified_users": total_users - verified_users,
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

