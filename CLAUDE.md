# Storehouse — Working Agreement & Current State

> **Read this file first, every session.** It is the single source of truth for how to
> work in this repo and what the system looks like right now. It is a **current-state**
> document, not a changelog. Full session-by-session history (chat widget, Paystack
> Sessions 1–11) lives in `CLAUDE.archive.md`.
>
> Storehouse is a **live payments app for real Nigerian merchants.** Treat every change
> accordingly.

---

## How to work (behavioural principles)

1. **Think before coding.** State your assumptions out loud. If the task is ambiguous,
   present options and **ASK** rather than guess. Surface tradeoffs. If something is
   confusing or contradictory, **stop and name it** — do not run with a wrong
   interpretation and build on top of it.

2. **Simplicity first.** Write the minimum code that solves the actual problem. No
   speculative abstractions, no "flexibility" nobody asked for, no error-handling for
   cases that cannot occur. If 200 lines could be 50, rewrite it as 50.

3. **Surgical changes.** Touch only what the task requires. Do **not** "improve" adjacent
   code, comments, or formatting. Match the existing style. Only remove dead code that
   **your** change orphaned. Never delete pre-existing code you don't fully understand —
   investigate it first (git blame, trace the call path) and surface what you find.

4. **Verify before done.** Define a concrete pass/fail success check up front and **prove
   it**. This project has no full test suite, so "verify" means **live positive + negative
   proof**, not "write tests first":
   - positive: do the action and watch the right thing happen (record a sale → it persists
     and displays correctly);
   - negative: attempt the failure and watch it be rejected (submit a duplicate
     `client_sale_id` → DB rejects it as a silent no-op).
   For multi-step work, state a brief plan with a verify step **per stage** and stop at
   each boundary.

5. **Production-money discipline.** This is a live payments app handling real merchants'
   money. Before **any** change to a core path (sales recording, payments, money math,
   migrations):
   - **draft first** and show the diff for approval;
   - apply the **smallest scoped** change;
   - keep a named **rip-cord** (the exact `git checkout`/revert command);
   - **test locally** before deploying;
   - deploy only after the pre-deploy gates pass.
   Past assistance is **not** authorization to skip review. Approval in one context does
   not extend to the next.

6. **Trust reality over this doc.** Always start by reading this file — but when a fact
   here conflicts with what you find live (code, DB, deployed behaviour), **verify live
   and trust reality.** Then flag the stale line so it can be corrected.

---

## Project operating rules

### Deployment gates (run every time, in order)
1. Before any changes: `git commit` (or `git stash`) current state — have a known-good point.
2. Run `npm run check:chat` — **must pass** (critical checks; 3 known non-critical warnings are OK).
3. Run `npm run build` — **must pass**, no errors.
4. Test locally — exercise the specific feature changed; check the browser console.
5. Deploy. **Primary path: `git push` to `origin/main` → Vercel auto-deploys** (the repo is
   git-integrated). Manual fallback: `vercel --prod --force --yes`.
6. Test on production immediately — verify the feature, check the console, confirm the
   service worker updated.
7. If broken: roll back (`git revert`/`git reset`, or Vercel → promote last good deploy)
   and redeploy. If working: commit with a clear message.

- **Never skip `npm run check:chat`** — it guards the chat dedup invariants.
- **Service worker caches aggressively.** A new deploy may serve the old bundle to existing
  tabs until the SW updates — verify in a fresh tab.

### Edge-function deploy gates (run every time an edge function is deployed)
`supabase functions deploy` **defaults to `verify_jwt=true`** and silently flips the flag
on every deploy. For a **webhook/public-facing** function (`paystack-webhook-router`,
`paystack-subaccount-webhook`, `whatsapp-webhook`, any Paystack/provider callback), `true`
makes the Supabase **gateway reject the request before your code runs** — Paystack sends no
JWT, so 100% of live webhook traffic 401s at the gateway and money events never process.
This is a P0 that produces **no error in your logs** (the code never executes). It fires on
**every** deploy, so it is a checklist, not prose:

1. **`--no-verify-jwt` is MANDATORY** on any webhook/public-facing edge function deploy:
   ```
   supabase functions deploy <fn> --no-verify-jwt --project-ref yzlniqwzqlsftxrtapdl
   ```
   (Auth'd functions called with a user JWT — e.g. `create-*`, `verify-*` invoked from the
   app — keep `verify_jwt=true`. `create-paystack-subaccount` is the exception: it verifies
   the JWT *in code*, so it is deployed `--no-verify-jwt`.)
