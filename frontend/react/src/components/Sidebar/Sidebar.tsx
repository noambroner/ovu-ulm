import { useEffect, useMemo, useState } from 'react';
import './Sidebar.css';

interface MenuItem {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  path: string;
  subItems?: MenuItem[];
}

interface SidebarProps {
  menuItems: MenuItem[];
  currentPath: string;
  language: 'he' | 'en';
  theme: 'light' | 'dark';
  onNavigate: (path: string) => void;
}

const SIDEBAR_STATE_KEY = 'ulm_sidebar_state';

interface SidebarState {
  collapsed: boolean;
  expandedItems: string[];
}

const getInitialSidebarState = (): SidebarState => {
  if (typeof window === 'undefined') {
    return { collapsed: false, expandedItems: [] };
  }

  try {
    const raw = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (!raw) {
      return { collapsed: false, expandedItems: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      collapsed: Boolean(parsed?.collapsed),
      expandedItems: Array.isArray(parsed?.expandedItems) ? parsed.expandedItems : [],
    };
  } catch {
    return { collapsed: false, expandedItems: [] };
  }
};

const findAncestorIds = (items: MenuItem[], targetPath: string, parents: string[] = []): string[] | null => {
  for (const item of items) {
    if (item.path === targetPath) {
      return parents;
    }

    if (item.subItems && item.subItems.length > 0) {
      const result = findAncestorIds(item.subItems, targetPath, [...parents, item.id]);
      if (result) {
        return result;
      }
    }
  }
  return null;
};

export const Sidebar = ({ menuItems, currentPath, language, theme, onNavigate }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => getInitialSidebarState().collapsed);
  const [expandedItems, setExpandedItems] = useState<string[]>(() => getInitialSidebarState().expandedItems);

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => currentPath === path;
  const isExpanded = (itemId: string) => expandedItems.includes(itemId);

  const activeAncestors = useMemo(
    () => findAncestorIds(menuItems, currentPath) ?? [],
    [menuItems, currentPath]
  );

  useEffect(() => {
    if (activeAncestors.length === 0) return;

    setExpandedItems(prev => {
      const merged = new Set(prev);
      activeAncestors.forEach(id => merged.add(id));
      if (merged.size === prev.length && prev.every(id => merged.has(id))) {
        return prev;
      }
      return Array.from(merged);
    });
  }, [activeAncestors]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        SIDEBAR_STATE_KEY,
        JSON.stringify({ collapsed, expandedItems })
      );
    } catch {
      // Ignore persistence errors
    }
  }, [collapsed, expandedItems]);

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const expanded = isExpanded(item.id);
    const active = isActive(item.path);
    const label = language === 'he' ? item.label : item.labelEn;

    return (
      <div key={item.id} className="sidebar-menu-item">
        <div
          className={`sidebar-item ${active ? 'active' : ''} ${level > 0 ? 'sub-item' : ''}`}
          onClick={() => {
            if (hasSubItems) {
              toggleExpand(item.id);
            } else {
              onNavigate(item.path);
            }
          }}
        >
          <span className="item-icon">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="item-label">{label}</span>
              {hasSubItems && (
                <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>
                  {language === 'he' ? '◀' : '▶'}
                </span>
              )}
            </>
          )}
        </div>
        {hasSubItems && expanded && !collapsed && (
          <div className="sidebar-subitems">
            {item.subItems!.map(subItem => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${theme}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <h2 className="sidebar-title">
            {language === 'he' ? 'תפריט ראשי' : 'Main Menu'}
          </h2>
        )}
        <button className="collapse-btn" onClick={toggleCollapse} title="Toggle Sidebar">
          {collapsed ? (language === 'he' ? '◀' : '▶') : (language === 'he' ? '▶' : '◀')}
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
    </aside>
  );
};
