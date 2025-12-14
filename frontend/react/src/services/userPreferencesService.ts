/**
 * User Preferences Service
 * ========================
 * Service for managing user DataGrid preferences and search history.
 *
 * Features:
 * - Save/load DataGrid preferences (filters, sort, column widths)
 * - Manage search history (up to 100 per grid)
 * - Automatic fallback to localStorage if offline
 */

import api from "../api/axios.config";

const API_BASE = "/api/v1";

// ================================================
// TypeScript Interfaces
// ================================================

export interface DataGridPreferences {
  filters: Record<string, string>;
  sort: {
    columnId: string | null;
    direction: "asc" | "desc" | null;
  };
  columnWidths: Record<string, number>;
}

export interface SearchHistoryEntry {
  id: number;
  datagrid_key: string;
  search_data: {
    filters: Record<string, string>;
    description?: string;
  };
  created_at: string;
}

export interface PreferencesResponse {
  datagrid_key: string;
  preferences: DataGridPreferences;
  updated_at: string;
}

// ================================================
// Preferences API
// ================================================

/**
 * Check if JWT token is expired (without verifying signature)
 */
function isTokenExpired(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const payload = token.split(".")[1];
    if (!payload) return true;

    // Decode base64 payload
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );

    // Check expiration
    if (!decoded.exp) return false; // No expiration = valid

    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = decoded.exp * 1000;
    const now = Date.now();

    // Add 30 second buffer to avoid edge cases
    return now >= expirationTime - 30000;
  } catch (e) {
    // If we can't parse, assume expired
    return true;
  }
}

/**
 * Check if user is properly authenticated (has both access and refresh tokens, and access token is not expired)
 */
function isUserAuthenticated(): boolean {
  const token = localStorage.getItem("ulm_token");
  const refreshToken = localStorage.getItem("ulm_refresh_token");

  // Need both tokens
  if (!token || !refreshToken) {
    return false;
  }

  // Check if access token is expired
  // If expired, don't make request - axios interceptor will handle refresh
  // But we don't want to trigger unnecessary 401/403 errors
  if (isTokenExpired(token)) {
    return false;
  }

  return true;
}

/**
 * Get user preferences for a DataGrid
 */
export const getUserPreferences = async (
  datagridKey: string
): Promise<DataGridPreferences | null> => {
  // Check if user is authenticated before making server request
  if (!isUserAuthenticated()) {
    // No tokens or incomplete auth - skip server request, use localStorage only
    return loadFromLocalStorage(datagridKey);
  }

  try {
    const response = await api.get<PreferencesResponse | null>(
      `${API_BASE}/preferences/${datagridKey}`
    );
    return response.data?.preferences || null;
  } catch (error: any) {
    // Don't log 401/403 errors - they're expected when not authenticated
    // Don't log 500 errors either - they're handled by backend logging
    // The system will fallback to localStorage seamlessly
    if (
      error.response?.status !== 401 &&
      error.response?.status !== 403 &&
      error.response?.status !== 500
    ) {
      console.error("Failed to load preferences from server:", error);
    }
    // Fallback to localStorage
    return loadFromLocalStorage(datagridKey);
  }
};

/**
 * Save user preferences for a DataGrid
 */
export const saveUserPreferences = async (
  datagridKey: string,
  preferences: DataGridPreferences
): Promise<void> => {
  // Always save to localStorage first (instant response)
  saveToLocalStorage(datagridKey, preferences);

  // Check if user is authenticated before making server request
  if (!isUserAuthenticated()) {
    // No tokens or incomplete auth - skip server request, localStorage already saved
    return;
  }

  try {
    await api.put(`${API_BASE}/preferences/${datagridKey}`, preferences);
    console.log(`Preferences saved to server: ${datagridKey}`);
  } catch (error: any) {
    // Don't log 401/403 errors - they're expected when not authenticated
    // The system will fallback to localStorage seamlessly
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      console.error("Failed to save preferences to server:", error);
    }
    // localStorage already saved, so no need to save again
  }
};