2. **READ THE FLAG BACK from the management API post-deploy — never assume the CLI applied
   it.** Report the value:
   ```
   curl -sS "https://api.supabase.com/v1/projects/<ref>/functions/<fn>" \
     -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
     | python3 -c "import sys,json;d=json.load(sys.stdin);print('verify_jwt=',d['verify_jwt'])"
   ```
   Then live-probe: a no-auth-header POST must return the **function's** response
   (`bad_signature`), NOT the gateway `UNAUTHORIZED_NO_AUTH_HEADER`. Those look alike and
   mean opposite things.
3. **RECORD the before-state of the flag BEFORE any redeploy of a money-path function**, so
   drift is detectable after. If you can't produce the before-value, you cannot claim the
   deploy didn't change it.

> Incident 2026-08-02 (see LEARNINGS.md): `paystack-webhook-router` was redeployed without
> `--no-verify-jwt`; the gateway then 401'd all Paystack traffic before the code ran. Caught
> only by an unrelated verification curl, not by process. Zero realized impact solely because
> no checkout traffic hit the ~1h26m window. **Deploy flags are part of the deploy.**

### Safe migrations (migration drift is real — `db push` is UNSAFE)
- Recorded migrations in `supabase_migrations.schema_migrations` lag the local
  `supabase/migrations/` directory (~30 recorded vs ~48 local). `supabase db push` would
  try to replay the backlog and **fail** (some `CREATE POLICY` lack `IF NOT EXISTS`).
- **Apply new migrations via direct psql**, then record them:
  ```
  psql "$(cat ~/.supabase-paystack-dburl)" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql
  psql "$(cat ~/.supabase-paystack-dburl)" -c \
    "INSERT INTO supabase_migrations.schema_migrations (version, name, statements) \
     VALUES ('<ver>', '<name>', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING;"
  ```
  Keep the migration as a tracked file in `supabase/migrations/` regardless.
- Wrap each migration in `BEGIN; … COMMIT;` so a failure rolls back cleanly.
- A dedicated **migration-reconciliation cleanup is owed** (`supabase migration repair
  --status applied <version>` for each drifted version) before merchant #2 / a fresh-env rebuild.

### DB access (read/write production directly via psql)
- Connection string is at `~/.supabase-paystack-dburl` (chmod 600). Prod project ref:
  `yzlniqwzqlsftxrtapdl`.
- Pattern: `psql "$(cat ~/.supabase-paystack-dburl)" ...` — **never** echo the URL, never
  commit it, never paste it into chat.
- For destructive or write probes, prefer `BEGIN; … ROLLBACK;` to prove behaviour without
  persisting. **Never** run `DELETE`/`UPDATE` without a `WHERE` clause. Scope deletes to
  exact ids and get approval first.

### Timestamps & WAT
- **Invariant:** all new timestamp columns MUST be declared `TIMESTAMPTZ`, never plain
  `TIMESTAMP`. (Plain `timestamp without time zone` caused a ~60-minute BST skew before the
  2026-05-02 conversion of 39 columns across 14 tables.)
- **Business dates display in WAT (Africa/Lagos).** Instant-based date displays must pin
  `timeZone: 'Africa/Lagos'`; the local day-key helper is `localDayKey()`. The
  timestamptz migration fixed *storage*, not *display* — display-side TZ is a separate
  concern. `src/utils/ajoDates.ts` is the WAT-safe reference for calendar-date logic.

### Module resolution
- Duplicate-basename modules (`x.js` + `x.ts`) are forbidden — Vite resolves `.js` first.
  Delete or rename; never let two copies coexist.

### Emergency playbook
- **Frontend broken:** Vercel → Deployments → find last working deploy → **Promote to
  Production** (fixes in ~10s, no code change).
- **Edge function broken:**
  ```
  cp supabase/functions/ai-chat/index.ts.ux-complete-2026-04-15 supabase/functions/ai-chat/index.ts
  supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl
  ```
- **generate-business-summary broken** (BOOT_ERROR / boot regression):
  ```
  cp supabase/functions/generate-business-summary/index.ts.v1.2.3-stable supabase/functions/generate-business-summary/index.ts
  supabase functions deploy generate-business-summary --project-ref yzlniqwzqlsftxrtapdl
  ```
- **Database broken:** contact Supabase support immediately. Do NOT run `DELETE`/`UPDATE`
  without a `WHERE` clause.
- **Everything broken:**
  ```
  git checkout v1.0-stable -- .
  npm run build && vercel --prod --force --yes
  supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl
  ```

