# WhatsApp AI Integration Instructions

## ✅ Safe Integration Steps

Follow these steps to add WhatsApp AI to your existing Storehouse dashboard WITHOUT breaking anything:

---

## Step 1: Add to Dashboard Menu

Find where your dashboard menu is defined (usually in `App.jsx` or a `Dashboard` component) and add:

```jsx
// Add to your menu items array
const menuItems = [
  // ... existing items
  {
    icon: MessageCircle,
    label: 'WhatsApp AI',
    path: '/dashboard/whatsapp',
    badge: 'NEW', // Optional badge to highlight new feature
    roles: ['store_owner', 'admin'] // Control who can see it
  }
];
```

---

## Step 2: Add Route

In your routing configuration (usually `App.jsx` or `AppRoutes.jsx`):

```jsx
// Import the component
import WhatsAppAISetup from './components/WhatsAppAI/WhatsAppAISetup';

// Add route
<Route
  path="/dashboard/whatsapp"
  element={
    <ProtectedRoute>
      <WhatsAppAISetup storeId={currentUser?.store_id} />
    </ProtectedRoute>
  }
/>
```

---

## Step 3: Add to Settings Page (Alternative)

If you prefer to add it as a tab in existing settings:

```jsx
// In your Settings component
import WhatsAppAISetup from './components/WhatsAppAI/WhatsAppAISetup';

// Add to tabs
const settingsTabs = [
  { id: 'general', label: 'General', component: GeneralSettings },
  { id: 'store', label: 'Store Info', component: StoreSettings },
  { id: 'whatsapp', label: 'WhatsApp AI', component: WhatsAppAISetup }, // NEW
  // ... other tabs
];

// In render
{activeTab === 'whatsapp' && (
  <WhatsAppAISetup storeId={currentUser?.store_id} />
)}
```

---

## Step 4: Add Environment Variables

Add to your `.env` file:

```bash
# WhatsApp AI Configuration
VITE_WHATSAPP_ENABLED=true
VITE_GREEN_API_BASE_URL=https://api.green-api.com

# Add these to Vercel/deployment environment too
GREEN_API_INSTANCE_1=your_instance_id
GREEN_API_TOKEN_1=your_token
```

---

## Step 5: Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL editor
-- Copy contents of: /supabase/migrations/20240323_whatsapp_ai_tables.sql
-- Paste and run in SQL editor
```

---

## Step 6: Add Feature Flag (Optional)

Control rollout with a feature flag:

```jsx
// In App.jsx or config
const FEATURES = {
  WHATSAPP_AI: process.env.VITE_WHATSAPP_ENABLED === 'true',
  // Beta test with specific stores
  WHATSAPP_BETA_STORES: ['store_id_1', 'store_id_2']
};

// In component render
{(FEATURES.WHATSAPP_AI || FEATURES.WHATSAPP_BETA_STORES.includes(currentUser?.store_id)) && (
  <MenuItem>
    <Link to="/dashboard/whatsapp">
      <MessageCircle className="mr-2" />
      WhatsApp AI
      <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">NEW</span>
    </Link>
  </MenuItem>
)}
```

---

## Step 7: Add API Routes

In your API configuration (Vercel, Next.js, or Express):

```javascript
// api/whatsapp/[...route].js (Vercel)
import whatsappAPI from '../../api/whatsapp/index';

