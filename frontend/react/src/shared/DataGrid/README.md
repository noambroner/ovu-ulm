# DataGrid - רכיב משותף

## 📍 מיקום
```
frontend/react/src/shared/DataGrid/
├── DataGrid.tsx       (הרכיב הראשי)
├── DataGrid.css       (עיצוב אחיד)
├── index.ts           (ייצוא)
└── README.md          (מסמך זה)
```

## 📦 ייבוא

```typescript
import { DataGrid } from '../../shared/DataGrid';
import type { DataGridColumn } from '../../shared/DataGrid';
```

## 🎯 תכונות עיקריות

### ✨ Features
- ✅ **Sorting** - מיון לכל עמודה (3 מצבים: asc/desc/none)
- ✅ **Filtering** - סינון לכל עמודה (text/select/number/date)
- ✅ **Resizable Columns** - גרירת רוחב עמודות
- ✅ **Sticky Header** - כותרות דביקות בגלילה
- ✅ **Persistence** - שמירת מצב ב-localStorage
- ✅ **Responsive** - 4 נקודות שבירה
- ✅ **RTL Support** - תמיכה מלאה בעברית/ערבית
- ✅ **Light/Dark Themes** - ערכה בהירה וכהה
- ✅ **Toolbar Integration** - toolbar אחיד עם עיצוב מובנה
- ✅ **TypeScript** - Type-safe + Generic

### 🎨 Toolbar Design System
**כל האלמנטים בToolbar עוצבו אוטומטית:**
- Buttons (Primary/Secondary/Danger)
- Select Dropdowns (עם חץ מותאם אישית)
- Input Fields
- גבהים אחידים: 1.75rem
- צבעים מתאימים ל-light/dark theme
- RTL support מלא

---

## 🚀 דוגמה פשוטה

```typescript
import { DataGrid } from '../../shared/DataGrid';
import type { DataGridColumn } from '../../shared/DataGrid';

interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  created: string;
}

const MyComponent = () => {
  const [data, setData] = useState<User[]>([...]);

  const columns: DataGridColumn<User>[] = [
    {
      id: 'id',
      label: 'ID',
      field: 'id',
      sortable: true,
      width: '80px'
    },
    {
      id: 'name',
      label: 'שם',
      field: 'name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      minWidth: '150px'
    },
    {
      id: 'email',
      label: 'אימייל',
      field: 'email',
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      id: 'status',
      label: 'סטטוס',
      field: 'status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'active', label: 'פעיל' },
        { value: 'inactive', label: 'לא פעיל' }
      ],
      render: (value) => (
        <span className={`badge ${value}`}>
          {value === 'active' ? 'פעיל' : 'לא פעיל'}
        </span>
      )
    }
  ];

  return (
    <DataGrid
      columns={columns}
      data={data}
      keyField="id"
      language="he"
      theme="light"
      persistStateKey="users-table"
      onRowClick={(row) => console.log(row)}
      height="600px"
    />
  );
};
```

---

## 📋 DataGridColumn Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | ✅ | מזהה ייחודי לעמודה |
| `label` | string | ✅ | טקסט כותרת |
| `field` | keyof T \| function | ✅ | שדה מהמידע או פונקציה |
| `sortable` | boolean | ❌ | האם ניתן למיון (default: false) |
| `filterable` | boolean | ❌ | האם ניתן לסינון (default: false) |
| `filterType` | FilterType | ❌ | סוג הפילטר: text/select/number/date |
| `filterOptions` | Array | ❌ | אופציות ל-select filter |
| `width` | string | ❌ | רוחב התחלתי (e.g. '120px') |
| `minWidth` | string | ❌ | רוחב מינימלי |
| `maxWidth` | string | ❌ | רוחב מקסימלי |
| `resizable` | boolean | ❌ | האם ניתן לשנות רוחב (default: true) |
| `render` | function | ❌ | פונקציה מותאמת להצגה |
| `headerRender` | function | ❌ | פונקציה מותאמת לכותרת |

