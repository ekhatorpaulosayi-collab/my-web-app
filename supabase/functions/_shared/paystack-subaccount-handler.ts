// Shared handler for Paystack subaccount/storefront webhook events.
// Extracted from paystack-subaccount-webhook/index.ts so the dispatcher
// (paystack-webhook-router) can reuse the same per-event logic without
// re-verifying signatures or duplicating writes.
//
// Contract:
//   - Caller has already HMAC-verified the signature and JSON-parsed
//     the event. Do NOT verify again here.
//   - charge.success: the paystack_webhook_events idempotency claim
//     happens INSIDE the record_successful_payment RPC (atomic with
//     the order/split/velocity/sales updates). Caller MUST NOT
//     pre-claim — that would double-insert and break the RPC's
//     ROW_COUNT == 0 short-circuit.
//   - charge.failed / transfer.success / other: inline claim with
//     ON CONFLICT detection, same semantics as the legacy
//     paystack-subaccount-webhook.
//
// Return: { ok, status, body }. Caller writes the HTTP response.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SubaccountHandlerResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export async function handleSubaccountEvent(
  event: { event: string; data: any },
  admin: SupabaseClient,
): Promise<SubaccountHandlerResult> {
  const eventType = event?.event;
  const reference = event?.data?.reference;
  if (!eventType || !reference) {
    return { ok: false, status: 400, body: { error: 'missing_event_or_reference' } };
  }

  // charge.success: atomic RPC owns the claim + all writes.
  if (eventType === 'charge.success') {
    const { data: rpcResult, error: rpcError } = await admin.rpc('record_successful_payment', {
      p_reference: reference,
      p_event_type: eventType,
      p_payload: event,
    });
    if (rpcError) {
      console.error('record_successful_payment failed', { reference, error: rpcError.message });
      return { ok: false, status: 500, body: { error: 'rpc_failed', detail: rpcError.message } };
    }
    console.log('webhook_processed', { eventType, reference, result: rpcResult });
    return { ok: true, status: 200, body: { ok: true, ...(rpcResult || {}) } };
  }

  // Non-success events: inline claim with ON CONFLICT detection.
  const { error: claimError } = await admin
    .from('paystack_webhook_events')
    .insert({
      paystack_reference: reference,
      event_type: eventType,
      payload: event,
      processed_at: null,
    });

  if (claimError) {
    if (claimError.code === '23505') {
      const { data: existing } = await admin
        .from('paystack_webhook_events')
        .select('processed_at')
        .eq('paystack_reference', reference)
        .eq('event_type', eventType)
        .maybeSingle();
      if (existing?.processed_at) {
        return { ok: true, status: 200, body: { ok: true, already_processed: true } };
      }
      // Another delivery is mid-flight — tell Paystack to retry.
      return { ok: false, status: 409, body: { error: 'in_progress' } };
    }
    console.error('webhook_claim_failed', { reference, eventType, error: claimError.message });
    return { ok: false, status: 500, body: { error: 'claim_failed', detail: claimError.message } };
  }

  // SESSION 5 TODO (inherited from legacy handler): wrap charge.failed in a
  // record_failed_payment RPC. Current inline path has a stuck-state bug —
  // if the orders/splits UPDATEs throw after the claim insert succeeds,
  // processed_at stays NULL forever and subsequent deliveries return 409
  // in_progress indefinitely. Not a money-loss bug.
  if (eventType === 'charge.failed') {
    await admin.from('orders')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
      .eq('status', 'pending');

    await admin.from('paystack_split_transactions')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
      .eq('status', 'pending');
  } else if (eventType === 'transfer.success') {
    // Session 7: mark vendor settlements as confirmed. Currently a no-op
    // beyond the claim + mark-processed.
  } else {
    // Subaccount-side events the router thought belonged here but we
    // don't explicitly handle (e.g. transfer.failed, transfer.reversed).
    console.log('webhook_unknown_subaccount_event_type', { eventType, reference });
  }

  await admin
    .from('paystack_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('paystack_reference', reference)
    .eq('event_type', eventType);

  console.log('webhook_processed', { eventType, reference });
  return { ok: true, status: 200, body: { ok: true } };
}
