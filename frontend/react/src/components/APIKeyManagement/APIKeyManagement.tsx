/**
 * API Key Management Component
 * ============================
 * ניהול מפתחות API עבור אינטגרציות חיצוניות
 */
import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios.config';
import { DataGrid } from '../../shared/DataGrid';
import type { DataGridColumn } from '../../shared/DataGrid';
import './APIKeyManagement.css';

interface APIKeyManagementProps {
  language?: 'he' | 'en' | 'ar';
  theme?: 'light' | 'dark';
}

interface APIKey {
  id: number;
  key_name: string;
  api_key_prefix: string;
  app_type: string;
  owner_name: string | null;
  owner_email: string | null;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  total_requests_count: number;
  rate_limit_per_minute: number;
  tags: string[];
}

interface NewAPIKeyResponse {
  id: number;
  key_name: string;
  api_key: string;
  api_key_prefix: string;
  app_type: string;
  status: string;
  created_at: string;
  scopes: string[];
  rate_limit_per_minute: number;
}

export const APIKeyManagement = ({ language = 'he', theme = 'light' }: APIKeyManagementProps) => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResponse, setNewKeyResponse] = useState<NewAPIKeyResponse | null>(null);

  // תרגומים
  const t = {
    he: {
      title: 'ניהול מפתחות API',
      subtitle: 'ניהול מפתחות API עבור אינטגרציות ויישומים חיצוניים',
      createKey: 'צור מפתח חדש',
      loading: 'טוען מפתחות...',
      noKeys: 'לא נמצאו מפתחות API',
      createFirst: 'צור את המפתח הראשון שלך',
      name: 'שם',
      keyPrefix: 'קידומת מפתח',
      type: 'סוג',
      status: 'סטטוס',
      created: 'נוצר',
      lastUsed: 'שימוש אחרון',
      requests: 'בקשות',
      rateLimit: 'מגבלת קצב',
      actions: 'פעולות',
      statusActive: 'פעיל',
      statusSuspended: 'מושהה',
      statusRevoked: 'מבוטל',
      statusExpired: 'פג תוקף',
      typeIntegration: 'אינטגרציה',
      typeMobile: 'מובייל',
      typeWeb: 'Web',
      typeService: 'שירות',
      typeBot: 'בוט',
      viewDetails: 'צפה בפרטים',
      revoke: 'בטל',
      delete: 'מחק',
      revokeConfirm: 'האם אתה בטוח שברצונך לבטל את המפתח',
      revokeReason: 'סיבה לביטול (אופציונלי):',
      revokeSuccess: 'המפתח בוטל בהצלחה',
      revokeFailed: 'שגיאה בביטול המפתח',
      deleteConfirm: 'האם אתה בטוח שברצונך למחוק את המפתח',
      deleteWarning: 'פעולה זו תמחק גם את כל סטטיסטיקות השימוש ולוגים. לא ניתן לבטל.',
      deleteSuccess: 'המפתח נמחק בהצלחה',
      deleteFailed: 'שגיאה במחיקת המפתח',
      perMinute: '/דקה',
      never: 'אף פעם',
      owner: 'בעלים',
      // Create Modal
      createNewKey: 'צור מפתח API חדש',
      keyName: 'שם המפתח',
      keyNameRequired: 'שם המפתח נדרש',
      keyNamePlaceholder: 'לדוגמה: אפליקציית מובייל v2',
      applicationType: 'סוג האפליקציה',
      ownerName: 'שם הבעלים',
      ownerEmail: 'אימייל בעלים',
      description: 'תיאור',
      descriptionPlaceholder: 'מטרת המפתח...',
      scopes: 'הרשאות (Scopes)',
      rateLimitPerMin: 'מגבלה לדקה',
      rateLimitPerHour: 'מגבלה לשעה',
      rateLimitPerDay: 'מגבלה ליום',
      expiresInDays: 'תוקף (ימים)',
      expiresPlaceholder: 'לדוגמה: 365',
      noExpiration: 'ללא תפוגה',
      cancel: 'ביטול',
      create: 'צור מפתח',
      creating: 'יוצר...',
      // New Key Display
      keyCreatedSuccess: 'מפתח API נוצר בהצלחה!',
      importantSaveKey: 'חשוב: שמור את המפתח עכשיו!',
      keyShownOnce: 'זוהי הפעם היחידה שתראה את המפתח המלא. לא ניתן לשחזר אותו מאוחר יותר.',
      apiKey: 'מפתח API:',
      copy: 'העתק',
      copied: 'הועתק!',
      usageExample: 'דוגמת שימוש:',
      iSaved: 'שמרתי את המפתח'
    },
    en: {
      title: 'API Keys Management',
      subtitle: 'Manage API keys for external integrations and applications',
      createKey: 'Create API Key',
      loading: 'Loading keys...',
      noKeys: 'No API keys found',
      createFirst: 'Create your first API key',
      name: 'Name',
      keyPrefix: 'Key Prefix',
      type: 'Type',
      status: 'Status',
      created: 'Created',
      lastUsed: 'Last Used',
      requests: 'Requests',
      rateLimit: 'Rate Limit',
      actions: 'Actions',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      statusRevoked: 'Revoked',
      statusExpired: 'Expired',
      typeIntegration: 'Integration',
      typeMobile: 'Mobile',
      typeWeb: 'Web',
      typeService: 'Service',
      typeBot: 'Bot',
      viewDetails: 'View Details',
      revoke: 'Revoke',
      delete: 'Delete',
      revokeConfirm: 'Are you sure you want to revoke the key',
      revokeReason: 'Reason for revocation (optional):',
      revokeSuccess: 'API key revoked successfully',
      revokeFailed: 'Failed to revoke API key',
      deleteConfirm: 'Are you sure you want to DELETE the key',
      deleteWarning: 'This will delete all usage statistics and logs. Cannot be undone.',
      deleteSuccess: 'API key deleted successfully',
      deleteFailed: 'Failed to delete API key',
      perMinute: '/min',
      never: 'Never',
      owner: 'Owner',
      // Create Modal
      createNewKey: 'Create New API Key',
      keyName: 'Key Name',
      keyNameRequired: 'Key name is required',
      keyNamePlaceholder: 'e.g., Mobile App v2',
      applicationType: 'Application Type',
      ownerName: 'Owner Name',
      ownerEmail: 'Owner Email',
      description: 'Description',
      descriptionPlaceholder: 'Purpose of this key...',
      scopes: 'Scopes (Permissions)',
      rateLimitPerMin: 'Rate Limit (per minute)',
      rateLimitPerHour: 'Rate Limit (per hour)',
      rateLimitPerDay: 'Rate Limit (per day)',
      expiresInDays: 'Expires In (days)',
      expiresPlaceholder: 'e.g., 365',
      noExpiration: 'No expiration',
      cancel: 'Cancel',
      create: 'Create Key',
      creating: 'Creating...',
      // New Key Display
      keyCreatedSuccess: 'API Key Created Successfully!',
      importantSaveKey: 'IMPORTANT: Save this key now!',
      keyShownOnce: 'This is the only time you will see the full key. Cannot be retrieved later.',
      apiKey: 'API Key:',
      copy: 'Copy',
      copied: 'Copied!',
      usageExample: 'Usage Example:',
      iSaved: 'I have saved the key'
    }
  };

  const texts = t[language as keyof typeof t] || t['he'];
  
  // Load API keys
  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/v1/api-keys');
      setApiKeys(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const handleCreateKey = () => {
    setShowCreateModal(true);
    setNewKeyResponse(null);
  };

  const handleRevoke = async (keyId: number, keyName: string) => {
    if (!confirm(`${texts.revokeConfirm} "${keyName}"? ${texts.deleteWarning}`)) {
      return;
    }

    try {
      const reason = prompt(texts.revokeReason);
      await api.post(`/api/v1/api-keys/${keyId}/revoke`, {
        reason: reason || undefined
      });
      alert(texts.revokeSuccess);
      loadAPIKeys();
    } catch (err: any) {
      alert(`${texts.revokeFailed}: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDelete = async (keyId: number, keyName: string) => {
    if (!confirm(`${texts.deleteConfirm} "${keyName}"? ${texts.deleteWarning}`)) {
      return;
    }

    try {
      await api.delete(`/api/v1/api-keys/${keyId}`);
      alert(texts.deleteSuccess);
      loadAPIKeys();
    } catch (err: any) {
      alert(`${texts.deleteFailed}: ${err.response?.data?.detail || err.message}`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return texts.never;
    const date = new Date(dateString);
    return date.toLocaleString(language === 'he' ? 'he-IL' : 'en-US');
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'suspended': return 'status-suspended';
      case 'revoked': return 'status-revoked';
      case 'expired': return 'status-expired';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return texts.statusActive;
      case 'suspended': return texts.statusSuspended;
      case 'revoked': return texts.statusRevoked;
      case 'expired': return texts.statusExpired;
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'integration': return texts.typeIntegration;
      case 'mobile': return texts.typeMobile;
      case 'web': return texts.typeWeb;
      case 'service': return texts.typeService;
      case 'bot': return texts.typeBot;
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'integration': return '#3b82f6';
      case 'mobile': return '#8b5cf6';
      case 'web': return '#10b981';
      case 'service': return '#f59e0b';
      case 'bot': return '#ec4899';
      default: return '#6b7280';
    }
  };

  // Define columns for DataGrid
  const columns: DataGridColumn<APIKey>[] = useMemo(() => [
    {
      id: 'name',
      label: texts.name,
      field: 'key_name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      minWidth: '200px',
      render: (value: string, row: APIKey) => (
        <div className="api-key-name-cell">
          <div className="api-key-name-primary">{value}</div>
          {row.owner_name && (
            <div className="api-key-name-secondary">
              {texts.owner}: {row.owner_name}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'prefix',
      label: texts.keyPrefix,
      field: 'api_key_prefix',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '150px',
      render: (value: string) => (
        <code className="api-key-prefix-code">
          {value}
        </code>
      )
    },
    {
      id: 'type',
      label: texts.type,
      field: 'app_type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'integration', label: texts.typeIntegration },
        { value: 'mobile', label: texts.typeMobile },
        { value: 'web', label: texts.typeWeb },
        { value: 'service', label: texts.typeService },
        { value: 'bot', label: texts.typeBot }
      ],
      width: '120px',
      render: (value: string) => (
        <span
          className="api-key-type-badge"
          style={{ backgroundColor: getTypeColor(value) }}
        >
          {getTypeText(value)}
        </span>
      )
    },
    {
      id: 'status',
      label: texts.status,
      field: 'status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'active', label: texts.statusActive },
        { value: 'suspended', label: texts.statusSuspended },
        { value: 'revoked', label: texts.statusRevoked },
        { value: 'expired', label: texts.statusExpired }
      ],
      width: '100px',
      render: (value: string) => (
        <span className={`status-badge ${getStatusClass(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    {
      id: 'created',
      label: texts.created,
      field: 'created_at',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '180px',
      render: (value: string) => (
        <span className="api-key-date-text">
          {formatDate(value)}
        </span>
      )
    },
    {
      id: 'lastUsed',
      label: texts.lastUsed,
      field: 'last_used_at',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '180px',
      render: (value: string | null) => (
        <span className="api-key-date-text" style={{ opacity: value ? 1 : 0.6 }}>
          {formatDate(value)}
        </span>
      )
    },
    {
      id: 'requests',
      label: texts.requests,
      field: 'total_requests_count',
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '100px',
      render: (value: number) => (
        <span className="api-key-number-text">
          {value.toLocaleString()}
        </span>
      )
    },
    {
      id: 'rateLimit',
      label: texts.rateLimit,
      field: 'rate_limit_per_minute',
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '120px',
      render: (value: number) => `${value}${texts.perMinute}`
    },
    {
      id: 'actions',
      label: texts.actions,
      field: 'id',
      sortable: false,
      filterable: false,
      width: '140px',
      render: (_: any, row: APIKey) => (
        <div className="action-buttons">
          <button
            className="view-details-btn"
            onClick={(e) => {
              e.stopPropagation();
              alert(`${texts.viewDetails} - ${row.key_name}`);
            }}
            title={texts.viewDetails}
          >
            👁️
          </button>
          {row.status === 'active' && (
            <button
              className="view-details-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRevoke(row.id, row.key_name);
              }}
              title={texts.revoke}
            >
              🚫
            </button>
          )}
          <button
            className="view-details-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id, row.key_name);
            }}
            title={texts.delete}
          >
            🗑️
          </button>
        </div>
      )
    }
  ], [language, texts]);

  // Toolbar content
  const toolbarContent = (
    <div className="toolbar-actions">
      <button className="pagination-btn" onClick={handleCreateKey}>
        ➕ {texts.createKey}
      </button>
    </div>
  );

  if (error) {
    return (
      <div className={`api-key-management ${theme}`}>
        <div className="logs-header">
          <h1 className="logs-title">🔐 {texts.title}</h1>
          <p className="logs-subtitle">{texts.subtitle}</p>
        </div>
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`api-key-management ${theme}`}>
      <div className="logs-header">
        <h1 className="logs-title">🔐 {texts.title}</h1>
        <p className="logs-subtitle">{texts.subtitle}</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{texts.loading}</p>
        </div>
      ) : (
        <DataGrid
          columns={columns}
          data={apiKeys}
          keyField="id"
          language={language}
          theme={theme}
          emptyMessage={texts.noKeys}
          height="calc(100vh - 280px)"
          stickyHeader={true}
          toolbarContent={toolbarContent}
        />
      )}

      {showCreateModal && (
        <CreateAPIKeyModal
          texts={texts}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(response) => {
            setNewKeyResponse(response);
            loadAPIKeys();
          }}
        />
      )}

      {newKeyResponse && (
        <NewKeyDisplayModal
          texts={texts}
          keyData={newKeyResponse}
          onClose={() => setNewKeyResponse(null)}
        />
      )}
    </div>
  );
};

