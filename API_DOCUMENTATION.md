# OVU-ULM API Documentation

## Overview
Complete API documentation for the OVU User Login Manager (ULM) service.

**Base URL:** `https://ulm-rct.ovu.co.il/api/v1`  
**Swagger UI:** `https://ulm-rct.ovu.co.il/api/ui`  
**ReDoc:** `https://ulm-rct.ovu.co.il/api/redoc`

---

## Authentication Endpoints

### 🔐 POST /auth/login
**Login with username and password**

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "user@example.com",
    "email": "user@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "preferred_language": "he",
    "status": "active"
  }
}
```

**Features:**
- JWT access token (customizable expiration: 5-1440 min, default 15 min)
- Refresh token (customizable expiration: 1-90 days, default 7 days)
- Device info and IP tracking
- Only active users can login

**Errors:**
- `401 Unauthorized` - Invalid credentials or inactive user

---

### 🔄 POST /auth/refresh
**Refresh access token using refresh token**

**Request Body:**
```json
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Use Case:**
- When access token expires, use this to get a new one without re-login
- Maintains user session without requiring credentials

**Errors:**
- `401 Unauthorized` - Invalid or expired refresh token

---

### 🚪 POST /auth/logout
**Logout from device(s)**

**Authentication Required:** Bearer token in header

**Query Parameters:**
- `refresh_token` (optional) - Specific token to revoke

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
// OR
{
  "message": "Logged out from all devices"
}
```

**Two Modes:**
1. **Single Device:** Provide `refresh_token` to logout from specific device
2. **All Devices:** Don't provide `refresh_token` to logout from all devices

**Errors:**
- `401 Unauthorized` - Invalid or missing access token

---

### 👤 GET /auth/me
**Get current authenticated user information**

**Authentication Required:** Bearer token in header

**Response (200):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "user@example.com",
  "email": "user@example.com",
  "role": "user",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "he",
  "status": "active"
}
```

**Use Cases:**
- Display user profile in UI
- Verify user permissions and role
- Validate session before sensitive operations

**Errors:**
- `401 Unauthorized` - Invalid or missing access token

---

## Token Settings Endpoints

### ⚙️ GET /token-settings/
**Get current user's token settings**

**Authentication Required:** Bearer token in header

**Response (200):**
```json
{
  "access_token_expire_minutes": 15,
  "refresh_token_expire_days": 7
}
```

**Default Values:**
- Access Token: 15 minutes
- Refresh Token: 7 days

---

### 📝 PUT /token-settings/
**Update token expiration settings**

**Authentication Required:** Bearer token in header

**Request Body:**
```json
{
  "access_token_expire_minutes": 30,
  "refresh_token_expire_days": 14
}
```

**Constraints:**
- `access_token_expire_minutes`: 5-1440 (5 min to 24 hours)
- `refresh_token_expire_days`: 1-90 days

**Response (200):**
```json
{
  "access_token_expire_minutes": 30,
  "refresh_token_expire_days": 14
}
```

**Security Recommendations:**
- High security: 5-15 min access, 1-7 days refresh
- Normal: 15-60 min access, 7-30 days refresh
- Low security: 60-1440 min access, 30-90 days refresh

**Errors:**
- `400 Bad Request` - No fields to update
- `422 Validation Error` - Values out of range

---

### 🔄 POST /token-settings/reset
**Reset token settings to defaults**

**Authentication Required:** Bearer token in header

**Response (200):**
```json
{
  "message": "Token settings reset to defaults"
}
```

**Resets to:**
- Access Token: 15 minutes
- Refresh Token: 7 days

---

## User Status Management Endpoints

### 🔴 POST /users/{user_id}/deactivate
**Deactivate user immediately or schedule future deactivation**

**Authentication Required:** Bearer token in header (admin role typically required)

**Request Body (Immediate):**
```json
{
  "deactivation_type": "immediate",
  "reason": "Contract ended"
}
```

**Request Body (Scheduled):**
```json
{
  "deactivation_type": "scheduled",
  "scheduled_date": "2025-10-30T10:00:00Z",
  "reason": "Contract expires on Oct 30"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "user_status": "inactive",
  "scheduled_for": null
}
```

**Effects:**
- User cannot login after deactivation
- Status changes to 'inactive' or 'scheduled_deactivation'
- Activity history recorded
- Admin notification triggered

---

### ❌ POST /users/{user_id}/cancel-schedule
**Cancel scheduled deactivation**

**Authentication Required:** Bearer token in header (admin role typically required)

**Request Body:**
```json
{
  "reason": "Contract extended"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Scheduled deactivation cancelled successfully",
  "user_status": "active",
  "scheduled_for": null
}
```

---

### ✅ POST /users/{user_id}/reactivate
**Reactivate inactive user**

**Authentication Required:** Bearer token in header (admin role typically required)

**Request Body:**
```json
{
  "reason": "Contract renewed"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User reactivated successfully",
  "user_status": "active",
  "scheduled_for": null
}
```

**Use Cases:**
- Contract renewal
- Temporary suspension ended
- Mistaken deactivation corrected

---

### 📊 GET /users/{user_id}/status
**Get comprehensive user status information**

