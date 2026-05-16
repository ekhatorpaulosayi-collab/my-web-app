# Chat Widget — Slug Routing & AI-to-Human Takeover

**CRITICAL**: For complete chat widget operations, troubleshooting, and emergency procedures, see:
**→ [docs/CHAT_WIDGET_SYSTEM.md](docs/CHAT_WIDGET_SYSTEM.md)**

That document is the SINGLE SOURCE OF TRUTH for:
- Emergency kill switch procedures
- Message deduplication fixes
- The THREE sacred setMessages calls
- Integrity checking script
- Complete diagnostic procedures

## System Overview

The SmartStock chat system is a multi-tenant real-time chat application with AI-to-human agent takeover capabilities. It supports public access via slug URLs and authenticated agent dashboard access, with optional WhatsApp fallback when agents don't respond.

## Core Components

### 1. Database Structure

#### Tables
- **ai_chat_conversations**: Main conversation records
  - `id`: UUID primary key
  - `session_id`: Unique session identifier
  - `store_id`: Links to store owner (user UUID)
  - `visitor_name`: Customer's name
  - `is_agent_active`: Boolean flag for agent takeover
  - `agent_id`: UUID of agent who took over
  - `chat_status`: 'active' | 'moved_to_whatsapp'
  - `created_at`, `updated_at`: Timestamps

- **ai_chat_messages**: Individual messages
  - `id`: UUID primary key
  - `conversation_id`: Links to conversation
  - `role`: 'user' | 'assistant' | 'system'
  - `content`: Message text
  - `is_agent_message`: Boolean flag
  - `agent_id`: UUID of agent (if applicable)
  - `sender_type`: 'customer' | 'agent' | 'ai'

- **stores**: Store configuration
  - `id`: UUID (matches user_id for single-store setups)
  - `user_id`: Store owner's UUID
  - `slug`: Unique URL identifier
  - `whatsapp_number`: WhatsApp contact
  - `wa_fallback_minutes`: Timeout before WhatsApp prompt

### 2. Row Level Security (RLS) Fix

**CRITICAL**: The main issue was that customers couldn't see agent messages due to restrictive RLS policies.