export default async function handler(req, res) {
  const { route } = req.query;

  switch(route[0]) {
    case 'activate':
      return whatsappAPI.activateWhatsApp(req, res);
    case 'webhook':
      return whatsappAPI.webhookHandler(req, res);
    case 'config':
      return whatsappAPI.getConfig(req, res);
    case 'settings':
      return whatsappAPI.updateSettings(req, res);
    case 'analytics':
      return whatsappAPI.getAnalytics(req, res);
    case 'test':
      return whatsappAPI.testConnection(req, res);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
```

---

## Step 8: Add to Store Onboarding (Optional)

For new stores, add WhatsApp setup to onboarding:

```jsx
// In onboarding flow
const onboardingSteps = [
  { id: 'store-info', label: 'Store Information' },
  { id: 'products', label: 'Add Products' },
  { id: 'payment', label: 'Payment Setup' },
  { id: 'whatsapp', label: 'WhatsApp AI (Optional)' }, // NEW
  { id: 'complete', label: 'Complete' }
];

// In WhatsApp step
{currentStep === 'whatsapp' && (
  <div>
    <h3>Activate WhatsApp AI Assistant</h3>
    <p>Let AI handle customer inquiries 24/7</p>
    <WhatsAppAISetup storeId={newStoreId} />
    <button onClick={skipStep}>Skip for now</button>
  </div>
)}
```

---

## Step 9: Add Notification Badge

Show when WhatsApp has new messages:

```jsx
// In your notification component
const [whatsappUnread, setWhatsappUnread] = useState(0);

useEffect(() => {
  // Check for unread WhatsApp messages
  const checkMessages = async () => {
    const { count } = await supabase
      .from('whatsapp_messages')
      .select('count', { count: 'exact' })
      .eq('store_id', storeId)
      .eq('handled_by', 'pending')
      .single();

    setWhatsappUnread(count || 0);
  };

  checkMessages();
  const interval = setInterval(checkMessages, 30000); // Check every 30s
  return () => clearInterval(interval);
}, []);

// In menu
<Link to="/dashboard/whatsapp">
  WhatsApp AI
  {whatsappUnread > 0 && (
    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
      {whatsappUnread}
    </span>
  )}
</Link>
```

---

## Step 10: Test Integration

```javascript
// Add to browser console for testing
async function testWhatsAppIntegration() {
  console.log('Testing WhatsApp AI Integration...');

  // 1. Check component loads
  const component = document.querySelector('[data-testid="whatsapp-ai"]');
  console.log('✓ Component loaded:', !!component);

  // 2. Check API endpoint
  const response = await fetch('/api/whatsapp/test/' + storeId);
  const data = await response.json();
  console.log('✓ API connected:', data.success);

  // 3. Check database
  const { supabase } = await import('./supabaseClient');
  const { error } = await supabase.from('whatsapp_config').select('count');
  console.log('✓ Database ready:', !error);

  console.log('Integration test complete!');
}

testWhatsAppIntegration();
```

---

## Rollback Plan

If anything breaks, here's how to quickly disable:

```javascript
// 1. Quick disable in UI (add to App.jsx)
const DISABLE_WHATSAPP = true; // Emergency switch

{!DISABLE_WHATSAPP && (
  // WhatsApp AI components
)}

// 2. Disable via environment variable
VITE_WHATSAPP_ENABLED=false

// 3. Remove from menu temporarily
// Comment out the WhatsApp menu item

// 4. Database rollback (if needed)
DROP TABLE IF EXISTS whatsapp_config CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_analytics CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS green_api_pool CASCADE;
DROP TABLE IF EXISTS whatsapp_customers CASCADE;
DROP TABLE IF EXISTS whatsapp_debug_log CASCADE;
```

---

## Monitoring After Launch

```javascript
// Add to your monitoring dashboard
const WhatsAppMetrics = () => {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      const summary = {
        totalStores: new Set(data?.map(d => d.store_id)).size,
        totalMessages: data?.reduce((sum, d) => sum + d.total_messages, 0),
        errorRate: calculateErrorRate(data)
      };

      setMetrics(summary);
    };

    fetchMetrics();
  }, []);

  return (
    <div className="whatsapp-metrics">
      <h3>WhatsApp AI Status</h3>
      <div>Active Stores: {metrics.totalStores}</div>
      <div>Messages (7d): {metrics.totalMessages}</div>
      <div>Error Rate: {metrics.errorRate}%</div>
    </div>
  );
};
```

---

## Success Checklist

- [ ] Component appears in menu
- [ ] Clicking opens WhatsApp AI setup
- [ ] Database tables created
- [ ] Can activate trial (shows QR code)
- [ ] Settings save correctly
- [ ] Analytics display
- [ ] Debug tab shows data
- [ ] No console errors
- [ ] Existing features still work

---

## Need Help?

Check the debug guide: `/docs/WHATSAPP_AI_DEBUG_GUIDE.md`

Enable debug mode:
```javascript
window.WHATSAPP_DEBUG = true;
```

Test in isolation:
```bash
cd demo
node unified-implementation.js
```

The integration is designed to be completely modular - if anything goes wrong, simply remove the menu item and the feature is disabled!