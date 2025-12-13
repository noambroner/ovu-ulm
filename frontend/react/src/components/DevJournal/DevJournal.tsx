import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios.config';
import { DataTable } from '../../shared/DataTable/DataTable';
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

const ITEMS_PER_PAGE = 20;

export const DevJournal = ({ language, theme }: DevJournalProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

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
      totalSessions: 'סה"כ סשנים',
      inProgress: '⏳ בתהליך',
      selectSession: 'בחר סשן כדי לראות פרטים נוספים',
      selectedSession: 'פרטי סשן נבחר',
      minutesUnit: 'דקות'
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
      totalSessions: 'Total Sessions',
      inProgress: '⏳ In progress',
      selectSession: 'Select a session to see more details',
      selectedSession: 'Selected Session',
      minutesUnit: 'min'
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
      totalSessions: 'إجمالي الجلسات',
      inProgress: '⏳ قيد التنفيذ',
      selectSession: 'اختر جلسة لعرض مزيد من التفاصيل',
      selectedSession: 'تفاصيل الجلسة المختارة',
      minutesUnit: 'دقائق'
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
      const fetchedSessions = response.data.sessions || [];
      setSessions(fetchedSessions);
      setSelectedSession(fetchedSessions[0] || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sessions.length]);

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

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session) => {
      const values = [
        session.id?.toString(),
        session.title,
        session.summary,
        session.instructions_for_next
      ];
      return values.some((value) => value?.toLowerCase().includes(term));
    });
  }, [sessions, searchTerm]);

  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedSessions = useMemo(
    () => filteredSessions.slice(skip, skip + ITEMS_PER_PAGE),
    [filteredSessions, skip]
  );

  useEffect(() => {
    if (!paginatedSessions.length) {
      setSelectedSession(null);
      return;
    }
    setSelectedSession((prev) => {
      if (!prev) return paginatedSessions[0];
      const stillVisible = paginatedSessions.find((session) => session.id === prev.id);
      return stillVisible || paginatedSessions[0];
    });
  }, [paginatedSessions]);

  const tableColumns = useMemo(
    () => [
      { key: 'sessionId', label: t[language].sessionId },
      { key: 'title', label: t[language].sessionTitle },
      { key: 'startTime', label: t[language].startTime },
      { key: 'endTime', label: t[language].endTime },
      { key: 'duration', label: t[language].duration },
      { key: 'summary', label: t[language].summary }
    ],
    [language]
  );

  const tableData = useMemo(
    () =>
      paginatedSessions.map((session) => ({
        sessionId: `#${session.id}`,
        title: session.title || '-',
        startTime: formatDateTime(session.start_time),
        endTime: session.end_time ? formatDateTime(session.end_time) : t[language].inProgress,
        duration: session.duration_minutes ? `${session.duration_minutes}` : '-',
        summary: session.summary || '-',
        __sessionRef: session
      })),
    [paginatedSessions, language]
  );

  const pagination = useMemo(
    () => ({
      total: filteredSessions.length,
      skip,
      limit: ITEMS_PER_PAGE,
      returned: paginatedSessions.length
    }),
    [filteredSessions.length, skip, paginatedSessions.length]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (row: any) => {
    if (row?.__sessionRef) {
      setSelectedSession(row.__sessionRef);
    }
  };

  const selectedSessionDuration = selectedSession?.duration_minutes
    ? `${selectedSession.duration_minutes} ${t[language].minutesUnit}`
    : '-';

  const dir = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className={`dev-journal ${theme}`} dir={dir}>
      <div className="journal-header">
        <h1 className="journal-title">{t[language].title}</h1>
        <p className="journal-subtitle">{t[language].subtitle}</p>
        <button onClick={fetchSessions} className="refresh-btn">
          🔄 {t[language].refresh}
        </button>
      </div>

      {error ? (
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p>{t[language].error}: {error}</p>
        </div>
      ) : (
        <>
          {sessions.length > 0 && (
            <div className="sessions-stats">
              <span>{t[language].totalSessions}: <strong>{sessions.length}</strong></span>
            </div>
          )}

          <div className="dev-journal-table-card">
            <DataTable
              columns={tableColumns}
              data={tableData}
              pagination={pagination}
              language={language}
              theme={theme}
              loading={loading}
              error={null}
              searchable
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              onPageChange={handlePageChange}
              onRowClick={handleRowClick}
              exportable
              maxCellLength={80}
              showRowDetails={false}
            />
          </div>

          <div className="session-details-card">
            <div className="session-details-header">
              <h3>{t[language].selectedSession}</h3>
              {selectedSession && <span className="id-badge">#{selectedSession.id}</span>}
            </div>
            {selectedSession ? (
              <>
                <div className="session-details-grid">
                  <div>
                    <span className="details-label">{t[language].sessionTitle}</span>
                    <p>{selectedSession.title || '-'}</p>
                  </div>
                  <div>
                    <span className="details-label">{t[language].startTime}</span>
                    <p>{formatDateTime(selectedSession.start_time)}</p>
                  </div>
                  <div>
                    <span className="details-label">{t[language].endTime}</span>
                    <p>{selectedSession.end_time ? formatDateTime(selectedSession.end_time) : t[language].inProgress}</p>
                  </div>
                  <div>
                    <span className="details-label">{t[language].duration}</span>
                    <p>{selectedSessionDuration}</p>
                  </div>
                </div>

                {selectedSession.summary && (
                  <div className="session-summary-block">
                    <span className="details-label">{t[language].summary}</span>
                    <p>{selectedSession.summary}</p>
                  </div>
                )}

                <div className="session-actions-panel">
                  <button className="primary-action" onClick={() => openSteps(selectedSession.id)}>
                    📋 {t[language].viewSteps}
                  </button>
                  <button className="secondary-action" onClick={() => openState(selectedSession.id)}>
                    🔧 {t[language].viewState}
                  </button>
                </div>
              </>
            ) : (
              <p className="no-session-selected">{sessions.length ? t[language].selectSession : t[language].noSessions}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
