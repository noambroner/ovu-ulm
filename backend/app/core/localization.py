"""
Localization support for ULM Backend
Supports multiple languages including RTL (Hebrew, Arabic)
"""
from typing import Dict, Optional, List
from enum import Enum
import json
import os
from pathlib import Path

class Language(str, Enum):
    """Supported languages"""
    ENGLISH = "en"
    HEBREW = "he"
    ARABIC = "ar"
    RUSSIAN = "ru"
    FRENCH = "fr"
    SPANISH = "es"
    
    @classmethod
    def is_rtl(cls, language: str) -> bool:
        """Check if language is RTL"""
        return language in ["he", "ar", "fa", "ur"]
    
    @classmethod
    def get_direction(cls, language: str) -> str:
        """Get text direction for language"""
        return "rtl" if cls.is_rtl(language) else "ltr"


class Translator:
    """Translation manager for backend messages"""
    
    _instance = None
    _translations: Dict[str, Dict[str, str]] = {}
    _current_language = Language.ENGLISH
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_translations()
        return cls._instance
    
    def _load_translations(self):
        """Load all translation files"""
        translations_dir = Path(__file__).parent.parent / "translations"
        
        # Default English translations
        self._translations[Language.ENGLISH] = {
            # Authentication messages
            "login_successful": "Login successful",
            "logout_successful": "Logout successful",
            "invalid_credentials": "Invalid email or password",
            "account_locked": "Account is locked due to too many failed attempts",
            "account_not_verified": "Please verify your email address",
            "token_expired": "Token has expired",
            "token_invalid": "Invalid token",
            
            # Registration messages
            "registration_successful": "Registration successful. Please check your email to verify your account.",
            "email_already_exists": "Email already exists",
            "username_already_exists": "Username already exists",
            "weak_password": "Password is too weak. It must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.",
            
            # Password reset
            "password_reset_sent": "Password reset link has been sent to your email",
            "password_reset_successful": "Password has been reset successfully",
            "invalid_reset_token": "Invalid or expired reset token",
            
            # Validation messages
            "field_required": "This field is required",
            "invalid_email": "Invalid email address",
            "invalid_phone": "Invalid phone number",
            "invalid_date": "Invalid date format",
            "value_too_short": "Value is too short (minimum {min} characters)",
            "value_too_long": "Value is too long (maximum {max} characters)",
            
            # Permission messages
            "permission_denied": "You don't have permission to perform this action",
            "admin_only": "This action requires admin privileges",
            "unauthorized": "Unauthorized access",
            
            # CRUD messages
            "created_successfully": "{item} created successfully",
            "updated_successfully": "{item} updated successfully",
            "deleted_successfully": "{item} deleted successfully",
            "not_found": "{item} not found",
            "already_exists": "{item} already exists",
            
            # Error messages
            "internal_error": "An internal error occurred. Please try again later.",
            "database_error": "Database error occurred",
            "network_error": "Network error occurred",
            "rate_limit_exceeded": "Too many requests. Please try again later.",
            "service_unavailable": "Service is temporarily unavailable",
            
            # Success messages
            "operation_successful": "Operation completed successfully",
            "changes_saved": "Changes saved successfully",
            "email_sent": "Email sent successfully",
            
            # User messages
            "user_not_found": "User not found",
            "user_created": "User created successfully",
            "user_updated": "User updated successfully",
            "user_deleted": "User deleted successfully",
            "profile_updated": "Profile updated successfully",
            
            # Session messages
            "session_expired": "Your session has expired. Please login again.",
            "concurrent_sessions": "Maximum concurrent sessions reached",
            
            # MFA messages
            "mfa_required": "Multi-factor authentication required",
            "mfa_enabled": "Multi-factor authentication enabled successfully",
            "mfa_disabled": "Multi-factor authentication disabled",
            "invalid_mfa_code": "Invalid authentication code",
            
            # Email templates
            "email_verification_subject": "Verify your email address",
            "password_reset_subject": "Reset your password",
            "welcome_subject": "Welcome to OVU System",
        }
        
        # Hebrew translations
        self._translations[Language.HEBREW] = {
            # Authentication messages
            "login_successful": "התחברות הצליחה",
            "logout_successful": "יצאת מהמערכת בהצלחה",
            "invalid_credentials": "אימייל או סיסמה שגויים",
            "account_locked": "החשבון ננעל עקב ניסיונות כושלים רבים מדי",
            "account_not_verified": "אנא אמת את כתובת הדוא\"ל שלך",
            "token_expired": "התוקף של הטוקן פג",
            "token_invalid": "טוקן לא תקין",
            
            # Registration messages
            "registration_successful": "ההרשמה הצליחה. אנא בדוק את הדוא\"ל שלך לאימות החשבון.",
            "email_already_exists": "כתובת דוא\"ל כבר קיימת",
            "username_already_exists": "שם המשתמש כבר קיים",
            "weak_password": "הסיסמה חלשה מדי. היא חייבת להכיל לפחות 8 תווים, כולל אותיות גדולות, קטנות, מספרים ותווים מיוחדים.",
            
            # Password reset
            "password_reset_sent": "קישור לאיפוס סיסמה נשלח לדוא\"ל שלך",
            "password_reset_successful": "הסיסמה אופסה בהצלחה",
            "invalid_reset_token": "טוקן איפוס לא תקין או שפג תוקפו",
            
            # Validation messages
            "field_required": "שדה חובה",
            "invalid_email": "כתובת דוא\"ל לא תקינה",
            "invalid_phone": "מספר טלפון לא תקין",
            "invalid_date": "פורמט תאריך לא תקין",
            "value_too_short": "הערך קצר מדי (מינימום {min} תווים)",
            "value_too_long": "הערך ארוך מדי (מקסימום {max} תווים)",
            
            # Permission messages
            "permission_denied": "אין לך הרשאה לבצע פעולה זו",
            "admin_only": "פעולה זו דורשת הרשאות מנהל",
            "unauthorized": "גישה לא מורשית",
            
            # CRUD messages
            "created_successfully": "{item} נוצר בהצלחה",
            "updated_successfully": "{item} עודכן בהצלחה",
            "deleted_successfully": "{item} נמחק בהצלחה",
            "not_found": "{item} לא נמצא",
            "already_exists": "{item} כבר קיים",
            
            # Error messages
            "internal_error": "אירעה שגיאה פנימית. אנא נסה שוב מאוחר יותר.",
            "database_error": "אירעה שגיאת מסד נתונים",
            "network_error": "אירעה שגיאת רשת",
            "rate_limit_exceeded": "יותר מדי בקשות. אנא נסה שוב מאוחר יותר.",
            "service_unavailable": "השירות אינו זמין זמנית",
            
            # Success messages
            "operation_successful": "הפעולה הושלמה בהצלחה",
            "changes_saved": "השינויים נשמרו בהצלחה",
            "email_sent": "הדוא\"ל נשלח בהצלחה",
            
            # User messages
            "user_not_found": "המשתמש לא נמצא",
            "user_created": "המשתמש נוצר בהצלחה",
            "user_updated": "המשתמש עודכן בהצלחה",
            "user_deleted": "המשתמש נמחק בהצלחה",
            "profile_updated": "הפרופיל עודכן בהצלחה",
            
            # Session messages
            "session_expired": "תוקף ההתחברות שלך פג. אנא התחבר שוב.",
            "concurrent_sessions": "הגעת למספר המקסימלי של התחברויות במקביל",
            
            # MFA messages
            "mfa_required": "נדרש אימות דו-שלבי",
            "mfa_enabled": "אימות דו-שלבי הופעל בהצלחה",
            "mfa_disabled": "אימות דו-שלבי הושבת",
            "invalid_mfa_code": "קוד אימות שגוי",
            
            # Email templates
            "email_verification_subject": "אמת את כתובת הדוא\"ל שלך",
            "password_reset_subject": "אפס את הסיסמה שלך",
            "welcome_subject": "ברוך הבא למערכת OVU",
        }
        
        # Arabic translations
        self._translations[Language.ARABIC] = {
            "login_successful": "تم تسجيل الدخول بنجاح",
            "logout_successful": "تم تسجيل الخروج بنجاح",
            "invalid_credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            "field_required": "هذا الحقل مطلوب",
            "permission_denied": "ليس لديك إذن للقيام بهذا الإجراء",
            # Add more Arabic translations...
        }
        
        # Try to load from files if they exist
        for lang in Language:
            file_path = translations_dir / f"{lang.value}.json"
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    self._translations[lang.value] = json.load(f)
    
    def set_language(self, language: Language):
        """Set current language"""
        self._current_language = language
    
    def get(self, key: str, language: Optional[Language] = None, **kwargs) -> str:
        """Get translated message"""
        lang = language or self._current_language
        translations = self._translations.get(lang.value, self._translations[Language.ENGLISH])
        message = translations.get(key, key)
        
        # Format message with parameters
        if kwargs:
            try:
                message = message.format(**kwargs)
            except KeyError:
                pass
        
        return message
    
    def get_all_translations(self, key: str) -> Dict[str, str]:
        """Get translations for all languages"""
        result = {}
        for lang in Language:
            result[lang.value] = self.get(key, lang)
        return result
    
    def get_language_info(self, language: Optional[Language] = None) -> Dict:
        """Get language information including RTL status"""
        lang = language or self._current_language
        return {
            "code": lang.value,
            "name": lang.name,
            "is_rtl": Language.is_rtl(lang.value),
            "direction": Language.get_direction(lang.value)
        }


