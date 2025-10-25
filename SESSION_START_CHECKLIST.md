# ✅ Session Start Checklist for AI

## 🎯 MANDATORY: Do This FIRST Every Session!

### Step 1: Get Project Context (1 API call)
```bash
curl -s https://ulm-rct.ovu.co.il/api/v1/dev-journal/ai/project-context | jq .
```

---

### Step 2: Present Summary to User

**Format:**
```
╔══════════════════════════════════════════════════════╗
║ 🎯 ULM Development Session #X                       ║
╠══════════════════════════════════════════════════════╣
║                                                       ║
║ 📋 PREVIOUS SESSION                                  ║
║    • ID: #1                                          ║
║    • Title: [session title]                          ║
║    • Duration: 13.9 hours                            ║
║    • Summary: [brief summary]                        ║
║                                                       ║
║ 📝 TASKS FOR THIS SESSION                           ║
║    1. [task from instructions_for_next]             ║
║    2. [task from instructions_for_next]             ║
║    3. [task from instructions_for_next]             ║
║                                                       ║
║ 🏗️ ARCHITECTURE                                      ║
║    • Frontend: 64.176.173.105 (React/TypeScript)    ║
║    • Backend: 64.176.171.223 (FastAPI/Python)       ║
║    • Database: 64.177.67.215 (PostgreSQL 17)        ║
║                                                       ║
║ 🔧 TECH STACK                                        ║
║    • Backend: FastAPI + SQLAlchemy async + JWT      ║
║    • Frontend: React 18 + TypeScript + Axios        ║
║    • Database: PostgreSQL 17 + Redis                ║
║                                                       ║
║ ⚙️ CODING STANDARDS                                  ║
║    Backend:                                          ║
║    • Always async/await for DB                       ║
║    • snake_case functions, PascalCase classes       ║
║    • Type hints + docstrings required               ║
║                                                       ║
║    Frontend:                                         ║
║    • Functional components with hooks               ║
║    • camelCase functions, PascalCase components     ║
║    • ALL components must support RTL/LTR            ║
║                                                       ║
║ 📊 CURRENT FEATURES (what already exists)           ║
║    ✓ JWT Authentication                              ║
║    ✓ User Management + Status Control               ║
║    ✓ Token Settings (per-user control)              ║
║    ✓ API Logging (Backend + Frontend)               ║
║    ✓ Database Viewer (dynamic)                      ║
║    ✓ Application Map (interactive)                  ║
║    ✓ Development Journal (this system!)             ║
║                                                       ║
║ 🗄️ DATABASE TABLES (13)                             ║
║    users, roles, refresh_tokens, password_resets,   ║
║    token_settings, scheduled_user_actions,          ║
║    sessions, api_logs_backend, api_logs_frontend,   ║
║    development_sessions, development_steps,         ║
║    system_states                                     ║
║                                                       ║
╚══════════════════════════════════════════════════════╝

🚀 Ready to start Session #X!
What would you like to work on first?
```

---

### Step 3: Wait for User Confirmation

**Don't start coding until user responds!**

User might want to:
- Change priorities
- Add different tasks
- Ask questions first

---

## 📋 What This Achieves

✅ **AI knows current session number**
✅ **AI knows what was done last time**
✅ **AI knows what needs to be done now**
✅ **AI knows architecture & servers**
✅ **AI knows tech stack & versions**
✅ **AI knows coding standards**
✅ **AI knows existing features**
✅ **AI knows database structure**
✅ **User sees clear summary**
✅ **Continuity maintained**

---

## 🚫 Common Mistakes to Avoid

❌ **Don't** start coding immediately
❌ **Don't** skip the API call
❌ **Don't** forget to show session number
❌ **Don't** omit coding standards
❌ **Don't** forget to mention RTL requirement
❌ **Don't** assume user knows the architecture

---

## ✅ Verification Checklist

Before starting ANY work, verify you have shown:

- [ ] Current session number (#2, #3, etc.)
- [ ] Previous session summary
- [ ] Tasks for this session (from instructions_for_next)
- [ ] 3 servers with IPs
- [ ] Tech stack (FastAPI, React, PostgreSQL)
- [ ] Coding standards (async, RTL, naming)
- [ ] Current features (7 items)
- [ ] Database tables (13 tables)

**If you showed all 8 items → ✅ GOOD TO GO!**

---

## 🔄 During Session

Track each step in this format:

```python
{
  "step_number": 1,
  "user_prompt": "User's exact request",
  "ai_understanding": "What I understood",
  "ai_actions": "What I did (files, APIs, fixes)",
  "result": "Outcome (deployed? works? errors?)"
}
```

---

## 📝 At End of Session

1. Create session summary
2. Document all steps → POST /dev-journal/steps
3. Record system state → POST /dev-journal/state
4. Create SESSION_{N}_SUMMARY.md file
5. Commit everything to GitHub

---

**Last Updated**: 25/10/2025  
**Current Session**: #1 (completed)  
**Next Session**: #2

