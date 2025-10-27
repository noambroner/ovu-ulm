"""
Authentication Context Middleware
Extracts user information from JWT token and stores it in request.state for logging
"""
import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import SECRET_KEY, ALGORITHM, get_db_pool


class AuthContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts user info from JWT and stores in request.state
    This allows the APILoggerMiddleware to access user information
    """
    
    async def dispatch(self, request: Request, call_next):
        # Initialize user as None
        request.state.user = None
        
        # Try to extract JWT token from Authorization header
        auth_header = request.headers.get("authorization")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            
            try:
                # Decode JWT token
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("sub")
                
                if user_id:
                    # Fetch user from database
                    pool = await get_db_pool()
                    async with pool.acquire() as conn:
                        user = await conn.fetchrow(
                            """
                            SELECT id, username, email, role, status
                            FROM users 
                            WHERE id = $1 AND is_active = true
                            """,
                            int(user_id)
                        )
                    
                    if user:
                        # Create a simple user object and store in request.state
                        class UserContext:
                            def __init__(self, user_data):
                                self.id = user_data['id']
                                self.username = user_data['username']
                                self.email = user_data['email']
                                self.role = user_data['role']
                                self.status = user_data['status']
                        
                        request.state.user = UserContext(user)
            
            except (jwt.PyJWTError, ValueError, KeyError, Exception):
                # If token is invalid or any error occurs, just continue without user
                # The endpoint will handle authentication if needed
                pass
        
        # Continue processing request
        response = await call_next(request)
        return response


