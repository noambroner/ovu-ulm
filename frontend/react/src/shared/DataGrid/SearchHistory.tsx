/**
 * Search History Component
 * =========================
 * Displays and manages user search history for DataGrid.
 * 
 * Features:
 * - Shows last 100 searches
 * - Click to apply previous search
 * - Delete individual searches
 * - Grouped by date
 */

import React, { useState, useEffect } from 'react';
import { getSearchHistory, deleteSearchHistory, SearchHistoryEntry } from '../../services/userPreferencesService';
import './SearchHistory.css';

interface SearchHistoryProps {
  datagridKey: string;
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
  onApplySearch: (filters: Record<string, string>) => void;
  onClose: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  datagridKey,
  language,
  theme,
  onApplySearch,
  onClose,
}) => {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const translations = {
    he: {
      title: 'היסטוריית חיפושים',
      noHistory: 'אין היסטוריית חיפושים',
      apply: 'החל',
      delete: 'מחק',
      close: 'סגור',
      loading: 'טוען...',
    },
    en: {
      title: 'Search History',
      noHistory: 'No search history',
      apply: 'Apply',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading...',
    },
    ar: {
      title: 'سجل البحث',
      noHistory: 'لا يوجد سجل بحث',
      apply: 'تطبيق',
      delete: 'حذف',
      close: 'إغلاق',
      loading: 'جار التحميل...',
    },
  };

  const t = translations[language];

  useEffect(() => {
    loadHistory();
  }, [datagridKey]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getSearchHistory(datagridKey);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (entry: SearchHistoryEntry) => {
    onApplySearch(entry.search_data.filters);
    onClose();
  };

  const handleDelete = async (historyId: number) => {
    try {
      await deleteSearchHistory(historyId);
      setHistory(prev => prev.filter(h => h.id !== historyId));
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'he' ? 'עכשיו' : language === 'ar' ? 'الآن' : 'Now';
    if (diffMins < 60) return `${diffMins} ${language === 'he' ? 'דקות' : language === 'ar' ? 'دقائق' : 'min'}`;
    if (diffHours < 24) return `${diffHours} ${language === 'he' ? 'שעות' : language === 'ar' ? 'ساعات' : 'hours'}`;
    if (diffDays < 7) return `${diffDays} ${language === 'he' ? 'ימים' : language === 'ar' ? 'أيام' : 'days'}`;
    
    return date.toLocaleDateString(language === 'he' ? 'he-IL' : language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const formatFilters = (filters: Record<string, string>) => {
    return Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') || (language === 'he' ? 'כל הנתונים' : language === 'ar' ? 'جميع البيانات' : 'All data');
  };

  return (
    <div className={`search-history-overlay ${theme}`} onClick={onClose}>
      <div className={`search-history-modal ${theme}`} onClick={e => e.stopPropagation()}>
        <div className="search-history-header">
          <h2>{t.title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="search-history-content">
          {loading ? (
            <div className="loading-state">{t.loading}</div>
          ) : history.length === 0 ? (
            <div className="empty-state">{t.noHistory}</div>
          ) : (
            <div className="history-list">
              {history.map(entry => (
                <div key={entry.id} className="history-item">
                  <div className="history-info">
                    <div className="history-filters">
                      {entry.search_data.description || formatFilters(entry.search_data.filters)}
                    </div>
                    <div className="history-time">{formatDate(entry.created_at)}</div>
                  </div>
                  <div className="history-actions">
                    <button
                      className="apply-btn"
                      onClick={() => handleApply(entry)}
                      title={t.apply}
                    >
                      ↻
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(entry.id)}
                      title={t.delete}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-history-footer">
          <button className="footer-btn" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

