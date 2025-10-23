import { useState } from 'react';
import './APIFunctions.css';

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  title: string;
  description: string;
  authentication: boolean;
  parameters?: Parameter[];
  requestBody?: string;
  responseExample?: string;
  category: string;
}

interface APIFunctionsProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
  appType: 'ulm' | 'aam';
}

export const APIFunctions = ({ language, theme, appType }: APIFunctionsProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);

  const t = {
    he: {
      title: 'תיעוד API Functions',
      subtitle: 'תיעוד מלא של כל נקודות הקצה שהאפליקציה מספקת',
      categories: 'קטגוריות',
      allCategories: 'כל הקטגוריות',
      method: 'שיטה',
      endpoint: 'נקודת קצה',
      description: 'תיאור',
      authentication: 'אימות',
      required: 'נדרש',
      optional: 'אופציונלי',
      parameters: 'פרמטרים',
      requestBody: 'גוף הבקשה',
      responseExample: 'דוגמת תגובה',
      selectEndpoint: 'בחר נקודת קצה לצפייה בפרטים',
      name: 'שם',
      type: 'סוג',
      status: 'סטטוס',
    },
    en: {
      title: 'API Functions Documentation',
      subtitle: 'Complete documentation of all endpoints provided by the application',
      categories: 'Categories',
      allCategories: 'All Categories',
      method: 'Method',
      endpoint: 'Endpoint',
      description: 'Description',
      authentication: 'Authentication',
      required: 'Required',
      optional: 'Optional',
      parameters: 'Parameters',
      requestBody: 'Request Body',
      responseExample: 'Response Example',
      selectEndpoint: 'Select an endpoint to view details',
      name: 'Name',
      type: 'Type',
      status: 'Status',
    },
    ar: {
      title: 'توثيق وظائف API',
      subtitle: 'توثيق كامل لجميع نقاط النهاية التي يوفرها التطبيق',
      categories: 'الفئات',
      allCategories: 'جميع الفئات',
      method: 'الطريقة',
      endpoint: 'نقطة النهاية',
      description: 'الوصف',
      authentication: 'المصادقة',
      required: 'مطلوب',
      optional: 'اختياري',
      parameters: 'المعاملات',
      requestBody: 'جسم الطلب',
      responseExample: 'مثال الاستجابة',
      selectEndpoint: 'حدد نقطة نهاية لعرض التفاصيل',
      name: 'الاسم',
      type: 'النوع',
      status: 'الحالة',
    }
  };

  const ulmEndpoints: APIEndpoint[] = [
    // ===== Authentication Endpoints =====
    {
      id: 'auth-login',
      method: 'POST',
      path: '/api/v1/auth/login',
      title: 'User Login',
      description: 'Authenticate user with username and password. Returns JWT access token and refresh token.',
      authentication: false,
      category: 'Authentication',
      parameters: [],
      requestBody: `{
  "username": "user@example.com",
  "password": "SecurePassword123!"
}`,
      responseExample: `{
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
}`
    },
    {
      id: 'auth-refresh',
      method: 'POST',
      path: '/api/v1/auth/refresh',
      title: 'Refresh Access Token',
      description: 'Refresh the access token using a valid refresh token. Use this when access token expires.',
      authentication: false,
      category: 'Authentication',
      requestBody: `{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}`,
      responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}`
    },
    {
      id: 'auth-logout',
      method: 'POST',
      path: '/api/v1/auth/logout',
      title: 'User Logout',
      description: 'Logout from device(s). Provide refresh_token to logout from specific device, or omit to logout from all devices.',
      authentication: true,
      category: 'Authentication',
      parameters: [
        { name: 'refresh_token', type: 'string', required: false, description: 'Specific refresh token to revoke' },
      ],
      responseExample: `{
  "message": "Logged out successfully"
}`
    },
    {
      id: 'auth-me',
      method: 'GET',
      path: '/api/v1/auth/me',
      title: 'Get Current User',
      description: 'Get current authenticated user information. Requires valid access token in Authorization header.',
      authentication: true,
      category: 'Authentication',
      responseExample: `{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "user@example.com",
  "email": "user@example.com",
  "role": "user",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "he",
  "status": "active"
}`
    },

    // ===== Token Settings Endpoints =====
    {
      id: 'token-settings-get',
      method: 'GET',
      path: '/api/v1/token-settings/',
      title: 'Get Token Settings',
      description: 'Get current user\'s token expiration settings (default: 15 minutes for access, 7 days for refresh).',
      authentication: true,
      category: 'Token Settings',
      responseExample: `{
  "access_token_expire_minutes": 15,
  "refresh_token_expire_days": 7
}`
    },
    {
      id: 'token-settings-update',
      method: 'PUT',
      path: '/api/v1/token-settings/',
      title: 'Update Token Settings',
      description: 'Update token expiration settings. Access token: 5-1440 minutes. Refresh token: 1-90 days.',
      authentication: true,
      category: 'Token Settings',
      requestBody: `{
  "access_token_expire_minutes": 30,
  "refresh_token_expire_days": 14
}`,
      responseExample: `{
  "access_token_expire_minutes": 30,
  "refresh_token_expire_days": 14
}`
    },
    {
      id: 'token-settings-reset',
      method: 'POST',
      path: '/api/v1/token-settings/reset',
      title: 'Reset Token Settings',
      description: 'Reset token settings to defaults (15 minutes / 7 days).',
      authentication: true,
      category: 'Token Settings',
      responseExample: `{
  "message": "Token settings reset to defaults"
}`
    },

    // ===== User Status Management =====
    {
      id: 'user-deactivate',
      method: 'POST',
      path: '/api/v1/users/{user_id}/deactivate',
      title: 'Deactivate User',
      description: 'Deactivate user immediately or schedule future deactivation. Requires admin role.',
      authentication: true,
      category: 'User Status',
      parameters: [
        { name: 'user_id', type: 'integer', required: true, description: 'User ID to deactivate' },
      ],
      requestBody: `{
  "deactivation_type": "immediate",
  "reason": "Contract ended"
}`,
      responseExample: `{
  "success": true,
  "message": "User deactivated successfully",
  "user_status": "inactive",
  "scheduled_for": null
}`
    },
    {
      id: 'user-cancel-schedule',
      method: 'POST',
      path: '/api/v1/users/{user_id}/cancel-schedule',
      title: 'Cancel Scheduled Deactivation',
      description: 'Cancel a scheduled deactivation and return user to active status. Requires admin role.',
      authentication: true,
      category: 'User Status',
      parameters: [
        { name: 'user_id', type: 'integer', required: true, description: 'User ID' },
      ],
      requestBody: `{
  "reason": "Contract extended"
}`,
      responseExample: `{
  "success": true,
  "message": "Scheduled deactivation cancelled successfully",
  "user_status": "active",
  "scheduled_for": null
}`
    },
    {
      id: 'user-reactivate',
      method: 'POST',
      path: '/api/v1/users/{user_id}/reactivate',
      title: 'Reactivate User',
      description: 'Reactivate an inactive user to restore access. Requires admin role.',
      authentication: true,
      category: 'User Status',
      parameters: [
        { name: 'user_id', type: 'integer', required: true, description: 'User ID to reactivate' },
      ],
      requestBody: `{
  "reason": "Contract renewed"
}`,
      responseExample: `{
  "success": true,
  "message": "User reactivated successfully",
  "user_status": "active",
  "scheduled_for": null
}`
    },
    {
      id: 'user-status',
      method: 'GET',
      path: '/api/v1/users/{user_id}/status',
      title: 'Get User Status',
      description: 'Get comprehensive status information for a user (active, inactive, scheduled_deactivation).',
      authentication: true,
      category: 'User Status',
      parameters: [
        { name: 'user_id', type: 'integer', required: true, description: 'User ID' },
      ],
      responseExample: `{
  "user_id": 123,
  "status": "active",
  "current_period": {
    "joined_at": "2025-01-01T00:00:00Z",
    "duration_days": 295
  },
  "next_scheduled_action": null
}`
    },
    {
      id: 'user-activity-history',
      method: 'GET',
      path: '/api/v1/users/{user_id}/activity-history',
      title: 'Get Activity History',
      description: 'Get complete activity history for a user (all join/leave events and status changes).',
      authentication: true,
      category: 'User Status',
      parameters: [
        { name: 'user_id', type: 'integer', required: true, description: 'User ID' },
        { name: 'limit', type: 'integer', required: false, description: 'Limit number of records' },
      ],
      responseExample: `[
  {
    "id": 1,
    "user_id": 123,
    "joined_at": "2025-01-01T00:00:00Z",
    "action_type": "join",
    "performed_by_username": "admin@example.com",
    "reason": "New user registration",
    "duration_days": 295,
    "is_current": true
  }
]`
    },
    {
      id: 'user-scheduled-actions',
      method: 'GET',
      path: '/api/v1/users/{user_id}/scheduled-actions',
      title: 'Get Scheduled Actions',
      description: 'Get all scheduled actions for a user (pending, completed, cancelled, failed).',
      authentication: true,
      category: 'User Status',
      parameters: [
        { name: 'user_id', type: 'integer', required: true, description: 'User ID' },
      ],
      responseExample: `[
  {
    "id": 1,
    "user_id": 123,
    "action_type": "deactivate",
    "scheduled_for": "2025-10-30T10:00:00Z",
    "status": "pending",
    "is_overdue": false,
    "time_until_execution": "7 days"
  }
]`
    },
    {
      id: 'stats-activity',
      method: 'GET',
      path: '/api/v1/stats/activity',
      title: 'System Activity Statistics',
      description: 'Get system-wide user activity statistics. Requires admin role.',
      authentication: true,
      category: 'User Status',
      responseExample: `{
  "total_users": 150,
  "active_users": 120,
  "inactive_users": 25,
  "scheduled_deactivations": 5,
  "pending_scheduled_actions": 5
}`
    },
    {
      id: 'pending-deactivations',
      method: 'GET',
      path: '/api/v1/users/pending-deactivations',
      title: 'Get Pending Deactivations',
      description: 'Get all pending scheduled deactivations across the system. Requires admin role.',
      authentication: true,
      category: 'User Status',
      responseExample: `[
  {
    "id": 1,
    "user_id": 123,
    "action_type": "deactivate",
    "scheduled_for": "2025-10-30T10:00:00Z",
    "status": "pending",
    "is_overdue": false
  }
]`
    },

    // ===== User Management =====
    {
      id: 'users-list',
      method: 'GET',
      path: '/api/v1/users',
      title: 'Get All Users',
      description: 'Retrieve a list of all users with pagination and search. Requires admin role.',
      authentication: true,
      category: 'Users',
      parameters: [
        { name: 'skip', type: 'integer', required: false, description: 'Number of records to skip' },
        { name: 'limit', type: 'integer', required: false, description: 'Maximum records to return' },
        { name: 'search', type: 'string', required: false, description: 'Search query' },
      ],
      responseExample: `{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "skip": 0,
  "limit": 100
}`
    },
    {
      id: 'users-create',
      method: 'POST',
      path: '/api/v1/users',
      title: 'Create User',
      description: 'Create a new user. Requires admin role.',
      authentication: true,
      category: 'Users',
      requestBody: `{
  "username": "string",
  "email": "user@example.com",
  "password": "string",
  "phone": "string",
  "role": "user"
}`,
      responseExample: `{
  "id": 2,
  "username": "new_user",
  "email": "new@example.com",
  "role": "user",
  "created_at": "2025-01-15T10:30:00Z"
}`
    },
    {
      id: 'users-update',
      method: 'PUT',
      path: '/api/v1/users/{id}',
      title: 'Update User',
      description: 'Update user information. Requires admin role.',
      authentication: true,
      category: 'Users',
      parameters: [
        { name: 'id', type: 'integer', required: true, description: 'User ID' },
      ],
      requestBody: `{
  "username": "string",
  "email": "user@example.com",
  "phone": "string",
  "role": "user"
}`,
      responseExample: `{
  "id": 2,
  "username": "updated_user",
  "email": "updated@example.com",
  "role": "admin",
  "updated_at": "2025-01-15T11:00:00Z"
}`
    }
  ];

  const aamEndpoints: APIEndpoint[] = [
    {
      id: 'auth-login',
      method: 'POST',
      path: '/api/v1/auth/login',
      title: 'Admin Login',
      description: 'Authenticate admin and receive access token',
      authentication: false,
      category: 'Authentication',
      requestBody: `{
  "username": "string",
  "password": "string"
}`,
      responseExample: `{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin"
  }
}`
    },
    {
      id: 'admins-list',
      method: 'GET',
      path: '/api/v1/admins',
      title: 'Get All Admins',
      description: 'Retrieve a list of all administrators',
      authentication: true,
      category: 'Admins',
      parameters: [
        { name: 'skip', type: 'integer', required: false, description: 'Number of records to skip' },
        { name: 'limit', type: 'integer', required: false, description: 'Maximum records to return' },
      ],
      responseExample: `{
  "admins": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "super_admin",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10
}`
    },
    {
      id: 'roles-list',
      method: 'GET',
      path: '/api/v1/roles',
      title: 'Get All Roles',
      description: 'Retrieve all available roles and their permissions',
      authentication: true,
      category: 'Permissions',
      responseExample: `{
  "roles": [
    {
      "id": 1,
      "name": "admin",
      "permissions": ["users.read", "users.write", "roles.read"]
    }
  ]
}`
    },
    {
      id: 'system-logs',
      method: 'GET',
      path: '/api/v1/logs',
      title: 'Get System Logs',
      description: 'Retrieve system activity logs',
      authentication: true,
      category: 'System',
      parameters: [
        { name: 'level', type: 'string', required: false, description: 'Log level (info, warning, error)' },
        { name: 'limit', type: 'integer', required: false, description: 'Maximum records to return' },
      ],
      responseExample: `{
  "logs": [
    {
      "id": 1,
      "level": "info",
      "message": "User login successful",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ]
}`
    }
  ];

  const endpoints = appType === 'ulm' ? ulmEndpoints : aamEndpoints;
  const categories = ['all', ...new Set(endpoints.map(e => e.category))];
  const filteredEndpoints = selectedCategory === 'all' 
    ? endpoints 
    : endpoints.filter(e => e.category === selectedCategory);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return '#61affe';
      case 'POST': return '#49cc90';
      case 'PUT': return '#fca130';
      case 'DELETE': return '#f93e3e';
      case 'PATCH': return '#50e3c2';
      default: return '#999';
    }
  };

  return (
    <div className={`api-functions ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="api-header">
        <h1 className="api-title">{t[language].title}</h1>
        <p className="api-subtitle">{t[language].subtitle}</p>
      </div>

      <div className="api-content">
        {/* Sidebar with Categories and Endpoints */}
        <div className="api-sidebar">
          <div className="categories">
            <h3 className="sidebar-title">{t[language].categories}</h3>
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? t[language].allCategories : category}
              </button>
            ))}
          </div>

          <div className="endpoints-list">
            {filteredEndpoints.map(endpoint => (
              <div
                key={endpoint.id}
                className={`endpoint-item ${selectedEndpoint?.id === endpoint.id ? 'active' : ''}`}
                onClick={() => setSelectedEndpoint(endpoint)}
              >
                <span 
                  className="method-badge"
                  style={{ backgroundColor: getMethodColor(endpoint.method) }}
                >
                  {endpoint.method}
                </span>
                <div className="endpoint-info">
                  <div className="endpoint-title">{endpoint.title}</div>
                  <code className="endpoint-path">{endpoint.path}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content with Endpoint Details */}
        <div className="api-main">
          {selectedEndpoint ? (
            <div className="endpoint-details">
              <div className="detail-header">
                <div className="header-top">
                  <span 
                    className="method-badge large"
                    style={{ backgroundColor: getMethodColor(selectedEndpoint.method) }}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <code className="endpoint-path large">{selectedEndpoint.path}</code>
                </div>
                <h2 className="endpoint-title">{selectedEndpoint.title}</h2>
                <p className="endpoint-description">{selectedEndpoint.description}</p>
                
                {selectedEndpoint.authentication && (
                  <div className="auth-badge">
                    🔒 {t[language].authentication} {t[language].required}
                  </div>
                )}
              </div>

              {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">{t[language].parameters}</h3>
                  <div className="parameters-table">
                    {selectedEndpoint.parameters.map((param, idx) => (
                      <div key={idx} className="parameter-row">
                        <span className="param-name">{param.name}</span>
                        <span className="param-type">{param.type}</span>
                        <span className={`param-required ${param.required ? 'required' : 'optional'}`}>
                          {param.required ? t[language].required : t[language].optional}
                        </span>
                        <span className="param-description">{param.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEndpoint.requestBody && (
                <div className="detail-section">
                  <h3 className="section-title">{t[language].requestBody}</h3>
                  <pre className="code-block">{selectedEndpoint.requestBody}</pre>
                </div>
              )}

              {selectedEndpoint.responseExample && (
                <div className="detail-section">
                  <h3 className="section-title">{t[language].responseExample}</h3>
                  <pre className="code-block">{selectedEndpoint.responseExample}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="no-selection">
              <span className="no-selection-icon">📚</span>
              <p>{t[language].selectEndpoint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

