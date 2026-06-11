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

## Current state & critical gotchas (as of 2026-06-11)

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
