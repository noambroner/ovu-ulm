"""
Localization middleware for FastAPI
Automatically detects user language and sets appropriate translations
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
import json

from app.core.localization import Language, translator, get_user_language


class LocalizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle language detection and localization
    """
    
    async def dispatch(self, request: Request, call_next):
        # Get language from various sources
        language = self._get_request_language(request)
        
        # Set language for this request
        translator.set_language(language)
        
        # Store language in request state for access in endpoints
        request.state.language = language
        request.state.is_rtl = Language.is_rtl(language.value)
        request.state.text_direction = Language.get_direction(language.value)
        
        # Process request
        response = await call_next(request)
        
        # Add language headers to response
        response.headers["Content-Language"] = language.value
        response.headers["X-Text-Direction"] = request.state.text_direction
        
        return response
    
    def _get_request_language(self, request: Request) -> Language:
        """
        Determine language from request
        Priority order:
        1. Query parameter (?lang=he)
        2. Custom header (X-Language: he)
        3. Cookie (language=he)
        4. Accept-Language header
        5. Default (English)
        """
        
        # 1. Check query parameter
        lang_param = request.query_params.get("lang")
        if lang_param:
            try:
                return Language(lang_param.lower())
            except ValueError:
                pass
        
        # 2. Check custom header
        lang_header = request.headers.get("X-Language")
        if lang_header:
            try:
                return Language(lang_header.lower())
            except ValueError:
                pass
        
        # 3. Check cookie
        lang_cookie = request.cookies.get("language")
        if lang_cookie:
            try:
                return Language(lang_cookie.lower())
            except ValueError:
                pass
        
        # 4. Check Accept-Language header
        accept_language = request.headers.get("Accept-Language")
        if accept_language:
            return get_user_language(accept_language)
        
        # 5. Default to English
        return Language.ENGLISH


class LocalizedResponse:
    """
    Helper class for creating localized responses
    """
    
    @staticmethod
    def success(
        message_key: str,
        data: Optional[dict] = None,
        language: Optional[Language] = None,
        **kwargs
    ) -> dict:
        """Create a success response with localized message"""
        message = translator.get(message_key, language, **kwargs)
        response = {
            "status": "success",
            "message": message,
        }
        if data:
            response["data"] = data
        
        # Add RTL info if needed
        if language and Language.is_rtl(language.value):
            response["text_direction"] = "rtl"
        
        return response
    
    @staticmethod
    def error(
        message_key: str,
        status_code: int = 400,
        error_code: Optional[str] = None,
        language: Optional[Language] = None,
        **kwargs
    ) -> dict:
        """Create an error response with localized message"""
        message = translator.get(message_key, language, **kwargs)
        response = {
            "status": "error",
            "message": message,
            "status_code": status_code,
        }
        if error_code:
            response["error_code"] = error_code
        
        # Add RTL info if needed
        if language and Language.is_rtl(language.value):
            response["text_direction"] = "rtl"
        
        return response
    
    @staticmethod
    def validation_error(
        errors: dict,
        language: Optional[Language] = None
    ) -> dict:
        """Create a validation error response with localized field messages"""
        localized_errors = {}
        
        for field, error_key in errors.items():
            if isinstance(error_key, str):
                localized_errors[field] = translator.get(error_key, language)
            elif isinstance(error_key, dict):
                # Handle complex validation with parameters
                key = error_key.get("key", "field_required")
                params = error_key.get("params", {})
                localized_errors[field] = translator.get(key, language, **params)
            else:
                localized_errors[field] = str(error_key)
        
        response = {
            "status": "error",
            "message": translator.get("validation_error", language),
            "errors": localized_errors,
            "status_code": 422
        }
        
        # Add RTL info if needed
        if language and Language.is_rtl(language.value):
            response["text_direction"] = "rtl"
        
        return response
    
    @staticmethod
    def paginated(
        items: list,
        total: int,
        page: int,
        per_page: int,
        language: Optional[Language] = None
    ) -> dict:
        """Create a paginated response with localized metadata"""
        response = {
            "status": "success",
            "data": items,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": (total + per_page - 1) // per_page,
                "has_next": page * per_page < total,
                "has_prev": page > 1
            }
        }
        
        # Add localized labels
        if language:
            response["pagination"]["labels"] = {
                "showing": translator.get("showing_x_to_y_of_z", language,
                    from_=(page - 1) * per_page + 1,
                    to=min(page * per_page, total),
                    total=total
                ),
                "page": translator.get("page", language),
                "of": translator.get("of", language),
            }
            
            # Add RTL info if needed
            if Language.is_rtl(language.value):
                response["text_direction"] = "rtl"
        
        return response


def get_request_language(request: Request) -> Language:
    """
    Get language from request state
    Use in endpoints to get the detected language
    """
    return getattr(request.state, "language", Language.ENGLISH)


def get_localized_message(request: Request, key: str, **kwargs) -> str:
    """
    Get localized message for current request
    """
    language = get_request_language(request)
    return translator.get(key, language, **kwargs)
