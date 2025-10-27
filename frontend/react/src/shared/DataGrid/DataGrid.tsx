import { useState, useEffect, useMemo } from 'react';
import './DataGrid.css';

export type FilterType = 'text' | 'select' | 'number' | 'date';
export type SortDirection = 'asc' | 'desc' | null;

export interface DataGridColumn<T = any> {
  id: string;
  label: string;
  field: keyof T | ((row: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: { value: string; label: string }[];
  width?: string;
  minWidth?: string;
  render?: (value: any, row: T) => React.ReactNode;
  headerRender?: () => React.ReactNode;
}

export interface DataGridProps<T = any> {
  columns: DataGridColumn<T>[];
  data: T[];
  keyField: keyof T;
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
  persistStateKey?: string; // Key for localStorage persistence
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  height?: string;
  stickyHeader?: boolean;
}

interface FilterState {
  [columnId: string]: string;
}

interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

export const DataGrid = <T extends Record<string, any>>({
  columns,
  data,
  keyField,
  language,
  theme,
  persistStateKey,
  onRowClick,
  emptyMessage,
  height = 'auto',
  stickyHeader = true,
}: DataGridProps<T>) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ columnId: null, direction: null });

  const translations = {
    he: {
      noData: 'אין נתונים להצגה',
      clearFilters: 'נקה סינונים',
      filterPlaceholder: 'חפש...',
      selectAll: 'הכל',
    },
    en: {
      noData: 'No data to display',
      clearFilters: 'Clear Filters',
      filterPlaceholder: 'Search...',
      selectAll: 'All',
    },
    ar: {
      noData: 'لا توجد بيانات',
      clearFilters: 'مسح المرشحات',
      filterPlaceholder: 'بحث...',
      selectAll: 'الكل',
    },
  };

  const t = translations[language];

  // Load state from localStorage on mount
  useEffect(() => {
    if (persistStateKey) {
      const saved = localStorage.getItem(`datagrid_${persistStateKey}`);
      if (saved) {
        try {
          const { filters: savedFilters, sort: savedSort } = JSON.parse(saved);
          setFilters(savedFilters || {});
          setSort(savedSort || { columnId: null, direction: null });
        } catch (e) {
          console.error('Failed to load DataGrid state:', e);
        }
      }
    }
  }, [persistStateKey]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (persistStateKey) {
      localStorage.setItem(
        `datagrid_${persistStateKey}`,
        JSON.stringify({ filters, sort })
      );
    }
  }, [filters, sort, persistStateKey]);

  // Get value from row
  const getValueFromRow = (row: T, column: DataGridColumn<T>): any => {
    if (typeof column.field === 'function') {
      return column.field(row);
    }
    return row[column.field];
  };

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([columnId, filterValue]) => {
      if (!filterValue) return;

      const column = columns.find(col => col.id === columnId);
      if (!column) return;

      result = result.filter(row => {
        const value = getValueFromRow(row, column);
        const stringValue = String(value || '').toLowerCase();
        const filterString = filterValue.toLowerCase();

        return stringValue.includes(filterString);
      });
    });

    return result;
  }, [data, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sort.columnId || !sort.direction) return filteredData;

    const column = columns.find(col => col.id === sort.columnId);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getValueFromRow(a, column);
      const bValue = getValueFromRow(b, column);

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sort.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sort.direction === 'asc' ? -1 : 1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sort, columns]);

  // Handle sort click
  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    setSort(prev => {
      if (prev.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnId, direction: 'desc' };
      }
      return { columnId: null, direction: null };
    });
  };

  // Handle filter change
  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: value,
    }));
  };

  // Clear all filters and sorting
  const handleClearAll = () => {
    setFilters({});
    setSort({ columnId: null, direction: null });
  };

  // Check if any filters or sorting active
  const hasActiveFilters = Object.values(filters).some(v => v) || sort.columnId !== null;

  return (
    <div className={`data-grid ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="data-grid-toolbar">
          <button onClick={handleClearAll} className="clear-filters-btn">
            🗑️ {t.clearFilters}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="data-grid-container" style={{ height }}>
        <table className="data-grid-table">
          <thead className={stickyHeader ? 'sticky-header' : ''}>
            {/* Column headers */}
            <tr>
              {columns.map(column => (
                <th
                  key={column.id}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="th-content">
                    {column.headerRender ? column.headerRender() : column.label}
                    {column.sortable && (
                      <span className="sort-indicator">
                        {sort.columnId === column.id ? (
                          sort.direction === 'asc' ? ' ▲' : ' ▼'
                        ) : (
                          ' ⇅'
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Filter row */}
            <tr className="filter-row">
              {columns.map(column => (
                <th key={`filter-${column.id}`}>
                  {column.filterable && (
                    <>
                      {column.filterType === 'select' && column.filterOptions ? (
                        <select
                          className="filter-input filter-select"
                          value={filters[column.id] || ''}
                          onChange={e => handleFilterChange(column.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">{t.selectAll}</option>
                          {column.filterOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={column.filterType === 'number' ? 'number' : 'text'}
                          className="filter-input"
                          placeholder={t.filterPlaceholder}
                          value={filters[column.id] || ''}
                          onChange={e => handleFilterChange(column.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-message">
                  {emptyMessage || t.noData}
                </td>
              </tr>
            ) : (
              sortedData.map(row => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'clickable' : ''}
                >
                  {columns.map(column => (
                    <td key={`${row[keyField]}-${column.id}`}>
                      {column.render
                        ? column.render(getValueFromRow(row, column), row)
                        : String(getValueFromRow(row, column) ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="data-grid-footer">
        <span className="data-count">
          {sortedData.length === data.length
            ? `${data.length} ${language === 'he' ? 'רשומות' : language === 'ar' ? 'سجلات' : 'records'}`
            : `${sortedData.length} / ${data.length} ${language === 'he' ? 'רשומות' : language === 'ar' ? 'سجلات' : 'records'}`}
        </span>
      </div>
    </div>
  );
};

