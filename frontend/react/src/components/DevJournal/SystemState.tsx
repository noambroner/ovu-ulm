import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axios.config';
import './SystemState.css';

interface State {
  id: number;
  state_at_start: string;
  state_at_end?: string;
  changes_summary?: string;
  created_at: string;
  updated_at?: string;
}

interface SystemStateProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const SystemState = ({ language, theme }: SystemStateProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const t = {
    he: {
      title: 'מצב מערכת',
      subtitle: 'מצב המערכת לפני ואחרי הסשן',
      loading: 'טוען נתונים...',
      error: 'שגיאה',
      noState: 'אין מצב מערכת מתועד',
      sessionId: 'מזהה סשן',
      stateAtStart: 'מצב בתחילת הסשן',
      stateAtEnd: 'מצב בסוף הסשן',
      changesSummary: 'סיכום שינויים',
      backToJournal: 'חזרה ליומן',
      sessionTitle: 'כותרת הסשן'
    },
    en: {
      title: 'System State',
      subtitle: 'System state before and after session',
      loading: 'Loading data...',
      error: 'Error',
      noState: 'No system state recorded',
      sessionId: 'Session ID',
      stateAtStart: 'State at Start',
      stateAtEnd: 'State at End',
      changesSummary: 'Changes Summary',
      backToJournal: 'Back to Journal',
      sessionTitle: 'Session Title'
    },
    ar: {
      title: 'حالة النظام',
      subtitle: 'حالة النظام قبل وبعد الجلسة',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      noState: 'لم يتم تسجيل حالة النظام',
      sessionId: 'معرف الجلسة',
      stateAtStart: 'الحالة في البداية',
      stateAtEnd: 'الحالة في النهاية',
      changesSummary: 'ملخص التغييرات',
      backToJournal: 'العودة إلى اليومية',
      sessionTitle: 'عنوان الجلسة'
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionAndState();
    }
  }, [sessionId]);

  const fetchSessionAndState = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch session info
      const sessionResponse = await axios.get(`/api/v1/dev-journal/sessions/${sessionId}`);
      setSessionInfo(sessionResponse.data.session);

      // Fetch system state
      const stateResponse = await axios.get(`/api/v1/dev-journal/sessions/${sessionId}/state`);
      if (stateResponse.data.state) {
        setState(stateResponse.data.state);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch system state');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`system-state ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="state-header">
        <h1 className="state-title">{t[language].title}</h1>
        <p className="state-subtitle">
          {t[language].subtitle} #{sessionId}
        </p>
        {sessionInfo && (
          <p className="session-title-display">
            {t[language].sessionTitle}: <strong>{sessionInfo.title}</strong>
          </p>
        )}
        <button onClick={() => window.close()} className="back-btn">
          ← {t[language].backToJournal}
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
      ) : !state ? (
        <div className="no-state-container">
          <span className="no-state-icon">🔧</span>
          <p>{t[language].noState}</p>
        </div>
      ) : (
        <div className="state-content">
          <div className="state-card start-state">
            <div className="card-header">
              <h2>🚀 {t[language].stateAtStart}</h2>
            </div>
            <div className="card-body">
              <pre className="state-text">{state.state_at_start}</pre>
            </div>
          </div>

          {state.state_at_end && (
            <div className="state-card end-state">
              <div className="card-header">
                <h2>✅ {t[language].stateAtEnd}</h2>
              </div>
              <div className="card-body">
                <pre className="state-text">{state.state_at_end}</pre>
              </div>
            </div>
          )}

          {state.changes_summary && (
            <div className="state-card changes-summary">
              <div className="card-header">
                <h2>📝 {t[language].changesSummary}</h2>
              </div>
              <div className="card-body">
                <pre className="state-text">{state.changes_summary}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

