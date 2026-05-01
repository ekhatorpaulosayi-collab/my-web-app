# STOREHOUSE-DEBUG.md

A debugging skill file for the SmartStock / Storehouse codebase. Everything in here is grounded in the actual source — function names, paths, column names, and query shapes are taken from the files listed at the bottom. When the code changes, update this doc.

For chat-widget specifics not duplicated here, see `CLAUDE.md` and `docs/CHAT_WIDGET_SYSTEM.md`.

---

## Section 1 — Architecture

### Frontend stack
- **React + TypeScript + JSX** (mixed `.tsx` and `.jsx`).
- **Vite** as the bundler. `npm run build` runs the Vite production build into `dist/`.
- **React Router** for navigation (`useNavigate`, `Navigate`).
- **lucide-react** for icons. **Tailwind-style CSS** via per-component `.css` files (`AIUsageCounter.css`, `MoreMenu.css`, `LandingPage.css`, etc.).
- **Service Worker** at `dist/sw.js` (cache-busted on every build — see deployment rules).
- The app is a single-page app served from Vercel at `https://smartstock-v2.vercel.app`.

### Auth
- **Supabase Auth** via `@supabase/supabase-js`. The codebase still uses Firebase-style naming (`currentUser.uid`) because of an earlier migration — `uid` here is the Supabase auth user UUID.
- `useAuth()` from `src/contexts/AuthContext.jsx` returns `{ currentUser, loading, userProfile }`.

### Supabase tables actively read/written
| Table | Purpose |
|---|---|
| `users` | Profile row mirroring `auth.users`. `id` (UUID) matches the auth user. Stores `email`, `phone_number`, `business_name`, `device_type`, `is_active`, `created_at`, `last_login_at`, `updated_at`. |
| `stores` | One per user. `id` (UUID PK). **`user_id` is TEXT** (see Section 3). Plus `business_name`, `store_slug`, `subdomain`, `custom_domain`, `whatsapp_number`, `wa_fallback_minutes`, `is_public`, `logo_url`, `address`, `bank_name`, `account_number`, `account_name`, `accepted_payment_methods`, `payment_instructions`, `paystack_enabled`, `paystack_public_key`, `paystack_test_mode`, `delivery_areas`, `delivery_fee`, `delivery_time`, `minimum_order`, `business_hours`, `days_of_operation`, `instagram_url`, `facebook_url`, `tiktok_url`, `twitter_url`, `about_us`, `return_policy`. |
| `ai_chat_conversations` | `id` (UUID), `session_id`, `store_id` → `stores.id`, `visitor_name`, `visitor_email`, `is_agent_active`, `agent_id`, `takeover_status` (`'requested' \| 'agent' \| 'agent_active' \| 'ai' \| 'ended'`), `waiting_for_owner_since`, `chat_status` (`'active' \| 'moved_to_whatsapp'`), `detected_language`, `created_at`, `updated_at`. |
| `ai_chat_messages` | `id`, `conversation_id`, `store_id`, `role` (`'user' \| 'assistant' \| 'system'`), `content`, `is_agent_message`, `agent_id`, `sender_type` (`'customer' \| 'agent' \| 'ai' \| 'system'`), `detected_language`, `translated_text`, `created_at`. |
| `chat_analytics` | Edge function writes events here: `event_type`, `user_type`, `visitor_ip`, `session_id`, `user_id`, `context_type`, `message_count`, `metadata`. |
| `user_subscriptions` | `user_id`, `tier_id`, `status`, `billing_cycle`, `payment_reference`, `payment_provider`, `ai_chats_used`, `ai_chats_used_this_month`, `cancelled_at`, `updated_at`. Joined with `subscription_tiers` for tier name. |
| `subscription_tiers` | `id`, `name` (`'Free' \| 'Starter' \| 'Pro' \| 'Business'`), `description`, `price_monthly`, `price_annual`, `paystack_plan_code_monthly`, `paystack_plan_code_annual`, `max_products`, `max_images_per_product`, `max_users`, `max_ai_chats_monthly`, `is_active`, `display_order`, plus `has_*` feature-flag booleans. |
| `ai_chat_logs` | Per-chat usage telemetry written by `incrementAIUsage()`. |
| `subscriptions` | Legacy single-row subscription table created at signup (`tier='free'`, 100-year `expires_at`). |

### Edge functions (Supabase Functions, Deno)
- `ai-chat` (`supabase/functions/ai-chat/index.ts`, ~3120 lines) — main customer/owner chat brain. Calls OpenAI, enforces rate limits + monthly quota, writes messages, runs the storefront/help/onboarding/business-advisory contexts. Imports from `./store-context.ts` and `./cache-helper.ts`.
- `send-agent-message` — invoked from the dashboard to insert an authenticated agent reply (used by `ConversationsSimplifiedFixed.tsx:496`).
- `verify-transaction`, `verify-subscription`, `manage-subscription` — Paystack flow (used from `SubscriptionUpgrade.tsx`).

### Deployment targets
- **Frontend → Vercel** (`vercel --prod --force --yes`). Project ID inferred from the URL `smartstock-v2.vercel.app`.
- **Edge functions → Supabase Functions** (`supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl`).
- **Database → Supabase** (project ref `yzlniqwzqlsftxrtapdl`).

