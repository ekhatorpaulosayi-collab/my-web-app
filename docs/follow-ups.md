# Follow-ups

Tracked, load-bearing follow-ups that don't belong in a changelog. Newest first.

---

## Blossom Paystack webhook-forward bridge — TEMPORARY, has a deletion trigger

**Created:** 2026-08-02
**Status:** code written; **NOT deployed** (deploy gated — see below).

### What it is
One Paystack business currently serves **both Storehouse and Blossom**. Paystack allows
exactly one Live webhook URL, and it points at Storehouse's `paystack-webhook-router`.
Blossom's fee rail is built/tested/deployed but **dark** (receives no events). The router
forwards **Blossom-bound events** to Blossom's own router so its rail can go live before the
two businesses are split.

- **Blossom identity (certainty):** server-set `data.reference` prefix **`BLS_`**. Storehouse
  emits `ord_<uuid>` (storefront) and Paystack-native subscription refs — **none** start with
  `BLS_`. Disjoint prefix sets → the bridge can never catch a Storehouse money event.
- **Metadata marker (`metadata.product='blossom'`) is PENDING** on Blossom's side. Not
  required to route; if present it MUST agree with the prefix. Disagreement ⇒ **do not
  forward**, return 409, log loudly.
- **Byte-for-byte forward:** original raw body + original `x-paystack-signature`, no
  parse-then-restringify, so Blossom re-verifies the identical HMAC-SHA512 (shared secret).
- **Failure ⇒ non-200** so Paystack retries: **409** marker-disagreement, **502** Blossom
  down / non-2xx / network. Never 200-drops a Blossom event; never touches Storehouse state.
- **Observability:** `blossom_forward_log` (reference, event_type, outcome, response_code,
  detail, created_at). Deliberately NOT `paystack_webhook_events` — foreign `BLS_` refs could
  collide with Storehouse's replay-protection unique index.

**Files:** `supabase/functions/_shared/blossom-bridge.ts`,
`supabase/functions/paystack-webhook-router/index.ts` (additive branch),
`supabase/migrations/20260802_blossom_forward_log.sql`, reminder in
`supabase/functions/create-paystack-subaccount/index.ts`, note in `CLAUDE.md`.

### DELETION TRIGGER (no fixed date)
> **Delete the whole bridge when the first non-Paul school completes CARD-PAYMENTS
> onboarding (creates a Paystack subaccount)** — Blossom then moves to its own Paystack
> business. Merely signing up for Blossom, or a cash/claims-only school, does **not**
> trigger removal, since those carry no shared-business exposure.

To delete: remove `blossom-bridge.ts`, the bridge branch + `logBlossomForward` from the
router, `blossom_forward_log` (drop table), the reminder comment in
`create-paystack-subaccount`, and this section + the `CLAUDE.md` note. Repoint Paystack's
Live webhook only if Blossom takes its own business's URL.

### DEPLOY GATE (do not deploy the bridge until ALL pass, in order)
1. **[done]** Design approved; code written (this diff).
2. Paul sets Blossom's two secrets on project `lmmznmywiwjyfyvgarof`:
   `PAYSTACK_SECRET_KEY` = the **shared** business's `sk_live_` (this is what signs the
   forwarded events), and `PAYSTACK_ENABLED=true`.
3. Re-curl Blossom's router with a raw body + **bogus** signature and confirm the response is
   **`401 bad_signature` from the function** — NOT `503 not_configured` (the dark-gate, seen
   2026-08-02 pre-config), NOT a gateway 401, NOT a 404. Those look alike and mean opposite
   things.
   ```
   curl -sS -i -X POST \
     https://lmmznmywiwjyfyvgarof.supabase.co/functions/v1/paystack-webhook-router \
     -H "Content-Type: application/json" \
     -H "x-paystack-signature: deadbeef...deadbeef" \
     --data '{"event":"charge.success","data":{"reference":"BLS_probe"}}'
   ```
4. Apply the `blossom_forward_log` migration via psql (record in `schema_migrations`).
5. `npm run check:chat` + `npm run build` pass; deploy `paystack-webhook-router`.
6. Live-verify BOTH products (test-mode): a `BLS_` event lands in Blossom's logs via the
   forward; an `ord_` Storehouse event still records a sale.

### Verification log
- **2026-08-02:** curled Blossom router, no auth header, bogus signature →
  **HTTP 503 `{"error":"not_configured"}`** from `supabase-edge-runtime`
  (`sb-project-ref: lmmznmywiwjyfyvgarof`). Confirms: (a) `verify_jwt=false` — function ran
  with no apikey/JWT, so the forward needs **no auth header**; (b) not a 404 — function is
  deployed; (c) it short-circuits on the intended dark-gate (`PAYSTACK_ENABLED`/
  `PAYSTACK_SECRET_KEY` unset) **before** the signature check. Gate step 3 above re-runs this
  after config to require `401 bad_signature`.
