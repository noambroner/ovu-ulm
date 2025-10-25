import { useState } from 'react';
import './ApplicationMap.css';

interface MapElement {
  id: string;
  type: 'frontend' | 'backend' | 'database' | 'api' | 'service' | 'model' | 'route';
  name: string;
  description: string;
  tech: string;
  endpoints?: string[];
  dependencies?: string[];
  files?: string[];
  status: 'active' | 'warning' | 'error';
}

interface ApplicationMapProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const ApplicationMap = ({ language, theme }: ApplicationMapProps) => {
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const t = {
    he: {
      title: 'מפת האפליקציה - ULM System',
      subtitle: 'מערכת ניהול משתמשים מתקדמת עם אימות JWT, ניהול טוקנים, API Logging ויומן פיתוח',
      systemDescription: 'ULM (User Login Manager) היא מערכת ניהול משתמשים מלאה הבנויה על React בצד הלקוח ו-FastAPI בצד השרת. המערכת מספקת: אימות מאובטח עם JWT + Refresh Tokens, ניהול הרשאות, השבתות משתמשים מתוזמנות, מעקב היסטוריית פעילות, בקרת טוקנים ברמת משתמש, API Logging מלא (Backend + Frontend), Database Viewer דינמי, ויומן פיתוח מתקדם. 19 אלמנטים, 13 טבלאות DB, 28+ endpoints, תמיכה ב-3 שפות עם RTL מלא.',
      howSystemWorks: 'איך המערכת עובדת?',
      frontend: 'Frontend',
      backend: 'Backend',
      database: 'מסד נתונים',
      clickToView: 'לחץ לצפייה בפרטים',
      technology: 'טכנולוגיה',
      status: 'סטטוס',
      endpoints: 'נקודות קצה',
      dependencies: 'תלויות',
      files: 'קבצים',
      description: 'תיאור',
      active: 'פעיל',
      warning: 'אזהרה',
      error: 'שגיאה',
      closeDetails: 'סגור',
    },
    en: {
      title: 'Application Map - ULM System',
      subtitle: 'Advanced User Management System with JWT authentication, token management, API Logging and Development Journal',
      systemDescription: 'ULM (User Login Manager) is a complete user management system built on React for the client and FastAPI for the server. The system provides: secure authentication with JWT + Refresh Tokens, permission management, scheduled user deactivations, activity history tracking, user-level token control, full API Logging (Backend + Frontend), dynamic Database Viewer, and advanced Development Journal. 19 elements, 13 DB tables, 28+ endpoints, supports 3 languages with full RTL.',
      howSystemWorks: 'How does the system work?',
      frontend: 'Frontend',
      backend: 'Backend',
      database: 'Database',
      clickToView: 'Click to view details',
      technology: 'Technology',
      status: 'Status',
      endpoints: 'Endpoints',
      dependencies: 'Dependencies',
      files: 'Files',
      description: 'Description',
      active: 'Active',
      warning: 'Warning',
      error: 'Error',
      closeDetails: 'Close',
    },
    ar: {
      title: 'خريطة التطبيق - نظام ULM',
      subtitle: 'نظام إدارة مستخدمين متقدم مع مصادقة JWT وإدارة الرموز وسجل API وسجل التطوير',
      systemDescription: 'ULM (مدير تسجيل دخول المستخدم) هو نظام إدارة مستخدمين كامل مبني على React للعميل و FastAPI للخادم. يوفر النظام: مصادقة آمنة مع JWT + Refresh Tokens، إدارة الصلاحيات، إلغاء تنشيط المستخدمين المجدول، تتبع سجل النشاط، التحكم في الرموز على مستوى المستخدم، سجل API كامل (Backend + Frontend)، عارض قاعدة بيانات ديناميكي، وسجل تطوير متقدم. 19 عنصراً، 13 جدول DB، 28+ endpoints، يدعم 3 لغات مع RTL كامل.',
      howSystemWorks: 'كيف يعمل النظام؟',
      frontend: 'الواجهة الأمامية',
      backend: 'الخلفية',
      database: 'قاعدة البيانات',
      clickToView: 'انقر لعرض التفاصيل',
      technology: 'التكنولوجيا',
      status: 'الحالة',
      endpoints: 'نقاط النهاية',
      dependencies: 'التبعيات',
      files: 'الملفات',
      description: 'الوصف',
      active: 'نشط',
      warning: 'تحذير',
      error: 'خطأ',
      closeDetails: 'إغلاق',
    }
  };

