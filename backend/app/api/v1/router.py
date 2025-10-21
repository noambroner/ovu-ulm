from fastapi import APIRouter
from app.api.routes import user_status

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(user_status.router, tags=["user-status"])

# You can add more routers here as needed
# Example:
# api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
# api_router.include_router(users.router, prefix="/users", tags=["users"])








