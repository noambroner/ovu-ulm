import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios.config';
import { DataGrid } from '../../shared/DataGrid';
import type { DataGridColumn } from '../../shared/DataGrid';
import './APILogs.css';

interface LogEntry {
  id: number;
  method: string;
  endpoint: string;
  path?: string;
  url?: string;
  user_id?: number;
  username?: string;
  user_ip?: string;
  origin?: string;
  referer?: string;
  app_source?: string;
  request_type?: string;
  direction?: string;
  status_code?: number;
  request_body?: string;
  response_body?: string;
  duration_ms?: number;
  error_message?: string;
  request_time: string;
  created_at: string;
}

interface APILogsProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
  logType: 'backend' | 'frontend';
}

export const APILogs = ({ language, theme, logType }: APILogsProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  
  // API-level filters
  const [hoursFilter, setHoursFilter] = useState(24);
  const limit = 200; // Fetch more records for client-side filtering
  
  const t = {
    he: {
      title: logType === 'backend' ? 'לוג API Backend' : 'לוג API Frontend',
      subtitle: logType === 'backend' ? 'כל בקשות API שהגיעו לשרת' : 'כל בקשות API שבוצעו מהדפדפן',
      loading: 'טוען נתונים...',
      error: 'שגיאה',
      noLogs: 'אין לוגים להצגה',
      method: 'Method',
      endpoint: 'Endpoint',
      user: 'משתמש',
      requestType: 'סוג הבקשה',
      requestTypeUI: 'קריאות UI',
      requestTypeIntegration: 'קריאות אינטגרציה',
      direction: 'כיוון',
      directionInbound: 'נכנס',
      directionOutbound: 'יוצא',
      status: 'Status',
      duration: 'זמן (ms)',
      timestamp: 'זמן',
      timeRange: 'טווח זמן',
      lastHours: 'שעות אחרונות',
      refresh: 'רענן',
      viewDetails: 'צפה בפרטים',
      requestBody: 'Request Body',
      responseBody: 'Response Body',
      errorMessage: 'הודעת שגיאה',
      ipAddress: 'כתובת IP',
      origin: 'Origin (דומיין)',
      referer: 'Referer (URL מקור)',
      appSource: 'אפליקציה',
      close: 'סגור',
      actions: 'פעולות'
    },
    en: {
      title: logType === 'backend' ? 'Backend API Logs' : 'Frontend API Logs',
      subtitle: logType === 'backend' ? 'All API requests received by server' : 'All API requests made from browser',
      loading: 'Loading data...',
      error: 'Error',
      noLogs: 'No logs to display',
      method: 'Method',
      endpoint: 'Endpoint',
      user: 'User',
      requestType: 'Request Type',
      requestTypeUI: 'UI Calls',
      requestTypeIntegration: 'Integration Calls',
      direction: 'Direction',
      directionInbound: 'Inbound',
      directionOutbound: 'Outbound',
      status: 'Status',
      duration: 'Duration (ms)',
      timestamp: 'Timestamp',
      timeRange: 'Time Range',
      lastHours: 'Last Hours',
      refresh: 'Refresh',
      viewDetails: 'View Details',
      requestBody: 'Request Body',
      responseBody: 'Response Body',
      errorMessage: 'Error Message',
      ipAddress: 'IP Address',
      origin: 'Origin (Domain)',
      referer: 'Referer (Source URL)',
      appSource: 'Application',
      close: 'Close',
      actions: 'Actions'
    },
    ar: {
      title: logType === 'backend' ? 'سجلات Backend API' : 'سجلات Frontend API',
      subtitle: logType === 'backend' ? 'جميع طلبات API المستلمة من الخادم' : 'جميع طلبات API من المتصفح',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      noLogs: 'لا توجد سجلات لعرضها',
      method: 'Method',
      endpoint: 'Endpoint',
      user: 'مستخدم',
      requestType: 'نوع الطلب',
      requestTypeUI: 'مكالمات UI',
      requestTypeIntegration: 'مكالمات التكامل',
      direction: 'الاتجاه',
      directionInbound: 'وارد',
      directionOutbound: 'صادر',
      status: 'الحالة',
      duration: 'المدة (ms)',
      timestamp: 'الوقت',
      timeRange: 'النطاق الزمني',
      lastHours: 'آخر ساعات',
      refresh: 'تحديث',
      viewDetails: 'عرض التفاصيل',
      requestBody: 'Request Body',
      responseBody: 'Response Body',
      errorMessage: 'رسالة خطأ',
      ipAddress: 'عنوان IP',
      origin: 'Origin (النطاق)',
      referer: 'Referer (عنوان URL المصدر)',
      appSource: 'التطبيق',
      close: 'إغلاق',
      actions: 'الإجراءات'
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logType, hoursFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        skip: 0,
        limit: limit,
        hours: hoursFilter
      };

      const endpoint = logType === 'backend' ? '/api/v1/logs/backend' : '/api/v1/logs/frontend';
      const response = await axios.get(endpoint, { params });
      
      setLogs(response.data.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to fetch ${logType} logs`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return '#999';
    if (statusCode >= 200 && statusCode < 300) return '#10b981';
    if (statusCode >= 300 && statusCode < 400) return '#3b82f6';
    if (statusCode >= 400 && statusCode < 500) return '#f59e0b';
    return '#ef4444';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return '#10b981';
      case 'POST': return '#3b82f6';
      case 'PUT': return '#f59e0b';
      case 'DELETE': return '#ef4444';
      case 'PATCH': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Define columns for DataGrid
  const columns: DataGridColumn<LogEntry>[] = useMemo(() => [
    {
      id: 'method',
      label: t[language].method,
      field: 'method',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' }
      ],
      width: '80px',
      render: (value: string) => (
        <span
          className="method-badge"
          style={{ backgroundColor: getMethodColor(value), color: 'white', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}
        >
          {value}
        </span>
      )
    },
    {
      id: 'endpoint',
      label: t[language].endpoint,
      field: (row) => row.endpoint || row.path || row.url,
      sortable: true,
      filterable: true,
      filterType: 'text',
      minWidth: '200px',
      render: (value: string) => (
        <span className="monospace" style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
          {value}
        </span>
      )
    },
    {
      id: 'user',
      label: t[language].user,
      field: (row) => row.username || row.user_id || '-',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '120px'
    },
    {
      id: 'request_type',
      label: t[language].requestType,
      field: 'request_type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'ui', label: t[language].requestTypeUI },
        { value: 'integration', label: t[language].requestTypeIntegration }
      ],
      width: '140px',
      render: (value: string) => (
        <span className={`request-type-badge ${value === 'ui' ? 'ui' : 'integration'}`}>
          {value === 'ui' ? t[language].requestTypeUI : t[language].requestTypeIntegration}
        </span>
      )
    },
    {
      id: 'direction',
      label: t[language].direction,
      field: 'direction',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'inbound', label: t[language].directionInbound },
        { value: 'outbound', label: t[language].directionOutbound }
      ],
      width: '100px',
      render: (value: string) => (
        <span className={`direction-badge ${value === 'inbound' ? 'inbound' : 'outbound'}`}>
          {value === 'inbound' ? t[language].directionInbound : t[language].directionOutbound}
        </span>
      )
    },
    {
      id: 'status',
      label: t[language].status,
      field: 'status_code',
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '80px',
      render: (value: number) => (
        <span
          style={{ color: getStatusColor(value), fontWeight: 600 }}
        >
          {value || '-'}
        </span>
      )
    },
    {
      id: 'duration',
      label: t[language].duration,
      field: 'duration_ms',
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '90px',
      render: (value: number) => value ? `${value}ms` : '-'
    },
    {
      id: 'timestamp',
      label: t[language].timestamp,
      field: 'created_at',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '160px',
      render: (value: string) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--dg-text-secondary)' }}>
          {formatTimestamp(value)}
        </span>
      )
    },
    {
      id: 'actions',
      label: t[language].actions,
      field: 'id',
      sortable: false,
      filterable: false,
      width: '80px',
      render: (_value: any, row: LogEntry) => (
        <button
          className="view-details-btn"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0.25rem',
            transition: 'transform 0.2s ease'
          }}
        >
          👁️
        </button>
      )
    }
  ], [language, t]);

  // Toolbar content
  const toolbarContent = (
    <>
      <button onClick={fetchLogs} className="toolbar-btn toolbar-btn-primary">
        <span className="btn-icon">🔄</span>
        <span className="btn-text">{t[language].refresh}</span>
      </button>

      <div className="toolbar-separator"></div>

      <div className="toolbar-filter-group">
        <label className="filter-label">{t[language].timeRange || 'טווח זמן'}:</label>
        <select
          value={hoursFilter}
          onChange={(e) => setHoursFilter(Number(e.target.value))}
          className="toolbar-select"
        >
          <option value="1">1 {t[language].lastHours}</option>
          <option value="6">6 {t[language].lastHours}</option>
          <option value="24">24 {t[language].lastHours}</option>
          <option value="72">72 {t[language].lastHours}</option>
          <option value="168">168 {t[language].lastHours}</option>
        </select>
      </div>
    </>
  );

  return (
    <div className={`api-logs ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="logs-header">
        <h1 className="logs-title">{t[language].title}</h1>
        <p className="logs-subtitle">{t[language].subtitle}</p>
      </div>

      {/* DataGrid with integrated toolbar */}
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
      ) : (
        <DataGrid
          columns={columns}
          data={logs}
          keyField="id"
          language={language}
          theme={theme}
          persistStateKey={`api-logs-${logType}`}
          onRowClick={(row) => setSelectedLog(row)}
          emptyMessage={t[language].noLogs}
          height="calc(100vh - 400px)"
          stickyHeader={true}
          toolbarContent={toolbarContent}
        />
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="details-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span style={{ backgroundColor: getMethodColor(selectedLog.method), color: 'white', padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 600 }} className="method-badge">
                  {selectedLog.method}
                </span>
                {selectedLog.endpoint || selectedLog.path}
              </h2>
              <button className="modal-close-btn" onClick={() => setSelectedLog(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <strong>{t[language].user}:</strong> {selectedLog.username || selectedLog.user_id || 'N/A'}
              </div>
              <div className="modal-section">
                <strong>{t[language].ipAddress}:</strong> {selectedLog.user_ip || 'N/A'}
              </div>
              {selectedLog.origin && (
                <div className="modal-section">
                  <strong>{t[language].origin}:</strong> {selectedLog.origin}
                </div>
              )}
              {selectedLog.referer && (
                <div className="modal-section">
                  <strong>{t[language].referer}:</strong>{' '}
                  <span className="referer-link">{selectedLog.referer}</span>
                </div>
              )}
              {selectedLog.app_source && (
                <div className="modal-section">
                  <strong>{t[language].appSource}:</strong> {selectedLog.app_source}
                </div>
              )}
              <div className="modal-section">
                <strong>{t[language].requestType}:</strong>{' '}
                <span className={`request-type-badge ${selectedLog.request_type === 'ui' ? 'ui' : 'integration'}`}>
                  {selectedLog.request_type === 'ui' ? t[language].requestTypeUI : t[language].requestTypeIntegration}
                </span>
              </div>
              <div className="modal-section">
                <strong>{t[language].direction}:</strong>{' '}
                <span className={`direction-badge ${selectedLog.direction === 'inbound' ? 'inbound' : 'outbound'}`}>
                  {selectedLog.direction === 'inbound' ? t[language].directionInbound : t[language].directionOutbound}
                </span>
              </div>
              <div className="modal-section">
                <strong>{t[language].status}:</strong>{' '}
                <span style={{ color: getStatusColor(selectedLog.status_code), fontWeight: 600 }}>
                  {selectedLog.status_code}
                </span>
              </div>
              <div className="modal-section">
                <strong>{t[language].duration}:</strong> {selectedLog.duration_ms}ms
              </div>
              {selectedLog.request_body && (
                <div className="modal-section">
                  <strong>{t[language].requestBody}:</strong>
                  <pre className="code-block">{selectedLog.request_body}</pre>
                </div>
              )}
              {selectedLog.response_body && (
                <div className="modal-section">
                  <strong>{t[language].responseBody}:</strong>
                  <pre className="code-block">{selectedLog.response_body}</pre>
                </div>
              )}
              {selectedLog.error_message && (
                <div className="modal-section error-section">
                  <strong>{t[language].errorMessage}:</strong>
                  <pre className="code-block error-block">{selectedLog.error_message}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
