"""
Configuration settings for ULM service
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
import secrets


class Settings(BaseSettings):
    # Service Information
    SERVICE_NAME: str = "ULM - User Login Manager"
    SERVICE_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    
    # Password Policy
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    PASSWORD_HISTORY_COUNT: int = 5
    
    # Rate Limiting
    LOGIN_RATE_LIMIT: str = "5/minute"
    REGISTER_RATE_LIMIT: str = "3/hour"
    API_RATE_LIMIT: str = "100/minute"
    PASSWORD_RESET_RATE_LIMIT: str = "3/hour"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost/ulm_db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40
    DATABASE_POOL_TIMEOUT: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None
    REDIS_POOL_SIZE: int = 10
    REDIS_DECODE_RESPONSES: bool = True
    
    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@ovu.co.il"
    EMAILS_FROM_NAME: str = "OVU System"
    EMAIL_TEMPLATES_DIR: str = "app/templates/email"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "https://ulm.ovu.co.il",
        "https://aam.ovu.co.il",
        "https://ovu.co.il"
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    # Frontend URLs
    FRONTEND_URL: str = "https://ulm.ovu.co.il"
    PASSWORD_RESET_URL: str = "https://ulm.ovu.co.il/reset-password"
    EMAIL_VERIFICATION_URL: str = "https://ulm.ovu.co.il/verify-email"
    
    # Session Configuration
    SESSION_COOKIE_NAME: str = "ulm_session"
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    MAX_CONCURRENT_SESSIONS: int = 5
    
    # MFA/2FA
    MFA_ISSUER_NAME: str = "OVU System"
    MFA_QR_CODE_SIZE: int = 10
    MFA_TOTP_DIGITS: int = 6
    MFA_TOTP_INTERVAL: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    SENTRY_DSN: Optional[str] = None
    
    # Development
    DEBUG: bool = False
    TESTING: bool = False
    
    # Service Discovery
    AAM_SERVICE_URL: str = "https://aam.ovu.co.il"
    API_GATEWAY_URL: str = "https://api.ovu.co.il"
    
    # Health Check
    HEALTH_CHECK_PATH: str = "/health"
    READY_CHECK_PATH: str = "/ready"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
