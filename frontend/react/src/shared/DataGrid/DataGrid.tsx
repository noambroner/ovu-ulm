import { useState, useEffect, useMemo, useRef } from 'react';
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
  maxWidth?: string;
  resizable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  headerRender?: () => React.ReactNode;
}

export interface DataGridProps<T = any> {
  columns: DataGridColumn<T>[];
  data: T[];
  keyField: keyof T;
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
  persistStateKey?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  height?: string;
  stickyHeader?: boolean;
  toolbarContent?: React.ReactNode; // Custom toolbar content
}

interface FilterState {
  [columnId: string]: string;
}

interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

interface ColumnWidths {
  [columnId: string]: number;
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
  toolbarContent,
}: DataGridProps<T>) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ columnId: null, direction: null });
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
  const [resizing, setResizing] = useState<{ columnId: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

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
          const { filters: savedFilters, sort: savedSort, columnWidths: savedWidths } = JSON.parse(saved);
          setFilters(savedFilters || {});
          setSort(savedSort || { columnId: null, direction: null });
          setColumnWidths(savedWidths || {});
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
        JSON.stringify({ filters, sort, columnWidths })
      );
    }
  }, [filters, sort, columnWidths, persistStateKey]);

  // Initialize column widths from columns prop
  useEffect(() => {
    const initialWidths: ColumnWidths = {};
    columns.forEach(col => {
      if (col.width && !columnWidths[col.id]) {
        initialWidths[col.id] = parseInt(col.width);
      }
    });
    if (Object.keys(initialWidths).length > 0) {
      setColumnWidths(prev => ({ ...initialWidths, ...prev }));
    }
  }, [columns]);

  // Handle column resize
  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = tableRef.current?.querySelector(`th[data-column-id="${columnId}"]`);
    if (th) {
      setResizing({
        columnId,
        startX: e.clientX,
        startWidth: th.getBoundingClientRect().width,
      });
    }
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + delta);
      setColumnWidths(prev => ({
        ...prev,
        [resizing.columnId]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

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

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sort.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sort.direction === 'asc' ? -1 : 1;

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

  // Get column style
  const getColumnStyle = (column: DataGridColumn<T>) => {
    const style: React.CSSProperties = {};
    
    if (columnWidths[column.id]) {
      style.width = `${columnWidths[column.id]}px`;
    } else if (column.width) {
      style.width = column.width;
    }
    
    if (column.minWidth) {
      style.minWidth = column.minWidth;
    }
    
    if (column.maxWidth) {
      style.maxWidth = column.maxWidth;
    }

    return style;
  };

  return (
    <div className={`data-grid ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Toolbar - Always visible */}
      <div className="data-grid-toolbar">
        <div className="toolbar-custom">
          {/* Custom toolbar content (filters, buttons, etc.) */}
          {toolbarContent}
          
          {/* Clear filters button */}
          {hasActiveFilters && (
            <button onClick={handleClearAll} className="clear-filters-btn">
              🗑️ {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="data-grid-container" style={{ height }}>
        <table className="data-grid-table" ref={tableRef}>
          <thead className={stickyHeader ? 'sticky-header' : ''}>
            {/* Column headers */}
            <tr>
              {columns.map(column => (
                <th
                  key={column.id}
                  data-column-id={column.id}
                  style={getColumnStyle(column)}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="th-content">
                    <span className="th-label">
                      {column.headerRender ? column.headerRender() : column.label}
                    </span>
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
                  {/* Resize handle */}
                  {column.resizable !== false && (
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(column.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
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
                    <td key={`${row[keyField]}-${column.id}`} style={getColumnStyle(column)}>
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
