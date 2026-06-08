# Ajo / Contributions (esusu / ROSCA) — Redesign Plan & Roadmap of Record

> **Status:** living roadmap. Records the benchmarked design + staged build for the
> rotating-savings (Ajo/esusu/ROSCA) feature.
> **Last updated:** 2026-06-08.
> **Scope:** logic + small-schema reconciliation. Member-bound records (payments/payouts
> keyed on `member_id`), so reordering/rotation fixes are logic changes, NOT data
> migrations of history.
>
> Related docs: Stage 0 audit (rotation + dates), `supabase/migrations/20260607_ajo_stage1_schema_reconciliation.sql`.

---

## BENCHMARK: validated against the Jan 2026 ROSCA technical standard

We validated our approach against the published **Jan 2026 technical standard for
digitising rotating savings** (TechCabal, Joseph Ajayi).

- The standard defines **5 core entities** — **group, member, cycle, contribution,
  payout**. **Our schema has all 5** (`contribution_groups`, `contribution_members`,
  `current_cycle`/`cycle_number`, `contribution_payments`, `contribution_payouts`).
- Our **member-bound ledger** + **derive-collected-from-payouts** + **double-collect
  gate** match the standard's core requirement: a shared ledger that prevents the
  classic failure mode — *"a member receives the pot early then stops contributing."*
  - "Collected" is derived from `contribution_payouts` rows (a member has collected IFF
    a payout row exists for them in the group). `recordPayout` rejects a second payout
    for the same member.
- Our **staged build matches the standard's recommended phases** (below).

**Why our model is sound (entity mapping):**

| Standard entity | Our implementation |
|---|---|
| Group | `contribution_groups` (name, amount, frequency, collection_day, cycle_start_date, current_cycle, status) |
| Member | `contribution_members` (member_id, name, phone, **payout_position**, status) — stable per-person id |
| Cycle | rotation turn = `groupPayouts.length + 1`; `current_cycle` is a display counter, NOT the recipient selector |
| Contribution | `contribution_payments` (member_id, cycle_number, amount, method) |
| Payout | `contribution_payouts` (member_id, cycle_number, amount) — the has-collected ledger |

---

## STANDARD'S 4 PHASES (our roadmap)

- **Phase 1 (core / MVP):** group creation, member management, position assignment,
  contribution tracking, payout processing. ← **WE ARE HERE** (our Stages 1–4).
- **Phase 2 (reliability):** default handling, grace periods, late fees, insurance
  reserves, partial-payout logic. ← FUTURE (our Stage 6+).
- **Phase 3 (security):** MFA on money actions, authorisation/roles, permanent audit
  logging, fraud detection.
- **Phase 4 (scale):** users in multiple groups, historical completed-group records,
  analytics.

---

## OUR STAGES (Phase 1) — current status

### Stage 1 — schema reconciliation — ✅ DONE (verified)
- Made `frequency` canonical (backfilled `payment_frequency := frequency`).
- Formalized `cycle_start_date` in the migration ledger (existed live, out-of-band).
- Dropped the broken `contribution_groups_payment_frequency_check` (it omitted
  `biweekly`, which had rolled back the backfill).
- Documented `collection_day` convention (day-of-week for weekly/biweekly; day-of-month
  for monthly) via `COMMENT ON COLUMN`.
- Applied via `psql -f` + recorded in `schema_migrations` (drift discipline; NOT
  `supabase db push`). Migration: `20260607_ajo_stage1_schema_reconciliation.sql`.
- Known residual drift (left intentionally): `owner_id` duplicate of `user_id`
  (mostly NULL; `user_id` canonical/RLS-bound); `payment_frequency` kept temporarily
  for read-compat (slated for removal after readers move to `frequency`).

### Stage 2 — has-collected ledger + order-independent recipient + payout gate + post-payout auto-refresh — ✅ DONE (pending final verification on Scale Test 20)
- **Recipient selection (order-independent):** `currentRecipient` = the member with the
  **lowest `payout_position` whose `member_id` is NOT in the collected set** (derived from
  `contribution_payouts`). Works for any N and any collection order (e.g. collect
  3,4,2,5 → remaining position 1 is still correctly selected). No `payout_position ===
  current_cycle`; no `|| sortedMembers[0]` fallback.
- **`current_cycle` is NOT the source of truth** for who collects — display counter only.
- **Bug fixed (N-member):** `sortedMembers` was sorting on `m.position` (undefined →
  fell through to `created_at`); now sorts on `payout_position`, so the lowest-uncollected
  rule is correct.
- **Payout gate:** `recordPayout` rejects a second collect for a member already in
  `contribution_payouts` (no double-collect). Manual "Change Recipient"/arbitrary
  cycle-pointer overrides removed.
- **Complete state:** when all members have collected, `currentRecipient = null`, a
  "Rotation complete — everyone has collected" banner shows, and the Record-payout button
  is disabled (modal cannot open with a blank recipient).
