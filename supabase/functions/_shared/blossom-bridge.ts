// ============================================================================
// TEMPORARY BRIDGE — Storehouse → Blossom Paystack webhook forward.
//
// temporary — delete when Blossom moves to its own Paystack business;
// trigger: first third-party (non-Paul) school onboards card payments
// (i.e. the first non-Paul store completes CARD-PAYMENTS onboarding and a
// Paystack subaccount is created for it). Merely signing up for Blossom, or
// a cash/claims-only school, does NOT trigger removal — no shared-business
// exposure there. See docs/follow-ups.md and CLAUDE.md.
//
// WHY THIS EXISTS
//   One Paystack business currently serves BOTH Storehouse and Blossom.
//   Paystack allows exactly one Live webhook URL, and it points at
//   Storehouse's paystack-webhook-router. Blossom's fee rail is built,
//   tested and deployed but DARK — it receives no events because Paystack
//   sends everything here. This bridge forwards Blossom-bound events to
//   Blossom's own router so its rail can go live before the two businesses
//   are split.
//
// SAFETY MODEL (see the design in the PR / follow-ups doc)
//   - Matches ONLY on the server-set 'BLS_' reference prefix. Storehouse's
//     own charge references are 'ord_<uuid>' (initiate-storefront-payment)
//     and Paystack-native subscription refs — none start with 'BLS_'. The
//     two prefix sets are disjoint, so this can never catch a Storehouse
//     money event.
//   - A metadata product/app marker (metadata.product === 'blossom') is
//     PENDING on the Blossom side. It is NOT required to route. But if it
//     is present it MUST AGREE with the prefix; disagreement is a routing
//     FAULT, not a decision — the caller must NOT forward and must return a
//     non-200 so Paystack retries while a human investigates.
//   - The raw request body is forwarded BYTE-FOR-BYTE with the original
//     x-paystack-signature header, so Blossom re-verifies the identical
//     HMAC-SHA512 (same shared signing secret). No parse-then-restringify.
//
// This module is PURE detection + a single fetch. It performs no DB writes;
// the caller owns logging to blossom_forward_log and the HTTP response.
// ============================================================================

// Blossom's deployed webhook router. verify_jwt=false (confirmed 2026-08-02
// by curl: the function executes with no Authorization header and returns
// its own application JSON, not a gateway 401). So the forward carries NO
// apikey / NO JWT — HMAC-only, exactly like Storehouse's own router.
//
// Overridable via env for staging/testing; falls back to the known prod URL.
const BLOSSOM_WEBHOOK_URL = 'https://lmmznmywiwjyfyvgarof.supabase.co/functions/v1/paystack-webhook-router';

const FORWARD_TIMEOUT_MS = 5000;

export type BlossomMatch =
  | { kind: 'blossom' }           // clean BLS_ match (metadata absent or agreeing)
  | { kind: 'not_blossom' }       // no BLS_ prefix, not ours to forward
  | { kind: 'disagreement' };     // marker conflict — do NOT forward, 409

// Decide whether an already-parsed, already-HMAC-verified event belongs to
// Blossom. Pure — no side effects.
export function classifyBlossomEvent(event: { data?: any } | null | undefined): BlossomMatch {
  const ref = event?.data?.reference;
  const hasBlsPrefix = typeof ref === 'string' && ref.startsWith('BLS_');

  // metadata.product is PENDING on Blossom's side. Only inspect it when
  // present; absence never blocks a clean prefix match.
  const productMarker = event?.data?.metadata?.product;
  const markerPresent = typeof productMarker === 'string' && productMarker.length > 0;
  const markerSaysBlossom = markerPresent && productMarker.toLowerCase() === 'blossom';

  if (hasBlsPrefix) {
    // Prefix says Blossom. If a marker is present it MUST agree.
    if (markerPresent && !markerSaysBlossom) return { kind: 'disagreement' };
    return { kind: 'blossom' };
  }

  // No BLS_ prefix. If the marker nonetheless claims Blossom, that's a
  // conflict (a Blossom-marked event with a non-BLS_ reference is malformed
  // or a spoof) — refuse to guess.
  if (markerSaysBlossom) return { kind: 'disagreement' };

  return { kind: 'not_blossom' };
}

export interface ForwardOutcome {
  ok: boolean;            // Blossom returned 2xx
  status: number;         // Blossom's HTTP status (0 = network/timeout, no response)
  networkError: boolean;  // fetch threw / timed out (no HTTP response at all)
  detail?: string;        // error message when networkError
}

// Forward the ORIGINAL raw body + ORIGINAL signature to Blossom, byte-for-byte.
// Never re-serialise the event. Bounded by an AbortController so a hung
// Blossom endpoint can't stall the Storehouse worker.
export async function forwardToBlossom(
  rawBody: string,
  signature: string,
): Promise<ForwardOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
  try {
    const res = await fetch(BLOSSOM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Verbatim — Blossom re-verifies HMAC over the same bytes.
        'x-paystack-signature': signature,
      },
      body: rawBody,               // the exact string Storehouse received
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return { ok: res.status >= 200 && res.status < 300, status: res.status, networkError: false };
  } catch (e) {
    clearTimeout(timeoutId);
    const detail = (e as { message?: string })?.message ?? 'unknown';
    return { ok: false, status: 0, networkError: true, detail };
  }
}

export { BLOSSOM_WEBHOOK_URL };