# Global translator instance
translator = Translator()


def _(key: str, **kwargs) -> str:
    """Shortcut for translation"""
    return translator.get(key, **kwargs)


def get_user_language(accept_language: Optional[str] = None) -> Language:
    """Get user's preferred language from Accept-Language header"""
    if not accept_language:
        return Language.ENGLISH
    
    # Parse Accept-Language header
    # Example: "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7"
    languages = []
    for lang_str in accept_language.split(','):
        parts = lang_str.strip().split(';')
        lang = parts[0].split('-')[0].lower()
        
        # Get quality factor
        q = 1.0
        for part in parts[1:]:
            if part.strip().startswith('q='):
                try:
                    q = float(part.strip()[2:])
                except ValueError:
                    q = 0.0
        
        languages.append((lang, q))
    
    # Sort by quality factor
    languages.sort(key=lambda x: x[1], reverse=True)
    
    # Find first supported language
    for lang_code, _ in languages:
        try:
            return Language(lang_code)
        except ValueError:
            continue
    
    return Language.ENGLISH


def format_date(date, language: Optional[Language] = None) -> str:
    """Format date according to language/locale"""
    lang = language or translator._current_language
    
    # RTL languages often use different date formats
    if Language.is_rtl(lang.value):
        return date.strftime("%d/%m/%Y")  # DD/MM/YYYY
    else:
        return date.strftime("%m/%d/%Y")  # MM/DD/YYYY for US English


def format_currency(amount: float, currency: str = "ILS", language: Optional[Language] = None) -> str:
    """Format currency according to language/locale"""
    lang = language or translator._current_language
    
    if currency == "ILS":
        if lang == Language.HEBREW:
            return f"₪{amount:,.2f}"
        else:
            return f"{amount:,.2f} ILS"
    elif currency == "USD":
        return f"${amount:,.2f}"
    elif currency == "EUR":
        return f"€{amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"
