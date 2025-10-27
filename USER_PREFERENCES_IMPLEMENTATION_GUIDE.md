# 📋 מדריך מימוש שמירת העדפות משתמש והיסטוריית חיפושים

## ✅ מה יצרתי:

### 1. **Backend (Python/FastAPI)**
- ✅ `backend/migrations/add_user_preferences_and_search_history.sql` - מיגרציה מלאה
- ✅ `backend/app/models/user_preferences.py` - מודלים SQLAlchemy
- ✅ `backend/app/api/routes/user_preferences.py` - API endpoints מלאים
- ✅ `backend/app/api/v1/router.py` - עודכן להכיל את ה-routes החדשים

### 2. **Frontend (React/TypeScript)**
- ✅ `frontend/react/src/services/userPreferencesService.ts` - שכבת תקשורת עם API
- ✅ `frontend/react/src/shared/DataGrid/SearchHistory.tsx` - רכיב UI להיסטוריה
- ✅ `frontend/react/src/shared/DataGrid/SearchHistory.css` - עיצוב מלא

---

## 🚀 שלבי ההמשך (בסדר!):

### **שלב 1: הרצת המיגרציה על ה-DB**

```bash
# התחבר לשרת הDB
ssh -i ~/.ssh/ovu_key ploi@64.177.67.215

# הרץ את המיגרציה
psql -U ovu_user -d ovu_db -f /path/to/backend/migrations/add_user_preferences_and_search_history.sql

# או אם יש לך access ישיר:
psql -h 64.177.67.215 -U ovu_user -d ovu_db -f backend/migrations/add_user_preferences_and_search_history.sql
```

**או העלה את הקובץ לשרת ותריץ:**
```bash
scp -i ~/.ssh/ovu_key backend/migrations/add_user_preferences_and_search_history.sql ploi@64.177.67.215:/tmp/

ssh -i ~/.ssh/ovu_key ploi@64.177.67.215
psql -U ovu_user -d ovu_db -f /tmp/add_user_preferences_and_search_history.sql
```

---

### **שלב 2: עדכון DataGrid Component**

יש לעדכן את `frontend/react/src/shared/DataGrid/DataGrid.tsx`:

```typescript
import { savePreferencesHybrid, loadPreferencesHybrid, addSearchHistory } from '../../services/userPreferencesService';
import { SearchHistory } from './SearchHistory';

// בתוך הקומפוננטה:
const [showHistory, setShowHistory] = useState(false);

// במקום localStorage, השתמש ב-service:
useEffect(() => {
  const loadState = async () => {
    const saved = await loadPreferencesHybrid(persistStateKey);
    if (saved) {
      setFilters(saved.filters || {});
      setSort(saved.sort || { columnId: null, direction: null });
      setColumnWidths(saved.columnWidths || {});
    }
  };
  
  if (persistStateKey) {
    loadState();
  }
}, [persistStateKey]);

// שמירה:
useEffect(() => {
  if (persistStateKey) {
    savePreferencesHybrid(persistStateKey, {
      filters,
      sort,
      columnWidths
    });
  }
}, [filters, sort, columnWidths, persistStateKey]);

// הוסף כפתור להיסטוריה ב-toolbar:
<button 
  className="toolbar-btn" 
  onClick={() => setShowHistory(true)}
  title="Search History"
>
  📋
</button>

// הוסף את הרכיב:
{showHistory && (
  <SearchHistory
    datagridKey={persistStateKey}
    language={language}
    theme={theme}
    onApplySearch={(filters) => setFilters(filters)}
    onClose={() => setShowHistory(false)}
  />
)}
```

---

### **שלב 3: שמירת חיפושים כשמפעילים סינון**

```typescript
// כשמשתמש מפעיל סינון (במקום handleFilterChange):
const handleFilterChange = async (columnId: string, value: string) => {
  const newFilters = {
    ...filters,
    [columnId]: value,
  };
  setFilters(newFilters);
  
  // שמור בהיסטוריה (רק אם יש סינונים)
  if (persistStateKey && Object.values(newFilters).some(v => v)) {
    await addSearchHistory(persistStateKey, newFilters);
  }
};
```

