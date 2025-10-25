import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axios.config';
import './SessionSteps.css';

interface Step {
  id: number;
  step_number: number;
  user_prompt: string;
  ai_understanding?: string;
  ai_actions?: string;
  result?: string;
  created_at: string;
}

interface SessionStepsProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const SessionSteps = ({ language, theme }: SessionStepsProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const t = {
    he: {
      title: 'צעדי הפיתוח',
      subtitle: 'כל הצעדים שבוצעו בסשן מספר',
      loading: 'טוען נתונים...',
      error: 'שגיאה',
      noSteps: 'אין צעדים להצגה',
      step: 'צעד',
      userPrompt: 'הוראת המשתמש',
      aiUnderstanding: 'הבנת ה-AI',
      aiActions: 'פעולות שבוצעו',
      result: 'תוצאה',
      timestamp: 'זמן',
      totalSteps: 'סה"כ צעדים',
      backToJournal: 'חזרה ליומן',
      sessionTitle: 'כותרת הסשן'
    },
    en: {
      title: 'Development Steps',
      subtitle: 'All steps performed in session number',
      loading: 'Loading data...',
      error: 'Error',
      noSteps: 'No steps to display',
      step: 'Step',
      userPrompt: 'User Instruction',
      aiUnderstanding: 'AI Understanding',
      aiActions: 'Actions Performed',
      result: 'Result',
      timestamp: 'Timestamp',
      totalSteps: 'Total Steps',
      backToJournal: 'Back to Journal',
      sessionTitle: 'Session Title'
    },
    ar: {
      title: 'خطوات التطوير',
      subtitle: 'جميع الخطوات المنفذة في الجلسة رقم',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      noSteps: 'لا توجد خطوات لعرضها',
      step: 'خطوة',
      userPrompt: 'تعليمات المستخدم',
      aiUnderstanding: 'فهم الذكاء الاصطناعي',
      aiActions: 'الإجراءات المنفذة',
      result: 'النتيجة',
      timestamp: 'الوقت',
      totalSteps: 'إجمالي الخطوات',
      backToJournal: 'العودة إلى اليومية',
      sessionTitle: 'عنوان الجلسة'
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionAndSteps();
    }
  }, [sessionId]);

  const fetchSessionAndSteps = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch session info
      const sessionResponse = await axios.get(`/api/v1/dev-journal/sessions/${sessionId}`);
      setSessionInfo(sessionResponse.data.session);

      // Fetch steps
      const stepsResponse = await axios.get(`/api/v1/dev-journal/sessions/${sessionId}/steps`);
      setSteps(stepsResponse.data.steps || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch steps');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-SA' : 'en-US');
  };

  return (
    <div className={`session-steps ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="steps-header">
        <h1 className="steps-title">
          {t[language].title} - {t[language].subtitle} #{sessionId}
        </h1>
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
      ) : steps.length === 0 ? (
        <div className="no-steps-container">
          <span className="no-steps-icon">📋</span>
          <p>{t[language].noSteps}</p>
        </div>
      ) : (
        <>
          <div className="steps-stats">
            <span>{t[language].totalSteps}: <strong>{steps.length}</strong></span>
          </div>

          <div className="steps-list">
            {steps.map((step) => (
              <div key={step.id} className="step-card">
                <div className="step-header">
                  <span className="step-number">
                    {t[language].step} #{step.step_number}
                  </span>
                  <span className="step-time">{formatDateTime(step.created_at)}</span>
                </div>

                <div className="step-content">
                  <div className="step-section user-prompt-section">
                    <h3>👤 {t[language].userPrompt}</h3>
                    <p className="step-text">{step.user_prompt}</p>
                  </div>

                  {step.ai_understanding && (
                    <div className="step-section ai-understanding-section">
                      <h3>🤖 {t[language].aiUnderstanding}</h3>
                      <p className="step-text">{step.ai_understanding}</p>
                    </div>
                  )}

                  {step.ai_actions && (
                    <div className="step-section ai-actions-section">
                      <h3>⚙️ {t[language].aiActions}</h3>
                      <p className="step-text">{step.ai_actions}</p>
                    </div>
                  )}

                  {step.result && (
                    <div className="step-section result-section">
                      <h3>✅ {t[language].result}</h3>
                      <p className="step-text">{step.result}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

