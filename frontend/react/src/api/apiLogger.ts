/**
 * API Logger for Frontend
 * Logs all API calls to Backend database
 */
import axios from 'axios';

interface APILogEntry {
  method: string;
  url: string;
  endpoint: string;
  request_body?: string;
  request_headers?: string;
  user_id?: number;
  username?: string;
  session_id?: string;
  origin?: string;
  referer?: string;
  app_source?: string;
  request_type?: string;
  direction?: string;
  status_code?: number;
  response_body?: string;
  response_headers?: string;
  success: boolean;
  request_time: string;
  response_time: string;
  duration_ms: number;
  error_message?: string;
  browser_info?: string;
}

class APILogger {
  private readonly API_URL: string;
  private logQueue: APILogEntry[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.API_URL = import.meta.env.VITE_API_URL || '';
    
    // Start periodic flush
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  /**
   * Log an API call
   */
  log(
    method: string,
    url: string,
    requestData?: any,
    requestHeaders?: any,
    responseData?: any,
    responseHeaders?: any,
    statusCode?: number,
    success: boolean = false,
    requestTime: Date = new Date(),
    responseTime: Date = new Date(),
    errorMessage?: string
  ) {
    try {
      // Extract endpoint from URL
      const urlObj = new URL(url, window.location.origin);
      const endpoint = urlObj.pathname;

      // Get user info from localStorage
      const userInfo = this.getUserInfo();

      // Calculate duration
      const duration_ms = responseTime.getTime() - requestTime.getTime();

      // Prepare log entry
      const logEntry: APILogEntry = {
        method: method.toUpperCase(),
        url: url,
        endpoint: endpoint,
        request_body: requestData ? this.safeStringify(requestData) : undefined,
        request_headers: requestHeaders ? this.safeStringify(this.filterHeaders(requestHeaders)) : undefined,
        user_id: userInfo.userId,
        username: userInfo.username,
        session_id: this.getSessionId(),
        origin: window.location.origin,  // e.g., https://ulm-rct.ovu.co.il
        referer: window.location.href,   // Full URL of the page making the request
        app_source: 'ulm-react-web',     // Application identifier
        request_type: 'ui',              // Frontend calls are always UI calls
        direction: 'outbound',           // Frontend makes outbound requests to backend
        status_code: statusCode,
        response_body: responseData ? this.safeStringify(responseData, 500) : undefined,
        response_headers: responseHeaders ? this.safeStringify(responseHeaders) : undefined,
        success: success,
        request_time: requestTime.toISOString(),
        response_time: responseTime.toISOString(),
        duration_ms: duration_ms,
        error_message: errorMessage,
        browser_info: this.getBrowserInfo(),
      };

      // Add to queue
      this.logQueue.push(logEntry);

      // Flush if queue is full
      if (this.logQueue.length >= this.BATCH_SIZE) {
        this.flush();
      }
    } catch (error) {
      // Don't let logging errors affect the application
      console.error('Failed to log API call:', error);
    }
  }

  /**
   * Flush the log queue to the server
   */
  private async flush() {
    if (this.logQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      // Send logs to backend
      await axios.post(`${this.API_URL}/api/v1/logs/frontend/batch`, {
        logs: logsToSend
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ulm_token')}`,
          'Content-Type': 'application/json',
          'X-App-Source': 'ulm-react-web'  // Identify as UI request (not integration)
        }
      });
    } catch (error) {
      // If failed, put logs back in queue
      this.logQueue.unshift(...logsToSend);
      console.error('Failed to send API logs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get user info from localStorage or state
   */
  private getUserInfo(): { userId?: number; username?: string } {
    try {
      // Try to get from token or userInfo in localStorage
      const username = localStorage.getItem('ulm_username');
      const userId = localStorage.getItem('ulm_user_id');
      
      return {
        userId: userId ? parseInt(userId) : undefined,
        username: username || undefined
      };
    } catch {
      return {};
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('ulm_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ulm_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get browser info
   */
  private getBrowserInfo(): string {
    return `${navigator.userAgent} | ${window.screen.width}x${window.screen.height}`;
  }

  /**
   * Filter sensitive headers
   */
  private filterHeaders(headers: any): any {
    const filtered = { ...headers };
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key'];
    
    for (const key of sensitiveKeys) {
      if (filtered[key]) {
        filtered[key] = '[REDACTED]';
      }
    }
    
    return filtered;
  }

  /**
   * Safely stringify with size limit
   */
  private safeStringify(obj: any, maxLength: number = 1000): string {
    try {
      const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
      return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch {
      return '<unable to stringify>';
    }
  }
}

// Export singleton instance
export const apiLogger = new APILogger();

