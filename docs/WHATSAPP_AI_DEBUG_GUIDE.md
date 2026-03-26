# 🔧 WhatsApp AI Debug & Troubleshooting Guide

## Quick Debug Checklist

If WhatsApp AI is not working, check these in order:

1. **Database Connection** → Check Supabase is connected
2. **Tables Created** → Run migration script
3. **API Keys** → Verify environment variables
4. **Component Import** → Check component is imported in App.jsx
5. **Green API Status** → Test connection endpoint
6. **Console Logs** → Check browser console for errors

---

## Common Issues & Solutions

### Issue 1: "WhatsApp configuration not found"

**Symptoms:**
- Component shows loading forever
- No data in analytics tab

**Debug Steps:**
```javascript
// 1. Check if tables exist in Supabase
// Run in SQL editor:
SELECT * FROM whatsapp_config WHERE store_id = 'YOUR_STORE_ID';

// 2. Check React component console
window.WHATSAPP_DEBUG = true; // Enable debug mode
// Refresh page and check console

// 3. Test API directly
fetch('/api/whatsapp/test/' + storeId)
  .then(r => r.json())
  .then(console.log);
```

**Solution:**
```sql
-- Run migration if tables missing
-- Execute: /supabase/migrations/20240323_whatsapp_ai_tables.sql
```

---

### Issue 2: "Failed to activate WhatsApp"

**Symptoms:**
- Error when clicking "Get Started"
- QR code doesn't appear

**Debug Steps:**
```javascript
// 1. Check Green API pool
SELECT * FROM green_api_pool WHERE status = 'available';

// 2. Test Green API credentials
curl -X GET "https://api.green-api.com/waInstance{ID}/getStateInstance/{TOKEN}"

// 3. Check backend logs
tail -f /var/log/app.log | grep "WhatsApp"
```

**Solution:**
```javascript
// Add Green API instances to pool
INSERT INTO green_api_pool (instance_id, api_token, status)
VALUES
  ('1101234567', 'your_token_here', 'available'),
  ('1101234568', 'your_token_here', 'available');
```

---

### Issue 3: "Messages not being received"

**Symptoms:**
- WhatsApp shows active but no messages in analytics
- Customers say bot doesn't respond

**Debug Steps:**
```javascript
// 1. Check webhook configuration
fetch('/api/whatsapp/webhook', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{
      from: '2348012345678',
      to: 'store_phone',
      body: 'Test message',
      timestamp: Date.now()
    }]
  })
}).then(r => console.log(r.status));

// 2. Check message logs
SELECT * FROM whatsapp_messages
WHERE store_id = 'YOUR_STORE_ID'
ORDER BY created_at DESC
LIMIT 10;

// 3. Check debug logs
SELECT * FROM whatsapp_debug_log
WHERE store_id = 'YOUR_STORE_ID'
ORDER BY created_at DESC;
```

**Solution:**
```javascript
// Verify webhook URL in Green API
const webhookUrl = 'https://yourdomain.com/api/whatsapp/webhook';
// Update in Green API dashboard
```

---

### Issue 4: "AI not responding correctly"

**Symptoms:**
- Generic responses only
- Not showing product info
- Wrong language

**Debug Steps:**
```javascript
// 1. Check products exist
SELECT COUNT(*) FROM products WHERE store_id = 'YOUR_STORE_ID';

// 2. Test AI response generation
const testMessage = "What are your prices?";
const response = await generateAIResponse(testMessage, storeData);
console.log(response);

// 3. Check settings
SELECT settings FROM whatsapp_config WHERE store_id = 'YOUR_STORE_ID';
```

**Solution:**
```sql
-- Update AI settings
UPDATE whatsapp_config
SET settings = jsonb_set(settings, '{language}', '"en"')
WHERE store_id = 'YOUR_STORE_ID';
```

---

### Issue 5: "Component not showing in dashboard"

**Symptoms:**
- WhatsApp AI option missing
- No menu item in settings

**Debug Steps:**
```javascript
// 1. Check component import in App.jsx
import WhatsAppAISetup from './components/WhatsAppAI/WhatsAppAISetup';

// 2. Check routing
// Should have route like:
<Route path="/dashboard/whatsapp" element={<WhatsAppAISetup storeId={storeId} />} />

// 3. Check permissions
const userRole = currentUser.role;
console.log('User can access WhatsApp:', userRole === 'store_owner');
```

**Solution:**
```javascript
// Add to App.jsx or Dashboard component
{currentUser && currentUser.store_id && (
  <WhatsAppAISetup storeId={currentUser.store_id} />
)}
```

---

## Debug Functions

### Enable Debug Mode
```javascript
// Add to browser console
window.WHATSAPP_DEBUG = true;
localStorage.setItem('WHATSAPP_DEBUG', 'true');

// All WhatsApp operations will now log to console
```

### Test Database Connection
```javascript
async function testDatabaseConnection() {
  const { supabase } = await import('./supabaseClient');

  try {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('count');

    if (error) throw error;
    console.log('✅ Database connected');
    return true;
  } catch (err) {
    console.error('❌ Database error:', err);
    return false;
  }
}

testDatabaseConnection();
```

### Force Reload Configuration
```javascript
async function forceReloadConfig(storeId) {
  // Clear cache
  localStorage.removeItem(`whatsapp_config_${storeId}`);

  // Reload from database
  const response = await fetch(`/api/whatsapp/config/${storeId}`);
  const data = await response.json();

  console.log('Config reloaded:', data);

  // Trigger component update
  window.location.reload();
}
```

