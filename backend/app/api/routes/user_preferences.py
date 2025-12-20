"""
User Preferences API Routes
===========================
API endpoints for managing user DataGrid preferences and search history.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.user_preferences import UserDataGridPreference, UserSearchHistory
from app.core.security import get_current_user


router = APIRouter(tags=["User Preferences"])


# ================================================
# Pydantic Models
# ================================================

class PreferencesData(BaseModel):
    """DataGrid preferences structure"""
    filters: Optional[dict] = {}
    sort: Optional[dict] = {"columnId": None, "direction": None}
    columnWidths: Optional[dict] = {}


class PreferencesResponse(BaseModel):
    """Response for preferences"""
    datagrid_key: str
    preferences: PreferencesData
    updated_at: datetime


class SearchHistoryData(BaseModel):
    """Search history data structure"""
    filters: dict
    description: Optional[str] = None


class SearchHistoryCreate(BaseModel):
    """Create search history entry"""
    search_data: SearchHistoryData


class SearchHistoryResponse(BaseModel):
    """Response for search history"""
    id: int
    datagrid_key: str
    search_data: SearchHistoryData
    created_at: datetime


# ================================================
# DataGrid Preferences Endpoints
# ================================================

@router.get("/preferences/{datagrid_key}", response_model=Optional[PreferencesResponse])
async def get_user_preferences(
    datagrid_key: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user preferences for a specific DataGrid.

    Returns None if no preferences exist yet.
    """
    user_id = current_user.id

    result = await db.execute(
        select(UserDataGridPreference).filter(
            UserDataGridPreference.user_id == user_id,
            UserDataGridPreference.datagrid_key == datagrid_key
        )
    )
    pref = result.scalar_one_or_none()

    if not pref:
        return None

    # Convert JSONB to dict if needed (SQLAlchemy JSONB should already be dict, but ensure it)
    prefs_dict = pref.preferences
    if prefs_dict is None:
        prefs_dict = {}
    elif not isinstance(prefs_dict, dict):
        try:
            prefs_dict = dict(prefs_dict) if prefs_dict else {}
        except (TypeError, ValueError):
            prefs_dict = {}

    return {
        "datagrid_key": pref.datagrid_key,
        "preferences": prefs_dict,
        "updated_at": pref.updated_at
    }


@router.put("/preferences/{datagrid_key}")
async def save_user_preferences(
    datagrid_key: str,
    preferences: PreferencesData,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Save or update user preferences for a DataGrid.

    Creates new entry if doesn't exist, updates if exists.
    """
    user_id = current_user.id

    # Check if preferences exist
    result = await db.execute(
        select(UserDataGridPreference).filter(
            UserDataGridPreference.user_id == user_id,
            UserDataGridPreference.datagrid_key == datagrid_key
        )
    )
    pref = result.scalar_one_or_none()

    if pref:
        # Update existing
        pref.preferences = preferences.dict()
        pref.updated_at = datetime.utcnow()
    else:
        # Create new
        pref = UserDataGridPreference(
            user_id=user_id,
            datagrid_key=datagrid_key,
            preferences=preferences.dict()
        )
        db.add(pref)

    await db.commit()
    await db.refresh(pref)

    return {
        "message": "Preferences saved successfully",
        "datagrid_key": datagrid_key,
        "updated_at": pref.updated_at
    }


@router.delete("/preferences/{datagrid_key}")
async def delete_user_preferences(
    datagrid_key: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete user preferences for a DataGrid.
    """
    user_id = current_user.id

    result = await db.execute(
        select(UserDataGridPreference).filter(
            UserDataGridPreference.user_id == user_id,
            UserDataGridPreference.datagrid_key == datagrid_key
        )
    )
    pref = result.scalar_one_or_none()

    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not found"
        )

    await db.execute(
        delete(UserDataGridPreference).where(
            UserDataGridPreference.user_id == user_id,
            UserDataGridPreference.datagrid_key == datagrid_key,
        )
    )
    await db.commit()

    return {"message": "Preferences deleted successfully"}


# ================================================
# Search History Endpoints
# ================================================

@router.get("/search-history/{datagrid_key}", response_model=List[SearchHistoryResponse])
async def get_search_history(
    datagrid_key: str,
    limit: int = 100,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get search history for a DataGrid.

    Returns up to 'limit' most recent searches (default 100, max 100).
    """
    user_id = current_user.id
    limit = min(limit, 100)  # Cap at 100

    result = await db.execute(
        select(UserSearchHistory)
        .filter(
            UserSearchHistory.user_id == user_id,
            UserSearchHistory.datagrid_key == datagrid_key
        )
        .order_by(UserSearchHistory.created_at.desc())
        .limit(limit)
    )
    history = result.scalars().all()

    result_list = []
    for h in history:
        # Convert JSONB to dict if needed
        search_data = h.search_data
        if search_data is None:
            search_data = {}
        elif not isinstance(search_data, dict):
            try:
                search_data = dict(search_data) if search_data else {}
            except (TypeError, ValueError):
                search_data = {}
        
        result_list.append({
            "id": h.id,
            "datagrid_key": h.datagrid_key,
            "search_data": search_data,
            "created_at": h.created_at
        })
    
    return result_list


@router.post("/search-history/{datagrid_key}", status_code=status.HTTP_201_CREATED)
async def add_search_history(
    datagrid_key: str,
    data: SearchHistoryCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new search to history.

    Automatic cleanup keeps only last 100 entries (handled by DB trigger).
    """
    user_id = current_user.id

    history = UserSearchHistory(
        user_id=user_id,
        datagrid_key=datagrid_key,
        search_data=data.search_data.dict()
    )

    db.add(history)
    await db.commit()
    await db.refresh(history)

    return {
        "message": "Search saved to history",
        "id": history.id,
        "created_at": history.created_at
    }


@router.delete("/search-history/{history_id}")
async def delete_search_history(
    history_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific search history entry.

    Users can only delete their own entries.
    """
    user_id = current_user.id

    result = await db.execute(
        select(UserSearchHistory).filter(
            UserSearchHistory.id == history_id,
            UserSearchHistory.user_id == user_id
        )
    )
    history = result.scalar_one_or_none()

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search history not found or not authorized"
        )

    await db.execute(
        delete(UserSearchHistory).where(
            UserSearchHistory.id == history_id,
            UserSearchHistory.user_id == user_id,
        )
    )
    await db.commit()

    return {"message": "Search history deleted successfully"}

