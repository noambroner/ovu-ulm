# ULM - User Login Manager

## 📋 תיאור
מיקרו-שירות לניהול משתמשים, אימות והרשאות במערכת OVU.

## 🎯 פונקציונליות
- ✅ רישום משתמשים חדשים
- ✅ התחברות ואימות (JWT)
- ✅ ניהול פרופילי משתמשים
- ✅ מערכת הרשאות RBAC
- ✅ Multi-Factor Authentication (MFA)
- ✅ ניהול סשנים
- ✅ API Keys Management
- ✅ Password Reset & Recovery
- ✅ User Activity Logging

## 🏗️ ארכיטקטורה

### Backend (FastAPI + PostgreSQL)
```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── roles.py
│   │   │   │   └── permissions.py
│   │   │   └── router.py
│   │   └── deps.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── role.py
│   │   └── permission.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── auth.py
│   │   └── role.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   └── email_service.py
│   └── main.py
├── tests/
├── alembic/
├── requirements.txt
└── Dockerfile
```

### Frontend (Flutter)
```
frontend/flutter/
├── lib/
│   ├── api/
│   │   ├── auth_api.dart
│   │   └── user_api.dart
│   ├── models/
│   │   ├── user.dart
│   │   └── auth.dart
│   ├── providers/
│   │   └── auth_provider.dart
│   ├── screens/
│   │   ├── login/
│   │   ├── register/
│   │   ├── profile/
│   │   └── settings/
│   ├── widgets/
│   └── main.dart
├── test/
└── pubspec.yaml
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
```

### Roles Table
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions Table
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);
```

### User_Roles Junction Table
```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);
```

### Role_Permissions Junction Table
```sql
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/verify-email` - Verify email address
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/mfa/enable` - Enable MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA code

### Users
- `GET /api/v1/users` - List users (admin)
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/me` - Update current user
- `PUT /api/v1/users/{id}` - Update user (admin)
- `DELETE /api/v1/users/{id}` - Delete user (admin)

### Roles & Permissions
- `GET /api/v1/roles` - List roles
- `POST /api/v1/roles` - Create role (admin)
- `PUT /api/v1/roles/{id}` - Update role (admin)
- `DELETE /api/v1/roles/{id}` - Delete role (admin)
- `GET /api/v1/permissions` - List permissions
- `POST /api/v1/users/{user_id}/roles` - Assign role to user
- `DELETE /api/v1/users/{user_id}/roles/{role_id}` - Remove role from user

### API Keys
- `GET /api/v1/api-keys` - List user's API keys
- `POST /api/v1/api-keys` - Create new API key
- `DELETE /api/v1/api-keys/{id}` - Revoke API key

## 🔐 Security Features

### Password Policy
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Password history (prevent reuse of last 5 passwords)
- Password expiry (optional)

### Session Management
- JWT tokens with short expiry (15 minutes)
- Refresh tokens with longer expiry (7 days)
- Session invalidation on logout
- Device tracking
- Concurrent session limits (optional)

### Rate Limiting
- Login attempts: 5 per minute
- Registration: 3 per hour per IP
- API requests: 100 per minute per user
- Password reset: 3 per hour per email

### Audit Logging
- Login/logout events
- Password changes
- Permission changes
- Failed authentication attempts
- API key usage

## 🚀 Running the Service

### Development
```bash
# Backend
cd services/ulm/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Frontend (Flutter)
cd services/ulm/frontend/flutter
flutter pub get
flutter run -d web --web-port 3001
```

### Production (Docker)
```bash
docker-compose up ulm
```

## 🧪 Testing

```bash
# Backend tests
cd services/ulm/backend
pytest tests/ -v --cov=app

# Frontend tests
cd services/ulm/frontend/flutter
flutter test
```

## 📝 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/ulm_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# Redis (for caching/sessions)
REDIS_URL=redis://localhost:6379/0

# Service Configuration
SERVICE_NAME=ULM
SERVICE_URL=https://ulm.ovu.co.il
CORS_ORIGINS=["https://aam.ovu.co.il", "https://ovu.co.il"]
```

## 📚 Dependencies

### Backend
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- python-jose[cryptography]
- passlib[bcrypt]
- python-multipart
- python-dotenv
- asyncpg
- redis
- celery

### Frontend
- dio (HTTP client)
- provider/riverpod (State management)
- shared_preferences (Local storage)
- go_router (Navigation)
- flutter_secure_storage (Secure storage)
