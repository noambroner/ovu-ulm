import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios.config';
import { DataTable, type DataTableColumn } from '../../shared/DataTable/DataTable';
import './ActiveUsers.css';

interface ActiveUser {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  last_connected_at?: string | null;
  [key: string]: unknown;
}

interface ActiveUsersProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

const translations = {
  he: {
    title: 'משתמשים פעילים',
    subtitle: 'משתמשים מחוברים בזמן אמת',
    username: 'שם משתמש',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    lastConnected: 'תאריך חיבור אחרון',
    error: 'שגיאה בטעינת המשתמשים הפעילים',
  },
  en: {
    title: 'Active Users',
    subtitle: 'Real-time connected users',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    lastConnected: 'Last Connection',
    error: 'Failed to load active users',
  },
  ar: {
    title: 'المستخدمون النشطون',
    subtitle: 'المستخدمون المتصلون في الوقت الفعلي',
    username: 'اسم المستخدم',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    lastConnected: 'تاريخ آخر اتصال',
    error: 'فشل تحميل المستخدمين النشطين',
  },
};

export const ActiveUsers = ({ language, theme }: ActiveUsersProps) => {
  const t = translations[language];
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const REFRESH_INTERVAL_MS = 30_000; // reduce visual "refresh" / noise, still near real-time

  useEffect(() => {
    let canceled = false;
    const fetchActive = async () => {
      const showLoading = !hasLoadedRef.current;
      try {
        if (showLoading) setLoading(true);
        const response = await api.get('/api/v1/users/active');
        if (canceled) return;
        const data = response.data?.active_users || [];
        setUsers(data);
        setError(null);
        hasLoadedRef.current = true;
      } catch (err: any) {
        if (!canceled) {
          let detail = err?.response?.data?.detail;
          // Handle case where detail is an object/array (validation errors)
          if (detail && typeof detail !== 'string') {
            detail = JSON.stringify(detail);
          }
          setError(detail || err?.message || t.error);
        }
      } finally {
        if (!canceled && showLoading) setLoading(false);
      }
    };

    fetchActive();

    intervalRef.current = window.setInterval(fetchActive, REFRESH_INTERVAL_MS);
    return () => {
      canceled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [language]);

  const columns = useMemo<DataTableColumn<ActiveUser>[]>(() => [
    {
      key: 'username',
      label: t.username,
    },
    {
      key: 'first_name',
      label: t.firstName,
      render: (val: unknown, _row: ActiveUser) => (val as string | null | undefined) || '-',
    },
    {
      key: 'last_name',
      label: t.lastName,
      render: (val: unknown, _row: ActiveUser) => (val as string | null | undefined) || '-',
    },
    {
      key: 'last_connected_at',
      label: t.lastConnected,
      render: (val: unknown, _row: ActiveUser) => {
        if (!val || (typeof val !== 'string' && typeof val !== 'number')) return '-';
        const d = new Date(val);
        return isNaN(d.getTime())
          ? '-'
          : d.toLocaleString(language === 'he' ? 'he-IL' : 'en-US');
      },
    },
  ], [language, t.firstName, t.lastConnected, t.lastName, t.username]);

  return (
    <div className={`active-users-page ${theme}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
      <header className="active-users-header">
        <div className="header-text">
          <p className="eyebrow">👥</p>
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
      </header>

      <section className="active-users-card">
        <DataTable
          columns={columns}
          data={users}
          language={language}
          theme={theme}
          loading={loading}
          error={error || undefined}
          searchable
          exportable
          maxCellLength={120}
        />
      </section>
    </div>
  );
};