---

## 📋 DataGrid Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | DataGridColumn[] | ✅ | הגדרת העמודות |
| `data` | T[] | ✅ | המידע להצגה |
| `keyField` | keyof T | ✅ | שדה המפתח הייחודי |
| `language` | 'he' \| 'en' \| 'ar' | ✅ | שפה |
| `theme` | 'light' \| 'dark' | ✅ | ערכה |
| `persistStateKey` | string | ❌ | מפתח לשמירה ב-localStorage |
| `onRowClick` | function | ❌ | פעולה בלחיצה על שורה |
| `emptyMessage` | string | ❌ | הודעה כשאין מידע |
| `height` | string | ❌ | גובה (default: 'auto') |
| `stickyHeader` | boolean | ❌ | כותרות דביקות (default: true) |
| `toolbarContent` | ReactNode | ❌ | תוכן מותאם אישי ל-toolbar |

---

## 🎨 Toolbar Integration

### דוגמה עם Toolbar מותאם אישית:

```typescript
const toolbarContent = (
  <>
    <select value={filter} onChange={...}>
      <option value="">הכל</option>
      <option value="active">פעיל</option>
      <option value="inactive">לא פעיל</option>
    </select>
    
    <input 
      type="search" 
      placeholder="חיפוש כללי..."
      value={search}
      onChange={...}
    />
    
    <button onClick={handleRefresh}>
      🔄 רענן
    </button>
    
    <button className="secondary" onClick={handleExport}>
      📊 ייצא לExcel
    </button>
    
    <button className="danger" onClick={handleDelete}>
      🗑️ מחק נבחרים
    </button>
  </>
);

<DataGrid
  ...
  toolbarContent={toolbarContent}
/>
```

### סוגי Buttons:
```html
<button>כפתור ראשי (כחול)</button>
<button class="secondary">כפתור משני (outline)</button>
<button class="danger">כפתור מסוכן (אדום)</button>
```

### העיצוב האוטומטי:
כל האלמנטים ב-`.data-grid-toolbar` מקבלים אוטומטית:
- גובה אחיד: **1.75rem**
- פונט: **0.8125rem**
- Border radius: **4px**
- Padding: **0.25rem 0.625rem**
- צבעים מתאימים ל-theme (light/dark)
- RTL support (חץ בצד הנכון ב-select)
- Hover effects
- Focus styles

---

## 💾 Persistence (שמירת מצב)

DataGrid שומר אוטומטית:
- **Filters** - כל הפילטרים שהמשתמש הזין
- **Sort** - עמודה ממוינת + כיוון
- **Column Widths** - רוחבי עמודות שהמשתמש שינה

```typescript
// מפתח ייחודי לכל טבלה
<DataGrid
  persistStateKey="users-table"
  ...
/>

// נשמר ב-localStorage:
{
  "datagrid_users-table": {
    "filters": { "name": "john", "status": "active" },
    "sort": { "columnId": "created", "direction": "desc" },
    "columnWidths": { "name": 200, "email": 250 }
  }
}
```

---

## 🔧 Custom Renders

### דוגמה: Badge
```typescript
{
  id: 'status',
  label: 'סטטוס',
  field: 'status',
  render: (value) => (
    <span className={`badge ${value === 'active' ? 'success' : 'danger'}`}>
      {value === 'active' ? '✓ פעיל' : '✗ לא פעיל'}
    </span>
  )
}
```

### דוגמה: Link
```typescript
{
  id: 'email',
  label: 'אימייל',
  field: 'email',
  render: (value) => (
    <a href={`mailto:${value}`}>{value}</a>
  )
}
```

### דוגמה: Date Formatting
```typescript
{
  id: 'created',
  label: 'תאריך יצירה',
  field: 'created_at',
  render: (value) => new Date(value).toLocaleDateString('he-IL')
}
```

### דוגמה: Field Function
```typescript
{
  id: 'fullName',
  label: 'שם מלא',
  field: (row) => `${row.firstName} ${row.lastName}`,
  sortable: true
}
```

