import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import api from './api/axios.config';

// Federated OVU Sidebar - loaded from remote
const OVUSidebar = lazy(() => import('sidebar/Sidebar').then(m => ({ default: m.OVUSidebar || m.default })));

// Fallback sidebar skeleton
const SidebarSkeleton = () => (
  <aside className="sidebar-skeleton" style={{
    width: '280px',
    height: '100vh',
    background: 'var(--color-surface, #1e293b)',
    position: 'fixed',
    right: 0,
    top: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid var(--color-border, #334155)',
      borderTopColor: 'var(--color-primary, #6366f1)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '14px' }}>טוען סרגל...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </aside>
);
import { Dashboard } from './components/Dashboard/Dashboard';
import { UsersTable } from './components/UsersTable/UsersTable';
import { ActiveUsers } from './components/ActiveUsers/ActiveUsers';
import { ManagePage } from './components/ManagePage/ManagePage';
import { TokenControl } from './components/TokenControl/TokenControl';
import { APIUIEndpoints } from './components/APIUIEndpoints/APIUIEndpoints';
import { APIFunctions } from './components/APIFunctions/APIFunctions';
import { ApplicationMap } from './components/ApplicationMap/ApplicationMap';
import { DatabaseViewer } from './components/DatabaseViewer/DatabaseViewer';
import { APILogs } from './components/APILogs/APILogs';
import { DevJournal, SessionSteps, SystemState } from './components/DevJournal';
import { DevelopmentGuidelines } from './components/DevelopmentGuidelines/DevelopmentGuidelines';
import './App.css';
import './components/Layout/Layout.css';

interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
}

const translations = {
  he: {
    headerTitle: 'מערכת ניהול משתמשים',
    langBtn: 'EN',
    themeBtn: (theme: string) => theme === 'light' ? '🌙' : '☀️',
    // Login
    loginTitle: 'התחברות למערכת',
    email: 'אימייל',
    password: 'סיסמה',
    loginBtn: 'התחבר',
    logout: 'התנתק',
    // Dashboard
    welcome: 'ברוך הבא',
    totalUsers: 'סה"כ משתמשים',
    activeUsers: 'משתמשים פעילים',
    activeUsersPage: 'משתמשים פעילים',
    newUsers: 'משתמשים חדשים',
    recentActivity: 'פעילות אחרונה',
    // Menu
    dashboard: 'לוח בקרה',
    users: 'משתמשים',
    allUsers: 'כל המשתמשים',
    addUser: 'הוספת משתמש',
    profile: 'פרופיל',
    settings: 'הגדרות',
    manage: 'ניהול',
    tokenControl: 'בקרת כניסה',
    applicationMap: 'מפת האפליקציה',
    databaseViewer: 'מציג מסד נתונים',
    logs: 'לוגים',
    backendLogs: 'לוג Backend',
    frontendLogs: 'לוג Frontend',
    devJournal: 'יומן פיתוח',
    devGuidelines: 'הנחיות וכללי פיתוח',
    api: 'API',
    apiUIEndpoints: 'UI Endpoints',
    apiFunctions: 'פונקציות',
    // Quick Actions
    addNewUser: 'הוסף משתמש',
    viewReports: 'צפה בדוחות',
    manageRoles: 'נהל הרשאות',
    // Activity
    userRegistered: 'משתמש חדש נרשם',
    userLoggedIn: 'משתמש התחבר',
    profileUpdated: 'פרופיל עודכן',
    passwordChanged: 'סיסמה שונתה',
  },
  en: {
    headerTitle: 'User Management System',
    langBtn: 'עב',
    themeBtn: (theme: string) => theme === 'light' ? '🌙' : '☀️',
    // Login
    loginTitle: 'Login to System',
    email: 'Email',
    password: 'Password',
    loginBtn: 'Login',
    logout: 'Logout',
    // Dashboard
    welcome: 'Welcome',
    totalUsers: 'Total Users',
    activeUsers: 'Active Users',
    activeUsersPage: 'Active Users',
    newUsers: 'New Users',
    recentActivity: 'Recent Activity',
    // Menu
    dashboard: 'Dashboard',
    users: 'Users',
    allUsers: 'All Users',
    addUser: 'Add User',
    profile: 'Profile',
    settings: 'Settings',
    manage: 'Manage',
    tokenControl: 'Token Control',
    applicationMap: 'Application Map',
    databaseViewer: 'Database Viewer',
    logs: 'Logs',
    backendLogs: 'Backend Logs',
    frontendLogs: 'Frontend Logs',
    devJournal: 'Development Journal',
    devGuidelines: 'Development Guidelines',
    api: 'API',
    apiUIEndpoints: 'UI Endpoints',
    apiFunctions: 'Functions',
    // Quick Actions
    addNewUser: 'Add User',
    viewReports: 'View Reports',
    manageRoles: 'Manage Roles',
    // Activity
    userRegistered: 'New user registered',
    userLoggedIn: 'User logged in',
    profileUpdated: 'Profile updated',
    passwordChanged: 'Password changed',
  }
};

function AppContent() {
  // API Configuration
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  useLocation(); // Keep for potential future use
  const t = translations[language];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');
    if (savedTheme) setTheme(savedTheme as 'light' | 'dark');
    if (savedLanguage) setLanguage(savedLanguage as 'he' | 'en');
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('language', language);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, language]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('ulm_token');
      const refreshToken = localStorage.getItem('ulm_refresh_token');
      
      // If no tokens at all, skip auth check
      if (!token || !refreshToken) {
        localStorage.removeItem('ulm_token');
        localStorage.removeItem('ulm_refresh_token');
        setLoading(false);
        setIsLoggedIn(false);
        return;
      }
      
      try {
        const response = await api.get('/api/v1/auth/me');
        setUserInfo(response.data);
        setIsLoggedIn(true);
      } catch (err) {
        // Clear both tokens on auth failure
        localStorage.removeItem('ulm_token');
        localStorage.removeItem('ulm_refresh_token');
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    // Listen for token removal (from axios interceptor or other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ulm_token' && !e.newValue) {
        // Token was removed, logout user
        setIsLoggedIn(false);
        setUserInfo(null);
        setLoading(false);
      }
    };

    // Listen for auth:logout event from axios interceptor (same tab)
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setUserInfo(null);
      setLoading(false);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLanguage = () => setLanguage(prev => prev === 'he' ? 'en' : 'he');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/v1/auth/login', {
        username: email,
        password: password,
      });

      // Save both tokens
      localStorage.setItem('ulm_token', response.data.access_token);
      localStorage.setItem('ulm_refresh_token', response.data.refresh_token);
      setUserInfo(response.data.user);
      setIsLoggedIn(true);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Optional: call logout endpoint
      const refreshToken = localStorage.getItem('ulm_refresh_token');
      if (refreshToken) {
        await api.post('/api/v1/auth/logout', { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local storage regardless
      localStorage.removeItem('ulm_token');
      localStorage.removeItem('ulm_refresh_token');
      setIsLoggedIn(false);
      setUserInfo(null);
      navigate('/');
    }
  };

  // Menu items now come from SAM via federated sidebar
  // Local menu config removed - managed centrally in SAM

  const stats = [
    {
      icon: '👥',
      label: t.totalUsers,
      labelEn: t.totalUsers,
      value: 1248,
      change: 12,
      color: 'blue' as const
    },
    {
      icon: '✓',
      label: t.activeUsers,
      labelEn: t.activeUsers,
      value: 847,
      change: 8,
      color: 'green' as const
    },
    {
      icon: '🆕',
      label: t.newUsers,
      labelEn: t.newUsers,
      value: 124,
      change: 15,
      color: 'purple' as const
    }
  ];

  const activities = [
    {
      id: '1',
      icon: '👤',
      message: t.userRegistered,
      messageEn: t.userRegistered,
      timestamp: language === 'he' ? '5 דקות' : '5 min ago'
    },
    {
      id: '2',
      icon: '🔓',
      message: t.userLoggedIn,
      messageEn: t.userLoggedIn,
      timestamp: language === 'he' ? '12 דקות' : '12 min ago'
    },
    {
      id: '3',
      icon: '✏️',
      message: t.profileUpdated,
      messageEn: t.profileUpdated,
      timestamp: language === 'he' ? '25 דקות' : '25 min ago'
    },
    {
      id: '4',
      icon: '🔐',
      message: t.passwordChanged,
      messageEn: t.passwordChanged,
      timestamp: language === 'he' ? 'שעה' : '1 hour ago'
    },    {      id: "5",      icon: "📧",      message: language === "he" ? "אימייל נשלח" : "Email sent",      messageEn: "Email sent",      timestamp: language === "he" ? "30 דקות" : "30 min ago"    },    {      id: "6",      icon: "🔔",      message: language === "he" ? "התראה נוצרה" : "Notification created",      messageEn: "Notification created",      timestamp: language === "he" ? "45 דקות" : "45 min ago"    },    {      id: "7",      icon: "📊",      message: language === "he" ? "דוח נוצר" : "Report generated",      messageEn: "Report generated",      timestamp: language === "he" ? "שעה" : "1 hour ago"    },    {      id: "8",      icon: "🔒",      message: language === "he" ? "הרשאה שונתה" : "Permission changed",      messageEn: "Permission changed",      timestamp: language === "he" ? "שעתיים" : "2 hours ago"    },    {      id: "9",      icon: "💾",      message: language === "he" ? "נתונים נשמרו" : "Data saved",      messageEn: "Data saved",      timestamp: language === "he" ? "שעתיים" : "2 hours ago"    },    {      id: "10",      icon: "🗑️",      message: language === "he" ? "פריט נמחק" : "Item deleted",      messageEn: "Item deleted",      timestamp: language === "he" ? "3 שעות" : "3 hours ago"    },    {      id: "11",      icon: "📝",      message: language === "he" ? "הערה נוספה" : "Note added",      messageEn: "Note added",      timestamp: language === "he" ? "4 שעות" : "4 hours ago"    },    {      id: "12",      icon: "🔄",      message: language === "he" ? "מערכת עודכנה" : "System updated",      messageEn: "System updated",      timestamp: language === "he" ? "5 שעות" : "5 hours ago"    },    {      id: "13",      icon: "✅",      message: language === "he" ? "משימה הושלמה" : "Task completed",      messageEn: "Task completed",      timestamp: language === "he" ? "6 שעות" : "6 hours ago"    },    {      id: "14",      icon: "🔗",      message: language === "he" ? "קישור נוצר" : "Link created",      messageEn: "Link created",      timestamp: language === "he" ? "7 שעות" : "7 hours ago"    },    {      id: "15",      icon: "📤",      message: language === "he" ? "קובץ הועלה" : "File uploaded",      messageEn: "File uploaded",      timestamp: language === "he" ? "8 שעות" : "8 hours ago"
    }
  ];

  const quickActions = [
    {
      label: t.addNewUser,
      labelEn: t.addNewUser,
      icon: '➕',
      onClick: () => navigate('/users/add')
    },
    {
      label: t.viewReports,
      labelEn: t.viewReports,
      icon: '📊',
      onClick: () => navigate('/reports')
    },
    {
      label: t.manageRoles,
      labelEn: t.manageRoles,
      icon: '🔑',
      onClick: () => navigate('/roles')
    }
  ];

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="app" dir={language === 'he' ? 'rtl' : 'ltr'}>
        <header className="app-header">
          <h1 className="header-title">{t.headerTitle}</h1>
          <div className="header-controls">
            <button onClick={toggleLanguage} className="control-btn lang-btn">
              <span>{t.langBtn}</span>
            </button>
            <button onClick={toggleTheme} className="control-btn theme-btn">
              <span>{t.themeBtn(theme)}</span>
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="login-card">
            <div className="logo-container">
              <div className="logo-icon">👤</div>
            </div>
            <h1 className="login-title">{t.loginTitle}</h1>
            {error && <div className="error-message">{error}</div>}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">{t.email}</label>
                <input
                  type="text"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">{t.password}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '...' : t.loginBtn}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Handle app switching from sidebar
  const handleAppSwitch = (app: any) => {
    if (app.frontendUrl && app.code !== 'ulm') {
      window.location.href = app.frontendUrl;
    }
  };

  // Handle menu item clicks
  const handleMenuItemClick = (item: any, app: any) => {
    if (app.code === 'ulm') {
      navigate(item.path);
    } else if (app.frontendUrl) {
      window.location.href = `${app.frontendUrl}${item.path}`;
    }
  };

  return (
    <div className="app-layout" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Federated OVU Sidebar */}
      <Suspense fallback={<SidebarSkeleton />}>
        <OVUSidebar
          currentApp="ulm"
          samApiUrl="https://sam.ovu.co.il/api/v1"
          language={language}
          theme={theme}
          showSearch={true}
          showUser={true}
          user={userInfo ? {
            id: userInfo.id,
            username: userInfo.username,
            email: userInfo.email,
            role: userInfo.role,
          } : undefined}
          onAppSwitch={handleAppSwitch}
          onMenuItemClick={handleMenuItemClick}
          onLogout={handleLogout}
          onSettings={() => navigate('/settings')}
        />
      </Suspense>
      
      <div className="main-layout">
        <header className="app-header">
          <h1 className="header-title">{t.headerTitle}</h1>
          <div className="header-controls">
            <span className="user-info">{userInfo?.username}</span>
            <button onClick={toggleLanguage} className="control-btn lang-btn">
              <span>{t.langBtn}</span>
            </button>
            <button onClick={toggleTheme} className="control-btn theme-btn">
              <span>{t.themeBtn(theme)}</span>
            </button>
            <button onClick={handleLogout} className="control-btn logout-btn">
              <span>{t.logout}</span>
            </button>
          </div>
        </header>

        <main className="main-container">
          <Routes>
            <Route path="/dashboard" element={
              <Dashboard
                language={language}
                theme={theme}
                stats={stats}
                activities={activities}
                quickActions={quickActions}
              />
            } />
            <Route path="/users/active" element={<ActiveUsers language={language} theme={theme} />} />
            <Route path="/users/all" element={<UsersTable language={language} theme={theme} apiEndpoint={API_URL} token={localStorage.getItem("ulm_token") || ""} />} />
            <Route path="/users/add" element={<div className="page-placeholder">➕ {t.addUser}</div>} />
            <Route path="/profile" element={<div className="page-placeholder">👤 {t.profile}</div>} />
            <Route path="/manage" element={<ManagePage language={language} theme={theme} />} />
            <Route path="/token-control" element={<TokenControl language={language} theme={theme} />} />
            <Route path="/application-map" element={<ApplicationMap language={language} theme={theme} />} />
            <Route path="/database-viewer" element={<DatabaseViewer language={language} theme={theme} />} />
            <Route path="/logs/backend" element={<APILogs language={language} theme={theme} logType="backend" />} />
            <Route path="/logs/frontend" element={<APILogs language={language} theme={theme} logType="frontend" />} />
            <Route path="/dev-journal" element={<DevJournal language={language} theme={theme} />} />
            <Route path="/dev-journal/session/:sessionId/steps" element={<SessionSteps language={language} theme={theme} />} />
            <Route path="/dev-journal/session/:sessionId/state" element={<SystemState language={language} theme={theme} />} />
            <Route path="/dev-guidelines" element={<DevelopmentGuidelines language={language} theme={theme} />} />
            <Route path="/api/ui" element={<APIUIEndpoints language={language} theme={theme} appType="ulm" />} />
            <Route path="/api/functions" element={<APIFunctions language={language} theme={theme} appType="ulm" />} />
            <Route path="*" element={<Dashboard language={language} theme={theme} stats={stats} activities={activities} quickActions={quickActions} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