```sql
-- ✅ CORRECT: Permissive SELECT policy
CREATE POLICY "Everyone can view all messages"
ON ai_chat_messages FOR SELECT
USING (true);

-- Keep restrictive INSERT to prevent abuse
CREATE POLICY "Only authenticated can insert messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

### 3. RPC Function for Agent Messages

```sql
CREATE OR REPLACE FUNCTION send_agent_message(
  p_conversation_id UUID,
  p_message TEXT,
  p_agent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert agent message
  INSERT INTO ai_chat_messages (
    conversation_id,
    role,
    content,
    is_agent_message,
    agent_id,
    sender_type
  ) VALUES (
    p_conversation_id,
    'assistant',
    p_message,
    true,
    p_agent_id,
    'agent'
  ) RETURNING id INTO v_message_id;

  -- Update conversation state
  UPDATE ai_chat_conversations
  SET
    updated_at = NOW(),
    is_agent_active = true,
    agent_id = p_agent_id
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Implementation

### 1. Customer Chat Widget (`/src/components/AIChatWidget.tsx`)

#### Polling-Based Message Updates
```typescript
// CRITICAL: Use polling instead of WebSocket (Supabase free tier)
// Polls every 3 seconds for new messages, slows to 5s when idle
useEffect(() => {
  let pollInterval;
  let lastMessageTime = Date.now();
  let currentPollRate = 3000; // Start at 3 seconds

  const startPolling = () => {
    pollInterval = setInterval(async () => {
      // Fetch only new messages since last known message
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .gt('created_at', lastMessageTimestamp)
        .order('created_at', { ascending: true });

      // Check conversation status changes
      const { data: conversation } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, chat_status')
        .eq('id', conversationId)
        .single();

      if (messages?.length > 0) {
        setMessages(prev => [...prev, ...messages]);
        lastMessageTime = Date.now();

        // Speed up polling when new messages arrive
        if (currentPollRate !== 3000) {
          clearInterval(pollInterval);
          currentPollRate = 3000;
          startPolling();
        }
      } else if (Date.now() - lastMessageTime > 30000) {
        // Slow down polling after 30 seconds of inactivity
        if (currentPollRate !== 5000) {
          clearInterval(pollInterval);
          currentPollRate = 5000;
          startPolling();
        }
      }

      // Update conversation status
      if (conversation) {
        setConversationStatus(conversation);
      }
    }, currentPollRate);
  };

  startPolling();

  return () => {
    if (pollInterval) clearInterval(pollInterval);
  };
}, [conversationId]);
```

### 2. Agent Dashboard (`/src/components/dashboard/ConversationsSimplifiedFixed.tsx`)

#### Key Fix: Store Lookup for Multi-tenant
```typescript
// CRITICAL FIX: Find stores by user_id first
const loadConversations = async () => {
  // Step 1: Get user's stores
  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', user?.uid || '');

  const storeIds = stores?.map(s => s.id) || [];

  // Step 2: Get conversations for those stores
  const { data: conversations } = await supabase
    .from('ai_chat_conversations')
    .select('*')
    .in('store_id', storeIds.length > 0 ? storeIds : [user?.uid || ''])
    .order('updated_at', { ascending: false });
};
```

#### Key Fix: Take Over Button State
```typescript
const handleTakeOver = async (conversationId: string) => {
  // CRITICAL: Set UI state immediately to prevent flicker
  setIsTakeoverActive(true);

  // Update local state immediately
  setConversations(prev =>
    prev.map(c =>
      c.id === conversationId
        ? { ...c, is_agent_active: true, agent_id: user?.uid }
        : c
    )
  );

  // Then update database
  await supabase.rpc('send_agent_message', {
    p_conversation_id: conversationId,
    p_message: 'Agent has joined the conversation',
    p_agent_id: user?.uid
  });
};
```

### 3. WhatsApp Fallback Component (`/src/components/chat/WhatsAppFallback.tsx`)

```typescript
const WhatsAppFallback = ({ conversationId, storeId, lastCustomerMessage }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Start timer when customer sends message
    const minutes = store.wa_fallback_minutes || 5;
    startFallbackTimer(minutes);

    // Poll for agent takeover status
    const checkInterval = setInterval(async () => {
      const { data } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, chat_status')
        .eq('id', conversationId)
        .single();

      if (data?.is_agent_active) {
        // Agent took over - cancel fallback
        cancelFallback();
        setShowFallback(false);
      }

      // Stop polling if conversation moved to WhatsApp
      if (data?.chat_status === 'moved_to_whatsapp') {
        clearInterval(checkInterval);
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [conversationId]);

  const switchToWhatsApp = async () => {
    // Double-check status before showing modal
    const { data } = await supabase
      .from('ai_chat_conversations')
      .select('is_agent_active')
      .eq('id', conversationId)
      .single();

    if (data?.is_agent_active) {
      // Agent just took over - skip modal
      return;
    }

    // Update status
    await supabase
      .from('ai_chat_conversations')
      .update({ chat_status: 'moved_to_whatsapp' })
      .eq('id', conversationId);

    // Open WhatsApp
    const message = encodeURIComponent(
      `Hi, I was asking about "${lastCustomerMessage}" on your SmartStock page`
    );
    const waLink = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(waLink, '_blank');
  };
};
```

## Common Issues & Solutions

### Issue 1: Agent Messages Not Visible to Customers
**Symptom**: Messages show in dashboard but not in customer widget
**Root Cause**: RLS policies too restrictive
**Solution**: Set permissive SELECT policy (`USING (true)`)

### Issue 2: Dashboard Shows No Conversations
**Symptom**: Empty conversations page despite having chats
**Root Cause**: store_id doesn't match user_id in multi-store setups
**Solution**: Query stores table first, then fetch conversations

### Issue 3: Take Over Button Disappears
**Symptom**: Button flickers and disappears after clicking
**Root Cause**: Polling resets state before database updates
**Solution**: Update local state immediately, then sync with database

### Issue 4: Duplicate Messages
**Symptom**: Same message appears twice
**Root Cause**: Multiple polling intervals or race conditions
**Solution**: Deduplicate by message ID in frontend, use `.gt('created_at', lastMessageTimestamp)` to fetch only new messages

### Issue 5: 406 Not Acceptable Error
**Symptom**: Error when checking for system messages
**Root Cause**: Malformed query parameters
**Solution**: Simplify query or use session state

## Testing Checklist

### Database Tests
```sql
-- Test 1: Verify RLS allows anonymous access
BEGIN;
SET LOCAL ROLE anon;
SELECT COUNT(*) FROM ai_chat_messages;
-- Should return count, not permission error
ROLLBACK;

-- Test 2: Verify agent message insertion
SELECT send_agent_message(
  'test-conv-id'::uuid,
  'Test agent message',
  'agent-id'::uuid
);
-- Should return message ID
```

### Frontend Tests
1. **Customer View**:
   - Open store slug URL in incognito
   - Send message as customer
   - Agent takes over in dashboard
   - ✅ Agent message should appear immediately

2. **Dashboard View**:
   - Login as store owner
   - Navigate to conversations
   - ✅ Should see all store conversations
   - Click take over
   - ✅ Button should stay active

3. **WhatsApp Fallback**:
   - Send customer message
   - Wait for timeout (default 5 minutes)
   - ✅ WhatsApp dialog should appear
   - Agent takes over before timeout
   - ✅ Dialog should disappear

## Deployment Commands

```bash
# Build and deploy
npm run build && vercel --prod --force --yes

# Check deployment logs
vercel logs smartstock-v2.vercel.app

# Test in production
curl https://smartstock-v2.vercel.app/api/health
```

## Quick Reference

### Key Files
- `/src/components/AIChatWidget.tsx` - Customer chat widget
- `/src/components/dashboard/ConversationsSimplifiedFixed.tsx` - Agent dashboard
- `/src/components/chat/WhatsAppFallback.tsx` - WhatsApp fallback timer
- `/src/pages/ConversationsPage.tsx` - Conversations route

### Key Database Fields
- `is_agent_active` - Boolean for agent takeover state
- `agent_id` - UUID of agent who took over
- `is_agent_message` - Boolean to identify agent messages
- `chat_status` - Track if moved to WhatsApp

### Environment Variables
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting Guide

### "Messages not showing in customer view"
1. Check RLS policy: `SELECT * FROM pg_policies WHERE tablename = 'ai_chat_messages';`
2. Verify polling is running: Check browser console for fetch requests every 3s
3. Test as anonymous: `SET LOCAL ROLE anon; SELECT * FROM ai_chat_messages;`
4. Check polling cleanup: Ensure intervals are properly cleared on unmount

### "Take over button not working"
1. Check RPC function exists: `SELECT proname FROM pg_proc WHERE proname = 'send_agent_message';`
2. Verify immediate state update in code
3. Check console for errors

### "WhatsApp fallback not triggering"
1. Verify store has WhatsApp number: `SELECT whatsapp_number FROM stores WHERE id = ?;`
2. Check timer is starting: Console log in useEffect
3. Verify agent takeover cancels timer (polling detects status change)
4. Ensure fresh status check before showing modal

### "Polling memory leaks"
1. Always clear intervals on component unmount: `return () => clearInterval(pollInterval)`
2. Stop polling when conversation reaches terminal status (moved_to_whatsapp)
3. Check browser DevTools Memory tab for orphan timers
4. Use unique interval IDs to prevent conflicts

## DEPLOYMENT RULES

**CRITICAL**: Follow these rules EVERY TIME you deploy to production:

### Pre-Deployment Checklist
1. **Save Current State**:
   - Run `git stash` to temporarily save uncommitted changes, OR
   - Run `git add -A && git commit -m "WIP: before deployment"` to commit current state

2. **Run Integrity Check**:
   - Execute: `npm run check:chat`
   - **MUST PASS** all critical checks before proceeding
   - If warnings appear, evaluate if they're acceptable

3. **Build Locally**:
   - Execute: `npm run build`
   - **MUST COMPLETE** without errors
   - Check for TypeScript errors or missing dependencies

4. **Test Locally** (if possible):
   - Test the specific feature you're deploying
   - Check browser console for errors
   - Verify polling/real-time updates work

### Deployment Process
5. **Deploy to Production**:
   ```bash
   vercel --prod --force --yes
   ```
   - Always use `--force` to ensure cache busting
   - Always use `--yes` to skip confirmation prompts
   - Wait for deployment to complete fully

6. **Test on Production Immediately**:
   - Navigate to https://smartstock-v2.vercel.app
   - Test the specific feature that was changed
   - Check browser console for any errors
   - Verify Service Worker updated (check Application tab in DevTools)

### Post-Deployment Actions
7. **If Deployment is Broken**:
   - **Immediate Rollback**:
     ```bash
     git stash pop  # If you used git stash
     # OR
     git reset --hard HEAD~1  # If you committed
     ```
   - Rebuild and redeploy immediately:
     ```bash
     npm run build && vercel --prod --force --yes
     ```
   - Notify team of the issue

8. **If Deployment is Working**:
   - Commit the successful changes:
     ```bash
     git add -A
     git commit -m "✅ [FEATURE]: Description of what was changed"
     ```
   - Example commit messages:
     - `✅ [FIX]: Fixed translated_text field being stripped in chat widget`
     - `✅ [FEATURE]: Added multi-language support to chat`
     - `✅ [UPDATE]: Improved polling performance`

### Emergency Procedures
- **Kill Switch**: See [docs/CHAT_WIDGET_SYSTEM.md](docs/CHAT_WIDGET_SYSTEM.md) for emergency procedures
- **Rollback Command**: `git reset --hard HEAD~1 && npm run build && vercel --prod --force --yes`
- **Check Logs**: `vercel logs smartstock-v2.vercel.app --follow`

### Important Notes
- **Never skip the chat integrity check** - it prevents duplicate message bugs
- **Always test immediately after deploy** - catch issues before users do
- **Use descriptive commit messages** - helps track what changed when
- **Cache busting is automatic** - Service Worker version updates on build

## Version History

- **v1.0** (March 26, 2026): Initial fix for agent message visibility
- **v1.1**: Added WhatsApp fallback functionality
- **v1.2**: Fixed duplicate message issue
- **v1.3**: Improved store lookup for multi-tenant
- **v1.4** (March 27, 2026): Replaced WebSocket with polling (Supabase free tier compatibility)
- **v1.5** (March 28, 2026): Fixed AI response duplication - removed duplicate insertion from ChatTracking service
- **v1.6** (March 28, 2026): Created comprehensive operations manual at docs/CHAT_WIDGET_SYSTEM.md
- **v1.6.1** (DB-only, 2026-05-02): TIMESTAMPTZ migration: converted 39 timestamp columns across 14 tables from `timestamp without time zone` to `timestamptz`. Root-cause fix for 60-minute clock skew that necessitated parseUtc band-aid in v1.2.1-stable. See migration `20260502_fix_naked_timestamp_columns.sql` and the TIMESTAMP HANDLING section below.

---

Last Updated: March 28, 2026
Author: Claude & Paul
Status: ✅ Production Ready (Polling-based, Deduplication Fixed)

## TIMESTAMP HANDLING (post-2026-05-02)

**Root cause now fixed at the database level.** A migration on
2026-05-02 converted 39 `timestamp without time zone` columns across
14 tables to `timestamptz`, treating existing values as UTC. The
affected tables are: `affiliate_clicks`, `affiliate_payouts`,
`affiliate_sales`, `affiliates`, `ai_chat_conversations`,
`ai_chat_messages`, `ai_chat_rate_limits`, `ai_chat_usage`,
`product_images`, `subscription_tiers`, `user_onboarding_preferences`,
`user_subscriptions`, `whatsapp_chats`, `whatsapp_settings`. The
`store_conversations` view was dropped and recreated.

**Effect on the frontend.** PostgREST now serializes these columns
with proper `+00:00` (or `Z`) suffixes, so `new Date(...)` and
`parseISO(...)` parse them correctly without coercion.

**The `parseUtc` helper in `src/components/dashboard/ConversationsSimplifiedFixed.tsx`
is now a defensive band-aid.** It is NO LONGER strictly required for
correct behavior. **Keep it in place for at least one stable release**
as a safety net against:
- An older client cache that still has stale strings in memory
  (unlikely with our SW cache-busting but possible in long-lived tabs).
- Some other code path that writes a naked-ISO string back to the
  database before the migration takes full effect everywhere.
- Future tables/columns added without TZ awareness.

**Future cleanup (no rush).** Code that previously had to use
`parseUtc` can eventually use plain `parseISO` again. Recommended
order when you do clean it up:
1. Wait at least one stable release after 2026-05-02 with no
   timestamp-related bug reports.
2. Spot-check the response shape for each call site (browser console:
   look for `+00:00` or `Z` on the relevant column).
3. Replace `parseUtc(...)` → `parseISO(...)` one site at a time, run
   `npm run check:chat`, build, deploy, verify.
4. Remove the `parseUtc` helper itself only after every call site is
   migrated.

**Schema-level invariant going forward.** All new timestamp columns
in this project MUST be declared `TIMESTAMPTZ`, never plain
`TIMESTAMP`. Plain `timestamp without time zone` is what produced the
~60-minute BST skew on the conversations dashboard before the
2026-05-02 migration.

## EMERGENCY PLAYBOOK

If frontend is broken:
1. Go to vercel.com → Deployments → find last working deployment → Promote to Production
2. This fixes it in 10 seconds without touching code

If edge function is broken:
cp supabase/functions/ai-chat/index.ts.ux-complete-2026-04-15 supabase/functions/ai-chat/index.ts
supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl

If generate-business-summary is broken (use on BOOT_ERROR or boot-related regression):
cp supabase/functions/generate-business-summary/index.ts.v1.2.3-stable supabase/functions/generate-business-summary/index.ts
supabase functions deploy generate-business-summary --project-ref yzlniqwzqlsftxrtapdl

If database is broken:
Contact Supabase support immediately. Do NOT run DELETE or UPDATE without WHERE clause.

If everything is broken:
git checkout v1.0-stable -- .
npm run build
vercel --prod --force --yes
supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl

## DEPLOYMENT RULES (follow every time)
1. Before any changes: git stash or git commit current state
2. Run npm run check:chat — must pass
3. Run npm run build — must pass
4. Deploy: vercel --prod --force --yes
5. Test on production immediately after deploy
6. If broken: git stash pop (or restore backup) and redeploy
7. If working: git add -A && git commit -m "description of change"

## Paystack Subaccount Work — Session 1 complete (2026-05-13)

### State
- Foundation migration 20260509 + 4 RPC migrations 20260510–20260513 APPLIED to production via direct psql (Supabase branching unavailable on Free tier; CLI `db push` blocked by drift — see below)
- 9 tables live: orders, order_items, paystack_subaccounts, vendor_kyc, bank_accounts, paystack_split_transactions, paystack_webhook_events, platform_fee_config, vendor_velocity_limits
- platform_fee_config seeded (free/starter/pro). basis_points is Storehouse-only take; paystack_wholesale_bps (150) is separate. Customer-total rate = basis_points + paystack_wholesale_bps. Verified.
- Reviewer UUID dffba89b-869d-422a-a542-2e2494850b44 (Paul) substituted into split_tx_reviewer_select/update RLS policies. Verified.
- Vault secret `vendor_kyc_key` created (32-byte base64-encoded). Verified.
- 4 RPCs live: record_successful_payment, complete_subaccount_onboarding, approve_review, reject_review_and_freeze. All SECURITY DEFINER. Verified.
- Feature flag `ENABLE_PAYSTACK_SUBACCOUNTS` remains OFF. No customer impact. All 7 edge functions check it and return 503 when off.
- All commits on `feat/paystack-subaccounts` pushed to origin. Commit A1 amended with the substituted UUID; force-pushed once.

### Branch + git
- Working branch: `feat/paystack-subaccounts`
- Locked migration: 20260509 only structural changes were the 3 reviewer-UUID substitutions per the migration's own pre-flight checklist. DO NOT modify further.
- 4 RPC migrations are CREATE OR REPLACE FUNCTION — idempotent, safe to re-run.

### Known issue: migration drift
- Local `supabase/migrations/` has ~40 files; production `supabase_migrations.schema_migrations` records only a subset. The rest were applied via dashboard SQL Editor or earlier tooling and never recorded.
- **DO NOT run `supabase db push` against production until reconciled** — it will attempt to replay ~35 backlog migrations and fail (some have CREATE POLICY statements with no IF NOT EXISTS guard).
- Workaround for new migrations: apply via direct psql with ON_ERROR_STOP=1, then INSERT into supabase_migrations.schema_migrations with empty `statements` array (the CLI only checks `version` for tracking).
- Pattern used for 20260509–20260513:
  ```
  psql "$(cat ~/.supabase-paystack-dburl)" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql
  psql "$(cat ~/.supabase-paystack-dburl)" -c "INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ('<ver>', '<name>', ARRAY[]::text[]);"
  ```
- Permanent fix: reconcile drift after Paystack v1 ships and before merchant #2 onboards. Use `supabase migration repair --status applied <version>` for each drifted migration.

### DB access
- Connection string saved to `~/.supabase-paystack-dburl` (chmod 600 — verified).
- Pattern: `psql "$(cat ~/.supabase-paystack-dburl)" ...` — never echo `$DATABASE_URL`, never commit, never paste into chat.

### Supabase Pro upgrade gate
- Currently on Free tier.
- MUST upgrade to Pro ($25/mo) BEFORE either of these happens:
  - First non-Paul merchant has `ENABLE_PAYSTACK_SUBACCOUNTS` flag enabled (per-store or globally)
  - First paying subscriber on any tier
- Reason: PITR (point-in-time recovery) becomes non-optional once real money flows. Branching also unlocks; would have prevented tonight's direct-to-prod workflow.

### Next session (Session 2)
1. Deploy 7 edge functions to Supabase Functions runtime (flag still OFF). Functions to deploy: initiate-storefront-payment, paystack-subaccount-webhook, create-paystack-subaccount, approve-transaction-for-fulfillment, reject-transaction-and-freeze, resolve-bank-account, initiate-marketplace-payment.
2. Verify `ENABLE_PAYSTACK_SUBACCOUNTS` is OFF in Supabase function secrets BEFORE deploy (`supabase secrets list --project-ref yzlniqwzqlsftxrtapdl`). Feature flag check belongs in edge function env vars, NOT Vercel.
3. End-to-end test on Paul's own store with flag flipped ON for that one store only (`stores.paystack_subaccounts_enabled = TRUE` for Paul's store; global flag stays whichever).
4. Wire real Paystack API calls (replace mock blocks in `create-paystack-subaccount`, `resolve-bank-account`, `initiate-storefront-payment`). REQUIRES: `PAYSTACK_SECRET_KEY` env var, §13.1 wholesale-fee-base verification per docs/PAYSTACK-DEBUG.md §11 (hard gate).
5. Pre-Session-2 mock data cleanup per docs/SESSION-2-MIGRATION-CHECKLIST.md.

