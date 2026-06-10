# Ajo / Contributions (esusu / ROSCA) — Redesign Plan & Roadmap of Record

> **Status:** living roadmap. Records the benchmarked design + staged build for the
> rotating-savings (Ajo/esusu/ROSCA) feature.
> **Last updated:** 2026-06-09.
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
  contribution tracking, payout processing. ← **WE ARE HERE** (our Stages 1–5 done;
  lifecycle states still open — see Known gaps).
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

### Stage 3 — safe transactional reorder + member-change rules — ✅ DONE
Encodes the standard's member-change rules:
- **New members CANNOT join after the group is Active** (only during Forming) — enforced
  by the add RPC's gate on "no payout recorded yet" (started = a payout exists).
- **Leaving AFTER receiving payout = NOT allowed** (obligation to keep contributing;
  treat as a debt).
- **Leaving BEFORE payout = allowed** (future: with penalty to reserve — Phase 2).
- **Reorder:** transactional — the `reorder_contribution_members` RPC rewrites positions in
  one atomic offset-then-finalize pass (no `UNIQUE(group_id, payout_position)` violation;
  replaces the old parallel `Promise.all` that collided transiently); only reorders
  **not-yet-collected** members; **never moves a collected member back into the line.**
- **Re-pack positions on removal** (no gaps); **add new members at the end** (max
  position + 1).
- **Group lifecycle states — NOT shipped in Stage 3 (still a gap; see Known gaps).** Stage 3
  only widened the `status` CHECK to allow Forming/Dissolved; it did NOT implement the
  formal Forming/Active/Completed/Dissolved state machine or the irreversible-Active rule.
  "Forming vs started" remains implicit (derived from whether any payout exists), and
  `status` is still only set to `active`/`completed`/`paused`.

### Stage 4 — derived date layer — ✅ DONE
- **Dates are DERIVED, never stored per-member:**
  `collectionDate(member) = addPeriods(cycle_start_date, frequency, payout_position - 1)`.
  Member at position P collects P periods from the group's start. Reordering re-assigns
  dates automatically (pure function of position). Surfaces current recipient + their
  date, next recipient + their date, and each member's date.
- `addPeriods` branches on frequency (monthly = day-of-month with month-length clamp;
  weekly/biweekly = day-of-week aligned). `cycle_start_date` may be NULL on legacy groups
  → prompt owner to set it before showing derived dates.
- Implemented in `src/utils/ajoDates.ts`; surfaced in `ContributionGroupDetail.tsx` and the
  public view.

### Stage 5 — reminders (Level A: owner-triggered WhatsApp) — ✅ DONE
- **Level A = owner-triggered, in-app, one-tap.** Every action just opens WhatsApp
  pre-filled; the owner hits send. NOTHING ever auto-sends. All dates come ONLY from
  `ajoDates.collectionDate` — no fabricated dates (no start date → route to the Stage 4
  "Set start date" prompt).
- **Contribution-due (per member):** per-row "Remind" → `wa.me/<number>?text=` pre-filled
  with name + amount + the derived current-cycle date + whose turn it is.
- **Whole-group:** a single `wa.me/?text=` chat-picker message (NOT a per-member loop —
  looping `window.open` is killed by popup blockers / Android page teardown).
- **Payment confirmation:** non-blocking toast after mark-paid + a durable per-row "Send
  receipt" (paid rows).
- **Payout confirmation:** non-blocking toast after a recorded payout + a durable "Payout
  receipt" chip on the latest recipient's row, using the ACTUAL recorded
  `contribution_payouts.amount`.
- **Phone add/edit:** inline `+ Add phone` / `✎` editor on each member row (owner-detail
  only; never the public view), so the "no phone" state is no longer a dead end. Stored raw
  (`.trim()`), normalized at link-build via `formatPhoneForWhatsApp`.
- **Level B (scheduled backend reminders) = FUTURE.** The standard's **3-tier schedule** —
  contribution reminders at **3 days before / 1 day before / on the due date**, immediate
  confirmation on receipt, recipient confirmation on payout, and a cycle-complete summary —
  is the target for the Level B build (a scheduled job, not in-app). Level A above covers
  the immediate/owner-driven subset.

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

- ✅ **Resolved (Stage 3): reorder is now transactional.** The
  `reorder_contribution_members` RPC rewrites positions atomically (offset-then-finalize,
  no UNIQUE collision, collected members pinned at the front); the old parallel
  `Promise.all` collision is gone, and "Save Order" guards an empty `recipientOrder`.
- **`current_cycle` semantics drifted historically** (prod had all rounds' payments under
  `cycle_number=1` while `current_cycle` advanced). Stage 2's per-turn key
  (`groupPayouts.length + 1`) is now the consistent key for record + query; older rows
  may need reconciliation per group (ask the owner; never guess/backfill payouts).
- **Lifecycle states (forming/active/completed/dissolved) + the irreversible-Active rule
  are STILL a gap.** Stage 3 only *widened* the `status` CHECK to allow these values; no
  code ever writes `forming`/`dissolved`, the irreversible-Active transition is not
  enforced, and `status` is only ever set to `active`/`completed`/`paused`. "Forming vs
  started" is currently *implicit* (the add-member gate keys on "any payout exists yet?",
  not a state flag), not a formal state machine. The Stage 3 **member-change rules** (add
  only before first payout, no-leave-after-collect, re-pack on removal) DID ship — it is
  only the formal lifecycle states that remain.
- ✅ **Resolved (Stage 4): derived per-member dates shipped.** `ajoDates.collectionDate`
  derives each member's date from `cycle_start_date + frequency + payout_position`
  (replacing the old single group-level "due this week?" status); surfaced in the detail
  and public views, with a "Set start date" prompt for legacy NULL groups.
- ✅ **Resolved (Stage 5): Level A reminders shipped.** Owner-triggered, one-tap WhatsApp:
  per-member contribution-due reminder, single whole-group chat-picker message, payment +
  payout receipts (toast + durable per-row actions), inline phone add/edit. Nothing
  auto-sends; dates only from `ajoDates`. **Level B (scheduled backend reminders — the
  3-tier 3-day/1-day/due-date schedule + cycle-complete summary) is still FUTURE.**
- **Default handling** is all-or-nothing only (Phase 2).
- **Audit payout-schedule picker's direct `payout_position` write** — possible Stage 3
  bypass; route through reorder RPC or remove.
- **Group lifecycle states (forming/active/completed)** — confirm scope and implement or
  descope.

---

_This file is the roadmap of record. It documents design and status only — it is not a
substitute for the code. When code and this doc disagree, verify against code + live DB._
