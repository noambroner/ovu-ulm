"""
Development Journal Routes
API endpoints for managing development sessions, steps, and system state
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.dev_journal import DevelopmentSession, DevelopmentStep, SystemState

router = APIRouter()


# Pydantic Schemas
class SessionCreate(BaseModel):
    title: str
    summary: Optional[str] = None
    instructions_for_next: Optional[str] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    end_time: Optional[datetime] = None
    instructions_for_next: Optional[str] = None

class StepCreate(BaseModel):
    session_id: int
    step_number: int
    user_prompt: str
    ai_understanding: Optional[str] = None
    ai_actions: Optional[str] = None
    result: Optional[str] = None

class SystemStateCreate(BaseModel):
    session_id: int
    state_at_start: str
    state_at_end: Optional[str] = None
    changes_summary: Optional[str] = None

class SystemStateUpdate(BaseModel):
    state_at_end: Optional[str] = None
    changes_summary: Optional[str] = None


# Sessions Endpoints
@router.get(
    "/sessions",
    summary="Get all development sessions",
    description="Returns list of all development sessions with pagination"
)
async def get_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get all development sessions"""
    try:
        # Get total count
        count_result = await db.execute(select(func.count()).select_from(DevelopmentSession))
        total = count_result.scalar()
        
        # Get sessions (newest first)
        result = await db.execute(
            select(DevelopmentSession)
            .order_by(desc(DevelopmentSession.start_time))
            .offset(skip)
            .limit(limit)
        )
        sessions = result.scalars().all()
        
        # Convert to dict
        sessions_data = []
        for session in sessions:
            # Calculate duration
            duration = None
            if session.end_time and session.start_time:
                duration = int((session.end_time - session.start_time).total_seconds() / 60)  # minutes
            
            sessions_data.append({
                "id": session.id,
                "title": session.title,
                "summary": session.summary,
                "start_time": session.start_time.isoformat() if session.start_time else None,
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "duration_minutes": duration,
                "instructions_for_next": session.instructions_for_next,
                "created_at": session.created_at.isoformat() if session.created_at else None
            })
        
        return {
            "success": True,
            "sessions": sessions_data,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(sessions_data)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")


@router.get(
    "/sessions/{session_id}",
    summary="Get specific session details"
)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get details of a specific session"""
    try:
        result = await db.execute(
            select(DevelopmentSession).where(DevelopmentSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Calculate duration
        duration = None
        if session.end_time and session.start_time:
            duration = int((session.end_time - session.start_time).total_seconds() / 60)
        
        return {
            "success": True,
            "session": {
                "id": session.id,
                "title": session.title,
                "summary": session.summary,
                "start_time": session.start_time.isoformat() if session.start_time else None,
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "duration_minutes": duration,
                "instructions_for_next": session.instructions_for_next,
                "created_at": session.created_at.isoformat() if session.created_at else None
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session: {str(e)}")


@router.post(
    "/sessions",
    summary="Create new development session"
)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create a new development session"""
    try:
        new_session = DevelopmentSession(
            title=session_data.title,
            summary=session_data.summary,
            instructions_for_next=session_data.instructions_for_next
        )
        
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        
        return {
            "success": True,
            "session_id": new_session.id,
            "message": f"Session created successfully with ID: {new_session.id}"
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.put(
    "/sessions/{session_id}",
    summary="Update development session"
)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Update an existing session"""
    try:
        result = await db.execute(
            select(DevelopmentSession).where(DevelopmentSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update fields
        if session_data.title is not None:
            session.title = session_data.title
        if session_data.summary is not None:
            session.summary = session_data.summary
        if session_data.end_time is not None:
            session.end_time = session_data.end_time
        if session_data.instructions_for_next is not None:
            session.instructions_for_next = session_data.instructions_for_next
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Session {session_id} updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")


# Steps Endpoints
@router.get(
    "/sessions/{session_id}/steps",
    summary="Get all steps for a session"
)
async def get_session_steps(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get all steps for a specific session"""
    try:
        result = await db.execute(
            select(DevelopmentStep)
            .where(DevelopmentStep.session_id == session_id)
            .order_by(DevelopmentStep.step_number)
        )
        steps = result.scalars().all()
        
        steps_data = []
        for step in steps:
            steps_data.append({
                "id": step.id,
                "step_number": step.step_number,
                "user_prompt": step.user_prompt,
                "ai_understanding": step.ai_understanding,
                "ai_actions": step.ai_actions,
                "result": step.result,
                "created_at": step.created_at.isoformat() if step.created_at else None
            })
        
        return {
            "success": True,
            "session_id": session_id,
            "steps": steps_data,
            "total_steps": len(steps_data)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch steps: {str(e)}")


@router.post(
    "/steps",
    summary="Add new step to session"
)
async def create_step(
    step_data: StepCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Add a new step to a session"""
    try:
        new_step = DevelopmentStep(
            session_id=step_data.session_id,
            step_number=step_data.step_number,
            user_prompt=step_data.user_prompt,
            ai_understanding=step_data.ai_understanding,
            ai_actions=step_data.ai_actions,
            result=step_data.result
        )
        
        db.add(new_step)
        await db.commit()
        await db.refresh(new_step)
        
        return {
            "success": True,
            "step_id": new_step.id,
            "message": f"Step {step_data.step_number} added to session {step_data.session_id}"
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create step: {str(e)}")


# System State Endpoints
@router.get(
    "/sessions/{session_id}/state",
    summary="Get system state for session"
)
async def get_system_state(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get system state for a specific session"""
    try:
        result = await db.execute(
            select(SystemState).where(SystemState.session_id == session_id)
        )
        state = result.scalar_one_or_none()
        
        if not state:
            return {
                "success": True,
                "session_id": session_id,
                "state": None,
                "message": "No system state recorded for this session"
            }
        
        return {
            "success": True,
            "session_id": session_id,
            "state": {
                "id": state.id,
                "state_at_start": state.state_at_start,
                "state_at_end": state.state_at_end,
                "changes_summary": state.changes_summary,
                "created_at": state.created_at.isoformat() if state.created_at else None,
                "updated_at": state.updated_at.isoformat() if state.updated_at else None
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system state: {str(e)}")


@router.post(
    "/state",
    summary="Create system state for session"
)
async def create_system_state(
    state_data: SystemStateCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create system state for a session"""
    try:
        new_state = SystemState(
            session_id=state_data.session_id,
            state_at_start=state_data.state_at_start,
            state_at_end=state_data.state_at_end,
            changes_summary=state_data.changes_summary
        )
        
        db.add(new_state)
        await db.commit()
        await db.refresh(new_state)
        
        return {
            "success": True,
            "state_id": new_state.id,
            "message": f"System state created for session {state_data.session_id}"
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create system state: {str(e)}")


@router.put(
    "/sessions/{session_id}/state",
    summary="Update system state for session"
)
async def update_system_state(
    session_id: int,
    state_data: SystemStateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Update system state for a session"""
    try:
        result = await db.execute(
            select(SystemState).where(SystemState.session_id == session_id)
        )
        state = result.scalar_one_or_none()
        
        if not state:
            raise HTTPException(status_code=404, detail="System state not found")
        
        # Update fields
        if state_data.state_at_end is not None:
            state.state_at_end = state_data.state_at_end
        if state_data.changes_summary is not None:
            state.changes_summary = state_data.changes_summary
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"System state updated for session {session_id}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update system state: {str(e)}")


# AI Helper Endpoints
@router.get(
    "/ai/latest-session",
    summary="Get latest session with instructions for next session (for AI)",
    description="Returns the most recent session with instructions_for_next field. Used by AI to know what to do in the new session."
)
async def get_latest_session_for_ai(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get latest session for AI to read instructions"""
    try:
        result = await db.execute(
            select(DevelopmentSession)
            .order_by(desc(DevelopmentSession.id))
            .limit(1)
        )
        latest_session = result.scalar_one_or_none()
        
        if not latest_session:
            return {
                "success": True,
                "has_previous_session": False,
                "message": "No previous sessions found. This is the first session.",
                "next_session_number": 1
            }
        
        # Calculate duration
        duration = None
        if latest_session.end_time and latest_session.start_time:
            duration = int((latest_session.end_time - latest_session.start_time).total_seconds() / 60)
        
        return {
            "success": True,
            "has_previous_session": True,
            "latest_session": {
                "id": latest_session.id,
                "title": latest_session.title,
                "summary": latest_session.summary,
                "start_time": latest_session.start_time.isoformat() if latest_session.start_time else None,
                "end_time": latest_session.end_time.isoformat() if latest_session.end_time else None,
                "duration_minutes": duration,
                "instructions_for_next": latest_session.instructions_for_next
            },
            "next_session_number": latest_session.id + 1,
            "message": f"Latest session: #{latest_session.id}. Next session will be #{latest_session.id + 1}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch latest session: {str(e)}")


@router.get(
    "/ai/sessions-summary",
    summary="Get summary of all sessions (for AI context)",
    description="Returns a brief summary of all development sessions. Useful for AI to understand project history."
)
async def get_sessions_summary_for_ai(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get summary of all sessions for AI"""
    try:
        # Get total count
        count_result = await db.execute(select(func.count()).select_from(DevelopmentSession))
        total = count_result.scalar()
        
        # Get recent sessions
        result = await db.execute(
            select(DevelopmentSession)
            .order_by(desc(DevelopmentSession.id))
            .limit(limit)
        )
        sessions = result.scalars().all()
        
        sessions_summary = []
        for session in sessions:
            duration = None
            if session.end_time and session.start_time:
                duration = int((session.end_time - session.start_time).total_seconds() / 60)
            
            sessions_summary.append({
                "id": session.id,
                "title": session.title,
                "summary": session.summary[:200] + "..." if session.summary and len(session.summary) > 200 else session.summary,
                "duration_minutes": duration,
                "start_time": session.start_time.isoformat() if session.start_time else None
            })
        
        return {
            "success": True,
            "total_sessions": total,
            "sessions_returned": len(sessions_summary),
            "sessions": sessions_summary
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions summary: {str(e)}")


@router.get(
    "/ai/project-context",
    summary="Get complete project context (for AI session start)",
    description="Returns comprehensive project information: architecture, tech stack, coding standards, latest session, and next steps."
)
async def get_project_context_for_ai(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get complete project context for AI to start a new session"""
    try:
        # Get latest session
        result = await db.execute(
            select(DevelopmentSession)
            .order_by(desc(DevelopmentSession.id))
            .limit(1)
        )
        latest_session = result.scalar_one_or_none()
        
        next_session_number = 1
        instructions = "This is the first session. Set up the development environment and review project structure."
        
        if latest_session:
            next_session_number = latest_session.id + 1
            instructions = latest_session.instructions_for_next or "Continue development. Check latest changes and plan next features."
        
        # Project context
        context = {
            "success": True,
            "current_session_number": next_session_number,
            "project_info": {
                "name": "ULM - User Login Manager",
                "description": "Multi-language user management system with JWT authentication, token control, and comprehensive logging",
                "version": "1.0.0",
                "languages": ["Hebrew (primary)", "English", "Arabic"],
                "rtl_support": True
            },
            "architecture": {
                "servers": [
                    {
                        "name": "Frontend Server",
                        "ip": "64.176.173.105",
                        "tech": "Nginx + React/Flutter Apps",
                        "port": 80
                    },
                    {
                        "name": "Backend Server",
                        "ip": "64.176.171.223",
                        "tech": "FastAPI (Python)",
                        "port": 8001
                    },
                    {
                        "name": "Database Server",
                        "ip": "64.177.67.215",
                        "tech": "PostgreSQL 17 + Redis",
                        "port": 5432
                    }
                ]
            },
            "tech_stack": {
                "backend": {
                    "framework": "FastAPI",
                    "language": "Python 3.11+",
                    "orm": "SQLAlchemy (async)",
                    "auth": "JWT (python-jose)",
                    "patterns": ["async/await", "dependency injection", "middleware"]
                },
                "frontend": {
                    "framework": "React 18",
                    "language": "TypeScript",
                    "routing": "React Router v6",
                    "http": "Axios",
                    "styling": "CSS Modules + RTL support"
                },
                "database": {
                    "primary": "PostgreSQL 17",
                    "cache": "Redis",
                    "tables": 13,
                    "orm": "SQLAlchemy async"
                }
            },
            "coding_standards": {
                "backend": {
                    "style": "PEP 8",
                    "naming": "snake_case for functions, PascalCase for classes",
                    "async": "Always use async/await for DB operations",
                    "docs": "Type hints + docstrings required",
                    "error_handling": "Use HTTPException with proper status codes"
                },
                "frontend": {
                    "style": "ESLint + Prettier",
                    "naming": "camelCase for functions, PascalCase for components",
                    "components": "Functional components with hooks",
                    "docs": "JSDoc for complex functions",
                    "rtl": "All components must support RTL/LTR"
                }
            },
            "current_features": [
                "JWT Authentication (login, refresh, logout)",
                "User Management (CRUD, status control, scheduling)",
                "Token Settings (per-user expiration control)",
                "API Logging (Backend + Frontend with middleware)",
                "Database Viewer (dynamic table viewing)",
                "Application Map (interactive architecture visualization)",
                "Development Journal (session tracking with steps)"
            ],
            "database_tables": [
                "users", "roles", "refresh_tokens", "password_resets",
                "token_settings", "scheduled_user_actions", "sessions",
                "api_logs_backend", "api_logs_frontend",
                "development_sessions", "development_steps", "system_states"
            ],
            "latest_session": {
                "id": latest_session.id if latest_session else None,
                "title": latest_session.title if latest_session else None,
                "duration_minutes": int((latest_session.end_time - latest_session.start_time).total_seconds() / 60) if latest_session and latest_session.end_time else None,
                "summary": latest_session.summary[:300] + "..." if latest_session and latest_session.summary and len(latest_session.summary) > 300 else (latest_session.summary if latest_session else None)
            } if latest_session else None,
            "next_steps": {
                "session_number": next_session_number,
                "instructions": instructions,
                "reminder": "Document all steps in dev journal at end of session"
            },
            "deployment": {
                "method": "Manual SCP + SSH",
                "frontend": "Build with 'npm run build', upload dist/* to frontend server",
                "backend": "Upload .py files, restart uvicorn",
                "git": "Always commit and push to GitHub after deployment"
            }
        }
        
        return context
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project context: {str(e)}")


@router.post(
    "/ai/create-session",
    summary="Create session for AI (no authentication required)",
    description="Creates a new development session. This endpoint is specifically for AI agents to document their work without needing authentication."
)
async def create_session_for_ai(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new development session for AI without authentication"""
    try:
        new_session = DevelopmentSession(
            title=session_data.title,
            summary=session_data.summary,
            instructions_for_next=session_data.instructions_for_next
        )
        
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        
        return {
            "success": True,
            "session_id": new_session.id,
            "message": f"Session #{new_session.id} created successfully",
            "session": {
                "id": new_session.id,
                "title": new_session.title,
                "summary": new_session.summary,
                "start_time": new_session.start_time.isoformat() if new_session.start_time else None,
                "instructions_for_next": new_session.instructions_for_next
            }
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