**Authentication Required:** Bearer token in header

**Response (200):**
```json
{
  "user_id": 123,
  "status": "active",
  "current_period": {
    "joined_at": "2025-01-01T00:00:00Z",
    "duration_days": 295
  },
  "next_scheduled_action": null
}
```

**Status Types:**
- `active` - User can login and use system
- `inactive` - User is deactivated
- `scheduled_deactivation` - Active but scheduled for deactivation

---

### 📜 GET /users/{user_id}/activity-history
**Get complete activity history**

**Authentication Required:** Bearer token in header

**Query Parameters:**
- `limit` (optional) - Limit number of records

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "joined_at": "2025-01-01T00:00:00Z",
    "left_at": null,
    "actual_left_at": null,
    "action_type": "join",
    "performed_by_id": 1,
    "performed_by_username": "admin@example.com",
    "reason": "New user registration",
    "duration_days": 295,
    "is_current": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

**Use Cases:**
- Audit trail of user status changes
- Display timeline in user profile
- Track who made changes and when

---

### 📅 GET /users/{user_id}/scheduled-actions
**Get all scheduled actions for user**

**Authentication Required:** Bearer token in header

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "action_type": "deactivate",
    "scheduled_for": "2025-10-30T10:00:00Z",
    "reason": "Contract expires",
    "created_by_id": 1,
    "status": "pending",
    "executed_at": null,
    "error_message": null,
    "is_overdue": false,
    "time_until_execution": "7 days, 3 hours"
  }
]
```

**Action Statuses:**
- `pending` - Waiting to be executed
- `completed` - Successfully executed
- `cancelled` - Manually cancelled
- `failed` - Execution failed

---

### 📈 GET /stats/activity
**Get system-wide activity statistics**

**Authentication Required:** Bearer token in header  
**Authorization Required:** Admin role

**Response (200):**
```json
{
  "total_users": 150,
  "active_users": 120,
  "inactive_users": 25,
  "scheduled_deactivations": 5,
  "total_activity_records": 500,
  "pending_scheduled_actions": 5
}
```

**Errors:**
- `403 Forbidden` - Admin privileges required

---

### ⏰ GET /pending-deactivations
**Get all pending scheduled deactivations**

**Authentication Required:** Bearer token in header  
**Authorization Required:** Admin role

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "action_type": "deactivate",
    "scheduled_for": "2025-10-30T10:00:00Z",
    "reason": "Contract expires",
    "created_by_id": 1,
    "status": "pending",
    "is_overdue": false,
    "time_until_execution": "7 days"
  }
]
```

**Use Cases:**
- Monitor upcoming deactivations
- Identify overdue scheduled actions
- Plan administrative tasks

**Errors:**
- `403 Forbidden` - Admin privileges required

---

## Authentication Format

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
- `200 OK` - Request successful
- `400 Bad Request` - Invalid parameters or request body
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - Valid token but insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Rate Limiting

The API implements rate limiting to prevent abuse. Default limits:
- **Authentication endpoints:** Higher limits for production use
- **General endpoints:** Standard rate limits apply

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - When the limit resets

---

## Multi-Language Support

The API supports multiple languages:
- **Hebrew (he)** - Default
- **English (en)**
- **Arabic (ar)**

Set language preference in user profile via `preferred_language` field.

---

## Security Features

- **JWT Tokens:** Secure token-based authentication
- **Password Hashing:** bcrypt for password storage
- **Token Rotation:** Refresh tokens can be rotated
- **Device Tracking:** Login tracking with device info and IP
- **Rate Limiting:** Protection against brute force attacks
- **HTTPS Only:** All communications encrypted
- **CORS Protection:** Configured allowed origins
- **Security Headers:** CSP, X-Frame-Options, etc.

---

## Health & System Endpoints

### ❤️ GET /health
**Basic health check**

**Response (200):**
```json
{
  "status": "healthy",
  "service": "ULM - User Login Manager",
  "version": "1.0.0"
}
```

**Use Cases:**
- Monitor service availability
- Load balancer health checks
- System monitoring tools

---

### 🔍 GET /ready
**Readiness check for dependencies**

**Response (200):**
```json
{
  "ready": true,
  "checks": {
    "database": true,
    "redis": true,
    "celery": true
  }
}
```

**Response (503 - Not Ready):**
```json
{
  "ready": false,
  "checks": {
    "database": true,
    "redis": false,
    "celery": false
  }
}
```

**Use Cases:**
- Kubernetes readiness probes
- Verify all dependencies before accepting traffic
- Deployment validation

---

### 🏠 GET /
**Root endpoint with service info**

**Response (200):**
```json
{
  "service": "ULM - User Login Manager",
  "version": "1.0.0",
  "status": "operational",
  "api_docs": "/api/v1/docs"
}
```

---

## Contact & Support

- **GitHub:** https://github.com/noambroner/ovu-ulm
- **Swagger UI:** https://ulm-rct.ovu.co.il/api/ui
- **ReDoc:** https://ulm-rct.ovu.co.il/api/redoc

---

**Last Updated:** October 23, 2025  
**API Version:** 1.0.0