### End-to-end flow when a customer visits a storefront
1. Customer hits `/store/<slug>` → `StorefrontPage.tsx` calls `supabase.from('stores').select('*').eq('store_slug', slug)`.
2. Page mounts `<AIChatWidget storeSlug={slug} contextType="storefront" />`.
3. `AIChatWidget` initialises a conversation (`session_id` in `sessionStorage` → `ai_chat_conversations`), then begins polling `ai_chat_messages` every 3s (5s when idle).
4. When the customer sends a message, the widget POSTs to `${supabaseUrl}/functions/v1/ai-chat` with `{ message, contextType, storeSlug, sessionId, userType, appContext, relevantDocs, storeInfo }`.
5. The edge function detects language, checks rate limit + monthly quota via the `check_ai_chat_quota` RPC, calls OpenAI (with `cachedOpenAICall`), inserts assistant reply into `ai_chat_messages`, returns `{ response, quotaExhausted, ... }`.
6. The customer's poll picks up the new row and renders it.
7. If `takeover_status='requested'` is set (via "Talk to Store Owner"), the owner dashboard at `/conversations` shows it. The owner clicks "Take over"; `ConversationsSimplifiedFixed.tsx` UPDATEs the conversation to `is_agent_active=true, takeover_status='agent_active'` and inserts a system message.
8. Owner replies via the `send-agent-message` edge function (so RLS uses the owner's auth context).
9. WhatsApp fallback timer (`WhatsAppFallbackTimer.tsx`, configured by `stores.wa_fallback_minutes`, default 2 min) prompts the customer if no agent answers.

---

## Section 2 — Key Files

### Application shell

#### `src/App.jsx` (≈6816 lines)
The top-level React component that owns most of the dashboard UI. Imports almost every feature component.
- Lines **88, 140–145** — pulls the dashboard header business name from Supabase via `useStore(currentUser?.uid)` and `useUser(currentUser)`. Computes `headerBusinessName = headerStore?.business_name || headerUser?.business_name || 'My Store'` (never `"Storehouse"`).
- Line **4097–4099** — header JSX: `<div className="business-name">{headerBusinessName}</div>`.
- Line **4103** — mounts `<AIUsageCounter compact={true} onUpgradeClick={() => navigate('/subscription')} />` in the header.
- Mounts `<BusinessSettings>` (line **5520**, modal) and `<Dashboard>` (the main grid).
- Connected: `BusinessSettings.tsx`, `Dashboard.tsx`, `AIChatWidget.tsx`, `AIUsageCounter.tsx`, `MoreMenu.tsx`, `useBusinessProfile`, `useAuth`, `useStore`, `useUser`.

#### `src/components/Dashboard.tsx` (≈1388 lines)
The action-first dashboard shown to a logged-in user. Receives `userId` as a prop (the auth UID).
- Line **102** — `const { store, loading: storeLoading } = useStore(userId);`
- Line **105** — `const { user: storeOwnerUser } = useUser(userId ? { uid: userId } : null);`
- Line **107** — `businessName = store?.business_name || storeOwnerUser?.business_name || 'My Store';` (never `"Storehouse"`).
- Mounts `<MoreMenu>` (gated on `showMoreMenu` state), `<ChannelAnalytics>`, `<StaffPinLogin>`, etc.
- Connected: `MoreMenu.tsx`, `ShareStoreBanner`, `PaymentStatusIndicator`, `useStore`, `useUser`, `useStaff`.

### Settings (TWO save paths — read carefully)

#### `src/components/BusinessSettings.tsx` (≈1469 lines)
Modal-style "Business Settings" panel mounted from `App.jsx:5520`. **This is the panel users actually see.** Persists profile data via `useBusinessProfile()` (localStorage) AND now writes `business_name` to Supabase `stores` and `users`.
- Imports `StoreSettings` (line **16**) but **does not currently render it** — `StoreSettings.tsx` is dead code in the user-facing flow. (Confirmed by inspection; if you wire it back in, double-check both saves don't fight each other.)
- Save handler (around line **367**): does `getSession()` first → blocks if expired; UPDATEs `stores` filtered by `eq('user_id', String(currentUser.uid))` with `.select(...).maybeSingle()`; mirrors to `users.business_name`; finally calls `setProfile()` (localStorage) and toasts success. **Throws on RLS-blocked or zero-row updates instead of silently saying "saved".**
- Connected: `useBusinessProfile`, `useAuth`, `supabase`, `pinService`, `storeSlug`, `PaymentSettings`, `PaymentMethodsManager`, `WhatsAppFallbackSettings`.

#### `src/components/StoreSettings.tsx` (≈2237 lines)
A more comprehensive store profile editor. Currently **not rendered anywhere in the user flow** (only imported by `BusinessSettings.tsx`). Kept around because it has the canonical full-profile save (logo upload, payment, delivery, social media, about, return policy).
- Lines **28–53** — `reloadStore()` does an uncached `supabase.from('stores').select('*').eq('user_id', String(user.uid)).maybeSingle()`. Does **not** go through the cached `useStore` hook.
- Lines **265–278** — guards `handleSave` with explicit `console.error` + alert when there's no user or `store?.id` is null (used to be a silent `return`).
- Lines **347–360** — explicit `supabase.auth.getSession()` check before the write.
- Lines **372–399** — UPDATE filtered by both `eq('id', store.id)` AND `eq('user_id', String(user.uid))`, with `.select().maybeSingle()`. Throws if `data` is null.
- Lines **402–411** — mirrors `business_name` to `users` table.
- Connected: `supabase`, `useAuth`, `uploadStoreLogo`, `nigerianBanks`, `aboutTemplates`, `qrCode`, `socialShare`.

### AI chat

#### `src/components/AIChatWidget.tsx` (≈2266 lines)
The customer-facing chat widget. Mounted on the storefront, landing page, and embedded on multiple in-app surfaces.
- Lines **537–555** — fetches store info by slug: `supabase.from('stores').select('id, user_id, whatsapp_number, wa_fallback_minutes, business_hours, days_of_operation').eq('store_slug', storeSlug)`. Defaults `wa_fallback_minutes` to **2** if missing.
- Lines **840–1025** — the polling loop. Polls `ai_chat_messages` every 3s, slows to 5s after **10 idle polls** (≈30s). Uses `lastMessageTimestampRef.current` and `.gt('created_at', ...)` to fetch only new rows. Has a fallback full-fetch when 3+ polls return nothing (mobile clock skew workaround).
- Lines **956–960** — also polls `ai_chat_conversations.is_agent_active, takeover_status, chat_status` every cycle. Stops polling if `chat_status === 'moved_to_whatsapp'`.
- Lines **882, 909** — message role mapping: `role: msg.is_agent_message ? 'assistant' : (msg.role as 'user' | 'assistant')`.
- Line **884, 911, 866** — **`translated_text` MUST be selected and preserved** in formatted messages. Stripping it broke multilingual takeover before (see Section 8).
- Lines **915–945** — message merge with deduplication: replaces optimistic `isLocal: true` messages with their DB version by matching `role + content.substring(0, 50)`; new messages added only if not already in state by UUID and not a replacement for a local message.
- Lines **1140–1160** — optimistic insert of customer message with `isLocal: true` flag.
- Lines **1192–1217** — fetches store info for AI context including `about_us, delivery_areas, delivery_time, return_policy, whatsapp_number, business_name, address`.
- Lines **1240–1257** — POSTs to `${supabaseUrl}/functions/v1/ai-chat`.
- Lines **1027–...** — `requestHumanAgent()` flips `takeover_status='requested'`, sets `waiting_for_owner_since`, ensures `is_agent_active=false`. Inserts a system message via `ai_chat_messages` with `sender_type: 'customer'`.
- Connected: `supabase`, `useAuth`, `useAppContext`, `chatTrackingService`, `WhatsAppFallbackTimer`, `docSearch`, `smartQuestions`.

#### `src/components/dashboard/ConversationsSimplifiedFixed.tsx` (≈1238 lines)
Owner dashboard at `/conversations`. Lists conversations, lets the owner take over and reply.
- Lines **234–248** — multi-tenant lookup: get `stores.id` for the user, then `from('ai_chat_conversations').select('*, takeover_status, waiting_for_owner_since').in('store_id', storeIds.length > 0 ? storeIds : [user?.uid || ''])`. Falls back to `user.uid` as a synthetic store_id if there's no store row.
- Lines **252–306** — auto-expires conversations: `waiting_for_owner_since > 30 min` flips `is_agent_active=false, takeover_status='ai'`. Agent session > 24h since last message ends it the same way.
- Lines **411–477** — `initiateTakeover()`: pre-checks `is_agent_active`, UPDATEs `is_agent_active=true, agent_id=user.uid, takeover_status='agent_active'`, inserts a system message `'You joined the chat'` (deduped against existing). Updates local state immediately to prevent flicker.
- Lines **480–527** — `sendAgentMessage()` POSTs to `${supabaseUrl}/functions/v1/send-agent-message` with `Authorization: Bearer ${session.access_token}`. Falls back gracefully if no session.
- Lines **530–...** — `endTakeover()` flips `is_agent_active=false, takeover_status='ai'` and inserts the system message `'The agent has left the chat. AI assistant will continue.'` (deduped).
- Connected: `supabase`, `useAuth`, `QuotaAlert`.

#### `src/services/aiUsageService.ts` (210 lines)
- `getAIUsage(userId)` — calls the `check_ai_chat_quota` RPC. Falls back to reading `user_subscriptions` directly if the RPC errors. Returns `{ chatsUsed, chatsRemaining, totalLimit, tierName, isApproachingLimit, hasExhausted, percentageUsed, upgradeMessage, valueMetric }`.
- Tier mapping (line 66) maps lowercase RPC `tier_id` to display name: `free → Free`, `basic → Basic`, `starter → Starter`, `pro → Pro`, `business → Business`.
- Default `totalLimit` when missing: **30** (Free tier).
- "Approaching limit" threshold: `chatsRemaining <= 5 && > 0`.
- `incrementAIUsage(userId)` — UPDATEs `user_subscriptions.ai_chats_used = current + 1`, then INSERTs into `ai_chat_logs`. Returns `false` if quota exhausted.
- `getUpgradeBenefits(currentTier)` — returns hardcoded benefit lists for the upgrade modal.
- ⚠️ **Mismatch with the rest of the app:** the benefit text on line **159** says "🚀 500 AI chats per month (vs 30 now)" but on line **165** says "1,500 AI chats per month (3x more)" for Starter→Pro upgrade. The Pro→Business benefit (line 172) advertises "10,000 AI chats per month" — but Business tier was removed from the UI (see `SubscriptionUpgrade.tsx` and `LandingPage.tsx`, where `VISIBLE_TIER_NAMES = new Set(['Free', 'Starter', 'Pro'])`). This service still references `'Business'` in `tierMapping` and benefits — leave as-is unless the DB tier is actually deleted, but be aware the UI hides it.

#### `src/components/AIUsageCounter.tsx` (205 lines)
Compact AI quota badge in the dashboard header (`compact={true}`). Also has a full-card mode used elsewhere.
- Line **32** — refreshes usage every **30 seconds** via `setInterval`.
- Line **42** — auto-shows the upgrade modal 2s after detecting `isApproachingLimit`.
- Line **75** — title text: `${tierName} Tier: ${chatsUsed} of ${totalLimit} AI chats used this month (${chatsRemaining} remaining)`.
- Line **101** — hides the upgrade link when `tierName === 'Business'` — but Business is no longer a visible tier (see Section 5). For Free → suggests Starter. For Starter → suggests Pro. For anything else → suggests Business (dead link in the new 3-tier world).
- Lines **180–185** — modal hardcodes upgrade prices: Free → ₦5,000/month (₦12,000/year savings); Starter → ₦10,000/month (₦24,000/year savings).
- Connected: `aiUsageService`, `useAuth`, `useNavigate`.

### Pricing & subscription

#### `src/pages/LandingPage.tsx` (≈1344 lines)
Public marketing site at `/`. Pricing section starts around line **869**. Three visible tiers — Free, Starter, Pro. Uses the `PricingToggle` (Monthly/Annual, line 16) and `PricingAmount` (line 45) components. Pro is marked "MOST POPULAR" (line 985) with the tagline "Everything you need to dominate your market" (line 1000).
- Each card has Core Limits, Included Features, and a "Not Included" section listing locked items with `🔒` and a `<span class="locked-tier-pill">` showing which tier unlocks it.
- Annual prices: Starter ₦5,000/mo or ₦48,000/yr; Pro ₦10,000/mo or ₦96,000/yr. (Annual saves 20%.)
- "Online payments" appears as Coming Soon on Starter and Pro.
- Auto-redirects logged-in users to `/dashboard` (unless bot user-agent — line 85).
- Connected: `AIChatWidget`, `useAuth`, `useNavigate`, `LandingPage.css`.

#### `src/components/SubscriptionUpgrade.tsx` (≈1436 lines)
In-app billing page at `/subscription` and `/upgrade`. Loads tier data from Supabase (`subscription_tiers` table, line ~125–135 area), but renders the human-readable feature lists from a hardcoded `TIER_DISPLAY` map (lines **16–124**) so the in-app page stays in lock-step with the landing page.
- Line **127** — `VISIBLE_TIER_NAMES = new Set(['Free', 'Starter', 'Pro'])` filters DB-loaded tiers. Business is intentionally excluded.
- `TIER_DISPLAY[tier].lockedItems` drives the "Not Included" section.
- Pro display uses `badge: 'MOST POPULAR'` and `ctaTagline: 'Everything you need to dominate your market'`.
- Paystack integration: loads `https://js.paystack.co/v1/inline.js`, calls `verify-transaction` and `verify-subscription` edge functions. Backup polling every 5s for up to 2 minutes if `onSuccess` callback doesn't fire.
- Cancellation calls `manage-subscription` edge function and then UPDATEs `user_subscriptions.status='cancelled'`.

### Modal navigation

#### `src/components/MoreMenu.tsx` (365 lines)
"More Features" mobile menu. Uses a **native `<dialog>` element** (line 296) with `dialogRef.current?.showModal()`. Sections: SELL, MANAGE, TRACK, GROWTH, ACCOUNT.
- Line **68** — fetches user tier via `getUserTier(currentUser.uid)` to gate Business Insights. Pro and Business tiers unlock; everyone else sees a "PRO" badge and a `Lock` icon.
- Lines **78–96** — `useEffect` opens the dialog and adds an Escape-key listener.
- Line **296** — `<dialog ref={dialogRef} className="more-menu">` — note the absence of an `onClose` prop. This was deliberate (see Section 4 and Section 8): wiring `onClose={onClose}` causes the parent state to flip `false` whenever the native dialog backdrop is tapped, so on mobile the menu closes during scroll.
- Line **287** — `handleItemClick` closes the dialog and calls `onClose()` then runs the menu item's action.
- Connected: `useNavigate`, `useStaff`, `useAuth`, `getUserTier`, `NotificationBadge`.

### Edge function

#### `supabase/functions/ai-chat/index.ts` (≈3120 lines)
- Imports `getStoreContext`, `searchProducts`, `detectLanguage`, `getLanguageInstruction`, `getLanguageFallback`, `isOffTopic`, `getOffTopicResponse`, `isSpam`, `checkRateLimit`, `trackOffTopicAttempt`, `getRateLimitResponse` from `./store-context.ts`.
- Imports `cachedOpenAICall` from `./cache-helper.ts`.
- Reads env: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Tracks visitor conversation state in-memory via `Map<string, ConversationState>` (`visitorStates`, line 62) — resets when the function cold-starts.
- `trackChatEvent(supabase, eventType, userType, visitorIp, sessionId, userId, contextType, messageCount, metadata)` writes to `chat_analytics`. Wrapped in try/catch — analytics failures never break the chat.
- `checkAndIncrementRateLimit(supabase, visitorIp, limit=7)` — IP-based rate limiting.
- Quota: line **2730** calls `supabase.rpc('check_ai_chat_quota', { p_user_id: storeUserId.toString() })`. **Fail-open**: if the RPC errors, the chat proceeds (intentional — don't block customers on backend issues).
- When quota is exhausted: line **2741+** generates a tier-specific friendly message redirecting to WhatsApp, inserts it into `ai_chat_messages` as `role='assistant'`, returns `{ response, quotaExhausted: true }`.
- The known-good backup is `supabase/functions/ai-chat/index.ts.ux-complete-2026-04-15` (see emergency playbook).

### Memory / context
- `src/contexts/BusinessProfile.jsx` — localStorage-backed profile (`KEY="sh:profile:v1"`). Sets `document.title = "<businessName> — Storehouse"`. Used by `setProfile()` in `BusinessSettings.tsx`.
- `src/lib/supabase-hooks.js` — exports `useUser`, `useStore`, `useStoreActions`, `usePublicStore`, `useProducts`, `useProductActions`, `useSales`, `useSaleActions`, `useDashboardSummary`, `useLowStockProducts`, `useCacheClear`. **All these hooks share a 5-minute in-memory cache** (`CacheManager` class). `useStoreActions.updateStore` calls `cache.invalidate(`store:${userId}`)` on success; `useUser` does NOT invalidate after a `users` update.

---

## Section 3 — Database Traps

### TEXT vs UUID — `stores.user_id`
**`stores.user_id` is `TEXT`, not `UUID`.** The Supabase auth `auth.uid()` returns a UUID. The frontend must send `String(user.uid)` and the RLS policy must compare with an explicit cast: `user_id = auth.uid()::text`.

| File:line | Query | Notes |
|---|---|---|
| `src/components/StoreSettings.tsx:39` | `.eq('user_id', String(user.uid))` | ✅ Coerced |
| `src/components/StoreSettings.tsx:376` | `.eq('user_id', String(user.uid))` | ✅ |
| `src/components/BusinessSettings.tsx:415` | `.eq('user_id', userIdText)` where `userIdText = String(currentUser.uid)` | ✅ |
| `src/lib/supabase-hooks.js:193` | `.eq('user_id', userId)` | Currently passes JS string — works but no defensive coercion |
| `src/components/dashboard/ConversationsSimplifiedFixed.tsx:238` | `.eq('user_id', user?.uid \|\| '')` | Works because empty fallback is also TEXT |

### `users.id` IS UUID
`users.id` matches `auth.users.id` and is a real UUID. But the frontend often sends `String(user.uid)` here too — fine, PostgREST accepts a UUID-formatted string.

### `ai_chat_conversations.store_id` references `stores.id` (UUID)
But there's a multi-tenant fallback: when no `stores` row is returned, the dashboard falls back to using `user.uid` directly as the store_id (`ConversationsSimplifiedFixed.tsx:246`, also in `CLAUDE.md` original docs). This is legacy and means some old conversations have `store_id = <user UUID>` instead of `store_id = <stores.id>`. New code paths should not rely on that equivalence.

### Field naming inconsistencies
- DB column → JS variable conversions are inconsistent:
  - `business_name` → `businessName` (BusinessProfile context, form state) but `business_name` straight through in Supabase queries.
  - `store_slug` ↔ `storeSlug` ↔ `slug` (note: `CLAUDE.md` original calls it `slug`, but the actual column is `store_slug` — confirmed in `AIChatWidget.tsx:1195`, `StoreSettings.tsx:266`).
  - `wa_fallback_minutes` ↔ `waFallbackMinutes` (form state in `BusinessSettings.tsx`).
  - `whatsapp_number` ↔ `whatsappNumber`.
- `currentUser.uid` everywhere = Supabase auth `user.id`. The Firebase-style name is a leftover from the migration.
- `role` column on `ai_chat_messages` has values `'user' | 'assistant' | 'system'`, but the code also reads `is_agent_message` and `sender_type`. **The widget maps:** `role: msg.is_agent_message ? 'assistant' : msg.role` (`AIChatWidget.tsx:882, 909`). If you change one, change the other.
- `takeover_status` enum: `'requested' | 'agent' | 'agent_active' | 'ai' | 'ended'` — used inconsistently. `requestHumanAgent()` writes `'requested'`, dashboard takeover writes `'agent_active'`, expiry writes `'ai'`, and the widget checks `takeover_status === 'agent'` in some places and `=== 'ended'` in others. When in doubt, treat both `'agent'` and `'agent_active'` as "owner is in".

### Cache pitfalls
- `useStore`, `useUser`, `useProducts`, etc. cache for **5 minutes**. The cache lives in module memory in `src/lib/supabase-hooks.js`.
- `useStoreActions.updateStore` invalidates `store:${userId}` — but a direct `supabase.from('stores').update(...)` (like `BusinessSettings.tsx:409` or `StoreSettings.tsx:372`) does **not** invalidate the cache. Other components reading via `useStore(userId)` will see stale data for up to 5 minutes.
- `useUser` is never invalidated after a write to `users`. The `users.business_name` mirror updates work correctly but the cached `useUser` result still reflects the old name until the TTL expires.

### RLS expectation
Per the project's prior fix in `CLAUDE.md`, `ai_chat_messages` SELECT is `USING (true)` (anyone can read), and INSERT requires `auth.uid() IS NOT NULL`. If a customer sees agent messages disappear, suspect RLS first.

---

## Section 4 — Known Bug Patterns

### 4.1 Silent save failure: "shows saved but DB unchanged"
**Pattern.** Component does `await supabase.from('stores').update(...).eq('id', store.id).select().single()`, then shows a success toast in the catch-free branch. If the JWT has expired, the request silently downgrades to the anon role, the RLS policy `user_id = auth.uid()::text` evaluates `NULL` for anon, the WHERE matches zero rows, and `.single()` throws PGRST116 — which the catch block then alerts as a generic "save failed". With `.maybeSingle()`, you get `{ data: null, error: null }` and (if you don't check `data`) the success toast still fires.

**Fix.** Both save flows now follow the pattern:
1. `getSession()` and throw if no `session`.
2. `.update(...).select(...).maybeSingle()`.
3. Check `data === null` separately from `error` — both must throw.
4. Filter writes by `eq('user_id', String(currentUser.uid))` so the WHERE clause matches the RLS predicate exactly.

See `BusinessSettings.tsx:391–434` and `StoreSettings.tsx:347–399` for the canonical implementation.

### 4.2 Two settings panels, only one persists to DB
**Pattern.** `BusinessSettings.tsx` and `StoreSettings.tsx` both look like "the settings page". `BusinessSettings.tsx` is the one actually rendered (modal at `App.jsx:5520`). `StoreSettings.tsx` is imported but never mounted. If you fix a bug in `StoreSettings.tsx` thinking that's the user-facing settings, the user won't see the change.

**Fix.** When the spec says "the settings page", it almost certainly means `BusinessSettings.tsx`. Confirm by grepping for the toast string the user sees.

### 4.3 Stale cache after direct Supabase writes
**Pattern.** A component writes directly to `supabase.from('stores').update(...)` (bypassing `useStoreActions.updateStore`). Other components reading via the cached `useStore(userId)` hook show the old value for up to 5 minutes.

**Fix.** Either go through `useStoreActions.updateStore` (which invalidates), or after a direct write, dispatch a refresh event the way `BusinessSettings.tsx:491` does (`window.dispatchEvent(new Event('storehouse:refresh-dashboard'))`) and have the affected components listen for it. For `users.business_name` mirror writes, accept that `useUser` will be stale until TTL — that's why the dashboard header reads `stores.business_name` first (which is uncached after going through `useStoreActions`).

### 4.4 Polling race conditions / duplicate messages in chat
**Pattern.** `ai_chat_messages` polled every 3s with `.gt('created_at', lastTimestamp)`. If the local optimistic insert is added to state, then the DB-version arrives via the next poll, the same message renders twice. Made worse by mobile clock skew — the timestamp cursor advances faster than DB writes land.

**Fix.** Three things in `AIChatWidget.tsx`:
- Optimistic messages get `isLocal: true` (line 1150).
- The poll merge replaces matched local messages by `role + content.substring(0, 50)` (lines 919–927).
- If 3+ polls find nothing AND ≤1 non-local message in state, do a full-fetch fallback (lines 860–890).

### 4.5 Native `<dialog>` closes on mobile backdrop tap
**Pattern.** A native HTML `<dialog>` opened with `showModal()` will fire its `close` event when the user taps outside the dialog (the backdrop). If the React component wires `onClose={onClose}` on the `<dialog>`, scrolling on mobile (which momentum-taps the backdrop) closes the menu mid-scroll.

**Fix.** Don't wire the dialog's native `onClose` to the React parent's close prop. `MoreMenu.tsx:296` deliberately does `<dialog ref={dialogRef} className="more-menu">` with no `onClose` prop. The menu only closes via the X button (`handleItemClick` on line 287) or Escape (line 81–86).

### 4.6 RLS allows UPDATE but blocks the post-UPDATE SELECT
**Pattern.** A row gets updated successfully but `.select().single()` returns nothing because RLS denies the SELECT clause. Code throws PGRST116 even though the write succeeded.

**Fix.** Use `.maybeSingle()` so this returns `data: null, error: null` — then the code can either trust the write or refetch separately. Both `BusinessSettings.tsx:417` and `StoreSettings.tsx:378` use `maybeSingle`.

### 4.7 Conversations stuck "waiting for owner" forever
**Pattern.** Customer hits "Talk to Store Owner", `takeover_status='requested'` and `waiting_for_owner_since=NOW()`. Owner never responds; the conversation stays in a perpetual waiting state, polluting the dashboard.

**Fix.** `ConversationsSimplifiedFixed.tsx:255–273` auto-expires after 30 minutes — UPDATEs `waiting_for_owner_since=null, is_agent_active=false, takeover_status='ai'`. Active agent sessions auto-expire after 24h since last message (lines 276–301).

### 4.8 `translated_text` stripped during message formatting
**Pattern.** Multilingual customer (e.g. Hausa) sends a message; agent takes over and replies. The agent reply has `translated_text` in the DB but the widget renders the original English. Cause: a `messages.map(...)` step somewhere formatted messages without preserving `translated_text`.

**Fix.** Every formatter MUST include `translated_text` (and ideally `detected_language`). See `AIChatWidget.tsx:884, 911` — both formatters explicitly pass `translated_text: msg.translated_text`. The `select('*, detected_language, translated_text')` at line 866 is also explicit (the `*` may not return generated/computed columns reliably).

### 4.9 Multi-tenant "no conversations shown" on dashboard
**Pattern.** Owner has no `stores` row yet (or `store_id` was set to `user_id` in legacy data). A query `from('ai_chat_conversations').in('store_id', stores.map(s => s.id))` returns nothing because `stores.map` is empty.

**Fix.** `ConversationsSimplifiedFixed.tsx:246` uses `.in('store_id', storeIds.length > 0 ? storeIds : [user?.uid || ''])` — falls back to the user UID as a synthetic store_id, which catches legacy data.

---

## Section 5 — Pricing & Quota System

### Tier shape (from `subscription_tiers` table)
Loaded from DB by `SubscriptionUpgrade.tsx`. Display-only metadata (feature lists, badges, "Not Included" lists) is **hardcoded** in `TIER_DISPLAY` (`SubscriptionUpgrade.tsx:16–124`) and mirrored on the landing page in `LandingPage.tsx:880–1023`.

### Visible tiers: Free, Starter, Pro
| Tier | Price | Products | Images | Team | AI chats/mo |
|---|---|---|---|---|---|
| Free | ₦0 | 30 | 1 | 1 (owner only) | 30 |
| Starter | ₦5,000/mo or ₦48,000/yr | 200 | 3 | 3 (owner + 2) | 500 |
| Pro | ₦10,000/mo or ₦96,000/yr | Unlimited | 5 | 10 (owner + 9) | 1,500 |

Annual saves 20%. Pro is the "MOST POPULAR" tier with tagline "Everything you need to dominate your market" (`LandingPage.tsx:985, 1000` and `SubscriptionUpgrade.tsx:101–102`).

**Business tier (₦15,000) was removed from UI.** `VISIBLE_TIER_NAMES = new Set(['Free', 'Starter', 'Pro'])` in `SubscriptionUpgrade.tsx:127` filters it out. But `aiUsageService.ts` still references `'Business'` in `tierMapping` (line 71), the `Business` upgrade-benefits list (line 172), and the `'Free' \| 'Starter' \| 'Business'` cost dictionary (line 202). If Business is fully retired, these are dead but harmless.

### Quota enforcement
- **Where it's checked at chat time:** the `ai-chat` edge function calls `supabase.rpc('check_ai_chat_quota', { p_user_id: storeUserId.toString() })` at line **2730**. The RPC returns `{ allowed, tier, chats_used, chat_limit, chats_remaining, ... }`.
- **What happens when exhausted:** edge function lines **2741–2755** generate a tier-specific friendly message that redirects the customer to WhatsApp (using `stores.whatsapp_number` and `stores.address`), inserts it into `ai_chat_messages` as `role='assistant'`, and returns `{ response, quotaExhausted: true }` to the widget.
- **Fail-open behavior (intentional):** if the RPC errors, the edge function logs and continues — customers are NEVER blocked from chatting because of a backend issue (line 2733).
- **Where the badge gets data:** `AIUsageCounter` (header, mounted in `App.jsx:4103`) calls `getAIUsage(currentUser.uid)` from `aiUsageService.ts:24`, which calls the same `check_ai_chat_quota` RPC. Refreshes every 30s.
- **Where usage gets incremented (in-app side):** `aiUsageService.incrementAIUsage(userId)` UPDATEs `user_subscriptions.ai_chats_used` and inserts a row into `ai_chat_logs`. Note: the storefront chat path goes through the edge function, which presumably increments via the RPC server-side — `incrementAIUsage` is for in-app AI chats.
- **Approaching-limit auto-modal:** triggers when `chatsRemaining <= 5 && > 0`, opens the upgrade modal 2s after detection (`AIUsageCounter.tsx:42`).

### Tier-name mapping (lowercase RPC ID → display name)
`aiUsageService.ts:66`:
```ts
{ free: 'Free', basic: 'Basic', starter: 'Starter', pro: 'Pro', business: 'Business' }
```

### Upgrade flow
- `SubscriptionUpgrade.tsx` loads the Paystack inline.js (line 200), calls `verify-transaction` after `onSuccess`, polls `verify-subscription` every 5s for up to 2 minutes as a backup.
- Cancellation: `manage-subscription` edge function with `{ action: 'cancel', subscriptionCode: payment_reference }`, then UPDATEs `user_subscriptions.status='cancelled', cancelled_at=NOW()`.

---

## Section 6 — AI Chat System

### Components in the flow
1. **`AIChatWidget.tsx`** (customer side) — mounted on `/store/:slug` storefront, also on landing page and in-app help.
2. **`ai-chat` edge function** — Deno function that calls OpenAI, enforces rate limits + quota, writes messages.
3. **`ConversationsSimplifiedFixed.tsx`** (owner side) — dashboard at `/conversations`, lists conversations and lets the owner take over.
4. **`send-agent-message` edge function** — invoked when an authenticated owner sends a reply (so the message uses the owner's auth context).
5. **`WhatsAppFallbackTimer.tsx`** — countdown shown to the customer when no agent picks up; opens `wa.me/<store_whatsapp>` link.
6. **`OwnerNotificationManager` / `NotificationBadge`** — surfaces "waiting customer" badges in the dashboard.

### Data flow on a single customer message
1. Widget appends optimistic message to local state with `isLocal: true`.
2. Widget POSTs to `${supabaseUrl}/functions/v1/ai-chat` with `{ message, contextType: 'storefront', storeSlug, sessionId, storeInfo, ... }`. Auth: `Bearer ${session.access_token || supabaseAnonKey}` + `apikey: supabaseAnonKey`.
3. Edge function:
   - Resolves `store_id` from `store_slug` via `getStoreContext`.
   - Detects language from `message` and conversation history.
   - Checks rate limit (per-IP, default 7).
   - Checks monthly quota via `check_ai_chat_quota` RPC. Fail-open on error.
   - If `is_agent_active` or `takeover_status='requested'` → still inserts the user message but returns a placeholder so AI doesn't reply (lines 2580–2608).
   - Otherwise calls OpenAI via `cachedOpenAICall` with the language-tuned system prompt + RAG docs + store info.
   - INSERTs assistant message into `ai_chat_messages` with `role: 'assistant'`, `store_id`.
   - Tracks the event in `chat_analytics`.
   - Returns `{ response, conversationId, ... }`.
4. Widget polling (3s) picks up the new row from `ai_chat_messages` via `.gt('created_at', lastTimestamp)`, dedupes against the optimistic message, renders.

### Takeover sequence
1. Customer clicks "Talk to Store Owner" → `requestHumanAgent()` (`AIChatWidget.tsx:1027`):
   - UPDATEs `ai_chat_conversations`: `takeover_status='requested', waiting_for_owner_since=NOW(), is_agent_active=false`.
   - INSERTs a system message with `sender_type='customer'`.
2. Owner dashboard polls and shows the conversation in the "Waiting" tab.
3. Owner clicks "Take over" → `initiateTakeover()` (`ConversationsSimplifiedFixed.tsx:411`):
   - Pre-checks `is_agent_active` (avoids race condition).
   - UPDATEs: `is_agent_active=true, agent_id=user.uid, takeover_status='agent_active'`.
   - INSERTs deduped system message `'You joined the chat'` with `sender_type='system'`.
   - Updates local state immediately so the button doesn't flicker.
4. Owner sends replies → POST `send-agent-message` edge function with `{ conversationId, message, agentId }`.
5. Customer's polling detects `is_agent_active === true` (or `takeover_status === 'agent'`) and renders agent messages.
6. Owner ends takeover → `endTakeover()`:
   - UPDATEs: `is_agent_active=false, takeover_status='ai'`.
   - INSERTs deduped system message `'The agent has left the chat. AI assistant will continue.'`.

### Translation
- Customer messages have a `detected_language` column. Replies from an agent are translated server-side (presumably by `send-agent-message`) and stored in `translated_text`.
- The widget chooses what to render based on the customer's language. **Every `messages.map()` formatter in `AIChatWidget.tsx` must include `translated_text`** — otherwise the customer sees the original English. See bug pattern 4.8.

### WhatsApp fallback
- `stores.wa_fallback_minutes` (default 2 if unset, per `AIChatWidget.tsx:547`) controls the timer.
- `WhatsAppFallbackTimer.tsx` polls `is_agent_active` every 3s; if the owner takes over, the timer is cancelled and the fallback prompt is hidden.
- When the timer expires, the customer sees a modal with `wa.me/<whatsapp_number>?text=<context>` and the conversation flips to `chat_status='moved_to_whatsapp'`. Polling stops on that state (`AIChatWidget.tsx:988–991`).

### Notifications
- `services/ownerNotificationService.ts` — `checkForWaitingCustomers()`, `playNotificationChime()`, `requestNotificationPermission()`.
- `WaitingCustomerBanner` component (mounted in `App.jsx`) plays sound + shows the banner when there are waiting conversations.

---

## Section 7 — Deployment Rules

These mirror the rules in `CLAUDE.md` (which is the canonical version). When in doubt, reread the playbook there.

### Pre-deploy (every time, no exceptions)
1. **Save state.** `git status` to confirm the working tree is intentional. Either `git stash` or `git commit -m "WIP: <reason>"` before changing anything that could break.
2. **Integrity check.** `npm run check:chat` MUST pass (the script lives in `package.json`; it greps for the chat-widget patterns we know are load-bearing).
3. **Build.** `npm run build` MUST complete without errors. Watch for TypeScript and missing-import errors at the top of the output.
4. **Test locally if possible.** Hit the specific feature you changed. Open the browser console — ANY red errors are blockers.

### Deploy
5. `vercel --prod --force --yes` for the frontend. `--force` bypasses Vercel's build cache; `--yes` skips interactive prompts.
6. For edge functions: `supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl` (replace function name as needed).

### Post-deploy
7. Hit `https://smartstock-v2.vercel.app` in a fresh tab. Run the **Pre-Deploy Checklist** at the bottom of `CLAUDE.md` (record sale → storefront chat → Hausa message → Talk to Store Owner → take over → More Features → Business Insights → WhatsApp share → AI badge).
8. Watch the browser console while testing. Service Worker must report a new version (Application tab → Service Workers).

### Rollback procedures
- **Frontend broken:** Vercel → Deployments → find last working → "Promote to Production". Done in 10s, no code change.
- **Edge function broken:** `cp supabase/functions/ai-chat/index.ts.ux-complete-2026-04-15 supabase/functions/ai-chat/index.ts && supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl`.
- **Local regression:** `git stash pop` (if you stashed) or `git reset --hard HEAD~1` (if you committed). Then rebuild + redeploy.
- **Database broken:** STOP. Contact Supabase support. Do NOT run `DELETE` or `UPDATE` without a `WHERE` clause.
- **Everything broken:** `git checkout v1.0-stable -- . && npm run build && vercel --prod --force --yes && supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl`.

### Successful deploy → commit
`git add -A && git commit -m "✅ [FIX/FEATURE/UPDATE]: <one-line description>"`. Don't batch unrelated changes into one commit — rollback granularity is your friend.

---

## Section 8 — Never Do List

Things that have broken Storehouse before. Each one cost real downtime.

1. **NEVER add `onClose={onClose}` to the `MoreMenu.tsx` `<dialog>` element.** The native dialog's `close` event fires on mobile backdrop tap, which fires during scroll. The menu closes mid-scroll. See bug 4.5 and `MoreMenu.tsx:296`.

2. **NEVER strip `translated_text` from message formatters in `AIChatWidget.tsx`.** Every `messages.map(msg => ({ ... }))` must explicitly include `translated_text: msg.translated_text`. Multilingual takeover breaks silently otherwise. See bug 4.8.

3. **NEVER use `.single()` on UPDATE-then-SELECT calls when RLS is involved.** Use `.maybeSingle()` and check `data === null` separately. Otherwise a successful UPDATE that fails RLS-on-SELECT throws a confusing PGRST116. See bug 4.6.

4. **NEVER trust `await supabase.from('stores').update(...)` without a `getSession()` check first.** An expired JWT silently downgrades to anon, RLS returns zero rows, no error. The save UI says "saved" but the DB is unchanged. See bug 4.1 and the canonical fix in `BusinessSettings.tsx:391–434`.

5. **NEVER assume `stores.user_id` is UUID.** It is `TEXT`. Always send `String(user.uid)` and write RLS as `user_id = auth.uid()::text`.

6. **NEVER write to `stores` directly without invalidating `useStore`'s cache.** Either use `useStoreActions.updateStore` (which calls `cache.invalidate(`store:${userId}`)`) or dispatch `window.dispatchEvent(new Event('storehouse:refresh-dashboard'))` and have consumers refresh. Otherwise other components show stale data for up to 5 minutes.

7. **NEVER add a second message-insertion site for the chat widget.** All assistant message inserts must come from the `ai-chat` edge function. A previous regression had `ChatTracking` service ALSO inserting AI responses, causing duplicates. See `CLAUDE.md` v1.5 changelog.

8. **NEVER skip `npm run check:chat` before deploying.** It exists specifically to catch the dedup-regression patterns above.

9. **NEVER run `DELETE` or `UPDATE` against the production database without a `WHERE` clause.** Per the emergency playbook — there is no "undo" without Supabase support.

10. **NEVER use WebSockets / Supabase realtime for `ai_chat_messages`.** This project deliberately uses polling because of free-tier limits. Switching back to realtime breaks at scale. See `CLAUDE.md` v1.4 changelog.

11. **NEVER fall back to "Storehouse" as the dashboard business name.** The header chain is `stores.business_name → users.business_name → "My Store"`. "Storehouse" is the app brand, not the user's store. See `App.jsx:142–145` and `Dashboard.tsx:107`.

12. **NEVER rely on `BusinessProfile` localStorage as the source of truth for `business_name`.** It survives a refresh in the same tab/device but doesn't survive a logout-on-another-device. The DB (`stores.business_name`, mirrored to `users.business_name`) is the source of truth. localStorage is a cache.

13. **NEVER bypass the multi-tenant store lookup in conversation queries.** Always query `stores` by `user_id` first, then `ai_chat_conversations.in('store_id', storeIds.length > 0 ? storeIds : [user.uid])`. The fallback to `user.uid` is for legacy rows; new code should still set `store_id` to the real `stores.id`.

14. **NEVER amend committed deploys with `git commit --amend` once they are pushed to production.** Always create a new forward commit so rollback (`git reset --hard HEAD~1`) keeps working as a single-step undo.

15. **NEVER skip hooks (`--no-verify`, `--no-gpg-sign`).** If a pre-commit hook fails, fix the underlying issue. Bypassing has caused at least one of the regressions above.

---

## Files this doc was built from
Read on the date of this writing:
- `src/App.jsx`
- `src/components/StoreSettings.tsx`
- `src/components/AIChatWidget.tsx`
- `src/components/AIUsageCounter.tsx`
- `src/services/aiUsageService.ts`
- `src/components/MoreMenu.tsx`
- `src/pages/LandingPage.tsx`
- `src/components/SubscriptionUpgrade.tsx`
- `src/components/dashboard/ConversationsSimplifiedFixed.tsx`
- `supabase/functions/ai-chat/index.ts` (first 100 lines + targeted sections around quota check)
- `src/components/BusinessSettings.tsx`
- `src/components/Dashboard.tsx`

Cross-referenced with `CLAUDE.md`. When the code drifts, update both.
