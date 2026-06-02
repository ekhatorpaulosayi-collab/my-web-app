// paystack-webhook-router
//
// Single Paystack webhook endpoint. HMAC-verifies once, parses once,
// then routes to the appropriate shared handler based on payload shape.
//
// Replaces the two-endpoint split (paystack-subaccount-webhook +
// paystack-webhook) with one URL Paystack can call. Legacy endpoints
// remain deployed for rollback safety; only the dashboard URL changes
// after this lands.
//
// Architectural decisions (Fix 3):
//   - HMAC-SHA512 validation at the dispatcher top, ONCE per request.
//   - Routing rules in _shared/paystack-router.ts (pure function).
//   - Per-handler logic in _shared/paystack-subaccount-handler.ts and
//     _shared/paystack-subscription-handler.ts.
//   - Subaccount handler's charge.success path: claim is INSIDE the
//     record_successful_payment RPC. Dispatcher MUST NOT pre-claim.
//   - Subscription handler has no internal idempotency primitive
//     (legacy paystack-webhook never wrote to paystack_webhook_events).
//     Dispatcher pre-claims for subscription events to close that gap.
//   - Unknown event types: log to paystack_webhook_events, return 200
//     so Paystack stops retrying.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { routeEvent } from '../_shared/paystack-router.ts';
import { handleSubaccountEvent } from '../_shared/paystack-subaccount-handler.ts';
import { handleSubscriptionEvent } from '../_shared/paystack-subscription-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// HMAC-SHA512 implementation copied verbatim from
// paystack-subaccount-webhook/index.ts:29-52 — the only verified-correct
// signature implementation in this codebase.
async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    if (!signature) {
      return jsonResponse({ error: 'no_signature' }, 401);
    }

    const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
    if (!timingSafeEqualHex(expected, signature)) {
      return jsonResponse({ error: 'bad_signature' }, 401);
    }

    let event: { event?: string; data?: any };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const target = routeEvent(event);

    if (target === 'unknown') {
      // Log for observability and return 200 so Paystack doesn't retry.
      // Use the reference if present, else a synthetic key so the row
      // can still be inserted (UNIQUE(paystack_reference, event_type)).
      const fallbackRef = event.data?.reference || `unknown_${Date.now()}`;
      const fallbackType = event.event || 'unknown';
      const { error: logError } = await admin
        .from('paystack_webhook_events')
        .insert({
          paystack_reference: fallbackRef,
          event_type: fallbackType,
          payload: event,
          processed_at: new Date().toISOString(),
        });
      if (logError && logError.code !== '23505') {
        // Couldn't log (and it's not a benign duplicate) — surface but
        // still 200 so Paystack stops retrying an event we can't handle.
        console.error('[router] failed to log unknown event', { error: logError.message, eventType: fallbackType });
      }
      console.log('[router] unknown event type, logged and returning 200', { eventType: fallbackType });
      return jsonResponse({ ok: true, target: 'unknown', logged: true }, 200);
    }

    if (target === 'subaccount') {
      // Subaccount handler owns its own idempotency (charge.success via
      // RPC, charge.failed/transfer.* via inline ON CONFLICT). Don't
      // pre-claim here.
      const result = await handleSubaccountEvent(
        event as { event: string; data: any },
        admin,
      );
      return jsonResponse(result.body, result.status);
    }

    if (target === 'subscription') {
      // Pre-claim for subscription events (handler has no internal claim).
      // Use subscription_code as a fallback reference for events that
      // don't carry data.reference (e.g. subscription.create).
      const refKey = event.data?.reference || event.data?.subscription_code || `sub_${Date.now()}`;
      const eventType = event.event || 'unknown';

      const { error: claimError } = await admin
        .from('paystack_webhook_events')
        .insert({
          paystack_reference: refKey,
          event_type: eventType,
          payload: event,
          processed_at: null,
        });

      if (claimError) {
        if (claimError.code === '23505') {
          const { data: existing } = await admin
            .from('paystack_webhook_events')
            .select('processed_at')
            .eq('paystack_reference', refKey)
            .eq('event_type', eventType)
            .maybeSingle();
          if (existing?.processed_at) {
            return jsonResponse({ ok: true, already_processed: true }, 200);
          }
          // Mid-flight — tell Paystack to retry.
          return jsonResponse({ error: 'in_progress' }, 409);
        }
        console.error('[router] subscription claim failed', { refKey, eventType, error: claimError.message });
        return jsonResponse({ error: 'claim_failed', detail: claimError.message }, 500);
      }

      const result = await handleSubscriptionEvent(
        event as { event: string; data: any },
        admin,
      );

      if (result.ok) {
        await admin
          .from('paystack_webhook_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('paystack_reference', refKey)
          .eq('event_type', eventType);
      }

      return jsonResponse(result.body, result.status);
    }

    // Unreachable: routeEvent only returns one of the three targets above.
    return jsonResponse({ error: 'unreachable' }, 500);
  } catch (e) {
    const message = (e as { message?: string })?.message ?? 'unknown';
    console.error('[router] error:', message, e);
    return jsonResponse({ error: 'internal_error', message }, 500);
  }
});