// Create API Key Modal
interface CreateAPIKeyModalProps {
  language?: string;
  theme?: string;
  texts: any;
  onClose: () => void;
  onSuccess: (response: NewAPIKeyResponse) => void;
}

const CreateAPIKeyModal = ({ texts, onClose, onSuccess }: CreateAPIKeyModalProps) => {
  const [formData, setFormData] = useState({
    key_name: '',
    app_type: 'integration',
    owner_name: '',
    owner_email: '',
    description: '',
    scopes: [] as string[],
    rate_limit_per_minute: 60,
    rate_limit_per_hour: 1000,
    rate_limit_per_day: 10000,
    expires_in_days: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.key_name.trim()) {
      setError(texts.keyNameRequired);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/api/v1/api-keys', formData);
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || texts.revokeFailed);
    } finally {
      setLoading(false);
    }
  };

  const availableScopes = [
    'users:read', 'users:write', 'users:delete',
    'logs:read', 'logs:write',
    'admin:*', 'read:*', 'write:*'
  ];

  const toggleScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  return (
    <div className="details-modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{texts.createNewKey}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-section">
            <strong>{texts.keyName} *</strong>
            <input
              type="text"
              value={formData.key_name}
              onChange={(e) => setFormData({...formData, key_name: e.target.value})}
              placeholder={texts.keyNamePlaceholder}
              required
              className="form-input"
            />
          </div>

          <div className="modal-section">
            <strong>{texts.applicationType}</strong>
            <select
              value={formData.app_type}
              onChange={(e) => setFormData({...formData, app_type: e.target.value})}
              className="form-input"
            >
              <option value="integration">{texts.typeIntegration}</option>
              <option value="mobile">{texts.typeMobile}</option>
              <option value="web">{texts.typeWeb}</option>
              <option value="service">{texts.typeService}</option>
              <option value="bot">{texts.typeBot}</option>
            </select>
          </div>

          <div className="form-row">
            <div className="modal-section">
              <strong>{texts.ownerName}</strong>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                className="form-input"
              />
            </div>
            <div className="modal-section">
              <strong>{texts.ownerEmail}</strong>
              <input
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-section">
            <strong>{texts.description}</strong>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder={texts.descriptionPlaceholder}
              rows={3}
              className="form-input"
            />
          </div>

          <div className="modal-section">
            <strong>{texts.scopes}</strong>
            <div className="scopes-grid">
              {availableScopes.map(scope => (
                <label key={scope} className="scope-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="modal-section">
              <strong>{texts.rateLimitPerMin}</strong>
              <input
                type="number"
                value={formData.rate_limit_per_minute}
                onChange={(e) => setFormData({...formData, rate_limit_per_minute: parseInt(e.target.value)})}
                min={1}
                className="form-input"
              />
            </div>
            <div className="modal-section">
              <strong>{texts.rateLimitPerHour}</strong>
              <input
                type="number"
                value={formData.rate_limit_per_hour}
                onChange={(e) => setFormData({...formData, rate_limit_per_hour: parseInt(e.target.value)})}
                min={1}
                className="form-input"
              />
            </div>
            <div className="modal-section">
              <strong>{texts.rateLimitPerDay}</strong>
              <input
                type="number"
                value={formData.rate_limit_per_day}
                onChange={(e) => setFormData({...formData, rate_limit_per_day: parseInt(e.target.value)})}
                min={1}
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-section">
            <strong>{texts.expiresInDays} - {texts.noExpiration}</strong>
            <input
              type="number"
              value={formData.expires_in_days || ''}
              onChange={(e) => setFormData({...formData, expires_in_days: e.target.value ? parseInt(e.target.value) : null})}
              placeholder={texts.expiresPlaceholder}
              min={1}
              className="form-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="pagination-btn" disabled={loading}>
              {texts.cancel}
            </button>
            <button type="submit" className="pagination-btn" disabled={loading}>
              {loading ? texts.creating : texts.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// New Key Display Modal
interface NewKeyDisplayModalProps {
  texts: any;
  keyData: NewAPIKeyResponse;
  onClose: () => void;
}

const NewKeyDisplayModal = ({ texts, keyData, onClose }: NewKeyDisplayModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(keyData.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="details-modal-overlay">
      <div className="details-modal">
        <div className="modal-header">
          <h2>✅ {texts.keyCreatedSuccess}</h2>
        </div>

        <div className="modal-body">
          <div className="warning-box">
            <h3>⚠️ {texts.importantSaveKey}</h3>
            <p>{texts.keyShownOnce}</p>
          </div>

          <div className="key-display">
            <strong>{texts.apiKey}</strong>
            <div className="key-value">
              <code className="code-block">{keyData.api_key}</code>
              <button
                className="pagination-btn"
                onClick={copyToClipboard}
                title={texts.copy}
              >
                {copied ? texts.copied : texts.copy}
              </button>
            </div>
          </div>

          <div className="modal-section">
            <strong>{texts.name}:</strong> {keyData.key_name}
          </div>
          <div className="modal-section">
            <strong>{texts.type}:</strong> {keyData.app_type}
          </div>
          <div className="modal-section">
            <strong>{texts.status}:</strong> <span className="status-badge status-active">{keyData.status}</span>
          </div>
          <div className="modal-section">
            <strong>{texts.scopes}:</strong> {keyData.scopes.join(', ') || texts.never}
          </div>
          <div className="modal-section">
            <strong>{texts.rateLimit}:</strong> {keyData.rate_limit_per_minute} {texts.perMinute}
          </div>

          <div className="modal-section">
            <strong>{texts.usageExample}</strong>
            <pre className="code-block">{`curl https://ulm-rct.ovu.co.il/api/v1/users \\
  -H "X-API-Key: ${keyData.api_key}"`}</pre>
          </div>

          <div className="modal-footer">
            <button className="pagination-btn" onClick={onClose}>
              {texts.iSaved}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
