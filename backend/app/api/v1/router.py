from fastapi import APIRouter
from app.api.routes import user_status, auth, token_settings, database_viewer, users, api_logs

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(user_status.router, tags=["user-status"])
api_router.include_router(token_settings.router, prefix="/token-settings", tags=["token-settings"])
api_router.include_router(database_viewer.router, prefix="/database", tags=["database-viewer"])
api_router.include_router(api_logs.router, tags=["api-logs"])








