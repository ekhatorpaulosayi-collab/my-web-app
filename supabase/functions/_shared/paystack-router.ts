// Shared router for Paystack webhook events. Returns the handler name.
// Pure function — no side effects, no DB calls. Used by
// paystack-webhook-router to dispatch HMAC-verified events to the
// appropriate handler module.
//
// Disambiguation rules (in evaluation order):
//   1. event prefix subscription.* → subscription
//   2. event prefix invoice.*      → subscription (recurring billing)
//   3. event prefix transfer.*     → subaccount (vendor settlements)
//   4. charge.success | charge.failed → inspect payload:
//      a. data.plan is a NON-EMPTY object → subscription
//         (subaccount charges always carry data.plan as {} — empty literal —
//          so absence-check is insufficient; must test Object.keys length)
//      b. data.subaccount.subaccount_code truthy → subaccount
//      c. data.reference starts with 'ord_' (F3 prefix) → subaccount
//      d. data.metadata.order_id truthy → subaccount
//   5. anything else → unknown (logged + 200, no handler call)

export type PaystackHandlerTarget = 'subaccount' | 'subscription' | 'unknown';

export function routeEvent(event: { event?: string; data?: any }): PaystackHandlerTarget {
  const eventType = event?.event || '';
  const data = event?.data || {};

  if (eventType.startsWith('subscription.')) return 'subscription';
  if (eventType.startsWith('invoice.')) return 'subscription';
  if (eventType.startsWith('transfer.')) return 'subaccount';

  if (eventType === 'charge.success' || eventType === 'charge.failed') {
    if (data.plan && typeof data.plan === 'object' && Object.keys(data.plan).length > 0) {
      return 'subscription';
    }
    if (data.subaccount?.subaccount_code) {
      return 'subaccount';
    }
    if (typeof data.reference === 'string' && data.reference.startsWith('ord_')) {
      return 'subaccount';
    }
    if (data.metadata?.order_id) {
      return 'subaccount';
    }
  }

  return 'unknown';
}