### Pre-deploy smoke checklist (manual, before a release)
```
[ ] Record a sale — correct price, no duplicate, appears immediately (no refresh)
[ ] Open storefront — AI chat responds
[ ] Send Hausa message — responds in Hausa
[ ] Click "Talk to Store Owner" — notification appears on dashboard
[ ] Take over chat — translation shows
[ ] Open More Features — all items clickable, modal stays open
[ ] Open Business Insights — page loads (Pro tier only)
[ ] Share store on WhatsApp — link works
[ ] Check AI badge — shows correct X/Y count
```

### Paystack setup (facts, not history)
- **Architecture:** Paystack **Subaccounts** with per-transaction `transaction_charge`
  (no marketplace approval needed). Money tables: `orders`, `order_items`,
  `paystack_subaccounts`, `vendor_kyc`, `bank_accounts`, `paystack_split_transactions`,
  `paystack_webhook_events`, `platform_fee_config`, `vendor_velocity_limits`.
- **Gating chain (ALL must pass for card payments):** global `ENABLE_PAYSTACK_SUBACCOUNTS`
  env flag · per-store `paystack_subaccounts_enabled` · KYC approved · 24h cooling period ·
  `frozen=false`.
- **Locked pricing — verify CODE enforces this SERVER-SIDE:**

  | Tier    | Subscription | Customer fee | Storehouse share | Paystack share | Monthly cap |
  |---------|-------------|--------------|------------------|----------------|-------------|
  | Free    | ₦0          | 2.5%         | 1.0%             | 1.5%           | ₦500,000/mo |
  | Starter | ₦5,000      | 2.0%         | 0.5%             | 1.5%           | Unlimited   |
  | Pro     | ₦10,000     | 1.5%         | 0%               | 1.5%           | Unlimited   |

  - Per-transaction Storehouse fee cap: **₦10,000** (all tiers).
  - High-value review threshold: **₦500,000 / transaction**.
  - Velocity caps: **₦200,000/day days 1–7** after KYC; **₦500,000/day days 8–30**.
    (The band-escalation cron is **not built** — vendors are pinned at the ₦200K cap until
    it is. Fails safe.)
- **Money math is integer kobo, always.** Float arithmetic on money is a P0.
  - `percentage_charge` sent to Paystack is a **JSON Number** (`basis_points / 100`),
    never a string.
  - F3 customer-absorb formula: `customer_total = (subtotal + flat) / 0.985`, flat ₦100
    above ₦2,500; `transaction_charge = storehouseTake + paystackFee`.
- **Reviewer UUID** (hardcoded by design, scoped to SELECT/UPDATE): Paul =
  `dffba89b-869d-422a-a542-2e2494850b44`. Founder store: slug `osayi`, store_id
  `d93cd891-7e0a-47a8-9963-5e2a00a2591f`.
- **`BYPASS_KYC_FOR_SMOKE`** edge secret can skip KYC + cooling — it MUST be absent in prod.

---

## Current state & critical gotchas (as of 2026-07-30)

- **Paystack LIVE cutover (2026-07-30):** `PAYSTACK_SECRET_KEY` is a **live** `sk_live_`
  key (confirmed live since ~2026-06-04; digest unchanged across rotation attempts).
  Founder store `d93cd891-…` is **live**: `paystack_test_mode=false`, live subaccount
  `ACCT_j2pfrv87o50gp62` (bank 050 = **Ecobank**, acct ····438, 0% split = Pro tier),
  `active=true`. The old test subaccount `ACCT_l6okid3gb94w1r6` ("F2 Smoke Test") was
  deleted. Webhook `paystack-webhook-router` registered in Paystack **Live** settings.
  Live storefront checkout is fully open (gate chain proven via 412→400 probe).
- **SEC-09 (LIVE, 2026-07-30):** `user_subscriptions` writes are **service-role only** —
  revoked INSERT/UPDATE/DELETE/TRUNCATE from anon+authenticated and dropped the
  unrestricted "Users can update own subscription" UPDATE policy (it had no WITH CHECK,
  letting any user self-upgrade tier + 0% their own card fees). SELECT policy retained.
  Signup free-tier row still works (SECURITY DEFINER trigger). Proven: authenticated
  PostgREST self-upgrade → `403 permission denied`.
