# KYC v1 Build — Lessons Captured (15-16 May 2026)

**Purpose:** Patterns and gotchas surfaced during the Session 4 build. Tomorrow-Paul reads this, decides what (if anything) gets formalized into `KYC_V1_FOCUS_RULES.md` or `CLAUDE.md`.

**Context:** Tonight Claude Code caught 5 distinct spec-vs-reality defects across step 1 and step 3a. Each was a real correctness issue that would have shipped broken code if not caught. The pattern is consistent enough to warrant capture.

---

## The five defects, in order

1. **vendor_kyc schema collision (Step 1a):** spec written assuming clean-slate table; actual table had 24 existing columns from Session 1, including encrypted BVN/NIN. Required full spec rewrite (v1 → v2).

2. **decrypt_vendor_kyc_field broken (Step 1b):** existing function from Session 1 used unqualified `pgp_sym_decrypt`. pgcrypto lives in `extensions` schema, not `public`. Combined with `SECURITY DEFINER ... SET search_path = public`, the function was unable to resolve the call. Pre-existing production bug nobody had hit yet because no RPC had called it. Fixed inline by qualifying both encrypt and decrypt with `extensions.` prefix.

3. **Partial index uses non-IMMUTABLE now() (Step 1c):** spec specified `CREATE INDEX ... WHERE expires_at IS NULL OR expires_at > now()`. Postgres rejects this — partial index predicates must be IMMUTABLE. Spec amended to drop the second index; composite index handles realistic query patterns.

4. **ON CONFLICT without UNIQUE constraint (Step 1d):** spec used `INSERT ... ON CONFLICT (user_id) DO UPDATE`. user_subscriptions has no UNIQUE on user_id (the table is append-history, multiple rows per user over time, written by paystack-webhook + verify-subscription). Spec amended to DELETE + INSERT.

5. **Type mismatch in ownership check (Step 3a):** spec's `WHERE id = p_store_id AND user_id = v_user_id` failed because `stores.user_id` is `text` and `v_user_id` is `uuid` from `auth.uid()`. Fixed with `v_user_id::text` cast. Existing codebase patterns (F1 RLS, F2 ownership) already did this; my spec didn't.

---

## The shared root cause

Each defect has the same shape: **the spec was written from architectural intent without verifying against actual database state.**

For each defect:
- Spec read like clean-room design
- Reality had existing schema, existing functions, existing type choices
- Defect surfaced at first code attempt
- Resolution required spec amendment alongside code

