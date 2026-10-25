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
import { chargeSuccessOutcome } from './moneyPolicies.ts';

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
      const failed = chargeSuccessOutcome(false, false);
      return { ok: false, status: failed.httpStatus, body: { error: 'rpc_failed', detail: rpcError.message } };
    }
    // Payment is already recorded. A stock failure must not 500, or Paystack
    // retries the charge and can double-apply side effects. Queue the reference
    // (migration 10) and return 200. apply_storefront_inventory is idempotent
    // on paystack reference, so a later replay is safe.
    const { error: inventoryError } = await admin.rpc('apply_storefront_inventory', {
      p_reference: reference,
    });
    const outcome = chargeSuccessOutcome(true, Boolean(inventoryError));
    let inventoryQueued = false;
    if (outcome.queueInventory && inventoryError) {
      const missing = /apply_storefront_inventory|PGRST202|42883/i.test(inventoryError.message || '');
      console.error('apply_storefront_inventory failed', { reference, error: inventoryError.message, missing });
      const { error: queueError } = await admin
        .from('storefront_inventory_queue')
        .upsert({
          paystack_reference: reference,
          last_error: String(inventoryError.message || 'inventory_failed').slice(0, 500),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'paystack_reference' });
      if (queueError) {
        console.error('inventory queue insert failed', { reference, error: queueError.message });
      }
      inventoryQueued = true;
    }
    console.log('webhook_processed', { eventType, reference, result: rpcResult, inventoryQueued });
    return { ok: true, status: outcome.httpStatus, body: { ok: true, inventory_queued: inventoryQueued, ...(rpcResult || {}) } };
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