---

### **שלב 4: בדיקה ב-development**

1. **בדוק שה-API עובד:**
```bash
cd backend
source venv/bin/activate  # אם יש venv
python -m uvicorn app.main:app --reload

# בדוק את הendpoints:
curl http://localhost:8000/api/v1/preferences/test-grid
```

2. **בדוק את הפרונטנד:**
```bash
cd frontend/react
npm run dev
```

3. **בדוק בדפדפן:**
   - פתח את `/logs/backend`
   - סנן משהו
   - רענן את הדף
   - הסינון אמור להישאר!
   - לחץ על כפתור ההיסטוריה (📋)

---

### **שלב 5: Deploy לשרת**

```bash
# Backend
cd backend
# רסטרט ל-FastAPI service (תלוי במערכת שלך)
sudo systemctl restart ovu-ulm-backend
# או
pm2 restart ovu-ulm-backend

# Frontend
cd frontend/react
npm run build
scp -i ~/.ssh/ovu_key -r dist/* ploi@64.176.173.105:/home/ploi/ulm-rct.ovu.co.il/public/
```

---

## 📊 מבנה הטבלאות שנוצרו:

### **user_datagrid_preferences**
```sql
- id (PK)
- user_id (FK → users.id)
- datagrid_key (string, e.g., 'api-logs-backend')
- preferences (JSONB: {filters, sort, columnWidths})
- created_at, updated_at
- UNIQUE(user_id, datagrid_key)
```

### **user_search_history**
```sql
- id (PK)
- user_id (FK → users.id)
- datagrid_key (string)
- search_data (JSONB: {filters, description})
- created_at
- Trigger: auto-cleanup (keeps last 100 per user/grid)
```

---

## 🎯 תכונות שהוספתי:

### **Preferences API:**
- `GET /api/v1/preferences/{datagrid_key}` - קבלת העדפות
- `PUT /api/v1/preferences/{datagrid_key}` - שמירת העדפות
- `DELETE /api/v1/preferences/{datagrid_key}` - מחיקת העדפות

### **Search History API:**
- `GET /api/v1/search-history/{datagrid_key}?limit=100` - קבלת היסטוריה
- `POST /api/v1/search-history/{datagrid_key}` - שמירת חיפוש
- `DELETE /api/v1/search-history/{history_id}` - מחיקת רשומה

### **Frontend Service:**
- Hybrid mode: שמירה גם ב-localStorage וגם ב-server
- Automatic fallback: אם השרת לא זמין, עובד עם localStorage
- TypeScript interfaces מלאים

### **UI Component:**
- SearchHistory: רכיב מודלי להצגת היסטוריה
- Click to apply: לחיצה על חיפוש קודם מחזירה אותו
- Delete: מחיקת רשומות
- Grouped by time: קיבוץ לפי זמן ("עכשיו", "5 דקות", וכו')

---

## 🔥 יתרונות:

✅ **Cross-device sync** - העדפות משותפות בין מכשירים  
✅ **Offline support** - עובד גם בלי אינטרנט (localStorage)  
✅ **Performance** - Hybrid mode לתגובה מיידית  
✅ **Scalable** - מבנה גנרי לכל DataGrid  
✅ **Auto-cleanup** - שומר רק 100 חיפושים אחרונים  
✅ **User-specific** - כל משתמש רואה רק את שלו  

---

## 📝 הערות חשובות:

1. **Authentication required**: כל ה-endpoints דורשים `get_current_user`
2. **Migration first**: הרץ את המיגרציה לפני restart של הbackend
3. **Test thoroughly**: בדוק בdev לפני deploy
4. **Error handling**: יש fallback אוטומטי ל-localStorage

---

אם יש שגיאות או צריך עזרה עם שלב מסוים - ספר לי! 🚀