  const mapElements: MapElement[] = [
    // Frontend Layer
    {
      id: 'frontend-react',
      type: 'frontend',
      name: 'React Application',
      description: 'אפליקציית SPA (Single Page Application) המספקת ממשק משתמש מתקדם עם ניווט client-side, ניהול state גלובלי, ותמיכה מלאה ב-RTL ו-3 שפות. האפליקציה בנויה על React 18 עם TypeScript לבטיחות טיפוסים ו-Vite לבנייה מהירה. כוללת routing עם React Router, ניהול טפסים, modals אינטראקטיביים ותקשורת עם Backend דרך Axios.',
      tech: 'React 18 + TypeScript + Vite',
      files: [
        'src/App.tsx',
        'src/components/',
        'src/api/axios.config.ts'
      ],
      dependencies: ['backend-api', 'auth-service', 'frontend-logger'],
      status: 'active'
    },
    {
      id: 'frontend-components',
      type: 'frontend',
      name: 'UI Components',
      description: 'אוסף קומפוננטות React מודולריות וניתנות לשימוש חוזר: Dashboard עם סטטיסטיקות, UsersTable עם חיפוש וסינון, LoginPage, Sidebar עם תפריט מתקפל, Modals לעריכה והוספת משתמשים, TokenControl לבקרת טוקנים, ApplicationMap למיפוי המערכת, ועוד. כל קומפוננטה עצמאית עם CSS משלה ותמיכה מלאה בדארק מוד ו-RTL.',
      tech: 'React Components',
      files: [
        'Dashboard.tsx',
        'UsersTable.tsx',
        'LoginPage.tsx',
        'Sidebar.tsx',
        'TokenControl.tsx'
      ],
      dependencies: ['frontend-react'],
      status: 'active'
    },
    {
      id: 'api-logs-viewer',
      type: 'frontend',
      name: 'API Logs Viewer',
      description: 'קומפוננטה מתקדמת לצפייה וניתוח לוגים של Backend ו-Frontend. מציגה טבלת logs עם סינון לפי method, endpoint, status, user, וטווח תאריכים. כוללת search, pagination, export ל-CSV, וצפייה מפורטת של request/response bodies. תומכת בצבעים לפי סטטוס (200=ירוק, 4xx=כתום, 5xx=אדום) ומציגה duration, timestamps, וerror messages.',
      tech: 'React + TypeScript + CSS',
      files: [
        'components/APILogs/APILogs.tsx',
        'components/APILogs/APILogs.css'
      ],
      dependencies: ['frontend-react', 'api-logs-service'],
      status: 'active'
    },
    {
      id: 'database-viewer',
      type: 'frontend',
      name: 'Database Viewer',
      description: 'קומפוננטה דינמית לצפייה בכל טבלאות מסד הנתונים. מושכת רשימת טבלאות מ-information_schema, מציגה את המבנה (columns + types) ואת הנתונים בטבלה. כוללת search, pagination, sorting, ו-CSV export. 100% דינמית - תומכת בכל טבלה חדשה ללא שינוי קוד. מציגה גם סטטיסטיקות (row count, size).',
      tech: 'React + TypeScript + CSS',
      files: [
        'components/DatabaseViewer/DatabaseViewer.tsx',
        'components/DatabaseViewer/DatabaseViewer.css'
      ],
      dependencies: ['frontend-react', 'database-viewer-service'],
      status: 'active'
    },
    {
      id: 'dev-journal-viewer',
      type: 'frontend',
      name: 'Development Journal',
      description: 'מערכת מלאה לתיעוד סשני פיתוח. מציגה רשימת סשנים עם title, duration, dates. כל סשן ניתן לפתוח ולצפות בצעדים כרונולוגיים (user prompt, AI understanding, actions, result) ובמצב מערכת (before/after). כוללת 3 קומפוננטות: DevJournal (רשימה), SessionSteps (צעדים), SystemState (מצב). תומכת ב-tabs נפרדים לכל view.',
      tech: 'React + TypeScript + CSS',
      files: [
        'components/DevJournal/DevJournal.tsx',
        'components/DevJournal/SessionSteps.tsx',
        'components/DevJournal/SystemState.tsx'
      ],
      dependencies: ['frontend-react', 'dev-journal-service'],
      status: 'active'
    },
    
    // Backend Layer
    {
      id: 'backend-api',
      type: 'backend',
      name: 'FastAPI Application',
      description: 'שרת API מלא מבוסס Python FastAPI + Uvicorn. מספק REST API עם תיעוד אוטומטי (Swagger UI), אימות JWT, ניהול משתמשים, ניהול טוקנים, השבתות מתוזמנות, ועוד. כולל CORS middleware לתקשורת עם Frontend, middleware לניהול טוקנים, health checks (/, /health, /ready), וטיפול מתקדם בשגיאות. כל ה-endpoints מנוהלים דרך APIRouter במבנה modular.',
      tech: 'Python 3.11 + FastAPI + Uvicorn',
      endpoints: [
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'GET /health',
        'GET /ready'
      ],
      files: ['app/main.py', 'app/api/'],
      dependencies: ['database-postgres', 'auth-service'],
      status: 'active'
    },
    {
      id: 'auth-service',
      type: 'service',
      name: 'Authentication Service',
      description: 'שירות אימות מאובטח מבוסס JWT + Refresh Token. מטפל בתהליך Login (שליחת username/password), שמירת Access Token ב-memory ו-Refresh Token ב-httpOnly cookie, רענון אוטומטי של טוקנים דרך interceptors, Logout מלא, ואימות משתמש שוטף. משתמש ב-python-jose לקידוד/פענוח JWT ו-passlib (bcrypt) לבדיקת סיסמאות.',
      tech: 'JWT + bcrypt',
      endpoints: [
        'POST /auth/login',
        'POST /auth/refresh',
        'POST /auth/logout',
        'GET /auth/me'
      ],
      files: ['app/api/routes/auth.py', 'app/core/security.py'],
      dependencies: ['database-postgres'],
      status: 'active'
    },
    {
      id: 'token-service',
      type: 'service',
      name: 'Token Settings Service',
      description: 'שירות לניהול זמני תוקף מותאמים אישית לכל משתמש. מאפשר למשתמש לקבוע כמה זמן Access Token ו-Refresh Token שלו יהיו תקפים (access_token_expire: 5-120 דקות, refresh_token_expire: 1-30 ימים). כולל איפוס להגדרות ברירת מחדל. ההגדרות נשמרות בטבלת user_token_settings ונאכפות בזמן יצירת טוקנים חדשים.',
      tech: 'FastAPI + PostgreSQL',
      endpoints: [
        'GET /token-settings/',
        'PUT /token-settings/',
        'POST /token-settings/reset'
      ],
      files: ['app/api/routes/token_settings.py'],
      dependencies: ['database-postgres', 'auth-service'],
      status: 'active'
    },
    {
      id: 'user-status-service',
      type: 'service',
      name: 'User Status Management',
      description: 'שירות לניהול סטטוס משתמשים (active/inactive) והשבתות מתוזמנות. מאפשר השבתה מיידית או מתוזמנת לעתיד, ביטול תזמון, הפעלה מחדש, וצפייה בהיסטוריית פעילות. משתמש ב-APScheduler לתזמון השבתות אוטומטיות. כל פעולה נשמרת בטבלת user_activity_history עם timestamp, סוג פעולה, ומשתמש מבצע. תומך גם בסטטיסטיקות רוחב-מערכתיות.',
      tech: 'FastAPI + APScheduler',
      endpoints: [
        'POST /users/{id}/deactivate',
        'POST /users/{id}/reactivate',
        'GET /users/{id}/status',
        'GET /users/{id}/activity-history'
      ],
      files: ['app/api/routes/user_status.py', 'app/core/scheduler.py'],
      dependencies: ['database-postgres', 'auth-service'],
      status: 'active'
    },
    {
      id: 'api-logger-middleware',
      type: 'service',
      name: 'API Logger Middleware',
      description: 'Middleware אוטומטי שמתעד כל בקשת API ב-Backend. לוכד method, endpoint, headers, request/response bodies, status code, duration, user_id, ועוד. משתמש ב-BackgroundTask של Starlette לשמירה אסינכרונית ל-DB ללא blocking של ה-response. תומך ב-filtering של endpoints רגישים ושמירת error stack traces. כולל 5 indexes לחיפוש מהיר.',
      tech: 'Starlette Middleware + asyncpg',
      endpoints: [
        'GET /api/v1/logs/backend',
        'GET /api/v1/logs/backend/stats',
        'POST /api/v1/logs/backend/clear'
      ],
      files: ['app/middleware/api_logger.py', 'app/api/routes/api_logs.py'],
      dependencies: ['database-postgres', 'backend-api'],
      status: 'active'
    },
    {
      id: 'frontend-logger',
      type: 'service',
      name: 'Frontend Logger Service',
      description: 'שירות logging בצד Frontend המתעד כל בקשת API דרך Axios interceptors. לוכד method, URL, headers, request/response data, duration, session_id, browser info, ועוד. משתמש ב-batching (שומר 10 logs ב-memory ושולח ב-batch אחד) להפחתת עומס. תומך ב-retry logic ו-offline mode. כל log נשמר בטבלת api_logs_frontend.',
      tech: 'Axios Interceptors + TypeScript',
      endpoints: [
        'POST /api/v1/logs/frontend/batch',
        'GET /api/v1/logs/frontend',
        'POST /api/v1/logs/frontend/clear'
      ],
      files: ['api/apiLogger.ts', 'api/axios.config.ts'],
      dependencies: ['frontend-react', 'api-logger-middleware'],
      status: 'active'
    },
    {
      id: 'api-logs-service',
      type: 'service',
      name: 'API Logs Service',
      description: 'שירות מלא לניהול וצפייה בלוגים של Backend ו-Frontend. מספק endpoints לשליפת logs עם filters (method, endpoint, status, user, dates), סטטיסטיקות (requests per hour, top endpoints, error rates, avg duration), וניקוי logs ישנים. כולל pagination, sorting, וsearch. תומך ב-JSON export.',
      tech: 'FastAPI + PostgreSQL',
      endpoints: [
        'GET /api/v1/logs/backend',
        'GET /api/v1/logs/frontend',
        'GET /api/v1/logs/backend/stats',
        'GET /api/v1/logs/frontend/stats'
      ],
      files: ['app/api/routes/api_logs.py', 'app/models/api_logs.py'],
      dependencies: ['database-postgres', 'auth-service'],
      status: 'active'
    },
    {
      id: 'database-viewer-service',
      type: 'service',
      name: 'Database Viewer Service',
      description: 'שירות דינמי לצפייה במבנה ובתוכן של כל טבלאות ה-DB. משתמש ב-information_schema לשליפת רשימת טבלאות, columns, types, constraints. מספק endpoints לשליפת נתונים מכל טבלה עם pagination, filtering, ו-sorting. 100% דינמי - תומך בכל טבלה חדשה ללא שינוי קוד. כולל גם סטטיסטיקות (row count, table size).',
      tech: 'FastAPI + information_schema',
      endpoints: [
        'GET /api/v1/database/tables',
        'GET /api/v1/database/tables/{name}/schema',
        'GET /api/v1/database/tables/{name}/data'
      ],
      files: ['app/api/routes/database_viewer.py'],
      dependencies: ['database-postgres', 'auth-service'],
      status: 'active'
    },
    {
      id: 'dev-journal-service',
      type: 'service',
      name: 'Development Journal Service',
      description: 'שירות מלא לתיעוד וניהול סשני פיתוח. מאפשר יצירת סשן חדש, הוספת צעדים (user prompt, AI understanding, actions, result), תיעוד מצב מערכת (before/after), וצפייה בהיסטוריה מלאה. כולל 12 endpoints ל-CRUD מלא. תומך ב-duration tracking, instructions_for_next, ו-JSON export. שומר 3 טבלאות: sessions, steps, system_states.',
      tech: 'FastAPI + PostgreSQL',
      endpoints: [
        'GET /api/v1/dev-journal/sessions',
        'POST /api/v1/dev-journal/sessions',
        'GET /api/v1/dev-journal/sessions/{id}/steps',
        'POST /api/v1/dev-journal/steps',
        'GET /api/v1/dev-journal/ai/project-context'
      ],
      files: ['app/api/routes/dev_journal.py', 'app/models/dev_journal.py'],
      dependencies: ['database-postgres', 'auth-service'],
      status: 'active'
    },
    
    // API Routes
    {
      id: 'api-router',
      type: 'route',
      name: 'API Router',
      description: 'נתב API ראשי המרכז את כל ה-routes. מנהל 28+ endpoints במבנה modular עם prefix /api/v1. כולל routes לאימות, ניהול משתמשים, token settings, user status, logging, database viewer, ו-dev journal. כל route מגדיר tags לתיעוד Swagger ו-dependencies לאימות.',
      tech: 'FastAPI Router',
      endpoints: ['/api/v1/*'],
      files: ['app/api/v1/router.py'],
      dependencies: ['auth-service', 'token-service', 'user-status-service', 'api-logs-service', 'database-viewer-service', 'dev-journal-service'],
      status: 'active'
    },
    
    // Database Layer
    {
      id: 'database-postgres',
      type: 'database',
      name: 'PostgreSQL Database',
      description: 'מסד נתונים יחסי מלא (ulm_db) עם 13 טבלאות: users (משתמשים + אימות), roles (הרשאות), refresh_tokens (טוקני רענון), password_resets (איפוס סיסמאות), token_settings (הגדרות טוקנים אישיות), scheduled_user_actions (פעולות מתוזמנות), sessions (סשנים פעילים), user_activity_history (היסטוריה), api_logs_backend (לוגים Backend), api_logs_frontend (לוגים Frontend), development_sessions (יומן פיתוח), development_steps (צעדי פיתוח), system_states (מצב מערכת). כולל 10+ indexes, foreign keys, ותמיכה מלאה ב-async operations דרך asyncpg.',
      tech: 'PostgreSQL 17',
      files: [
        'users, roles, refresh_tokens',
        'token_settings, sessions',
        'api_logs_backend, api_logs_frontend',
        'development_sessions, development_steps, system_states'
      ],
      status: 'active'
    },
    {
      id: 'user-model',
      type: 'model',
      name: 'User Model',
      description: 'מודל משתמש עם פרטים מלאים',
      tech: 'SQLAlchemy ORM',
      files: ['app/models/user.py', 'app/schemas/user.py'],
      dependencies: ['database-postgres'],
      status: 'active'
    },
    {
      id: 'token-model',
      type: 'model',
      name: 'Refresh Token Model',
      description: 'מודל Refresh Tokens עם מעקב מכשירים',
      tech: 'SQLAlchemy ORM',
      files: ['app/models/refresh_token.py'],
      dependencies: ['database-postgres'],
      status: 'active'
    },
    {
      id: 'scheduler',
      type: 'service',
      name: 'Task Scheduler',
      description: 'מתזמן משימות להשבתות אוטומטיות',
      tech: 'APScheduler',
      files: ['app/core/scheduler.py'],
      dependencies: ['database-postgres', 'user-status-service'],
      status: 'active'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#999';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'frontend': return '🎨';
      case 'backend': return '⚙️';
      case 'database': return '🗄️';
      case 'api': return '🔌';
      case 'service': return '🛠️';
      case 'model': return '📦';
      case 'route': return '🛤️';
      default: return '📍';
    }
  };