/**
 * Delete user preferences for a DataGrid
 */
export const deleteUserPreferences = async (
  datagridKey: string
): Promise<void> => {
  try {
    await api.delete(`${API_BASE}/preferences/${datagridKey}`);
    localStorage.removeItem(`datagrid_${datagridKey}`);
    console.log(`Preferences deleted: ${datagridKey}`);
  } catch (error) {
    console.error("Failed to delete preferences:", error);
    throw error;
  }
};

// ================================================
// Search History API
// ================================================

/**
 * Get search history for a DataGrid
 */
export const getSearchHistory = async (
  datagridKey: string,
  limit: number = 100
): Promise<SearchHistoryEntry[]> => {
  // Check if user is authenticated before making server request
  if (!isUserAuthenticated()) {
    // No tokens or incomplete auth - skip server request, return empty array
    return [];
  }

  try {
    const response = await api.get<SearchHistoryEntry[]>(
      `${API_BASE}/search-history/${datagridKey}`,
      { params: { limit } }
    );
    return response.data || [];
  } catch (error: any) {
    // Don't log 401/403 errors - they're expected when not authenticated
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      console.error("Failed to load search history:", error);
    }
    return [];
  }
};

/**
 * Add a search to history
 */
export const addSearchHistory = async (
  datagridKey: string,
  filters: Record<string, string>,
  description?: string
): Promise<void> => {
  // Check if user is authenticated before making server request
  if (!isUserAuthenticated()) {
    // No tokens or incomplete auth - skip server request
    return;
  }

  try {
    await api.post(`${API_BASE}/search-history/${datagridKey}`, {
      search_data: {
        filters,
        description,
      },
    });
    console.log("Search saved to history");
  } catch (error: any) {
    // Don't log 401/403 errors - they're expected when not authenticated
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      console.error("Failed to save search history:", error);
    }
  }
};

/**
 * Delete a search history entry
 */
export const deleteSearchHistory = async (historyId: number): Promise<void> => {
  try {
    await api.delete(`${API_BASE}/search-history/${historyId}`);
    console.log(`Search history deleted: ${historyId}`);
  } catch (error) {
    console.error("Failed to delete search history:", error);
    throw error;
  }
};

// ================================================
// LocalStorage Fallback (for offline support)
// ================================================

function loadFromLocalStorage(datagridKey: string): DataGridPreferences | null {
  try {
    const saved = localStorage.getItem(`datagrid_${datagridKey}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
  }
  return null;
}

function saveToLocalStorage(
  datagridKey: string,
  preferences: DataGridPreferences
): void {
  try {
    localStorage.setItem(
      `datagrid_${datagridKey}`,
      JSON.stringify(preferences)
    );
    console.log(`Preferences saved to localStorage: ${datagridKey}`);
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

// ================================================
// Hybrid Mode: Use both server and localStorage
// ================================================

/**
 * Save preferences to both server and localStorage
 */
export const savePreferencesHybrid = async (
  datagridKey: string,
  preferences: DataGridPreferences
): Promise<void> => {
  // Save to localStorage immediately (instant response)
  saveToLocalStorage(datagridKey, preferences);

  // Save to server in background (persistent across devices)
  saveUserPreferences(datagridKey, preferences).catch(() => {
    // Already saved to localStorage, so ignore server error
  });
};

/**
 * Load preferences from server with localStorage fallback
 */
export const loadPreferencesHybrid = async (
  datagridKey: string
): Promise<DataGridPreferences | null> => {
  // Try server first
  const serverPrefs = await getUserPreferences(datagridKey);

  if (serverPrefs) {
    // Update localStorage with server data
    saveToLocalStorage(datagridKey, serverPrefs);
    return serverPrefs;
  }

  // Fallback to localStorage
  return loadFromLocalStorage(datagridKey);
};