---

## 📱 Responsive Breakpoints

| Screen Size | Toolbar Height | Element Height | Font Size |
|-------------|----------------|----------------|-----------|
| Desktop (>1024px) | 2.25rem | 1.75rem | 0.8125rem |
| Tablet (768-1024px) | 2rem | 1.625rem | 0.75rem |
| Mobile (480-768px) | 1.875rem | 1.5rem | 0.6875rem |
| Small (<480px) | auto | 1.625rem | 0.6875rem |

**במובייל קטן (<480px):**
- Toolbar הופך לעמודות
- כל האלמנטים ברוחב מלא
- כפתורים ממורכזים

---

## 🎨 CSS Variables (Design System)

### Light Theme:
```css
--dg-bg-primary: #ffffff
--dg-bg-secondary: #f8fafc
--dg-text-primary: #1e293b
--dg-border: #e2e8f0
--dg-primary: #3b82f6
```

### Dark Theme:
```css
--dg-bg-primary: #1a1a2e
--dg-bg-secondary: #16213e
--dg-text-primary: #eee
--dg-border: #0f3460
--dg-primary: #3b82f6
```

---

## ✅ Checklist לשימוש

- [ ] ייבאת DataGrid מ-`shared/DataGrid`
- [ ] הגדרת `columns` עם `id`, `label`, `field`
- [ ] העברת `data` עם מפתח ייחודי
- [ ] הגדרת `keyField`
- [ ] הגדרת `language` ו-`theme`
- [ ] הוספת `persistStateKey` לשמירת מצב
- [ ] הוספת `toolbarContent` אם צריך פילטרים
- [ ] כל האלמנטים בtoolbar מתעצבים אוטומטית ✅

---

## 🐛 פתרון בעיות

### הטקסט לא מיושר בפילטרים?
✅ DataGrid מטפל בזה אוטומטית עם `vertical-align: middle` ו-`line-height: 1.2`

### Dropdown לא נראה טוב?
✅ DataGrid מוסיף SVG arrow אוטומטית עם RTL support

### צבעים לא מתאימים ל-theme?
✅ DataGrid משתמש ב-CSS Variables (`--dg-*`) שמשתנים לפי theme

### Toolbar גבוה מדי?
✅ Toolbar עכשיו עם `min-height: 2.25rem` ו-`gap: 0.5rem`

### אלמנטים לא באותו גובה?
✅ כל האלמנטים בtoolbar מקבלים אוטומטית `height: 1.75rem`

---

## 📚 דוגמאות נוספות

### דוגמה: Users Table
ראה `components/APILogs/APILogs.tsx` - דוגמה מלאה עם 9 עמודות

### דוגמה: עם Pagination
```typescript
const toolbarContent = (
  <>
    <select value={page} onChange={...}>
      <option>עמוד 1</option>
      <option>עמוד 2</option>
    </select>
    <span>סה"כ: {total} רשומות</span>
  </>
);
```

---

## 🎯 Best Practices

1. **תמיד** השתמש ב-`persistStateKey` ייחודי
2. **תמיד** הגדר `keyField` עם מפתח ייחודי אמיתי
3. **השתמש** ב-`render` לעיצוב מותאם אישית
4. **השתמש** ב-`field` כפונקציה לשדות מחושבים
5. **הוסף** `minWidth` לעמודות עם תוכן ארוך
6. **הוסף** `filterOptions` ל-select filters
7. **אל תעצב** אלמנטים בtoolbar ידנית - DataGrid מטפל בזה
8. **השתמש** ב-`.secondary` או `.danger` לכפתורים מיוחדים

---

## 📞 תמיכה

לשאלות או בעיות:
1. קרא README זה
2. ראה דוגמה ב-`APILogs.tsx`
3. בדוק את ה-CSS Variables ב-`DataGrid.css`

---

**נוצר:** Session #3  
**עדכון אחרון:** 27.10.2025  
**גרסה:** 2.0 (עם Toolbar Design System)