## Paystack Subaccount Work — Session 2 complete (2026-05-13)

### State
- All 7 edge functions DEPLOYED to production Supabase Functions runtime. Flag remains OFF — no customer impact.
- `ENABLE_PAYSTACK_SUBACCOUNTS` was absent from secrets at session start. Set explicitly to `false` before any deploy. Verified via SHA256 digest comparison (`fcbcf16590...` = sha256("false")).
- `PAYSTACK_SECRET_KEY` confirmed present (user-confirmed test-mode `sk_test_*`; CLI exposes digest only, not value).
- Each function invoked via curl with anon key + minimal valid payload immediately post-deploy. All returned HTTP 503 with `{"error":"feature_disabled"}` body (two with extra `detail` field — see table).

### Deploy + 503 verification table
| # | Function | HTTP | Body |
|---|----------|------|------|
| 1 | resolve-bank-account | 503 | `{"error":"feature_disabled"}` |
| 2 | create-paystack-subaccount | 503 | `{"error":"feature_disabled","detail":"ENABLE_PAYSTACK_SUBACCOUNTS is off"}` |
| 3 | paystack-subaccount-webhook | 503 | `{"error":"feature_disabled"}` |
| 4 | initiate-storefront-payment | 503 | `{"error":"feature_disabled"}` |
| 5 | initiate-marketplace-payment | 503 | `{"error":"feature_disabled","detail":"ENABLE_MARKETPLACE is off; ..."}` |
| 6 | approve-transaction-for-fulfillment | 503 | `{"error":"feature_disabled"}` |
| 7 | reject-transaction-and-freeze | 503 | `{"error":"feature_disabled"}` |

