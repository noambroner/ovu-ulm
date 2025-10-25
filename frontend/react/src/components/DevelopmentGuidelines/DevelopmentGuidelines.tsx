import { useState } from 'react';
import './DevelopmentGuidelines.css';

interface Guideline {
  id: string;
  category: 'deployment' | 'architecture' | 'coding' | 'database' | 'security' | 'testing';
  title: string;
  content: string;
  importance: 'critical' | 'high' | 'medium';
  examples?: string[];
}

interface DevelopmentGuidelinesProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const DevelopmentGuidelines = ({ language, theme }: DevelopmentGuidelinesProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedGuideline, setExpandedGuideline] = useState<string | null>(null);

  const t = {
    he: {
      title: 'הנחיות וכללי פיתוח',
      subtitle: 'מדריך מקיף לפיתוח, deployment ותחזוקה של מערכת ULM',
      allCategories: 'כל הקטגוריות',
      deployment: 'Deployment',
      architecture: 'ארכיטקטורה',
      coding: 'כללי קוד',
      database: 'מסד נתונים',
      security: 'אבטחה',
      testing: 'בדיקות',
      importance: 'חשיבות',
      critical: 'קריטי',
      high: 'גבוה',
      medium: 'בינוני',
      examples: 'דוגמאות',
      clickToExpand: 'לחץ להרחבה',
      devJournalNote: 'לפרטים נוספים על סשני פיתוח קודמים, עיין ביומן הפיתוח',
      viewDevJournal: 'צפה ביומן פיתוח'
    },
    en: {
      title: 'Development Guidelines',
      subtitle: 'Comprehensive guide for development, deployment and maintenance of ULM system',
      allCategories: 'All Categories',
      deployment: 'Deployment',
      architecture: 'Architecture',
      coding: 'Coding Standards',
      database: 'Database',
      security: 'Security',
      testing: 'Testing',
      importance: 'Importance',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      examples: 'Examples',
      clickToExpand: 'Click to expand',
      devJournalNote: 'For more details on previous development sessions, see Development Journal',
      viewDevJournal: 'View Development Journal'
    },
    ar: {
      title: 'إرشادات التطوير',
      subtitle: 'دليل شامل للتطوير والنشر والصيانة لنظام ULM',
      allCategories: 'جميع الفئات',
      deployment: 'النشر',
      architecture: 'الهيكلة',
      coding: 'معايير الكود',
      database: 'قاعدة البيانات',
      security: 'الأمان',
      testing: 'الاختبار',
      importance: 'الأهمية',
      critical: 'حرج',
      high: 'عالي',
      medium: 'متوسط',
      examples: 'أمثلة',
      clickToExpand: 'انقر للتوسيع',
      devJournalNote: 'لمزيد من التفاصيل حول جلسات التطوير السابقة، راجع يومية التطوير',
      viewDevJournal: 'عرض يومية التطوير'
    }
  };

  const guidelines: Guideline[] = [
    {
      id: 'deploy-frontend',
      category: 'deployment',
      title: 'Deployment של Frontend (React)',
      importance: 'critical',
      content: `חובה להעלות קבצים לשני מיקומים!
      
**שרת Frontend:** ploi@64.176.173.105
**SSH Key:** ~/.ssh/ovu_key
**תיקיית העבודה:** /home/ploi/ulm-rct.ovu.co.il/
**תיקיית Nginx (קריטי!):** /home/ploi/ulm-rct.ovu.co.il/public/

Nginx מגיש קבצים מתיקיית public/ ולא מהתיקייה הראשית!`,
      examples: [
        'cd /home/noam/projects/dev/ovu-ulm/frontend/react',
        'npm run build',
        'scp -i ~/.ssh/ovu_key -r dist/* ploi@64.176.173.105:/home/ploi/ulm-rct.ovu.co.il/',
        'ssh -i ~/.ssh/ovu_key ploi@64.176.173.105 "cp -rf /home/ploi/ulm-rct.ovu.co.il/*.html /home/ploi/ulm-rct.ovu.co.il/public/ && cp -rf /home/ploi/ulm-rct.ovu.co.il/assets/* /home/ploi/ulm-rct.ovu.co.il/public/assets/"'
      ]
    },
    {
      id: 'deploy-backend',
      category: 'deployment',
      title: 'Deployment של Backend (FastAPI)',
      importance: 'critical',
      content: `העלאה נכונה של Backend והפעלה מחדש של השירות.

**שרת Backend:** ploi@64.176.171.223
**SSH Key:** ~/.ssh/ovu_key
**תיקיית העבודה:** /home/ploi/ovu-ulm/backend/
**פורט:** 8001`,
      examples: [
        'cd /home/noam/projects/dev/ovu-ulm/backend',
        'scp -i ~/.ssh/ovu_key -r app/ ploi@64.176.171.223:/home/ploi/ovu-ulm/backend/',
        'ssh -i ~/.ssh/ovu_key ploi@64.176.171.223 "cd /home/ploi/ovu-ulm/backend && pkill -f \'uvicorn.*ulm\' && nohup venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 > /dev/null 2>&1 &"'
      ]
    },
    {
      id: 'database-migrations',
      category: 'database',
      title: 'הרצת Migrations',
      importance: 'critical',
      content: `כל שינוי בסכמת ה-DB דורש migration script.

**מיקום:** backend/migrations/
**חיבור לDB:** psql -h 64.176.171.223 -U ulm_user -d ulm_db

כל migration חייב לכלול:
1. ALTER TABLE statements
2. CREATE INDEX (אם צריך)
3. COMMENT ON COLUMN (תיעוד)
4. בדיקת קיום לפני יצירה (IF NOT EXISTS)`,
      examples: [
        'psql -h 64.176.171.223 -U ulm_user -d ulm_db -f backend/migrations/add_source_tracking_to_api_logs.sql',
        '-- Example migration:',
        'ALTER TABLE api_logs_backend ADD COLUMN IF NOT EXISTS origin VARCHAR(255);',
        'CREATE INDEX IF NOT EXISTS ix_api_logs_backend_app_source ON api_logs_backend (app_source);'
      ]
    },
    {
      id: 'sqlalchemy-models',
      category: 'database',
      title: 'עדכון SQLAlchemy Models',
      importance: 'high',
      content: `אחרי הרצת migration, חובה לעדכן את המודלים ב-SQLAlchemy.

**מיקום:** backend/app/models/

שימו לב:
1. כל עמודה חדשה צריכה להיות מוגדרת במודל
2. יש לציין nullable=True/False
3. יש להוסיף index=True לעמודות שצריכות אינדקס
4. חובה שיוויון בין DB למודל`,
      examples: [
        'from sqlalchemy import Column, String, Text',
        'class APILogBackend(Base):',
        '    origin = Column(String(255), nullable=True)',
        '    referer = Column(Text, nullable=True)',
        '    app_source = Column(String(100), index=True, nullable=True)'
      ]
    },
    {
      id: 'api-endpoints',
      category: 'architecture',
      title: 'יצירת API Endpoints',
      importance: 'high',
      content: `כל endpoint חייב לכלול:

1. **Type Hints מלאים** (Request, Response)
2. **Authentication** (דרך dependencies)
3. **Error Handling** (try-except)
4. **Logging** (במידת הצורך)
5. **Documentation** (docstring)

השתמש ב-Pydantic Models לvalidation.`,
      examples: [
        '@router.get("/logs/backend", response_model=LogsResponse)',
        'async def get_backend_logs(',
        '    skip: int = 0,',
        '    limit: int = 50,',
        '    current_user: dict = Depends(require_admin)',
        ') -> dict:',
        '    """Retrieve backend API logs"""',
        '    # Implementation...'
      ]
    },
    {
      id: 'response-serialization',
      category: 'coding',
      title: 'Serialization של Response',
      importance: 'critical',
      content: `חובה להחזיר את כל השדות הרלוונטיים מה-DB ב-API Response!

בעיה נפוצה: הוספת עמודות ל-DB אבל לא הכללתן ב-Response Dictionary.

פתרון: ודא שכל שדה מהמודל מוחזר במפורש ב-dict שהAPI מחזיר.`,
      examples: [
        '# ❌ Wrong - לא מחזיר שדות חדשים:',
        'return {',
        '    "id": log.id,',
        '    "timestamp": log.timestamp',
        '    # Missing: origin, referer, app_source',
        '}',
        '',
        '# ✅ Correct - מחזיר הכל:',
        'return {',
        '    "id": log.id,',
        '    "timestamp": log.timestamp,',
        '    "origin": log.origin,',
        '    "referer": log.referer,',
        '    "app_source": log.app_source',
        '}'
      ]
    },
    {
      id: 'frontend-api-types',
      category: 'coding',
      title: 'TypeScript Interfaces בFrontend',
      importance: 'high',
      content: `כל תוספת שדה ב-Backend דורשת עדכון של ה-Interface ב-Frontend.

**מיקום:** src/components/[Component]/[Component].tsx

חובה:
1. להוסיף שדות חדשים ל-interface
2. לעדכן את התצוגה (JSX)
3. להוסיף תרגום (i18n) לשדות חדשים`,
      examples: [
        'interface LogEntry {',
        '  id: number;',
        '  timestamp: string;',
        '  user_ip: string;',
        '  // New fields:',
        '  origin?: string;',
        '  referer?: string;',
        '  app_source?: string;',
        '}'
      ]
    },
    {
      id: 'multilingual',
      category: 'coding',
      title: 'תמיכה רב-לשונית (i18n)',
      importance: 'high',
      content: `המערכת תומכת ב-3 שפות: עברית, אנגלית, ערבית.

כל טקסט בממשק חייב להיות מתורגם!

**מיקום:** אובייקט t בתוך כל קומפוננטה

שימו לב:
1. עברית וערבית דורשות RTL
2. כל label/title/description צריך תרגום
3. הודעות שגיאה גם כן`,
      examples: [
        'const t = {',
        '  he: {',
        '    title: "כותרת בעברית",',
        '    sourceIP: "מקור (IP)"',
        '  },',
        '  en: {',
        '    title: "Title in English",',
        '    sourceIP: "Source (IP)"',
        '  },',
        '  ar: {',
        '    title: "العنوان بالعربية",',
        '    sourceIP: "المصدر (IP)"',
        '  }',
        '}'
      ]
    },
    {
      id: 'axios-interceptors',
      category: 'architecture',
      title: 'Axios Interceptors',
      importance: 'high',
      content: `כל בקשת API דרך Axios עוברת דרך interceptors שמוסיפים:

1. **Authorization Header** (JWT Token)
2. **X-App-Source Header** (זיהוי מקור הבקשה)
3. **Token Refresh** (אוטומטי במקרה של 401)

**מיקום:** frontend/react/src/api/axios.config.ts`,
      examples: [
        'const api = axios.create({',
        '  baseURL: API_URL,',
        '  headers: {',
        '    "Content-Type": "application/json",',
        '    "X-App-Source": "ulm-react-web"',
        '  }',
        '});'
      ]
    },
    {
      id: 'api-logging',
      category: 'architecture',
      title: 'API Logging',
      importance: 'high',
      content: `המערכת כוללת מנגנון logging מלא לכל קריאות API:

**Backend Logging:**
- Middleware: APILoggerMiddleware
- טבלה: api_logs_backend
- מתועד: endpoint, method, status, duration, user, IP, origin, referer, app_source

**Frontend Logging:**
- Service: apiLogger.ts
- טבלה: api_logs_frontend  
- Batching: 5 logs או 30 שניות
- מתועד: endpoint, status, duration, session_id, origin, referer, app_source`,
      examples: [
        '// Backend - APILoggerMiddleware auto-logs all requests',
        '',
        '// Frontend - apiLogger batches and sends logs',
        'apiLogger.log({',
        '  endpoint: "/api/v1/users",',
        '  method: "GET",',
        '  status_code: 200,',
        '  duration_ms: 150',
        '});'
      ]
    },
    {
      id: 'authentication',
      category: 'security',
      title: 'אימות והרשאות',
      importance: 'critical',
      content: `המערכת משתמשת ב-JWT + Refresh Tokens.

**Access Token:** חי 15 דקות
**Refresh Token:** חי 7 ימים

**Dependencies:**
- require_auth: משתמש מחובר
- require_admin: ניהול בלבד
- require_superadmin: superadmin בלבד

**Middleware:**
- AuthContextMiddleware: מחלץ user מ-JWT ושם ב-request.state.user`,
      examples: [
        '@router.get("/admin-only")',
        'async def admin_endpoint(',
        '    current_user: dict = Depends(require_admin)',
        '):',
        '    # Only admins can access',
        '    return {"message": "Admin access"}',
        '',
        '# Middleware order (in main.py):',
        'app.add_middleware(APILoggerMiddleware)  # Second',
        'app.add_middleware(AuthContextMiddleware)  # First (runs before logger)'
      ]
    },
    {
      id: 'git-workflow',
      category: 'coding',
      title: 'Git Workflow',
      importance: 'high',
      content: `תרגול Git נכון:

1. **לפני כל שינוי:** git status, git diff
2. **Commit messages:** תיאור ברור בעברית או אנגלית
3. **אחרי deployment מוצלח:** git add, git commit, git push
4. **לא לעשות:** force push, hard reset (אלא אם נדרש במפורש)

כל deployment מוצלח צריך להתועד ב-Git.`,
      examples: [
        'git status',
        'git add backend/app/models/api_logs.py',
        'git add frontend/react/src/components/APILogs/',
        'git commit -m "הוספת מעקב מקור (origin, referer, app_source) ללוגים"',
        'git push'
      ]
    },
    {
      id: 'dev-journal',
      category: 'architecture',
      title: 'יומן פיתוח (Development Journal)',
      importance: 'high',
      content: `המערכת כוללת יומן פיתוח אוטומטי שמתעד:

**Sessions:** כל סשן פיתוח
- כותרת, זמן התחלה/סיום, משך
- סיכום והנחיות למשך הבא

**Steps:** כל צעד בסשן
- פעולה, קוד, תוצאה
- הצלחה/כישלון

**System States:** מצב המערכת
- קבצים, קונפיגורציות, משתנים

⚠️ **חשוב:** לפני התחלת פיתוח, קרא את הסשנים הקודמים!`,
      examples: [
        '# View sessions:',
        'GET /api/v1/dev-journal/sessions',
        '',
        '# View specific session:',
        'GET /api/v1/dev-journal/sessions/{session_id}/steps',
        '',
        '# או בממשק:',
        'ניהול → יומן פיתוח'
      ]
    },
    {
      id: 'cache-clearing',
      category: 'deployment',
      title: 'ניקוי Cache לאחר Deployment',
      importance: 'high',
      content: `לאחר deployment של Frontend, יש 2 רמות של cache:

**1. Cloudflare Cache:**
- Dashboard: dash.cloudflare.com
- אפשרויות: Purge Everything או Custom Purge

**2. Browser Cache:**
- Hard Refresh: Ctrl+Shift+R (Windows/Linux) או Cmd+Shift+R (Mac)
- DevTools: Application → Storage → Clear site data
- Incognito: לבדיקה מהירה ללא cache

⚠️ לפעמים צריך לנקות שניהם!`,
      examples: [
        '# אימות שהקבצים הנכונים נטענים:',
        'curl -s https://ulm-rct.ovu.co.il/ | grep -o "index-[^\"]*\\.js"',
        '',
        '# צריך להחזיר את שם הקובץ האחרון שיצרת ב-npm run build'
      ]
    },
    {
      id: 'error-handling',
      category: 'coding',
      title: 'Error Handling',
      importance: 'high',
      content: `כל קוד שמבצע פעולות I/O חייב error handling:

**Backend:**
- try-except סביב DB queries
- HTTPException עם status codes נכונים
- הודעות שגיאה מפורטות

**Frontend:**
- try-catch סביב axios calls
- הצגת הודעות שגיאה ידידותיות למשתמש
- טיפול ב-401 (token expired)`,
      examples: [
        '# Backend:',
        'try:',
        '    result = await conn.fetch("SELECT ...")',
        'except Exception as e:',
        '    raise HTTPException(status_code=500, detail=str(e))',
        '',
        '# Frontend:',
        'try {',
        '  const response = await axios.get("/api/...");',
        '} catch (error: any) {',
        '  setError(error.response?.data?.detail || "Failed to fetch");',
        '}'
      ]
    }
  ];

  const filteredGuidelines = selectedCategory === 'all' 
    ? guidelines 
    : guidelines.filter(g => g.category === selectedCategory);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#0d6efd';
      default: return '#6c757d';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'deployment': return '🚀';
      case 'architecture': return '🏗️';
      case 'coding': return '💻';
      case 'database': return '🗄️';
      case 'security': return '🔒';
      case 'testing': return '🧪';
      default: return '📋';
    }
  };

  return (
    <div className={`dev-guidelines ${theme}`} dir={language === 'ar' || language === 'he' ? 'rtl' : 'ltr'}>
      <div className="guidelines-header">
        <h1>📚 {t[language].title}</h1>
        <p className="subtitle">{t[language].subtitle}</p>
        
        <div className="dev-journal-notice">
          <span>💡 {t[language].devJournalNote}</span>
          <a href="/dev-journal" className="journal-link">{t[language].viewDevJournal}</a>
        </div>
      </div>

      <div className="category-filter">
        <button 
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          {t[language].allCategories}
        </button>
        <button 
          className={selectedCategory === 'deployment' ? 'active' : ''}
          onClick={() => setSelectedCategory('deployment')}
        >
          🚀 {t[language].deployment}
        </button>
        <button 
          className={selectedCategory === 'architecture' ? 'active' : ''}
          onClick={() => setSelectedCategory('architecture')}
        >
          🏗️ {t[language].architecture}
        </button>
        <button 
          className={selectedCategory === 'coding' ? 'active' : ''}
          onClick={() => setSelectedCategory('coding')}
        >
          💻 {t[language].coding}
        </button>
        <button 
          className={selectedCategory === 'database' ? 'active' : ''}
          onClick={() => setSelectedCategory('database')}
        >
          🗄️ {t[language].database}
        </button>
        <button 
          className={selectedCategory === 'security' ? 'active' : ''}
          onClick={() => setSelectedCategory('security')}
        >
          🔒 {t[language].security}
        </button>
      </div>

      <div className="guidelines-grid">
        {filteredGuidelines.map((guideline) => (
          <div 
            key={guideline.id} 
            className={`guideline-card ${expandedGuideline === guideline.id ? 'expanded' : ''}`}
            onClick={() => setExpandedGuideline(expandedGuideline === guideline.id ? null : guideline.id)}
          >
            <div className="card-header">
              <div className="header-title">
                <span className="category-icon">{getCategoryIcon(guideline.category)}</span>
                <h3>{guideline.title}</h3>
              </div>
              <span 
                className="importance-badge"
                style={{ backgroundColor: getImportanceColor(guideline.importance) }}
              >
                {t[language][guideline.importance as keyof typeof t.he]}
              </span>
            </div>

            <div className="card-content">
              <pre className="guideline-text">{guideline.content}</pre>
              
              {guideline.examples && guideline.examples.length > 0 && (
                <div className="examples-section">
                  <h4>{t[language].examples}:</h4>
                  <div className="code-block">
                    {guideline.examples.map((example, idx) => (
                      <code key={idx}>{example}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {expandedGuideline !== guideline.id && (
              <div className="expand-hint">{t[language].clickToExpand}</div>
            )}
          </div>
        ))}
      </div>

      <div className="guidelines-footer">
        <p>📊 סה"כ {filteredGuidelines.length} הנחיות</p>
        <p>🔄 עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
      </div>
    </div>
  );
};