  const handleElementClick = (element: MapElement) => {
    setSelectedElement(element);
  };

  return (
    <div className={`application-map ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="map-header">
        <h1 className="map-title">{t[language].title}</h1>
        <p className="map-subtitle">{t[language].subtitle}</p>
        <div className="system-description">
          <h3>{t[language].howSystemWorks}</h3>
          <p>{t[language].systemDescription}</p>
        </div>
      </div>

      <div className="map-container">
        {/* Frontend Layer */}
        <div className="map-layer frontend-layer">
          <h2 className="layer-title">{t[language].frontend}</h2>
          <div className="layer-elements">
            {mapElements
              .filter(el => el.type === 'frontend')
              .map(element => (
                <div
                  key={element.id}
                  className={`map-element ${hoveredElement === element.id ? 'hovered' : ''}`}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredElement(element.id)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{ borderColor: getStatusColor(element.status) }}
                >
                  <div className="element-icon">{getTypeIcon(element.type)}</div>
                  <div className="element-name">{element.name}</div>
                  <div className="element-tech">{element.tech.split('+')[0]}</div>
                  <div 
                    className="element-status"
                    style={{ backgroundColor: getStatusColor(element.status) }}
                  >
                    {t[language][element.status as keyof typeof t.he]}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Services & Routes Layer */}
        <div className="map-layer services-layer">
          <h2 className="layer-title">Services & Routes</h2>
          <div className="layer-elements">
            {mapElements
              .filter(el => el.type === 'service' || el.type === 'route')
              .map(element => (
                <div
                  key={element.id}
                  className={`map-element ${hoveredElement === element.id ? 'hovered' : ''}`}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredElement(element.id)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{ borderColor: getStatusColor(element.status) }}
                >
                  <div className="element-icon">{getTypeIcon(element.type)}</div>
                  <div className="element-name">{element.name}</div>
                  <div className="element-tech">{element.tech.split('+')[0]}</div>
                  <div 
                    className="element-status"
                    style={{ backgroundColor: getStatusColor(element.status) }}
                  >
                    {t[language][element.status as keyof typeof t.he]}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Backend Layer */}
        <div className="map-layer backend-layer">
          <h2 className="layer-title">{t[language].backend}</h2>
          <div className="layer-elements">
            {mapElements
              .filter(el => el.type === 'backend')
              .map(element => (
                <div
                  key={element.id}
                  className={`map-element ${hoveredElement === element.id ? 'hovered' : ''}`}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredElement(element.id)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{ borderColor: getStatusColor(element.status) }}
                >
                  <div className="element-icon">{getTypeIcon(element.type)}</div>
                  <div className="element-name">{element.name}</div>
                  <div className="element-tech">{element.tech.split('+')[0]}</div>
                  <div 
                    className="element-status"
                    style={{ backgroundColor: getStatusColor(element.status) }}
                  >
                    {t[language][element.status as keyof typeof t.he]}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Database & Models Layer */}
        <div className="map-layer database-layer">
          <h2 className="layer-title">{t[language].database}</h2>
          <div className="layer-elements">
            {mapElements
              .filter(el => el.type === 'database' || el.type === 'model')
              .map(element => (
                <div
                  key={element.id}
                  className={`map-element ${hoveredElement === element.id ? 'hovered' : ''}`}
                  onClick={() => handleElementClick(element)}
                  onMouseEnter={() => setHoveredElement(element.id)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{ borderColor: getStatusColor(element.status) }}
                >
                  <div className="element-icon">{getTypeIcon(element.type)}</div>
                  <div className="element-name">{element.name}</div>
                  <div className="element-tech">{element.tech.split('+')[0]}</div>
                  <div 
                    className="element-status"
                    style={{ backgroundColor: getStatusColor(element.status) }}
                  >
                    {t[language][element.status as keyof typeof t.he]}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedElement && (
        <div className="element-details-overlay" onClick={() => setSelectedElement(null)}>
          <div className="element-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedElement(null)}>
              ✕
            </button>
            
            <div className="details-header">
              <span className="details-icon">{getTypeIcon(selectedElement.type)}</span>
              <h2>{selectedElement.name}</h2>
              <span 
                className="details-status-badge"
                style={{ backgroundColor: getStatusColor(selectedElement.status) }}
              >
                {t[language][selectedElement.status as keyof typeof t.he]}
              </span>
            </div>

            <div className="details-body">
              <div className="details-section">
                <h3>{t[language].technology}</h3>
                <p className="tech-value">{selectedElement.tech}</p>
              </div>

              <div className="details-section">
                <h3>{t[language].description}</h3>
                <p>{selectedElement.description}</p>
              </div>

              {selectedElement.endpoints && selectedElement.endpoints.length > 0 && (
                <div className="details-section">
                  <h3>{t[language].endpoints}</h3>
                  <ul className="endpoints-list">
                    {selectedElement.endpoints.map((endpoint, idx) => (
                      <li key={idx}>
                        <code>{endpoint}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedElement.files && selectedElement.files.length > 0 && (
                <div className="details-section">
                  <h3>{t[language].files}</h3>
                  <ul className="files-list">
                    {selectedElement.files.map((file, idx) => (
                      <li key={idx}>
                        <code>{file}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedElement.dependencies && selectedElement.dependencies.length > 0 && (
                <div className="details-section">
                  <h3>{t[language].dependencies}</h3>
                  <div className="dependencies-list">
                    {selectedElement.dependencies.map((depId, idx) => {
                      const dep = mapElements.find(el => el.id === depId);
                      return dep ? (
                        <div key={idx} className="dependency-item">
                          <span className="dep-icon">{getTypeIcon(dep.type)}</span>
                          <span className="dep-name">{dep.name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="details-footer">
              <button className="close-details-btn" onClick={() => setSelectedElement(null)}>
                {t[language].closeDetails}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Lines (SVG overlay) */}
      <svg className="connection-lines">
        {/* Draw connection lines between elements */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#666" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};


