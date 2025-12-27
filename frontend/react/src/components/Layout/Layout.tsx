import { type ReactNode } from 'react';
import './Layout.css';
import type { MenuItem, Theme, Language, UserInfo } from '../types';

interface LayoutProps {
  children: ReactNode;
  menuItems: MenuItem[];
  currentPath: string;
  language: Language;
  theme: Theme;
  userInfo: UserInfo | null;
  headerTitle: string;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onLogout: () => void;
  translations: {
    langBtn: string;
    themeBtn: (theme: Theme) => string;
    logout: string;
  };
}

export const Layout = ({
  children,
  menuItems: _menuItems,
  currentPath: _currentPath,
  language,
  theme,
  userInfo,
  headerTitle,
  onNavigate: _onNavigate,
  onToggleTheme,
  onToggleLanguage,
  onLogout,
  translations: t,
}: LayoutProps) => {
  return (
    <div className="app-layout" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Sidebar removed - using @ovu/sidebar in App.tsx instead */}

      <div className="main-layout">
        <header className="app-header">
          <h1 className="header-title">{headerTitle}</h1>
          <div className="header-controls">
            <span className="user-info">
              {userInfo?.username}
              {userInfo?.role && userInfo.role !== 'user' && ` (${userInfo.role})`}
            </span>
            <button onClick={onToggleLanguage} className="control-btn lang-btn">
              <span>{t.langBtn}</span>
            </button>
            <button onClick={onToggleTheme} className="control-btn theme-btn">
              <span>{t.themeBtn(theme)}</span>
            </button>
            <button onClick={onLogout} className="control-btn logout-btn">
              <span>{t.logout}</span>
            </button>
          </div>
        </header>

        <main className="main-container">
          {children}
        </main>
      </div>
    </div>
  );
};
