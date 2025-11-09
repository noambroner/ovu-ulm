"""
Main FastAPI application for ULM service
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import time as time_module
import time as time_module

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1.router import api_router
from app.middleware.localization_middleware import LocalizationMiddleware
from app.middleware.api_logger import APILoggerMiddleware
from app.middleware.auth_context import AuthContextMiddleware
from app.middleware.api_key_auth import APIKeyAuthMiddleware
from app.core.scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for the application
    """
    # Startup
    logger.info(f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
    logger.info("Multi-language support enabled: Hebrew, English, Arabic")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Initialize User Status Scheduler
    start_scheduler()
    logger.info("User status scheduler initialized")
    
    # Initialize Redis connection
    # TODO: Initialize Redis
    
    # Initialize Celery
    # TODO: Initialize Celery
    
    yield
    
    # Shutdown
    logger.info("Shutting down ULM service")
    
    # Shutdown scheduler
    shutdown_scheduler()
    logger.info("Scheduler shut down")
    
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI app
app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Add state to app for rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add Localization Middleware
app.add_middleware(LocalizationMiddleware)

# Add API Logger Middleware (logs all API requests/responses to database)
# Uses BackgroundTask to log AFTER response is sent (non-blocking)
app.add_middleware(APILoggerMiddleware)

# Add API Key Authentication Middleware (validates API keys for integration requests)
# MUST run BEFORE AuthContext to set request.state.app_source
app.add_middleware(APIKeyAuthMiddleware)

# Add Authentication Context Middleware (extracts user from JWT for logging)
# MUST run BEFORE APILogger to populate request.state.user
# Note: Middlewares are executed in reverse order of addition
app.add_middleware(AuthContextMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"]
)

# Add request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request"""
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time_module.time()
    response = await call_next(request)
    process_time = time_module.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log request
    logger.info(
        f"Request ID: {request_id} | "
        f"Path: {request.url.path} | "
        f"Method: {request.method} | "
        f"Process Time: {process_time:.3f}s"
    )
    
    return response

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to responses"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# Cache control middleware - Force no cache for all API responses
@app.middleware("http")
async def add_cache_control_headers(request: Request, call_next):
    """Add cache-control headers to prevent browser caching"""
    response = await call_next(request)
    
    # Force no cache for all API responses
    # This ensures browsers always fetch fresh data
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # Add ETag header with timestamp for cache busting
    import time as time_module
import time as time_module
    response.headers["ETag"] = f'"{int(time_module.time())}"'
    
    return response

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root endpoint
@app.get(
    "/",
    tags=["Root"],
    summary="Root Endpoint",
    description="""
    Root endpoint providing service information and API documentation links.
    
    **Returns:**
    - Service name and version
    - Operational status
    - Link to API documentation
    
    **Use Cases:**
    - Verify service is accessible
    - Get API documentation URL
    - Check service version
    """,
    responses={
        200: {
            "description": "Service information",
            "content": {
                "application/json": {
                    "example": {
                        "service": "ULM - User Login Manager",
                        "version": "1.0.0",
                        "status": "operational",
                        "api_docs": "/api/v1/docs"
                    }
                }
            }
        }
    }
)
async def root():
    """Root endpoint"""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "status": "operational",
        "api_docs": f"{settings.API_V1_STR}/docs"
    }

# Health check endpoint
@app.get(
    settings.HEALTH_CHECK_PATH,
    tags=["Health"],
    summary="Health Check",
    description="""
    Basic health check endpoint to verify service is running.
    
    **Returns:**
    - Service health status
    - Service name and version
    
    **Use Cases:**
    - Load balancer health checks
    - Monitoring system health probes
    - Uptime monitoring
    - CI/CD deployment validation
    
    **Note:** This is a lightweight check that only verifies the service is responsive.
    For dependency checks, use `/ready` endpoint.
    """,
    responses={
        200: {
            "description": "Service is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "service": "ULM - User Login Manager",
                        "version": "1.0.0"
                    }
                }
            }
        }
    }
)
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION
    }

# Readiness check endpoint
@app.get(
    settings.READY_CHECK_PATH,
    tags=["Health"],
    summary="Readiness Check",
    description="""
    Readiness check endpoint to verify all dependencies are operational.
    
    **Checks:**
    - **Database:** PostgreSQL connection and query execution
    - **Redis:** Connection to Redis cache (placeholder)
    - **Celery:** Celery worker availability (placeholder)
    
    **Returns:**
    - Overall readiness status
    - Individual check results
    
    **Use Cases:**
    - Kubernetes readiness probes
    - Service mesh health checks
    - Load balancer configuration
    - Deployment validation before accepting traffic
    
    **Response Codes:**
    - `200 OK` - All dependencies are ready
    - `503 Service Unavailable` - One or more dependencies are not ready
    
    **Note:** Service should not receive traffic until this endpoint returns 200.
    """,
    responses={
        200: {
            "description": "All dependencies are ready",
            "content": {
                "application/json": {
                    "example": {
                        "ready": True,
                        "checks": {
                            "database": True,
                            "redis": True,
                            "celery": True
                        }
                    }
                }
            }
        },
        503: {
            "description": "Service not ready - dependencies unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "ready": False,
                        "checks": {
                            "database": True,
                            "redis": False,
                            "celery": False
                        }
                    }
                }
            }
        }
    }
)
async def readiness_check():
    """Readiness check - verify all dependencies"""
    checks = {
        "database": False,
        "redis": False,
        "celery": False
    }
    
    # Check database
    try:
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
            checks["database"] = True
    except Exception as e:
        logger.error(f"Database check failed: {e}")
    
    # Check Redis
    # TODO: Add Redis check
    checks["redis"] = True  # Placeholder
    
    # Check Celery
    # TODO: Add Celery check
    checks["celery"] = True  # Placeholder
    
    all_ready = all(checks.values())
    
    return JSONResponse(
        status_code=200 if all_ready else 503,
        content={
            "ready": all_ready,
            "checks": checks
        }
    )

# Custom error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested resource was not found: {request.url.path}"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Custom 500 handler"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    logger.error(f"Internal server error - Request ID: {request_id}", exc_info=exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "request_id": request_id
        }
    )

# Sentry integration (if configured)
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment="development" if settings.DEBUG else "production",
        traces_sample_rate=0.1
    )
    
    app.add_middleware(SentryAsgiMiddleware)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
