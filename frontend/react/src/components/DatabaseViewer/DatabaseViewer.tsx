import React, { useState, useEffect } from 'react';
import axios from '../../api/axios.config';
import './DatabaseViewer.css';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableInfo {
  name: string;
  columns: Column[];
  row_count: number;
}

interface TableData {
  columns: string[];
  data: any[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    returned: number;
  };
}

interface DatabaseViewerProps {
  language: 'he' | 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const DatabaseViewer = ({ language, theme }: DatabaseViewerProps) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  const t = {
    he: {
      title: 'מציג מסד הנתונים',
      subtitle: 'צפייה וחיפוש בטבלאות מסד הנתונים',
      selectTable: 'בחר טבלה',
      tablesList: 'רשימת טבלאות',
      search: 'חיפוש...',
      loading: 'טוען נתונים...',
      noData: 'אין נתונים להצגה',
      error: 'שגיאה',
      rowCount: 'שורות',
      columns: 'עמודות',
      showing: 'מציג',
      of: 'מתוך',
      records: 'רשומות',
      previousPage: 'עמוד קודם',
      nextPage: 'עמוד הבא',
      page: 'עמוד',
      noTableSelected: 'אנא בחר טבלה מהרשימה',
      refresh: 'רענן',
      exportCSV: 'ייצא CSV',
      tableInfo: 'פרטי טבלה',
      totalRows: 'סה״כ שורות',
      clearSearch: 'נקה חיפוש'
    },
    en: {
      title: 'Database Viewer',
      subtitle: 'View and search database tables',
      selectTable: 'Select Table',
      tablesList: 'Tables List',
      search: 'Search...',
      loading: 'Loading data...',
      noData: 'No data to display',
      error: 'Error',
      rowCount: 'Rows',
      columns: 'Columns',
      showing: 'Showing',
      of: 'of',
      records: 'records',
      previousPage: 'Previous Page',
      nextPage: 'Next Page',
      page: 'Page',
      noTableSelected: 'Please select a table from the list',
      refresh: 'Refresh',
      exportCSV: 'Export CSV',
      tableInfo: 'Table Info',
      totalRows: 'Total Rows',
      clearSearch: 'Clear Search'
    },
    ar: {
      title: 'عارض قاعدة البيانات',
      subtitle: 'عرض والبحث في جداول قاعدة البيانات',
      selectTable: 'اختر الجدول',
      tablesList: 'قائمة الجداول',
      search: 'بحث...',
      loading: 'جاري تحميل البيانات...',
      noData: 'لا توجد بيانات لعرضها',
      error: 'خطأ',
      rowCount: 'صفوف',
      columns: 'أعمدة',
      showing: 'عرض',
      of: 'من',
      records: 'سجلات',
      previousPage: 'الصفحة السابقة',
      nextPage: 'الصفحة التالية',
      page: 'صفحة',
      noTableSelected: 'الرجاء تحديد جدول من القائمة',
      refresh: 'تحديث',
      exportCSV: 'تصدير CSV',
      tableInfo: 'معلومات الجدول',
      totalRows: 'إجمالي الصفوف',
      clearSearch: 'مسح البحث'
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setCurrentPage(1);
      fetchTableData(selectedTable, 1, searchTerm);
    }
  }, [selectedTable, searchTerm]);

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/v1/database/tables');
      setTables(response.data.tables || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string, page: number, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * itemsPerPage;
      const params: any = {
        skip,
        limit: itemsPerPage
      };
      
      if (search) {
        params.search = search;
      }

      const response = await axios.get(`/api/v1/database/table/${tableName}`, { params });
      setTableData(response.data);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch table data');
      setTableData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setSearchTerm('');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (selectedTable) {
      fetchTableData(selectedTable, newPage, searchTerm);
    }
  };

  const handleRefresh = () => {
    if (selectedTable) {
      fetchTableData(selectedTable, currentPage, searchTerm);
    }
  };

  const exportToCSV = () => {
    if (!tableData || !tableData.data.length) return;

    const csv = [
      tableData.columns.join(','),
      ...tableData.data.map(row =>
        tableData.columns.map(col => {
          const value = row[col];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_${new Date().toISOString()}.csv`;
    a.click();
  };

  const totalPages = tableData
    ? Math.ceil(tableData.pagination.total / itemsPerPage)
    : 0;

  return (
    <div className={`database-viewer ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="viewer-header">
        <h1 className="viewer-title">{t[language].title}</h1>
        <p className="viewer-subtitle">{t[language].subtitle}</p>
      </div>

      <div className="viewer-container">
        {/* Sidebar - Tables List */}
        <div className="tables-sidebar">
          <h2 className="sidebar-title">{t[language].tablesList}</h2>
          {loading && !tables.length && (
            <div className="loading-message">{t[language].loading}</div>
          )}
          {error && !tables.length && (
            <div className="error-message">{t[language].error}: {error}</div>
          )}
          <div className="tables-list">
            {tables.map((table) => (
              <div
                key={table.name}
                className={`table-item ${selectedTable === table.name ? 'active' : ''}`}
                onClick={() => handleTableSelect(table.name)}
              >
                <div className="table-item-name">
                  <span className="table-icon">🗄️</span>
                  {table.name}
                </div>
                <div className="table-item-info">
                  <span className="table-stat">
                    {table.row_count} {t[language].rowCount}
                  </span>
                  <span className="table-stat">
                    {table.columns.length} {t[language].columns}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content - Table Data */}
        <div className="table-content">
          {!selectedTable ? (
            <div className="no-selection">
              <span className="no-selection-icon">📋</span>
              <p>{t[language].noTableSelected}</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="content-toolbar">
                <div className="toolbar-left">
                  <h2 className="selected-table-name">{selectedTable}</h2>
                  {tableData && (
                    <span className="table-info-badge">
                      {tableData.pagination.total} {t[language].totalRows}
                    </span>
                  )}
                </div>
                <div className="toolbar-right">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder={t[language].search}
                      value={searchTerm}
                      onChange={handleSearch}
                      className="search-input"
                    />
                    {searchTerm && (
                      <button
                        className="clear-search-btn"
                        onClick={() => setSearchTerm('')}
                        title={t[language].clearSearch}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button className="toolbar-btn" onClick={handleRefresh} title={t[language].refresh}>
                    🔄
                  </button>
                  <button className="toolbar-btn" onClick={exportToCSV} title={t[language].exportCSV}>
                    📥
                  </button>
                </div>
              </div>

              {/* Data Table */}
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
              ) : tableData && tableData.data.length > 0 ? (
                <>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {tableData.columns.map((col) => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.data.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {tableData.columns.map((col) => (
                              <td key={col}>
                                {row[col] === null ? (
                                  <span className="null-value">NULL</span>
                                ) : typeof row[col] === 'boolean' ? (
                                  <span className={`bool-value ${row[col] ? 'true' : 'false'}`}>
                                    {row[col] ? '✓' : '✗'}
                                  </span>
                                ) : (
                                  String(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="pagination">
                    <div className="pagination-info">
                      {t[language].showing} {tableData.pagination.skip + 1}-
                      {Math.min(tableData.pagination.skip + tableData.pagination.returned, tableData.pagination.total)}{' '}
                      {t[language].of} {tableData.pagination.total} {t[language].records}
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        {t[language].previousPage}
                      </button>
                      <span className="page-indicator">
                        {t[language].page} {currentPage} {t[language].of} {totalPages}
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        {t[language].nextPage}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-data-container">
                  <span className="no-data-icon">📭</span>
                  <p>{t[language].noData}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

