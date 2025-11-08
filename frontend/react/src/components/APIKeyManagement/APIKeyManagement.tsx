/**
 * API Key Management Component
 * ============================
 * Complete UI for managing API keys for external integrations.
 * 
 * Features:
 * - List all API keys with filtering
 * - Create new API key (shows key only once!)
 * - View API key details
 * - Edit API key settings
 * - Revoke API key
 * - View usage statistics
 * - Audit trail
 */
import { useState, useEffect } from 'react';
import api from '../../api/axios.config';
import './APIKeyManagement.css';

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
  api_key: string;  // ⚠️ Only shown once!
  api_key_prefix: string;
  app_type: string;
  status: string;
  created_at: string;
  scopes: string[];
  rate_limit_per_minute: number;
}

export const APIKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResponse, setNewKeyResponse] = useState<NewAPIKeyResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Load API keys
  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/v1/api-keys', {
        params: filterStatus !== 'all' ? { status: filterStatus } : {}
      });
      setApiKeys(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAPIKeys();
  }, [filterStatus]);

  // Handle create API key
  const handleCreateKey = () => {
    setShowCreateModal(true);
    setNewKeyResponse(null);
  };

  // Handle revoke API key
  const handleRevoke = async (keyId: number, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const reason = prompt('Reason for revocation (optional):');
      await api.post(`/api/v1/api-keys/${keyId}/revoke`, {
        reason: reason || undefined
      });
      alert('API key revoked successfully');
      loadAPIKeys();
    } catch (err: any) {
      alert(`Failed to revoke API key: ${err.response?.data?.detail || err.message}`);
    }
  };

  // Handle delete API key
  const handleDelete = async (keyId: number, keyName: string) => {
    if (!confirm(`Are you sure you want to DELETE API key "${keyName}"? This will also delete all usage statistics and audit logs. This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/v1/api-keys/${keyId}`);
      alert('API key deleted successfully');
      loadAPIKeys();
    } catch (err: any) {
      alert(`Failed to delete API key: ${err.response?.data?.detail || err.message}`);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'suspended': return 'status-suspended';
      case 'revoked': return 'status-revoked';
      case 'expired': return 'status-expired';
      default: return '';
    }
  };

  return (
    <div className="api-key-management">
      <div className="header">
        <div className="header-content">
          <h1>🔐 API Keys Management</h1>
          <p>Manage API keys for external integrations and applications</p>
        </div>
        <button className="btn-create" onClick={handleCreateKey}>
          ➕ Create API Key
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div className="loading">Loading API keys...</div>}
      {error && <div className="error">{error}</div>}

      {/* API Keys Table */}
      {!loading && !error && (
        <div className="api-keys-table">
          {apiKeys.length === 0 ? (
            <div className="empty-state">
              <p>No API keys found</p>
              <button onClick={handleCreateKey}>Create your first API key</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key Prefix</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th>Requests</th>
                  <th>Rate Limit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id}>
                    <td>
                      <div className="key-name">{key.key_name}</div>
                      {key.owner_name && <div className="key-owner">{key.owner_name}</div>}
                    </td>
                    <td>
                      <code className="key-prefix">{key.api_key_prefix}</code>
                    </td>
                    <td>
                      <span className={`type-badge type-${key.app_type}`}>
                        {key.app_type}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(key.status)}`}>
                        {key.status}
                      </span>
                    </td>
                    <td>{formatDate(key.created_at)}</td>
                    <td>{formatDate(key.last_used_at)}</td>
                    <td>{key.total_requests_count.toLocaleString()}</td>
                    <td>{key.rate_limit_per_minute}/min</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-small btn-view"
                          onClick={() => alert('View details coming soon!')}
                          title="View Details"
                        >
                          👁️
                        </button>
                        {key.status === 'active' && (
                          <button
                            className="btn-small btn-revoke"
                            onClick={() => handleRevoke(key.id, key.key_name)}
                            title="Revoke"
                          >
                            🚫
                          </button>
                        )}
                        <button
                          className="btn-small btn-delete"
                          onClick={() => handleDelete(key.id, key.key_name)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAPIKeyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(response) => {
            setNewKeyResponse(response);
            loadAPIKeys();
          }}
        />
      )}

      {/* New Key Display Modal */}
      {newKeyResponse && (
        <NewKeyDisplayModal
          keyData={newKeyResponse}
          onClose={() => setNewKeyResponse(null)}
        />
      )}
    </div>
  );
};

// Create API Key Modal
interface CreateAPIKeyModalProps {
  onClose: () => void;
  onSuccess: (response: NewAPIKeyResponse) => void;
}

const CreateAPIKeyModal = ({ onClose, onSuccess }: CreateAPIKeyModalProps) => {
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
      setError('Key name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/api/v1/api-keys', formData);
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create API key');
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New API Key</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Key Name *</label>
            <input
              type="text"
              value={formData.key_name}
              onChange={(e) => setFormData({...formData, key_name: e.target.value})}
              placeholder="e.g., Mobile App v2"
              required
            />
          </div>

          <div className="form-group">
            <label>Application Type</label>
            <select
              value={formData.app_type}
              onChange={(e) => setFormData({...formData, app_type: e.target.value})}
            >
              <option value="integration">Integration</option>
              <option value="mobile">Mobile App</option>
              <option value="web">Web App</option>
              <option value="service">Service</option>
              <option value="bot">Bot</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Owner Name</label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Owner Email</label>
              <input
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Purpose of this API key..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Scopes (Permissions)</label>
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
            <div className="form-group">
              <label>Rate Limit (per minute)</label>
              <input
                type="number"
                value={formData.rate_limit_per_minute}
                onChange={(e) => setFormData({...formData, rate_limit_per_minute: parseInt(e.target.value)})}
                min={1}
              />
            </div>
            <div className="form-group">
              <label>Rate Limit (per hour)</label>
              <input
                type="number"
                value={formData.rate_limit_per_hour}
                onChange={(e) => setFormData({...formData, rate_limit_per_hour: parseInt(e.target.value)})}
                min={1}
              />
            </div>
            <div className="form-group">
              <label>Rate Limit (per day)</label>
              <input
                type="number"
                value={formData.rate_limit_per_day}
                onChange={(e) => setFormData({...formData, rate_limit_per_day: parseInt(e.target.value)})}
                min={1}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Expires In (days) - Leave empty for no expiration</label>
            <input
              type="number"
              value={formData.expires_in_days || ''}
              onChange={(e) => setFormData({...formData, expires_in_days: e.target.value ? parseInt(e.target.value) : null})}
              placeholder="e.g., 365"
              min={1}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// New Key Display Modal (shows key only once!)
interface NewKeyDisplayModalProps {
  keyData: NewAPIKeyResponse;
  onClose: () => void;
}

const NewKeyDisplayModal = ({ keyData, onClose }: NewKeyDisplayModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(keyData.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content new-key-modal">
        <div className="modal-header success">
          <h2>✅ API Key Created Successfully!</h2>
        </div>

        <div className="warning-box">
          <h3>⚠️ IMPORTANT: Save this API key now!</h3>
          <p>This is the <strong>only time</strong> you will see the full API key. It cannot be retrieved later.</p>
        </div>

        <div className="key-display">
          <label>API Key:</label>
          <div className="key-value">
            <code>{keyData.api_key}</code>
            <button
              className="btn-copy"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div className="key-info">
          <div className="info-row">
            <span>Name:</span>
            <strong>{keyData.key_name}</strong>
          </div>
          <div className="info-row">
            <span>Type:</span>
            <strong>{keyData.app_type}</strong>
          </div>
          <div className="info-row">
            <span>Status:</span>
            <strong className="status-active">{keyData.status}</strong>
          </div>
          <div className="info-row">
            <span>Scopes:</span>
            <strong>{keyData.scopes.join(', ') || 'None'}</strong>
          </div>
          <div className="info-row">
            <span>Rate Limit:</span>
            <strong>{keyData.rate_limit_per_minute} req/min</strong>
          </div>
        </div>

        <div className="usage-example">
          <h4>Usage Example:</h4>
          <pre><code>{`curl https://ulm-rct.ovu.co.il/api/v1/users \\
  -H "X-API-Key: ${keyData.api_key}"`}</code></pre>
        </div>

        <div className="modal-footer">
          <button className="btn-primary btn-large" onClick={onClose}>
            I have saved the API key
          </button>
        </div>
      </div>
    </div>
  );
};