### Notable finding: separate flag for marketplace
- `initiate-marketplace-payment` is gated by `ENABLE_MARKETPLACE`, NOT `ENABLE_PAYSTACK_SUBACCOUNTS`. Flipping the subaccount flag will NOT enable the marketplace endpoint. The marketplace route is reserved-only in Session 1 — even with its own flag on, it returns 501 `not_implemented` because the multi-vendor split flow isn't built. See `supabase/functions/initiate-marketplace-payment/index.ts:25,37`.
- `ENABLE_MARKETPLACE` is currently absent from Supabase secrets, so it defaults to off. Leave it that way until the marketplace flow is actually implemented.

### Deploy pattern used
```
supabase functions deploy <name> --project-ref yzlniqwzqlsftxrtapdl
curl -sS -X POST "https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/<name>" \
  -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" -d '<minimal valid payload>'
```
- Docker not running is fine — the CLI uploads the bundle directly without a local build step. The "WARNING: Docker is not running" line on every deploy is informational, not an error.
- Flag check runs FIRST in every function (before auth, payload parse, signature verify), so any payload — even empty — triggers the 503 path. This means flag-off behavior is deterministic regardless of caller.

### Next session (Session 3)
1. Wire real Paystack API calls per §13.1 wholesale-fee-base verification (docs/PAYSTACK-DEBUG.md §11). Hard gate. Functions with mock blocks to replace: `create-paystack-subaccount`, `resolve-bank-account`, `initiate-storefront-payment`.
2. Add per-user rate limiting to `resolve-bank-account` BEFORE flipping flag on (Paystack charges per `/bank/resolve`; unrate-limited endpoint = account-number harvesting risk). See TODO at `supabase/functions/resolve-bank-account/index.ts:107`.
3. Per-store flag flip on Paul's store only (`stores.paystack_subaccounts_enabled = TRUE` for `dffba89b-869d-422a-a542-2e2494850b44`). Keep global `ENABLE_PAYSTACK_SUBACCOUNTS=false` until at least one full E2E round-trip succeeds.
4. End-to-end test: onboard → resolve bank → create subaccount → initiate storefront payment → simulate webhook → approve → verify split. Use Paystack test cards.
5. Supabase Pro upgrade ($25/mo) BEFORE flipping flag on for any non-Paul merchant or accepting first paying subscriber (PITR + branching unlock; see Session 1 handoff).
6. Pre-Session-3 mock data cleanup per docs/SESSION-2-MIGRATION-CHECKLIST.md (still pending from Session 1's next-session list).

### What did NOT happen this session (intentional)
- Flag NOT enabled. `ENABLE_PAYSTACK_SUBACCOUNTS` remains `false`.
- No real Paystack API calls. All mock blocks intact.
- No frontend / Vercel work. Edge-function-only session.
- No DB migrations. No schema changes.

## Paystack debugging lessons (Session 3)

- **"Account details are invalid" is misleading.** Paystack returns
  this generic 400 message for many payload issues, not just bad
  bank/account combos. When stuck on this error, first reproduce
  with a direct curl from outside the edge function to isolate
  which side has the bug — if your direct curl works and the edge
  function fails, the bug is in how the function constructs the
  request, not in the bank/account/key values.
- **`percentage_charge` is a JSON number, not a string.** Paystack
  `/subaccount` validates the type strictly. Sending `"1"`
  (stringified, as `(bps / 100).toString()` produces) yields the
  misleading 400 above. Send a `Number` — drop any `.toString()`
  on this field. Same likely applies to other numeric Paystack
  fields (`amount`, `transaction_charge` etc.) — favour numbers
  over strings unless the docs explicitly say string.
- **F3 transaction_charge formula:** `Math.min(Math.floor(subtotal_kobo
  * basis_points / 10000), feeConfig.cap_kobo)`. Computed on the
  SUBTOTAL (merchant product price), not the customer-facing total
  which already includes Storehouse's markup. Paystack's flat ₦100
  fee is Paystack's concern, not ours. `bearer: "account"` means
  Storehouse main account is intended to bear the Paystack
  processing fee — but a subaccount-level bearer policy
  (configurable on Paystack's side via subaccount create/update)
  can override this per-transaction value. Verify the live behaviour
  against Paystack's verify response, not just the request body.

## KYC v1 Work — Session 4 ended at step 6 (2026-05-16)

### State
- Branch: `feat/kyc-wizard-v1` (merge-ready for the backend slice; UI work still to come)
- Steps 1-6 of `docs/KYC_V1_SPEC.md` §12 shipped and pushed:
  1a vendor_kyc extensions, 1b encrypt+decrypt helpers (incl. fix
  for pre-existing search_path bug on decrypt), 1c
  vendor_velocity_overrides table, 1d Paul super-admin pro
  subscription, 2 kyc-photos storage bucket + RLS, 3a-d the four
  RPCs (submit_kyc_v1, approve_kyc_review, reject_kyc_review,
  grant_velocity_override), 4 F2/F3 tier guards, 5 F3 velocity
  override lookup, 6 reviewer bash scripts.
- See `docs/SESSION_4_LESSONS_CAPTURED.md` for the spec-vs-reality
  pattern that forced multiple in-flight spec amendments. The same
  schema-reconciliation discipline is what made Session 4 finishable
  in one sitting; recommend keeping it for Sessions 5+.

### Step 7 deferred to Phase 1.5
- `notify-reviewer-new-kyc` edge function (email Paul on submission)
  is NOT shipping in v1. Reason: Paul checks
  `./scripts/kyc/list-pending.sh` manually. Email automation
  becomes critical at Phase 2 (employee reviewer) and isn't
  load-bearing for v1 launch. Re-prioritize when (a) Paul is no
  longer the only reviewer, or (b) merchant onboarding volume
  makes manual queue checks burdensome.
- Prerequisites for future work: Resend account, domain
  verification for `storehouse.ng`, `reviewer@storehouse.ng`
  inbox via Cloudflare Email Routing or equivalent.

### Next session (Session 5)
- Card 1 tier_locked state on `/settings/payments`
- Card 2 status states (tier_locked, rejected_can_resubmit,
  rejected_hard, in_review, approved)
- 5-step wizard frontend (matches existing bank-setup wizard
  styling per spec §6.3)
- Velocity visibility card below Card 2
- Edit-after-approval limited form (per spec §6.4)
- All per `docs/KYC_V1_SPEC.md` §6 + the focus rules in
  `docs/KYC_V1_FOCUS_RULES.md`

## PRE-DEPLOY CHECKLIST
[ ] Record a sale — correct price, no duplicate
[ ] Open storefront — AI chat responds
[ ] Send Hausa message — responds in Hausa
[ ] Click "Talk to Store Owner" — notification appears on dashboard
[ ] Take over chat — translation shows
[ ] Open More Features — all items clickable, modal stays open
[ ] Open Business Insights — page loads (Pro tier only)
[ ] Share store on WhatsApp — link works
[ ] Check AI badge — shows correct X/Y count
