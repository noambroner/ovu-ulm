import axios from "axios";
import { apiLogger } from "./apiLogger";

// Configure axios defaults
const API_URL = import.meta.env.VITE_API_URL || "";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "X-App-Source": "ulm-react-web", // Identifies this as the React web application
  },
});

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Separate client for refresh calls (no interceptors to avoid recursion)
const refreshApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "X-App-Source": "ulm-react-web",
  },
});

const decodeJwtExpMs = (token: string): number | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload);
    const parsed = JSON.parse(json);
    const exp = parsed?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpiringSoon = (
  token: string,
  bufferMs: number = 30_000
): boolean => {
  const expMs = decodeJwtExpMs(token);
  if (!expMs) return true;
  return Date.now() >= expMs - bufferMs;
};

const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const response = await refreshApi.post("/api/v1/auth/refresh", {
    refresh_token: refreshToken,
  });
  const accessToken = response.data?.access_token;
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Refresh did not return access_token");
  }
  return accessToken;
};

// Add request interceptor to include token and proactively refresh before expiry
api.interceptors.request.use(
  async (config) => {
    const url = config.url || "";
    const isAuthEndpoint =
      url.includes("/api/v1/auth/login") ||
      url.includes("/api/v1/auth/refresh") ||
      url.includes("/api/v1/auth/logout");

    const currentToken = localStorage.getItem("ulm_token");
    const refreshToken = localStorage.getItem("ulm_refresh_token");

    // Proactive refresh: avoid 401 spikes at token expiry boundary
    if (
      !isAuthEndpoint &&
      currentToken &&
      refreshToken &&
      isTokenExpiringSoon(currentToken)
    ) {
      if (isRefreshing) {
        // Wait for ongoing refresh
        try {
          const newToken = await new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (queueError) {
          // Refresh failed while we were queued, propagate the error
          throw queueError;
        }
      } else {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken(refreshToken);
          localStorage.setItem("ulm_token", newToken);
          api.defaults.headers.common["Authorization"] = "Bearer " + newToken;
          processQueue(null, newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem("ulm_token");
          localStorage.removeItem("ulm_refresh_token");
          window.dispatchEvent(new CustomEvent("auth:logout"));
          throw refreshError;
        } finally {
          isRefreshing = false;
        }
      }
    } else if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }

    // Store request start time for logging
    (config as any).metadata = { startTime: new Date() };

    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // CRITICAL: Don't try to refresh if the failing request IS the refresh endpoint!
    // This prevents infinite loops when refresh token is also invalid
    if (originalRequest.url?.includes("/auth/refresh")) {
      // Refresh endpoint failed, clear tokens and logout
      localStorage.removeItem("ulm_token");
      localStorage.removeItem("ulm_refresh_token");
      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("ulm_refresh_token");

      if (!refreshToken) {
        // No refresh token, clear tokens and reject
        isRefreshing = false;
        localStorage.removeItem("ulm_token");
        localStorage.removeItem("ulm_refresh_token");
        // Dispatch event to notify app of logout
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token (using separate client to avoid interceptor recursion)
        const access_token = await refreshAccessToken(refreshToken);

        localStorage.setItem("ulm_token", access_token);

        // Update the authorization header
        api.defaults.headers.common["Authorization"] = "Bearer " + access_token;
        originalRequest.headers["Authorization"] = "Bearer " + access_token;

        processQueue(null, access_token);
        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and reject
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem("ulm_token");
        localStorage.removeItem("ulm_refresh_token");
        // Dispatch event to notify app of logout
        window.dispatchEvent(new CustomEvent("auth:logout"));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Add logging interceptor (AFTER auth interceptors to capture final response)
api.interceptors.response.use(
  (response) => {
    // Log successful response
    const requestTime =
      (response.config as any).metadata?.startTime || new Date();
    const responseTime = new Date();

    apiLogger.log(
      response.config.method?.toUpperCase() || "GET",
      response.config.url || "",
      response.config.data,
      response.config.headers,
      response.data,
      response.headers,
      response.status,
      true, // success
      requestTime,
      responseTime
    );

    return response;
  },
  (error) => {
    // Log error response
    const requestTime =
      (error.config as any)?.metadata?.startTime || new Date();
    const responseTime = new Date();

    apiLogger.log(
      error.config?.method?.toUpperCase() || "GET",
      error.config?.url || "",
      error.config?.data,
      error.config?.headers,
      error.response?.data,
      error.response?.headers,
      error.response?.status,
      false, // not success
      requestTime,
      responseTime,
      error.message
    );

    return Promise.reject(error);
  }
);

export default api;