- **Payout execution fixed:** silent guard replaced with user feedback ("All members must
  pay in before payout", etc.); `recordPayout` called with the correct object signature
  `{ amount, paymentMethod }`; the previously no-op parent `onRecordPayout` now reloads
  the group from the backend.
- **Post-payout UI auto-refresh:** paid-status ("X/N paid", per-member badges) re-queries
  for the new turn after a payout — keyed on `currentTurn = groupPayouts.length + 1`
  (both record and query), with a `[groupPayouts.length]` reload effect (robust even when
  `current_cycle` numerically doesn't change). No manual refresh needed.
- **Final verification owed:** Scale Test 20 — seed a 20-member group, collect in
  arbitrary order, confirm each step selects the lowest-position uncollected member, the
  last uncollected member (any position) is reached, and a clean complete state results;
  and that paid-status resets to 0/N after each payout without manual refresh.

### Stage 3 — safe transactional reorder + member-change rules — ⏳ NEXT
MUST ENCODE the standard's rules:
- **New members CANNOT join after the group is Active** (only during Forming).
- **Leaving AFTER receiving payout = NOT allowed** (obligation to keep contributing;
  treat as a debt).
- **Leaving BEFORE payout = allowed** (future: with penalty to reserve — Phase 2).
- **Reorder:** transactional (no `UNIQUE(group_id, payout_position)` violation — the
  current parallel `Promise.all` updates collide transiently); only reorders
  **not-yet-collected** members; **never moves a collected member back into the line.**
- **Re-pack positions on removal** (no gaps); **add new members at the end** (max
  position + 1).
- **Group lifecycle states:** **Forming / Active / Completed / Dissolved** (the Active
  transition is **irreversible**). Today `status` is `active|completed|paused` — Stage 3
  introduces the Forming/Dissolved states and the irreversibility rule.

### Stage 4 — derived date layer + reminders — ⏳ FUTURE
- **Dates are DERIVED, never stored per-member:**
  `collectionDate(member) = addPeriods(cycle_start_date, frequency, payout_position - 1)`.
  Member at position P collects P periods from the group's start. Reordering re-assigns
  dates automatically (pure function of position). Surfaces current recipient + their
  date, next recipient + their date, and each member's date.
- MUST INCLUDE the standard's **3-tier reminder schedule:**
  - Contribution reminders at **3 days before**, **1 day before**, and **on the due date**.
  - **Immediate confirmation** when a contribution is received.
  - **Recipient confirmation** on payout.
  - **Cycle-complete summary**.
- `addPeriods` must branch on frequency (monthly = day-of-month with month-length clamp;
  weekly/biweekly = day-of-week aligned). `cycle_start_date` may be NULL on legacy groups
  → prompt owner to set it before showing derived dates.

---

## POSITION ASSIGNMENT (design note)

The standard offers **3 models**:
1. **Random (lottery)** — positions drawn at start.
2. **Bidding (Chit-Fund style)** — members bid for early access (discount auction).
3. **Need-based** — the group decides each cycle who collects.

**We implement need-based / manual-order-with-reorder** — the traditional Nigerian ajo
model (owner sets and can reorder the line). **Random and bidding are OPTIONAL future
enhancements, not required** for Phase 1.

---

## DEFAULT HANDLING (Phase 2 — the standard calls this "the central challenge")

**Current approach: all-or-nothing** — everyone must pay in before a payout is allowed.
This is a standard-recognized approach and the **most rigid** end of the spectrum.

Phase 2 would add (in roughly increasing sophistication):
- **Grace periods + late fees.**
- **Suspension-from-payout** for defaulters.
- **Insurance reserves** (2–5% per contribution) to cover shortfalls.
- **Threshold payouts** (e.g. pay out at 80% collected rather than 100%).
- **Partial-payout logic.**

**Deferred.** This is flagged as **the main gap between "solid" and "world-class
fintech."** The all-or-nothing rule is acceptable for launch (trusted, small Nigerian
ajo groups) but does not handle real-world default gracefully.

---

## Known gaps / honest status (so a fresh session has the truth)

- **Reorder is not yet transactional** (Stage 3) — parallel position updates can violate
  the unique constraint; "Save Order" can also run with an empty `recipientOrder` (now
  guarded with a fallback + honest feedback, but the transactional fix is Stage 3).
- **`current_cycle` semantics drifted historically** (prod had all rounds' payments under
  `cycle_number=1` while `current_cycle` advanced). Stage 2's per-turn key
  (`groupPayouts.length + 1`) is now the consistent key for record + query; older rows
  may need reconciliation per group (ask the owner; never guess/backfill payouts).
- **Lifecycle states** Forming/Dissolved + the irreversible-Active rule are NOT yet
  implemented (Stage 3).
- **Dates + reminders** are NOT yet implemented (Stage 4); the only existing date logic
  is a single group-level "is the contribution due this week?" status, not a per-member
  rotating schedule.
- **Default handling** is all-or-nothing only (Phase 2).

---

_This file is the roadmap of record. It documents design and status only — it is not a
substitute for the code. When code and this doc disagree, verify against code + live DB._