### Simulate Incoming Message
```javascript
async function simulateMessage(storeId, message = "Hello, test message") {
  const response = await fetch('/api/whatsapp/webhook', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      messages: [{
        from: '2348012345678',
        to: 'store_phone',
        body: message,
        timestamp: Date.now(),
        idMessage: 'test_' + Date.now()
      }]
    })
  });

  console.log('Simulation result:', response.status);
}
```

### Check API Health
```javascript
async function checkAPIHealth(storeId) {
  const endpoints = [
    `/api/whatsapp/config/${storeId}`,
    `/api/whatsapp/analytics/${storeId}`,
    `/api/whatsapp/test/${storeId}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(`✅ ${endpoint}:`, data.success ? 'OK' : 'FAIL');
    } catch (err) {
      console.log(`❌ ${endpoint}: ERROR`, err.message);
    }
  }
}
```

---

## Emergency Fixes

### Reset WhatsApp Configuration
```sql
-- Complete reset for a store
DELETE FROM whatsapp_config WHERE store_id = 'YOUR_STORE_ID';
DELETE FROM whatsapp_messages WHERE store_id = 'YOUR_STORE_ID';
DELETE FROM whatsapp_analytics WHERE store_id = 'YOUR_STORE_ID';

-- Store can now start fresh
```

### Fix Stuck Green API Instance
```sql
-- Release all stuck instances
UPDATE green_api_pool
SET status = 'available', current_store_id = NULL
WHERE status = 'in_use'
AND last_used_at < NOW() - INTERVAL '1 hour';
```

### Disable WhatsApp AI Temporarily
```sql
-- Suspend service
UPDATE whatsapp_config
SET status = 'suspended'
WHERE store_id = 'YOUR_STORE_ID';

-- Re-enable
UPDATE whatsapp_config
SET status = 'active'
WHERE store_id = 'YOUR_STORE_ID';
```

### Clear Debug Logs
```sql
-- Keep only last 7 days
DELETE FROM whatsapp_debug_log
WHERE created_at < NOW() - INTERVAL '7 days';

-- Or clear all for a store
DELETE FROM whatsapp_debug_log
WHERE store_id = 'YOUR_STORE_ID';
```

---

## Monitoring Queries

### Daily Health Check
```sql
-- Check active configs
SELECT
  COUNT(*) as total_stores,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
  COUNT(CASE WHEN last_message_at > NOW() - INTERVAL '1 hour' THEN 1 END) as active_last_hour
FROM whatsapp_config;

-- Check message volume
SELECT
  DATE(created_at) as date,
  COUNT(*) as messages,
  COUNT(DISTINCT customer_phone) as unique_customers,
  COUNT(CASE WHEN handled_by = 'ai' THEN 1 END) as ai_handled
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check Green API pool status
SELECT
  status,
  COUNT(*) as count
FROM green_api_pool
GROUP BY status;
```

### Performance Metrics
```sql
-- Average response time (if tracking)
SELECT
  AVG(response_time_ms) as avg_response_time,
  MIN(response_time_ms) as min_time,
  MAX(response_time_ms) as max_time
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Error rate
SELECT
  COUNT(CASE WHEN status = 'error' THEN 1 END) * 100.0 / COUNT(*) as error_rate
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## Environment Variables Required

```bash
# .env file
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Green API (if using)
GREEN_API_INSTANCE_1=1101234567
GREEN_API_TOKEN_1=your_token_here
GREEN_API_INSTANCE_2=1101234568
GREEN_API_TOKEN_2=your_token_here

# Optional
OPENAI_API_KEY=your_openai_key
WHATSAPP_WEBHOOK_SECRET=random_secret_string
```

---

## Support Contacts

If all debugging fails:

1. **Check Documentation:**
   - Green API: https://green-api.com/en/docs/
   - Baileys: https://github.com/WhiskeySockets/Baileys
   - Meta API: https://developers.facebook.com/docs/whatsapp

2. **Enable Verbose Logging:**
   ```javascript
   process.env.DEBUG = 'whatsapp:*';
   window.WHATSAPP_DEBUG = true;
   ```

3. **Collect Debug Info:**
   ```sql
   -- Run this query and save results
   SELECT
     'config' as table_name, COUNT(*) as count FROM whatsapp_config
   UNION ALL
   SELECT
     'messages', COUNT(*) FROM whatsapp_messages
   UNION ALL
   SELECT
     'analytics', COUNT(*) FROM whatsapp_analytics
   UNION ALL
   SELECT
     'debug_log', COUNT(*) FROM whatsapp_debug_log;
   ```

4. **Test in Isolation:**
   - Run the demo separately: `cd demo && node unified-implementation.js`
   - This helps identify if issue is integration or core functionality

---

## Recovery Procedures

### Full System Reset
```bash
# 1. Stop all services
pm2 stop all

# 2. Clear database
psql -d your_database -f reset_whatsapp.sql

# 3. Re-run migrations
psql -d your_database -f 20240323_whatsapp_ai_tables.sql

# 4. Restart services
pm2 restart all

# 5. Test with single store first
```

### Gradual Rollout
```javascript
// Enable for specific stores only
const BETA_STORES = ['store_id_1', 'store_id_2'];

if (BETA_STORES.includes(currentUser.store_id)) {
  // Show WhatsApp AI feature
}
```

---

Remember: Always test in development first! 🚀