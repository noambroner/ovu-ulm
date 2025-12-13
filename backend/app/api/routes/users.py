"""
Users API Routes
Provides endpoints to manage and view users
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.user import User

router = APIRouter()


# Pydantic Models
class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    role: str = Field(default='user', description="User role (user/admin)")


@router.post(
    "/users",
    summary="Create new user",
    description="""
    Create a new user in the system.
    
    **Process:**
    - Validates username and email uniqueness
    - Hashes the password securely
    - Creates user with specified role
    - Returns created user details
    
    **Required Fields:**
    - username (min 3 chars)
    - email (valid email format)
    - password (min 6 chars)
    
    **Optional Fields:**
    - phone
    - role (default: 'user')
    
    **Security:**
    - Password is hashed before storage
    - Requires admin authentication
    - Created user is set to active status
    """,
    response_description="User created successfully"
)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new user.
    
    Requires admin authentication.
    """
    try:
        # Check if username already exists
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Username '{user_data.username}' already exists")
        
        # Check if email already exists
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Email '{user_data.email}' already exists")
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            phone=user_data.phone,
            role=user_data.role,
            status='active',
            is_verified=False,
            created_by_id=current_user.get('id') if isinstance(current_user, dict) else current_user.id
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return {
            "success": True,
            "message": f"User '{new_user.username}' created successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "phone": new_user.phone,
                "role": new_user.role,
                "status": new_user.status,
                "is_verified": new_user.is_verified,
                "created_at": new_user.created_at.isoformat() if new_user.created_at else None
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


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
    "/users/active",
    summary="List currently active users",
    description="Returns users whose status is active/scheduled and have not left the current session.",
    response_model=None,
)
async def list_active_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get all currently active/connected users.
    """
    try:
        stmt = select(
            User.id,
            User.username,
            User.first_name,
            User.last_name,
            User.current_joined_at,
            User.status,
        ).where(
            User.status.in_(["active", "scheduled_deactivation"]),
            User.current_left_at.is_(None)
        ).order_by(User.current_joined_at.desc())

        result = await db.execute(stmt)
        rows = result.fetchall()

        return {
            "success": True,
            "active_users": [
                {
                    "id": row.id,
                    "username": row.username,
                    "first_name": row.first_name,
                    "last_name": row.last_name,
                    "last_connected_at": row.current_joined_at.isoformat() if row.current_joined_at else None,
                    "status": row.status,
                }
                for row in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch active users: {str(e)}")


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

