# 🧪 API Keys System - Browser Testing Guide

## 🎯 How to Test the Complete System

### Step 1: Access the Application
1. Open browser: **https://ulm-rct.ovu.co.il**
2. **Hard Refresh:** `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
   - זה חשוב כדי לקבל את הקבצים החדשים!
3. Login with admin credentials

---

### Step 2: Navigate to API Keys Management
1. Click on **"Manage"** (🛠️) in the sidebar
2. Click on **"מפתחות API"** / **"API Keys"** (🔑)
3. You should see the API Keys Management page

---

### Step 3: Create a New API Key

#### In the UI:
1. Click **"➕ Create API Key"** button
2. Fill in the form:
   - **Key Name:** `My Test Integration`
   - **App Type:** `integration`
   - **Owner Name:** `Your Name`
   - **Owner Email:** `your@email.com`
   - **Description:** `Testing API Keys system`
   - **Scopes:** Select `users:read` and `logs:read`
   - **Rate Limits:** Keep defaults (60/min, 1000/hour, 10000/day)
3. Click **"Create API Key"**
4. ⚠️ **IMPORTANT:** Copy the full API key - it will only be shown once!
5. Click **"I have saved the API key"**

---

### Step 4: Test the API Key

#### Open Browser Console (F12 → Console) and run:

```javascript
// Replace YOUR_API_KEY_HERE with the actual key you copied
const apiKey = "YOUR_API_KEY_HERE";

// Test 1: Get users list
fetch("https://ulm-rct.ovu.co.il/api/v1/users", {
  headers: {
    "X-API-Key": apiKey
  }
})
.then(r => r.json())
.then(data => {
  console.log("✅ Test 1 PASSED: Got users list", data);
})
.catch(err => {
  console.error("❌ Test 1 FAILED:", err);
});

// Test 2: Check if it's classified as integration call
setTimeout(() => {
  fetch("https://ulm-rct.ovu.co.il/api/v1/logs/backend?limit=5", {
    headers: {
      "Authorization": `Bearer ${localStorage.getItem('ulm_token')}`
    }
  })
  .then(r => r.json())
  .then(logs => {
    console.log("📊 Recent logs:", logs);
    const apiKeyLog = logs.find(log => 
      log.app_source && log.app_source.startsWith('api-key:')
    );
    if (apiKeyLog) {
      console.log("✅ Test 2 PASSED: API Key call classified correctly!");
      console.log("  - App Source:", apiKeyLog.app_source);
      console.log("  - Request Type:", apiKeyLog.request_type);
    } else {
      console.log("⏳ Test 2 PENDING: No API key calls in recent logs yet");
    }
  });
}, 2000);
```

---

### Step 5: Verify in UI

1. Go back to the **API Keys Management** page
2. You should see your new key in the list
3. Check the details:
   - ✅ Status: **Active**
   - ✅ Last Used: Should show recent timestamp
   - ✅ Requests: Should show at least 1 request

---

### Step 6: Test Revoke

1. Click the **🚫 Revoke** button next to your test key
2. Enter a reason: `Testing revoke functionality`
3. Confirm
4. Try using the API key again - it should fail with 401 Unauthorized

#### In Console:
```javascript
// This should now fail
fetch("https://ulm-rct.ovu.co.il/api/v1/users", {
  headers: {
    "X-API-Key": "YOUR_REVOKED_KEY_HERE"
  }
})
.then(r => r.json())
.then(data => {
  console.log("❌ Unexpected: Revoked key still works!");
})
.catch(err => {
  console.log("✅ Expected: Revoked key was rejected!", err);
});
```

---

## 🔍 Alternative Testing (Without Login)

If you can't login to the React app, you can test using curl:

### Step 1: Get Admin JWT Token
```bash
# Login
curl -X POST "https://ulm-rct.ovu.co.il/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-App-Source: ulm-curl-test" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'

# Save the "access_token" from the response
```

### Step 2: Create API Key via API
```bash
curl -X POST "https://ulm-rct.ovu.co.il/api/v1/api-keys" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-App-Source: ulm-curl-test" \
  -d '{
    "key_name": "Curl Test Key",
    "app_type": "integration",
    "scopes": ["users:read"],
    "rate_limit_per_minute": 60
  }'

# Save the "api_key" from the response
```

### Step 3: Test the API Key
```bash
curl -X GET "https://ulm-rct.ovu.co.il/api/v1/users" \
  -H "X-API-Key: YOUR_API_KEY"

# Should return users list
```

### Step 4: Check Logs
```bash
curl -X GET "https://ulm-rct.ovu.co.il/api/v1/logs/backend?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-App-Source: ulm-curl-test"

# Look for entries with:
# - app_source: "api-key:Curl Test Key"
# - request_type: "integration"
```

---

## ✅ Expected Results

### 1. API Key Creation:
- ✅ Full API key shown once
- ✅ Key saved to database
- ✅ Prefix visible in UI
- ✅ Status: Active

### 2. API Key Usage:
- ✅ Can authenticate with `X-API-Key` header
- ✅ Can access endpoints based on scopes
- ✅ Rate limits enforced
- ✅ Usage tracked

### 3. Logging:
- ✅ Calls with API key classified as `request_type: "integration"`
- ✅ `app_source` shows `"api-key:{key_name}"`
- ✅ No more "unknown" for legitimate integrations

### 4. Revocation:
- ✅ Revoked keys immediately rejected
- ✅ Returns 401 Unauthorized
- ✅ Audit trail updated

---

## 🐛 Troubleshooting

### Problem: Can't see API Keys page in sidebar
**Solution:** Hard refresh the page: `Ctrl + Shift + R`

### Problem: API key doesn't work (401)
**Checks:**
1. Did you copy the full key?
2. Is the key status "Active"?
3. Does the scope allow the endpoint you're calling?

### Problem: Still seeing "unknown" in logs
**Check:**
1. Are you using the `X-API-Key` header?
2. Is the middleware active? (Check `/api/v1/openapi.json`)

### Problem: Can't create API key (Permission denied)
**Solution:** Make sure you're logged in as admin or super_admin

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors (F12)
2. Check Backend logs: 
   ```bash
   ssh -i ~/.ssh/ovu_key ploi@64.176.171.223 'tail -50 /tmp/ulm_backend_live.log'
   ```
3. Check database:
   ```bash
   ssh -i ~/.ssh/ovu_key ploi@64.177.67.215 "
   PGPASSWORD='Ovu123456!!@@##' psql -h 64.177.67.215 -U ovu_user -d ulm_db -c '
   SELECT id, key_name, status, last_used_at FROM api_keys ORDER BY id DESC LIMIT 5;
   '"
   ```

---

**🎉 Happy Testing! 🎉**

**Created:** November 8, 2025  
**System:** ULM API Keys Management

