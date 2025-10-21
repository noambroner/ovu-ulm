import React, { useState, useEffect } from 'react';
import api from '../../api/axios.config';
import './TokenControl.css';

interface TokenControlProps {
  language: 'he' | 'en';
  theme: 'light' | 'dark';
}

interface TokenSettings {
  access_token_expire_minutes: number;
  refresh_token_expire_days: number;
}

const translations = {
  he: {
    title: 'בקרת כניסה',
    subtitle: 'הגדרות זמן פקיעת טוקן',
    accessToken: 'טוקן גישה (Access Token)',
    refreshToken: 'טוקן רענון (Refresh Token)',
    minutes: 'דקות',
    days: 'ימים',
    save: 'שמור',
    reset: 'אפס להגדרות ברירת מחדל',
    loading: 'טוען...',
    success: 'ההגדרות נשמרו בהצלחה!',
    error: 'שגיאה בשמירת ההגדרות',
    resetSuccess: 'ההגדרות אופסו להגדרות ברירת מחדל',
    accessTokenHelp: 'משך הזמן שהטוקן תקף (5-1440 דקות)',
    refreshTokenHelp: 'משך הזמן שהטוקן תקף (1-90 ימים)',
    currentSettings: 'הגדרות נוכחיות',
    warning: '⚠️ שינוי ההגדרות יחול מההתחברות הבאה',
    securityNote: '🔒 הגדרות אלו משפיעות על אבטחת החשבון שלך'
  },
  en: {
    title: 'Login Control',
    subtitle: 'Token Expiration Settings',
    accessToken: 'Access Token',
    refreshToken: 'Refresh Token',
    minutes: 'minutes',
    days: 'days',
    save: 'Save',
    reset: 'Reset to Defaults',
    loading: 'Loading...',
    success: 'Settings saved successfully!',
    error: 'Error saving settings',
    resetSuccess: 'Settings reset to defaults',
    accessTokenHelp: 'How long the token is valid (5-1440 minutes)',
    refreshTokenHelp: 'How long the token is valid (1-90 days)',
    currentSettings: 'Current Settings',
    warning: '⚠️ Changes will take effect on next login',
    securityNote: '🔒 These settings affect your account security'
  }
};

export const TokenControl: React.FC<TokenControlProps> = ({ language, theme }) => {
  const t = translations[language];
  const [settings, setSettings] = useState<TokenSettings>({
    access_token_expire_minutes: 15,
    refresh_token_expire_days: 7
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/v1/token-settings/');
      setSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setMessage({ type: 'error', text: t.error });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await api.put('/api/v1/token-settings/', settings);
      setMessage({ type: 'success', text: t.success });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || t.error 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(t.reset + '?')) return;

    setSaving(true);
    setMessage(null);

    try {
      await api.post('/api/v1/token-settings/reset');
      setSettings({
        access_token_expire_minutes: 15,
        refresh_token_expire_days: 7
      });
      setMessage({ type: 'success', text: t.resetSuccess });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || t.error 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="token-control-loading">{t.loading}</div>;
  }

  return (
    <div className={`token-control ${language}`} data-theme={theme}>
      <div className="token-control-header">
        <h1>🔐 {t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="info-box warning">
        <p>{t.warning}</p>
      </div>

      <div className="info-box security">
        <p>{t.securityNote}</p>
      </div>

      <div className="settings-form">
        <div className="setting-group">
          <label>
            <span className="label-text">{t.accessToken}</span>
            <span className="help-text">{t.accessTokenHelp}</span>
          </label>
          <div className="input-group">
            <input
              type="number"
              min="5"
              max="1440"
              value={settings.access_token_expire_minutes}
              onChange={(e) => setSettings({
                ...settings,
                access_token_expire_minutes: parseInt(e.target.value) || 15
              })}
            />
            <span className="unit">{t.minutes}</span>
          </div>
        </div>

        <div className="setting-group">
          <label>
            <span className="label-text">{t.refreshToken}</span>
            <span className="help-text">{t.refreshTokenHelp}</span>
          </label>
          <div className="input-group">
            <input
              type="number"
              min="1"
              max="90"
              value={settings.refresh_token_expire_days}
              onChange={(e) => setSettings({
                ...settings,
                refresh_token_expire_days: parseInt(e.target.value) || 7
              })}
            />
            <span className="unit">{t.days}</span>
          </div>
        </div>

        <div className="actions">
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t.loading : t.save}
          </button>
          <button 
            className="btn-reset" 
            onClick={handleReset}
            disabled={saving}
          >
            {t.reset}
          </button>
        </div>
      </div>

      <div className="current-settings">
        <h3>{t.currentSettings}</h3>
        <div className="settings-display">
          <div className="setting-item">
            <span className="key">{t.accessToken}:</span>
            <span className="value">{settings.access_token_expire_minutes} {t.minutes}</span>
          </div>
          <div className="setting-item">
            <span className="key">{t.refreshToken}:</span>
            <span className="value">{settings.refresh_token_expire_days} {t.days}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenControl;