- **Subscription rail — key facts:** plan popup is **card-only** (`channels:['card']`) —
  a bank-transfer against a Paystack Plan creates NO subscription object (no reusable
  auth), so nothing activates/renews the tier (2026-07-30 incident: paid ₦5k transfer,
  user stuck Free). Webhook subscription handlers resolve the user via
  `metadata.user_id` (verified to own the payer email) then `public.users` by email —
  the old `public.profiles` lookup was dead (**that table does not exist in prod**), so
  every subscription webhook silently no-opped. A prepaid-transfer branch + expiry cron
  are **deferred, not built**. There is **no subscription-expiry cron**; feature gating
  reads `status` only, and tier-resolver falls to `free` 7 days after `current_period_end`.
- **TEMPORARY Blossom webhook-forward bridge (2026-08-02):** one Paystack business serves
  **both Storehouse and Blossom**; Paystack allows one Live webhook URL and it points at
  Storehouse's `paystack-webhook-router`. The router forwards **Blossom-bound events**
  (server-set `BLS_` reference prefix; Storehouse uses `ord_`/native, provably disjoint)
  **byte-for-byte** (original raw body + original `x-paystack-signature`) to Blossom's own
  router `https://lmmznmywiwjyfyvgarof.supabase.co/functions/v1/paystack-webhook-router`.
  Failure → non-200 so Paystack retries (409 marker-disagreement, 502 Blossom-down); never
  200-drops a Blossom event, never touches Storehouse state. Observability in
  `blossom_forward_log` (NOT `paystack_webhook_events`, to avoid foreign-ref collisions).
  Code: `_shared/blossom-bridge.ts` + the branch in `paystack-webhook-router/index.ts`.
  **DELETION TRIGGER (no fixed date):** delete the whole bridge when the **first non-Paul
  school completes CARD-PAYMENTS onboarding (creates a Paystack subaccount)** — Blossom then
  moves to its own Paystack business. Merely signing up for Blossom, or a cash/claims-only
  school, does **not** trigger removal (no shared-business exposure). The onboarding path
  `create-paystack-subaccount` carries the same reminder at the RPC that fires the trigger.
  **DEPLOY GATE:** inert until Blossom's router is configured (`PAYSTACK_ENABLED=true` +
  shared `sk_live_` `PAYSTACK_SECRET_KEY`) and a bogus-signature curl returns
  **401 `bad_signature`** from the function (not 503 `not_configured` — the dark-gate — and
  not a gateway 401 / 404). See `docs/follow-ups.md`.
- **SECRET ROTATION — in progress (P0):** the Supabase **service-role JWT was committed
  to ~90 tracked files** (one-off scripts + 2 `public/*.html` that shipped to the
  browser). All deleted/redacted 2026-07-30, but the key is **live in git history** and
  must be revoked. **Chosen path: migrate-and-disable (not JWT-secret roll).** The project
  already has **new-style keys** provisioned (`sb_publishable_web`/`_mobile`, secret
  `backend_api` — provenance unknown, left untouched, flagged for deletion). Plan: point
  edge functions at a **freshly created** `sb_secret` (NOT backend_api) + frontend at
  `sb_publishable_web`, then **disable the Legacy API keys tab** — this revokes the leaked
  legacy service_role AND legacy anon with **no JWT-secret roll, no session wipe, no
  restart**. Verified consumers on legacy keys: frontend (anon, Vercel + `.env.local`),
  edge (service_role, auto-injected). API request logs (14-day) show **no unexplained
  legacy consumer** — Mac Mini pipelines confirmed not calling this API. After disable,
  both leaked legacy keys must return 401 (two-sided verify).
- **APK dies on legacy disable (expected/OK):** the shipped Dec-2025 Play Store APK embeds
  the **legacy anon key** and will 401 after disable. Acceptable — unlaunched, ~320
  commits stale, only Paul's test installs. **The future mobile rebuild (OFF-04) MUST use
  `sb_publishable_mobile`, not a legacy anon JWT.**
- **Cron reports dead (pre-existing, unrelated):** both pg_cron jobs (`hourly-whatsapp-
  reports`, `send-daily-whatsapp-reports`) target `send-daily-reports` and have returned
  401 since 2026-05-01 — neither sends the required `x-cron-secret` header. Out of scope
  for the key migration; fix as its own task (and dedupe the two redundant jobs).

## Prior state & critical gotchas (as of 2026-06-11)

