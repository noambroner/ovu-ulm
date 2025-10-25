import { useState, useEffect } from 'react';
import axios from '../../api/axios.config';
import './DevJournal.css';

interface Session {
  id: number;
  title: string;
  summary?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  instructions_for_next?: string;
  created_at: string;
}

interface DevJournalProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const DevJournal = ({ language, theme }: DevJournalProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    he: {
      title: 'יומן פיתוח',
      subtitle: 'מעקב אחר כל סשנים הפיתוח והצעדים שבוצעו',
      loading: 'טוען נתונים...',
      error: 'שגיאה',
      noSessions: 'אין סשני פיתוח להצגה',
      sessionId: 'מזהה סשן',
      sessionTitle: 'כותרת',
      startTime: 'זמן התחלה',
      endTime: 'זמן סיום',
      duration: 'משך (דקות)',
      summary: 'סיכום',
      viewSteps: 'צפה בצעדים',
      viewState: 'מצב מערכת',
      refresh: 'רענן',
      totalSessions: 'סה"כ סשנים'
    },
    en: {
      title: 'Development Journal',
      subtitle: 'Track all development sessions and steps performed',
      loading: 'Loading data...',
      error: 'Error',
      noSessions: 'No development sessions to display',
      sessionId: 'Session ID',
      sessionTitle: 'Title',
      startTime: 'Start Time',
      endTime: 'End Time',
      duration: 'Duration (min)',
      summary: 'Summary',
      viewSteps: 'View Steps',
      viewState: 'System State',
      refresh: 'Refresh',
      totalSessions: 'Total Sessions'
    },
    ar: {
      title: 'يومية التطوير',
      subtitle: 'تتبع جميع جلسات التطوير والخطوات المنفذة',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      noSessions: 'لا توجد جلسات تطوير لعرضها',
      sessionId: 'معرف الجلسة',
      sessionTitle: 'العنوان',
      startTime: 'وقت البدء',
      endTime: 'وقت الانتهاء',
      duration: 'المدة (دقائق)',
      summary: 'الملخص',
      viewSteps: 'عرض الخطوات',
      viewState: 'حالة النظام',
      refresh: 'تحديث',
      totalSessions: 'إجمالي الجلسات'
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/v1/dev-journal/sessions', {
        params: { limit: 1000 }
      });
      setSessions(response.data.sessions || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const openSteps = (sessionId: number) => {
    window.open(`/dev-journal/session/${sessionId}/steps`, '_blank');
  };

  const openState = (sessionId: number) => {
    window.open(`/dev-journal/session/${sessionId}/state`, '_blank');
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-SA' : 'en-US');
  };

  return (
    <div className={`dev-journal ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="journal-header">
        <h1 className="journal-title">{t[language].title}</h1>
        <p className="journal-subtitle">{t[language].subtitle}</p>
        <button onClick={fetchSessions} className="refresh-btn">
          🔄 {t[language].refresh}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t[language].loading}</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p>{t[language].error}: {error}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="no-sessions-container">
          <span className="no-sessions-icon">📝</span>
          <p>{t[language].noSessions}</p>
        </div>
      ) : (
        <>
          <div className="sessions-stats">
            <span>{t[language].totalSessions}: <strong>{sessions.length}</strong></span>
          </div>

          <div className="sessions-table-wrapper">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>{t[language].sessionId}</th>
                  <th>{t[language].sessionTitle}</th>
                  <th>{t[language].startTime}</th>
                  <th>{t[language].endTime}</th>
                  <th>{t[language].duration}</th>
                  <th>{t[language].summary}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="session-row">
                    <td className="session-id">
                      <span className="id-badge">#{session.id}</span>
                    </td>
                    <td className="session-title">{session.title}</td>
                    <td className="session-time">{formatDateTime(session.start_time)}</td>
                    <td className="session-time">
                      {session.end_time ? formatDateTime(session.end_time) : '⏳ בתהליך'}
                    </td>
                    <td className="session-duration">
                      {session.duration_minutes ? `${session.duration_minutes} דקות` : '-'}
                    </td>
                    <td className="session-summary">
                      {session.summary ? (
                        <span className="summary-text">{session.summary.substring(0, 100)}...</span>
                      ) : '-'}
                    </td>
                    <td className="session-actions">
                      <button
                        className="action-btn steps-btn"
                        onClick={() => openSteps(session.id)}
                        title={t[language].viewSteps}
                      >
                        📋
                      </button>
                      <button
                        className="action-btn state-btn"
                        onClick={() => openState(session.id)}
                        title={t[language].viewState}
                      >
                        🔧
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

