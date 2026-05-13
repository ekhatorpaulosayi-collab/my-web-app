// paystack-subaccount-webhook
//
// Session 1. Verifies HMAC (constant-time), then routes events:
//   - charge.success → admin.rpc('record_successful_payment') — atomic claim
//     + order/split update + velocity increment under row lock.
//   - charge.failed  → inline atomic claim + idempotent failure UPDATEs.
//   - transfer.success → Session 7 will handle; logged + marked processed.
//   - anything else → logged with payload reference + marked processed.
//
// SEPARATE from supabase/functions/paystack-webhook/ (subscriptions), per the
// Section 4.3 split decision.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha512Hex(secret, message) {
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

// Constant-time hex string comparison. String !== leaks information via early
// exit on first mismatched character; this XORs every byte regardless.
function timingSafeEqualHex(a, b) {
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

  const ENABLE = Deno.env.get('ENABLE_PAYSTACK_SUBACCOUNTS') === 'true';
  if (!ENABLE) {
    return jsonResponse({ error: 'feature_disabled' }, 503);
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  if (!signature) {
    return jsonResponse({ error: 'no_signature' }, 401);
  }

  // 1. HMAC verification — constant-time compare.
  const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
  if (!timingSafeEqualHex(expected, signature)) {
    return jsonResponse({ error: 'bad_signature' }, 401);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const eventType = event?.event;
  const reference = event?.data?.reference;
  if (!eventType || !reference) {
    return jsonResponse({ error: 'missing_event_or_reference' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 2. Route by event type.
  if (eventType === 'charge.success') {
    // Atomic: claim + order + split + velocity, all in one transaction.
    const { data: rpcResult, error: rpcError } = await admin.rpc('record_successful_payment', {
      p_reference: reference,
      p_event_type: eventType,
      p_payload: event,
    });
    if (rpcError) {
      console.error('record_successful_payment failed', { reference, error: rpcError.message });
      return jsonResponse({ error: 'rpc_failed', detail: rpcError.message }, 500);
    }
    console.log('webhook_processed', { eventType, reference, result: rpcResult });
    return jsonResponse({ ok: true, ...(rpcResult || {}) });
  }

  // For non-success events we do a smaller inline claim — same ON CONFLICT
  // semantics, no velocity work needed.
  const { error: claimError } = await admin
    .from('paystack_webhook_events')
    .insert({
      paystack_reference: reference,
      event_type: eventType,
      payload: event,
      processed_at: null,
    });

  if (claimError) {
    // Unique violation → already claimed by a previous delivery. Treat as
    // idempotent success.
    if (claimError.code === '23505') {
      const { data: existing } = await admin
        .from('paystack_webhook_events')
        .select('processed_at')
        .eq('paystack_reference', reference)
        .eq('event_type', eventType)
        .maybeSingle();
      if (existing?.processed_at) {
        return jsonResponse({ ok: true, already_processed: true });
      }
      // Row exists but not yet processed — another delivery is mid-flight.
      // 409 tells Paystack to retry.
      return jsonResponse({ error: 'in_progress' }, 409);
    }
    console.error('webhook_claim_failed', { reference, eventType, error: claimError.message });
    return jsonResponse({ error: 'claim_failed', detail: claimError.message }, 500);
  }

  // SESSION 5 TODO: wrap charge.failed in a record_failed_payment RPC
  // mirroring record_successful_payment (claim + idempotent UPDATEs +
  // mark processed, no velocity). Current inline path has a stuck-state
  // bug: if the orders/splits UPDATEs throw after the claim insert
  // succeeds, processed_at stays NULL forever and subsequent deliveries
  // return 409 in_progress indefinitely. Not a money-loss bug (failed
  // payments don't move money), but a manual DB cleanup if it happens.
  if (eventType === 'charge.failed') {
    await admin.from('orders')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
      .eq('status', 'pending');

    await admin.from('paystack_split_transactions')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
      .eq('status', 'pending');

    // SESSION 5 TODO: if (splitRows.length !== 1) warn — multi-store
    // marketplace case will need different handling.
  } else if (eventType === 'transfer.success') {
    // Session 7: mark vendor settlements as confirmed.
  } else {
    // Unknown event type — log so we notice new Paystack events in production
    // and can add explicit handlers.
    console.log('webhook_unknown_event_type', { eventType, reference });
  }

  // 3. Mark processed.
  await admin
    .from('paystack_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('paystack_reference', reference)
    .eq('event_type', eventType);

  console.log('webhook_processed', { eventType, reference });
  return jsonResponse({ ok: true });
});