- **Vercel — one repo, many projects (cost leak):** the account
  (`pauls-projects-cfe953d7`) has **6 projects** (verified `vercel projects ls`,
  2026-06-11): `smartstock-v2`, `my-web-app`, `my-web-app-7uaw`, `my-web-app-r9gf`,
  `my-web-app-1i8l`, and `founder-web`. **`smartstock-v2` is the live storefront — it
  serves `https://www.storehouse.ng`.** The four `my-web-app*` projects all redeploy within
  ~3 minutes of every push to `smartstock-v2` (a 5-way git fan-out wasting builds on the
  free tier). `founder-web` is the separate founder-dashboard frontend (leave it). **Action:
  untangle the 4 redundant `my-web-app*` projects down to just `smartstock-v2`** — but
  confirm none of them is itself wired to a live domain before deleting. (Note: this repo's
  local `.vercel/repo.json` links only `smartstock-v2`; the fan-out is configured on
  Vercel's side via git integration, not locally.)

- **Hosting tiers — both on FREE, must upgrade before launch:** Storehouse is
  **commercial**. Vercel's free Hobby plan prohibits commercial use AND has deploy-pausing
  hard caps (no warning, serve-cached, wait-for-reset) → move to **Vercel Pro** before
  launch. Supabase org is on the **`free` plan** (verified `get_organization`, 2026-06-11) →
  move to **Supabase Pro** before real money flows, because **PITR (point-in-time recovery)
  is Pro-only** and is non-optional once payments are live.

- **Migration drift (see Safe migrations above):** recorded ~30 vs local ~48. `db push`
  unsafe. Tracked-file + `psql -f` + record-in-`schema_migrations` is the path. A
  reconciliation cleanup is owed.

- **Sales idempotency (OFF-01 — LIVE):** `public.sales` has a nullable `client_sale_id` +
  a **FULL** unique index `sales_client_sale_id_uniq`. Offline/manual sale paths send the
  device UUID and upsert with `{ onConflict: 'client_sale_id', ignoreDuplicates: true }`.
  **The index MUST stay FULL** — PostgREST `upsert`/`onConflict` **cannot bind to a PARTIAL
  index** (Postgres error `42P10`, which breaks sale sync). Checkout/hook/card-RPC paths
  leave `client_sale_id` NULL and are unaffected (NULLs are distinct in a unique index).

- **Optimistic sale-row parity (must-refresh bug — fixed):** when adding a sale to local
  React state, the optimistic row MUST carry the **same fields the cloud-mapped row has** —
  `sellKobo`, `paymentMethod`, `dayKey` (via `localDayKey()`), and a **numeric** `createdAt`.
  Missing any of these makes the row render ₦NaN and corrupts the dashboard total until a
  refresh re-maps from cloud. Keep optimistic rows at parity with the cloud-map shape
  (`App.jsx` ~:1036–1054). Do **not** re-introduce a raw-IndexedDB re-read that overwrites
  the optimistic append with un-mapped rows.

- **Today's production changes (live):**
  - **SEC-05** — `invoices` / `invoice_items` public SELECT scoped to shared invoices
    (removed the `USING(true)` blanket leak).
  - **SEC-06** — `payment_transactions` INSERT + UPDATE restricted to `service_role` only
    (removed the public `USING(true)`/`WITH CHECK(true)` write surface).
  - **OFF-01** — `client_sale_id` column + full unique index + upsert dedup (commit `b874e9e`).
  - **Must-refresh parity fix** — optimistic sale-row carries `sellKobo`/`paymentMethod`/
    `dayKey`/`createdAt`; removed the clobbering raw-IDB re-read (commit `a85c47a`).
  - **Legacy `paystack-webhook` is dead code** — Paystack points at `paystack-webhook-router`.
    Delete the legacy function post-launch (it lacks idempotency + uses a non-constant-time
    HMAC compare; harmless only because it's unreferenced).

- **Launch gate — the one hard blocker:** the **Play Store APK rebuild (OFF-04)**. The
  shipped APK is the **Dec-2025 build** with no `server.url` (loads a frozen local bundle),
  ~320 commits / ~6 months behind, shipping none of the Paystack/KYC/Ajo/offline-fix work.
  Needs `cap sync` + rebuild + Play Store resubmit. **Do not launch the current APK.**

- **History & progress:** full session-by-session history (chat widget, Paystack Sessions
  1–11) is in **`CLAUDE.archive.md`**. Ongoing progress lives in the **founder dashboard**
  (Supabase project `yzlniqwzqlsftxrtapdl`, schema `founder` — verified live: tables
  `areas`, `progress_log`, `workstreams`; frontend = the `founder-web` Vercel project).
  **This file is current-state, not a changelog** — when something changes, update the
  relevant fact here rather than appending a session log.
