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
      title: 'מפת האפליקציה',
      subtitle: 'מבנה ויזואלי אינטראקטיבי של מערכת ULM',
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
      title: 'Application Map',
      subtitle: 'Interactive visual structure of ULM system',
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
      title: 'خريطة التطبيق',
      subtitle: 'بنية مرئية تفاعلية لنظام ULM',
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
      description: 'ממשק משתמש ראשי בנוי על React + TypeScript + Vite',
      tech: 'React 18 + TypeScript + Vite',
      files: [
        'src/App.tsx',
        'src/components/',
        'src/api/axios.config.ts'
      ],
      dependencies: ['backend-api', 'auth-service'],
      status: 'active'
    },
    {
      id: 'frontend-components',
      type: 'frontend',
      name: 'UI Components',
      description: 'קומפוננטות UI: Dashboard, Users, Login, Modals',
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
    
    // Backend Layer
    {
      id: 'backend-api',
      type: 'backend',
      name: 'FastAPI Application',
      description: 'שרת Backend ראשי עם FastAPI',
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
      description: 'שירות אימות JWT עם Refresh Tokens',
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
      description: 'ניהול הגדרות טוקנים למשתמש',
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
      description: 'ניהול סטטוס משתמשים והשבתות מתוזמנות',
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
    
    // API Routes
    {
      id: 'api-router',
      type: 'route',
      name: 'API Router',
      description: 'נתב API ראשי המרכז את כל ה-routes',
      tech: 'FastAPI Router',
      endpoints: ['/api/v1/*'],
      files: ['app/api/v1/router.py'],
      dependencies: ['auth-service', 'token-service', 'user-status-service'],
      status: 'active'
    },
    
    // Database Layer
    {
      id: 'database-postgres',
      type: 'database',
      name: 'PostgreSQL Database',
      description: 'מסד נתונים ראשי - ulm_db',
      tech: 'PostgreSQL 17',
      files: [
        'users table',
        'refresh_tokens table',
        'token_settings table',
        'user_activity_history table'
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