My (Paul's, via Claude in chat) spec-writing process: I describe what the data model *should* look like for the feature to work. I do not first interrogate what the data model *actually* looks like. The result is specs that are internally consistent but externally wrong.

---

## The proposed pattern: "Schema reconciliation pass"

Before writing any new spec section that touches a database table, function, or constraint, the spec author runs (or asks Claude Code to run):

```sql
-- For tables the spec will touch:
\d <table_name>

-- For functions the spec will reference:
SELECT proname, pg_get_function_arguments(oid) AS args, prosrc
FROM pg_proc WHERE proname LIKE '%<keyword>%';

-- For constraints the spec assumes:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = '<table>'::regclass;

-- For column types the spec uses in comparisons:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '<table>'
ORDER BY ordinal_position;
```

Output goes into the spec section as a "Schema baseline" subsection. Subsequent prose references actual column names and types, not idealized ones.

**Cost:** ~10-15 minutes per major spec section.
**Benefit (measured tonight):** prevents ~30-60 minutes of mid-implementation discovery, debate, and spec amendment per defect. Net positive even at one defect.

---

## Testing-scaffolding gotcha (Step 3a verification)

**`set_config('request.jwt.claims', ..., true)` is transaction-scoped.** Running it as a top-level statement followed by a separate top-level RPC call gives `auth.uid() = NULL` inside the function — they're in different implicit transactions, so the JWT claims don't carry through.

**Fix when testing RPCs under auth context:**

```sql
BEGIN;
SELECT set_config('request.jwt.claims', 
  '{"sub":"dffba89b-869d-422a-a542-2e2494850b44","role":"authenticated"}', 
  true);
SELECT submit_kyc_v1(...);
COMMIT;
```

Wrap both in the same transaction. Otherwise `auth.uid()` returns NULL and ownership checks pass for the wrong reasons (or fail for confusing reasons).

---

## Decisions tomorrow-Paul might make

1. **Add "Schema reconciliation pass" to `KYC_V1_FOCUS_RULES.md`?**
   - Argument for: 5 defects in one night is a real pattern. Future spec writing should include it as a required step.
   - Argument against: focus rules are about discipline during builds, not spec authoring. Maybe this belongs in a different document.
   - Suggestion: add a short section titled "Before writing a new spec section" with the SQL commands above.

2. **Add the transaction-wrapping note to `CLAUDE.md`?**
   - Argument for: future RPC verification tasks will hit this same gotcha.
   - Argument against: it's a fairly niche testing concern, not a general coding rule.
   - Suggestion: yes, but in a "Testing notes" subsection, not at the top level.

3. **Update spec author behaviour going forward?**
   - The next major spec section (Card 2 frontend wizard in Session 5) is mostly TypeScript/React, not SQL. Lower risk of schema-vs-reality defects there. The lesson applies most directly to backend-RPC and migration work — both of which are essentially done after Session 4.
   - This may be a Session-4-shaped problem that doesn't recur much in Sessions 5-6.

4. **What about Phase 2 / v1.5 / v2 spec work?**
   - Smile Identity integration, Phase 2 reviewer web page, Phase 2 self-serve velocity form — all touch existing schema again. The pattern WILL recur in those future specs. Worth formalizing now.

---

## Net read

Five defects across one session is a strong signal, not noise. The proposed mitigation (schema reconciliation pass) is cheap and targeted. The decision of whether and how to formalize is genuinely a tomorrow-Paul decision, but the lesson itself is worth keeping vivid.

The focus rules document earned its place tonight in a different way: it gave Claude Code permission to STOP each time, instead of compensating silently. That permission is what made the defects visible. Without it, three or four of the five would have shipped as quiet workarounds.

---

## Subscription hardening — item 1 (resolveActiveTier ↔ submit_kyc_v1 alignment)

**Lesson:** Edge-function `resolveActiveTier` (TypeScript in `supabase/functions/_shared/tier-resolver.ts`) and the SQL `submit_kyc_v1` RPC both gate on subscription tier + status + grace period. Today they implement the same contract in two languages. **They MUST stay in sync** — a divergence means a user passes one gate but fails the other, producing the worst kind of UX failure (the system contradicts itself).

The contract, written once:
- `tier_id IN ('starter', 'pro')`
- `status IN ('active', 'non_renewing', 'trialing', 'past_due')`
- `current_period_end IS NULL OR current_period_end > now() - INTERVAL '7 days'`

Any future change to one of these MUST be applied in parallel to:
- `supabase/functions/_shared/tier-resolver.ts` (the `.in('status', [...])` array and the `periodOk`/`GRACE_MS` constants)
- `submit_kyc_v1` RPC body (the inline `tier_id IN` / `status IN` / 7-day grace clauses)
- `get_user_tier` RPC body (the inline `WHERE` clause in the v_effective_tier SELECT — added in item 3)

The contract now lives in THREE places. If you find them out of sync in a future audit, the canonical source is `submit_kyc_v1` (it's the SQL the spec was authored against; the other two are re-implementations to expose the same contract to F2/F3 edge functions and to frontend code respectively).

Saved 16 May 2026 alongside resolveActiveTier past_due fix. Updated 16 May 2026 with get_user_tier addition.

## Subscription hardening — item 2 (DEFERRED — beta-tester promise discovered)

**Original plan:** migrate the 10 `tier_id='business'` rows in `user_subscriptions` down to `'free'` on the assumption they were dead seed data left over from a December bulk insert.

**What pre-flight surfaced:** all 10 rows have `grandfathered=true`, `grandfathered_at='2025-12-30 13:08:33'`, and `grandfathered_reason='Beta tester - unlimited AI chats forever as thank you for early support'`. They are NOT dead seeds — they are intentional beta-tester comps with a written promise of perpetual unlimited AI chats. Additional context:
- 9 of the 10 user_ids don't have a corresponding row in the `users` table — likely ghost accounts (orphan auth.users with no profile).
- The 1 user that DOES have a `users` row already has `users.subscription_tier='free'` — existing silent drift between the two columns.
- F2 / F3 / submit_kyc_v1 already treat 'business' as 'free' (it's not in their allow-list). After item 3, `get_user_tier` does too. So the user-facing system already silently treats these 10 users as Free — only the `user_subscriptions.tier_id` column says otherwise.

**Resolution deferred — this is a business decision, not engineering.** The product call to make:
- Do we honour the perpetual-unlimited-AI-chats promise? If yes: how — keep them on `'business'` with a permanent flag, migrate them to `'pro'` (closest active tier), or build a comp mechanism that's independent of tier_id?
- For the 9 ghost accounts: drop the rows, or leave as-is?

Until that's decided, the 10 rows stay as-is. Effect today: they silently behave as Free everywhere (item 3 closed the last leak).

## Subscription hardening — item 3 (get_user_tier RPC fix)

**Lesson:** `get_user_tier` was previously a trivial INNER JOIN with no status filter, no period check, and no fallback when no subscription row existed. Cancelled, lapsed, and business-tier users all kept their stored `tier_id` indefinitely. Fix: rewrite the RPC to mirror `submit_kyc_v1`'s canonical paid-tier check verbatim. Fall through to the `'free'` row in `subscription_tiers` for any row that fails the gate, or for users with no subscription row at all.

**Caller audit before the fix** (Step 3a of the hardening session):
- 6 call sites: `BusinessInsights.tsx`, `MoreMenu.tsx`, `aiUsageService.ts` (fallback path), and 3 internal callers in `subscriptionService.ts` (`canAddUser`, `canUseAIChat`, `hasFeature`).
- No caller had "ever subscribed" detection logic. No reactivation/win-back/upgrade-history flow. The codebase doesn't distinguish "lapsed Pro" from "never paid" — both lead to the same upgrade UX.
- Net effect of the fix: cancelled-Pro users correctly lose paid features at the UI layer (closing a leak), and `canAddUser`/`canUseAIChat`/`aiUsageService` stop returning spurious "Unable to check limit" errors for users with no subscription row.

Signature unchanged (`get_user_tier(p_user_id uuid) → TABLE(...)`). Callers required no updates.

Three-way sync contract now established (see item 1). All three functions must change together.

Saved 16 May 2026 alongside the get_user_tier rewrite.
