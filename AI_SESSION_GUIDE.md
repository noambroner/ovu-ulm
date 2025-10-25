# 🤖 AI Session Guide - Development Journal Integration

## 📋 Purpose
This guide helps the AI assistant track development sessions, understand project history, and maintain continuity between sessions.

---

## 🚀 At the START of Each Session

### **MANDATORY STEP 1: Get Complete Project Context**
```bash
curl -s https://ulm-rct.ovu.co.il/api/v1/dev-journal/ai/project-context
```

This ONE endpoint returns EVERYTHING you need:
- ✅ **Current session number**
- ✅ **Latest session summary**
- ✅ **Instructions for next session** (what to do)
- ✅ **Complete architecture** (3 servers, IPs, ports)
- ✅ **Tech stack** (FastAPI, React, PostgreSQL versions)
- ✅ **Coding standards** (naming conventions, patterns)
- ✅ **Current features** (what already exists)
- ✅ **Database tables** (all 13 tables)
- ✅ **Deployment procedures**

### **MANDATORY STEP 2: Present Summary to User**
Format the response as a clear summary showing:
1. Current session number (#2, #3, etc.)
2. Previous session title + duration
3. Tasks for this session (from instructions_for_next)
4. Architecture overview
5. Tech stack summary
6. Current features

### **STEP 3: Optional - Get Historical Context**
```bash
curl -s https://ulm-rct.ovu.co.il/api/v1/dev-journal/ai/sessions-summary?limit=5
```

Use this only if you need to understand the evolution across multiple sessions.

---

## 💻 During the Session

### Track Each Major Step
For each significant user request or accomplishment:

**Step Components:**
1. **user_prompt**: The exact user request/instruction
2. **ai_understanding**: What the AI understood from the request
3. **ai_actions**: What actions were taken (files created, APIs built, bugs fixed)
4. **result**: The outcome (success/failure, what was deployed)

**Example Step:**
```
Step 3: Application Map
- User: "נוסיף דף מפת האפליקציה"
- Understanding: "User wants visual interactive map of system architecture"
- Actions: "Created ApplicationMap.tsx, added routes, implemented click events"
- Result: "✅ Interactive map deployed at /application-map"
```

---

## 📝 At the END of Each Session

### 1. **Create Session Summary**
Prepare the following:

**Session Data:**
```python
{
  "title": "Brief descriptive title (Hebrew)",
  "summary": """Comprehensive summary including:
  - What was built
  - What was fixed
  - Statistics (lines of code, files, commits)
  - Technologies used
  """,
  "start_time": "2025-10-24T19:00:00Z",  # UTC
  "end_time": "2025-10-25T08:54:00Z",    # UTC
  "instructions_for_next": """What should be done in next session:
  1. Specific feature requests
  2. Known bugs to fix
  3. Improvements needed
  """
}
```

### 2. **Document All Steps**
For each step in the session, create a record with:
- `step_number`: Sequential number (1, 2, 3...)
- `user_prompt`: Exact user request
- `ai_understanding`: AI's interpretation
- `ai_actions`: Detailed actions taken
- `result`: Outcome description

### 3. **Record System State**
Document the before/after state:

**state_at_start:**
```
מצב המערכת בתחילת הסשן:
- Backend: List of existing features
- Frontend: List of existing components
- Database: Number of tables and their names
- Features: What already works
```

**state_at_end:**
```
מצב המערכת בסוף הסשן:
- Backend: All features (old + new)
- Frontend: All components (old + new)
- Database: New table count
- Features: New capabilities added
```

**changes_summary:**
```
סיכום השינויים:
1. Feature X: description
2. Bug fixes: list
3. Improvements: list
Statistics: lines, files, commits
```

---

## 🔌 API Endpoints for AI

### Get Latest Session
```http
GET /api/v1/dev-journal/ai/latest-session
```

**Response:**
```json
{
  "success": true,
  "has_previous_session": true,
  "latest_session": {
    "id": 1,
    "title": "בניית מערכת Logging מלאה",
    "summary": "...",
    "instructions_for_next": "להוסיף dashboard לסטטיסטיקות..."
  },
  "next_session_number": 2
}
```

### Get Sessions Summary
```http
GET /api/v1/dev-journal/ai/sessions-summary?limit=5
```

**Response:**
```json
{
  "success": true,
  "total_sessions": 1,
  "sessions_returned": 1,
  "sessions": [
    {
      "id": 1,
      "title": "...",
      "summary": "...",
      "duration_minutes": 834
    }
  ]
}
```

### Create New Session
```http
POST /api/v1/dev-journal/sessions
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Session title",
  "summary": "Detailed summary",
  "instructions_for_next": "Next steps..."
}
```

### Add Step to Session
```http
POST /api/v1/dev-journal/steps
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 2,
  "step_number": 1,
  "user_prompt": "User's request",
  "ai_understanding": "AI's interpretation",
  "ai_actions": "Actions taken",
  "result": "Outcome"
}
```

### Create System State
```http
POST /api/v1/dev-journal/state
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 2,
  "state_at_start": "Initial state...",
  "state_at_end": "Final state...",
  "changes_summary": "Summary of changes..."
}
```

---

## 📊 Session Documentation Template

### Minimal Session Record
```markdown
## Session #{ID}: {Title}

**Duration**: X hours
**Date**: DD/MM/YYYY

### What Was Built
1. Feature A
2. Feature B

### Statistics
- Lines: X
- Files: Y
- Commits: Z

### Next Session
- Task 1
- Task 2
```

---

## 🎯 Best Practices

1. **Start Every Session**: Check `/ai/latest-session` first
2. **Track Granularly**: One step per user request
3. **Be Detailed**: Include file names, line counts, technologies
4. **Document Bugs**: What failed and how it was fixed
5. **End Properly**: Create full session summary with stats
6. **Plan Ahead**: Always provide clear instructions for next session

---

## 🔗 Related Files

- **Database Schema**: `backend/app/models/dev_journal.py`
- **API Routes**: `backend/app/api/routes/dev_journal.py`
- **Session Example**: `SESSION_1_SUMMARY.md`

---

## 📌 Quick Checklist

**Session Start:**
- [ ] Read latest session
- [ ] Check instructions_for_next
- [ ] Note next session number

**During Session:**
- [ ] Track each step
- [ ] Document actions taken
- [ ] Note results/outcomes

**Session End:**
- [ ] Create session summary
- [ ] Document all steps
- [ ] Record system state
- [ ] Write instructions for next session
- [ ] Save everything to database
- [ ] Commit to GitHub

---

**Last Updated**: 25/10/2025  
**Current Session**: #1 (completed)  
**Next Session**: #2

