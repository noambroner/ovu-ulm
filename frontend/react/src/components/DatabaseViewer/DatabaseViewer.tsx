import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios.config';
import { DataTable } from '../../shared/DataTable/DataTable';
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

const ITEMS_PER_PAGE = 50;
const MAX_CELL_LENGTH = 15;

export const DatabaseViewer = ({ language, theme }: DatabaseViewerProps) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tableDataError, setTableDataError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableListSearch, setTableListSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const t = {
    he: {
      title: 'מציג מסד הנתונים',
      subtitle: 'צפייה וחיפוש בטבלאות מסד הנתונים',
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
      totalRows: 'סה"כ שורות',
      clearSearch: 'נקה חיפוש',
      tablesCount: 'סה"כ טבלאות',
      filterTables: 'סינון טבלאות...',
      noTables: 'לא נמצאו טבלאות',
      tableSearchPlaceholder: 'חפש טבלה לפי שם',
      rowDetails: 'פרטי רשומה',
      close: 'סגור'
    },
    en: {
      title: 'Database Viewer',
      subtitle: 'View and search database tables',
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
      totalRows: 'Total Rows',
      clearSearch: 'Clear Search',
      tablesCount: 'Total Tables',
      filterTables: 'Filter tables...',
      noTables: 'No tables found',
      tableSearchPlaceholder: 'Search table by name',
      rowDetails: 'Row Details',
      close: 'Close'
    },
    ar: {
      title: 'عارض قاعدة البيانات',
      subtitle: 'عرض والبحث في جداول قاعدة البيانات',
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
      totalRows: 'إجمالي الصفوف',
      clearSearch: 'مسح البحث',
      tablesCount: 'إجمالي الجداول',
      filterTables: 'تصفية الجداول...',
      noTables: 'لا توجد جداول',
      tableSearchPlaceholder: 'ابحث عن جدول بالاسم',
      rowDetails: 'تفاصيل السجل',
      close: 'إغلاق'
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
    setTablesLoading(true);
    setTablesError(null);
    try {
      const response = await axios.get('/api/v1/database/tables');
      setTables(response.data.tables || []);
    } catch (err: any) {
      setTablesError(err.response?.data?.detail || 'Failed to fetch tables');
    } finally {
      setTablesLoading(false);
    }
  };

  const fetchTableData = async (tableName: string, page: number, search: string = '') => {
    setTableDataLoading(true);
    setTableDataError(null);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const params: any = { skip, limit: ITEMS_PER_PAGE };
      if (search) {
        params.search = search;
      }
      const response = await axios.get(`/api/v1/database/table/${tableName}`, { params });
      setTableData(response.data);
      setCurrentPage(page);
    } catch (err: any) {
      setTableDataError(err.response?.data?.detail || 'Failed to fetch table data');
      setTableData(null);
    } finally {
      setTableDataLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setSearchTerm('');
  };

  const handleTableListSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableListSearch(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (selectedTable) {
      fetchTableData(selectedTable, newPage, searchTerm);
    }
  };

  const handleRefresh = () => {
    if (selectedTable) {
      fetchTableData(selectedTable, currentPage, searchTerm);
    } else {
      fetchTables();
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


  const filteredTables = useMemo(() => {
    if (!tableListSearch.trim()) {
      return tables;
    }
    const term = tableListSearch.toLowerCase();
    return tables.filter((table) => table.name.toLowerCase().includes(term));
  }, [tables, tableListSearch]);

  const totalRowsAcrossTables = useMemo(
    () => tables.reduce((sum, table) => sum + table.row_count, 0),
    [tables]
  );


  return (
    <div className={`database-viewer ${theme}`} dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="viewer-header">
        <h1 className="viewer-title">{t[language].title}</h1>
        <p className="viewer-subtitle">{t[language].subtitle}</p>
      </div>

      <div className="viewer-container">
        <div className="tables-sidebar">
          <h2 className="sidebar-title">{t[language].tablesList}</h2>
          <div className="tables-meta">
            <div className="meta-count"><strong>{tables.length}</strong> {t[language].tablesCount}</div>
            <div className="meta-count"><strong>{totalRowsAcrossTables.toLocaleString()}</strong> {t[language].totalRows}</div>
          </div>
          <div className="tables-search">
            <input
              type="text"
              placeholder={t[language].tableSearchPlaceholder}
              value={tableListSearch}
              onChange={handleTableListSearch}
            />
            {tableListSearch && (
              <button className="clear-table-search" onClick={() => setTableListSearch('')}>✕</button>
            )}
          </div>
          {tablesLoading && !tables.length && (
            <div className="loading-message">{t[language].loading}</div>
          )}
          {tablesError && !tables.length && (
            <div className="error-message">{t[language].error}: {tablesError}</div>
          )}
          <div className="tables-list">
            {filteredTables.length === 0 && !tablesLoading ? (
              <div className="no-tables">{t[language].noTables}</div>
            ) : (
              filteredTables.map((table) => (
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
              ))
            )}
          </div>
        </div>

        <div className="table-content">
          {!selectedTable ? (
            <div className="no-selection">
              <span className="no-selection-icon">📋</span>
              <p>{t[language].noTableSelected}</p>
            </div>
          ) : (
            <>
              <div className="content-toolbar">
                <div className="toolbar-left">
                  <h2 className="selected-table-name">{selectedTable}</h2>
                  {tableData && (
                    <span className="table-info-badge">
                      {tableData.pagination.total.toLocaleString()} {t[language].totalRows}
                    </span>
                  )}
                </div>
                <div className="toolbar-right">
                  <button className="toolbar-btn" onClick={handleRefresh} title={t[language].refresh}>🔄</button>
                </div>
              </div>

              <DataTable
                columns={tableData?.columns || []}
                data={tableData?.data || []}
                pagination={tableData?.pagination}
                language={language}
                theme={theme}
                loading={tableDataLoading}
                error={tableDataError}
                searchable={true}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                onPageChange={handlePageChange}
                exportable={true}
                onExport={exportToCSV}
                maxCellLength={MAX_CELL_LENGTH}
                showRowDetails={true}
                translations={t}
              />
            </>
          )}
        </div>
      </div>

    </div>
  );
};
