import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import './DataTable.css';

export interface DataTableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  render?: (value: T[keyof T] | undefined, row: T) => ReactNode;
  align?: 'start' | 'center' | 'end';
}

export interface DataTablePagination {
  total: number;
  skip: number;
  limit: number;
  returned: number;
}

export interface DataTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  columns: Array<DataTableColumn<T> | string>;
  data: T[];
  pagination?: DataTablePagination;
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
  loading?: boolean;
  error?: string | null;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  exportable?: boolean;
  onExport?: () => void;
  maxCellLength?: number;
  showRowDetails?: boolean;
  translations?: Record<string, Record<string, string>>;
}

const translations = {
  he: {
    searchPlaceholder: 'חיפוש...',
    clearSearch: 'נקה',
    noData: 'אין נתונים להצגה',
    loading: 'טוען נתונים...',
    error: 'שגיאה',
    export: 'ייצוא CSV',
    showing: 'מציג',
    of: 'מתוך',
    records: 'רשומות',
    previous: 'קודם',
    next: 'הבא',
  },
  en: {
    searchPlaceholder: 'Search...',
    clearSearch: 'Clear',
    noData: 'No data to display',
    loading: 'Loading...',
    error: 'Error',
    export: 'Export CSV',
    showing: 'Showing',
    of: 'of',
    records: 'records',
    previous: 'Previous',
    next: 'Next',
  },
  ar: {
    searchPlaceholder: 'بحث...',
    clearSearch: 'مسح',
    noData: 'لا توجد بيانات',
    loading: 'جار التحميل...',
    error: 'خطأ',
    export: 'تصدير CSV',
    showing: 'عرض',
    of: 'من',
    records: 'سجلات',
    previous: 'السابق',
    next: 'التالي',
  },
};

export const DataTable = <T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  language,
  theme,
  loading = false,
  error = null,
  searchable = false,
  searchValue = '',
  onSearchChange,
  onPageChange,
  onRowClick,
  exportable = false,
  onExport,
  maxCellLength = 80,
}: DataTableProps<T>) => {
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const t = translations[language];
  const dir = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';

  const displayData = useMemo<T[]>(() => data ?? [], [data]);

  const handleSearchChange = (value: string) => {
    setInternalSearch(value);
    onSearchChange?.(value);
  };

  const currentPage = pagination && pagination.limit > 0
    ? Math.floor(pagination.skip / pagination.limit) + 1
    : 1;

  const totalPages = pagination && pagination.limit > 0
    ? Math.max(1, Math.ceil(pagination.total / pagination.limit))
    : 1;

  const handlePageChange = (nextPage: number) => {
    if (!pagination || !onPageChange) return;
    if (nextPage < 1 || nextPage > totalPages) return;
    onPageChange(nextPage);
  };

  const truncateValue = (value: unknown) => {
    if (value === null || value === undefined) return '-';
    const strValue = typeof value === 'string' ? value : String(value);
    if (strValue.length <= maxCellLength) return strValue;
    return `${strValue.slice(0, maxCellLength)}…`;
  };

  const exportCsv = () => {
    const headers = columns.map((column) =>
      typeof column === 'string' ? column : column.label
    );
    const rows = displayData.map((row: T) =>
      columns.map((column) => {
        const colDef = typeof column === 'string' ? { key: column, label: column } : column;
        const value = colDef.render
          ? colDef.render(row[colDef.key as keyof T], row)
          : row[colDef.key as keyof T];
        const text = typeof value === 'string' ? value : String(value ?? '');
        const needsQuotes = text.includes(',') || text.includes('"') || text.includes('\n');
        if (!needsQuotes) return text;
        return `"${text.replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `table_export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`data-table ${theme}`} dir={dir}>
      {(searchable || exportable) && (
        <div className="data-table-toolbar">
          {searchable && (
            <div className="search-wrapper">
              <input
                type="text"
                value={internalSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="search-input"
              />
              {internalSearch && (
                <button className="clear-btn" onClick={() => handleSearchChange('')}>
                  {t.clearSearch}
                </button>
              )}
            </div>
          )}
          {exportable && (
            <button className="export-btn" onClick={onExport ?? exportCsv}>
              📥 {t.export}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="data-table-state">{t.loading}</div>
      ) : error ? (
        <div className="data-table-state error">
          {t.error}: {error}
        </div>
      ) : !displayData.length ? (
        <div className="data-table-state">{t.noData}</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((column) => {
                  const colDef = typeof column === 'string' ? { key: column, label: column } : column;
                  return (
                    <th key={colDef.key as string} data-align={colDef.align}>
                      {colDef.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row: T, rowIdx: number) => (
                <tr
                  key={`row-${rowIdx}`}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'clickable' : undefined}
                >
                  {columns.map((column) => {
                    const colDef = typeof column === 'string' ? { key: column, label: column } : column;
                    const rawValue = colDef.render
                      ? colDef.render(row[colDef.key as keyof T], row)
                      : row[colDef.key as keyof T];
                    const displayValue: ReactNode =
                      typeof rawValue === 'string' || typeof rawValue === 'number'
                        ? truncateValue(rawValue)
                        : (rawValue as ReactNode) ?? '-';
                    return (
                      <td key={colDef.key as string} data-align={colDef.align}>
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && totalPages > 1 && (
        <div className="data-table-pagination">
          <span>
            {t.showing} {pagination.skip + 1}-{pagination.skip + pagination.returned} {t.of}{' '}
            {pagination.total} {t.records}
          </span>
          <div className="pagination-controls">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              {t.previous}
            </button>
            <span>
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {t.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


