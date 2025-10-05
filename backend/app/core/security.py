from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get current user from JWT token
    TODO: Implement proper JWT validation
    """
    # For now, just return a mock user
    # In production, decode and validate JWT token
    return {"id": 1, "username": "admin"}
