import { useState, useEffect } from 'react';
import axios from '../../api/axios.config';
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
  
  // Filters
  const [methodFilter, setMethodFilter] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('');
  const [hoursFilter, setHoursFilter] = useState(24);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [total, setTotal] = useState(0);

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
      sourceIP: 'מקור (IP)',
      sourceDomain: 'מקור (דומיין)',
      requestType: 'סוג הבקשה',
      requestTypeUI: 'קריאות UI',
      requestTypeIntegration: 'קריאות אינטגרציה',
      direction: 'כיוון',
      directionInbound: 'נכנס',
      directionOutbound: 'יוצא',
      status: 'Status',
      duration: 'זמן (ms)',
      timestamp: 'זמן',
      filterMethod: 'סנן לפי Method',
      filterEndpoint: 'חפש Endpoint',
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
      page: 'עמוד',
      of: 'מתוך',
      showing: 'מציג',
      to: 'עד',
      records: 'רשומות'
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
      sourceIP: 'Source (IP)',
      sourceDomain: 'Source (Domain)',
      requestType: 'Request Type',
      requestTypeUI: 'UI Calls',
      requestTypeIntegration: 'Integration Calls',
      direction: 'Direction',
      directionInbound: 'Inbound',
      directionOutbound: 'Outbound',
      status: 'Status',
      duration: 'Duration (ms)',
      timestamp: 'Timestamp',
      filterMethod: 'Filter by Method',
      filterEndpoint: 'Search Endpoint',
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
      page: 'Page',
      of: 'of',
      showing: 'Showing',
      to: 'to',
      records: 'records'
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
      sourceIP: 'المصدر (IP)',
      sourceDomain: 'المصدر (النطاق)',
      requestType: 'نوع الطلب',
      requestTypeUI: 'مكالمات UI',
      requestTypeIntegration: 'مكالمات التكامل',
      direction: 'الاتجاه',
      directionInbound: 'وارد',
      directionOutbound: 'صادر',
      status: 'الحالة',
      duration: 'المدة (ms)',
      timestamp: 'الوقت',
      filterMethod: 'تصفية حسب Method',
      filterEndpoint: 'بحث Endpoint',
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
      page: 'صفحة',
      of: 'من',
      showing: 'عرض',
      to: 'إلى',
      records: 'سجلات'
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logType, methodFilter, endpointFilter, hoursFilter, currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const params: any = {
        skip,
        limit: itemsPerPage,
        hours: hoursFilter
      };
      
      if (methodFilter) params.method = methodFilter;
      if (endpointFilter) params.endpoint = endpointFilter;

      const endpoint = logType === 'backend' ? '/api/v1/logs/backend' : '/api/v1/logs/frontend';
      const response = await axios.get(endpoint, { params });
      
      setLogs(response.data.logs || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to fetch ${logType} logs`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'gray';
    if (statusCode >= 200 && statusCode < 300) return 'green';
    if (statusCode >= 300 && statusCode < 400) return 'blue';
    if (statusCode >= 400 && statusCode < 500) return 'orange';
    return 'red';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return '#4caf50';
      case 'POST': return '#2196f3';
      case 'PUT': return '#ff9800';
      case 'DELETE': return '#f44336';
      case 'PATCH': return '#9c27b0';
      default: return '#757575';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className={`api-logs ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="logs-header">
        <h1 className="logs-title">{t[language].title}</h1>
        <p className="logs-subtitle">{t[language].subtitle}</p>
      </div>

      {/* Filters */}
      <div className="logs-filters">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">{t[language].filterMethod}</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>

        <input
          type="text"
          value={endpointFilter}
          onChange={(e) => setEndpointFilter(e.target.value)}
          placeholder={t[language].filterEndpoint}
          className="filter-input"
        />

        <select
          value={hoursFilter}
          onChange={(e) => setHoursFilter(Number(e.target.value))}
          className="filter-select"
        >
          <option value="1">1 {t[language].lastHours}</option>
          <option value="6">6 {t[language].lastHours}</option>
          <option value="24">24 {t[language].lastHours}</option>
          <option value="72">72 {t[language].lastHours}</option>
          <option value="168">168 {t[language].lastHours}</option>
        </select>

        <button onClick={fetchLogs} className="refresh-btn">
          🔄 {t[language].refresh}
        </button>
      </div>

      {/* Logs Table */}
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
      ) : logs.length === 0 ? (
        <div className="no-logs-container">
          <span className="no-logs-icon">📭</span>
          <p>{t[language].noLogs}</p>
        </div>
      ) : (
        <>
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>{t[language].method}</th>
                  <th>{t[language].endpoint}</th>
                  <th>{t[language].user}</th>
                  <th>{t[language].requestType}</th>
                  <th>{t[language].direction}</th>
                  <th>{t[language].status}</th>
                  <th>{t[language].duration}</th>
                  <th>{t[language].timestamp}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span
                        className="method-badge"
                        style={{ backgroundColor: getMethodColor(log.method) }}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="endpoint-cell">{log.endpoint || log.path || log.url}</td>
                    <td>{log.username || log.user_id || '-'}</td>
                    <td>
                      <span className={`request-type-badge ${log.request_type === 'ui' ? 'ui' : 'integration'}`}>
                        {log.request_type === 'ui' ? t[language].requestTypeUI : t[language].requestTypeIntegration}
                      </span>
                    </td>
                    <td>
                      <span className={`direction-badge ${log.direction === 'inbound' ? 'inbound' : 'outbound'}`}>
                        {log.direction === 'inbound' ? t[language].directionInbound : t[language].directionOutbound}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ color: getStatusColor(log.status_code) }}
                      >
                        {log.status_code || '-'}
                      </span>
                    </td>
                    <td>{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                    <td className="timestamp-cell">{formatTimestamp(log.created_at)}</td>
                    <td>
                      <button
                        className="view-details-btn"
                        onClick={() => setSelectedLog(log)}
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="logs-pagination">
            <div className="pagination-info">
              {t[language].showing} {(currentPage - 1) * itemsPerPage + 1} {t[language].to}{' '}
              {Math.min(currentPage * itemsPerPage, total)} {t[language].of} {total} {t[language].records}
            </div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ←
              </button>
              <span className="page-indicator">
                {t[language].page} {currentPage} {t[language].of} {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="details-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span style={{ backgroundColor: getMethodColor(selectedLog.method) }} className="method-badge">
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
                <span style={{ color: getStatusColor(selectedLog.status_code) }}>
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

