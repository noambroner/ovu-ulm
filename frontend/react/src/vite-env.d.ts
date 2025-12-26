/// <reference types="vite/client" />

// Module Federation - Remote Sidebar declarations
declare module 'sidebar/Sidebar' {
  import { FC } from 'react';
  
  interface SidebarUser {
    id: string | number;
    username: string;
    email: string;
    role: string;
    avatar?: string;
  }

  interface OVUApplication {
    id: string;
    code: string;
    name: string;
    frontendUrl?: string;
  }

  interface MenuItem {
    id: string;
    label: string;
    path: string;
    icon?: string;
  }

  interface OVUSidebarProps {
    currentApp: string;
    samApiUrl?: string;
    language?: 'he' | 'en' | 'ar';
    theme?: 'light' | 'dark' | 'system';
    collapsed?: boolean;
    showSearch?: boolean;
    showUser?: boolean;
    user?: SidebarUser;
    onAppSwitch?: (app: OVUApplication) => void;
    onMenuItemClick?: (item: MenuItem, app: OVUApplication) => void;
    onCollapsedChange?: (collapsed: boolean) => void;
    onLogout?: () => void;
    onSettings?: () => void;
  }

  export const OVUSidebar: FC<OVUSidebarProps>;
  export default OVUSidebar;
}

declare module 'sidebar/SidebarProvider' {
  import { FC, ReactNode } from 'react';
  
  interface SidebarProviderProps {
    children: ReactNode;
    config: any;
  }
  
  export const SidebarProvider: FC<SidebarProviderProps>;
  export const useSidebar: () => any;
}

