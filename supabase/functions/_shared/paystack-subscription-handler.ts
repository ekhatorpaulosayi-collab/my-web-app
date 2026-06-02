// Shared handler for Paystack subscription/billing webhook events.
// Extracted from paystack-webhook/index.ts so the dispatcher
// (paystack-webhook-router) can reuse the same per-event logic without
// re-verifying signatures.
//
// Contract:
//   - Caller has already HMAC-verified the signature and JSON-parsed
//     the event. Do NOT verify again here.
//   - The dispatcher pre-claims paystack_webhook_events for subscription
//     events (this side has no internal idempotency primitive — legacy
//     paystack-webhook never wrote to that table). This handler does
//     NOT claim; the dispatcher already did.
//
// Returns { ok, status, body }. The legacy handler always returned 200
// 'OK' regardless of internal early-returns (user-not-found, tier-not-
// found, etc.) — those are intentionally treated as silent skips per
// the original semantics. We preserve that behavior: caller-facing
// response is 200 unless we throw.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SubscriptionHandlerResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export async function handleSubscriptionEvent(
  event: { event: string; data: any },
  admin: SupabaseClient,
): Promise<SubscriptionHandlerResult> {
  const eventType = event?.event;
  if (!eventType) {
    return { ok: false, status: 400, body: { error: 'missing_event' } };
  }

  try {
    switch (eventType) {
      case 'subscription.create':
        await handleSubscriptionCreate(admin, event.data);
        break;
      case 'charge.success':
        await handleChargeSuccess(admin, event.data);
        break;
      case 'subscription.disable':
        await handleSubscriptionDisable(admin, event.data);
        break;
      case 'subscription.not_renew':
        await handleSubscriptionNotRenew(admin, event.data);
        break;
      case 'charge.failed':
        await handleChargeFailed(admin, event.data);
        break;
      default:
        // Subscription-side events the router thought belonged here but
        // we don't explicitly handle (e.g. invoice.create, invoice.update).
        console.log('[Webhook] Unhandled subscription event type:', eventType);
    }
    return { ok: true, status: 200, body: { ok: true } };
  } catch (error) {
    const message = (error as { message?: string })?.message ?? 'unknown';
    console.error('[Webhook] handler threw:', message, error);
    return { ok: false, status: 500, body: { error: 'handler_threw', detail: message } };
  }
}

// --- Per-event handlers (extracted verbatim from paystack-webhook/index.ts) ---

async function handleSubscriptionCreate(supabase: any, data: any) {
  console.log('[Webhook] Handling subscription.create');

  const { customer, plan, subscription_code } = data;

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('email', customer.email)
    .single();

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email);
    return;
  }

  const userId = userData.user_id;

  const { data: tierData, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('id, name')
    .or(`paystack_plan_code_monthly.eq.${plan.plan_code},paystack_plan_code_annual.eq.${plan.plan_code}`)
    .single();

  if (tierError || !tierData) {
    console.error('[Webhook] Tier not found for plan code:', plan.plan_code);
    return;
  }

  const billingCycle = plan.interval === 'annually' ? 'annual' : 'monthly';

  const { data: subData, error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: tierData.id,
      status: 'active',
      billing_cycle: billingCycle,
      payment_provider: 'paystack',
      payment_reference: subscription_code,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(data.next_payment_date).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('[Webhook] Error updating subscription:', updateError);
    return;
  }

  console.log(`[Webhook] Subscription created for user ${userId} - Tier: ${tierData.name}`);

  await trackAffiliateSale(supabase, userId, customer.email, userData.display_name, subData.id, tierData.name, plan.amount);
}

async function handleChargeSuccess(supabase: any, data: any) {
  console.log('[Webhook] Handling charge.success');

  const { customer, amount, reference, authorization } = data;

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single();

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email);
    return;
  }

  const userId = userData.user_id;

  const { data: subData } = await supabase
    .from('user_subscriptions')
    .select('id, tier_id, billing_cycle')
    .eq('user_id', userId)
    .single();

  const { error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: userId,
      amount: amount / 100,
      currency: 'NGN',
      status: 'success',
      payment_provider: 'paystack',
      payment_reference: reference,
      payment_method: authorization.channel,
      authorization_code: authorization.authorization_code,
      subscription_id: subData?.id,
      tier_id: subData?.tier_id,
      billing_cycle: subData?.billing_cycle,
      paystack_response: data,
      customer_email: customer.email,
      customer_code: customer.customer_code,
      completed_at: new Date().toISOString(),
    });

  if (txError) {
    console.error('[Webhook] Error recording transaction:', txError);
  }

  if (subData) {
    const { error: renewError } = await supabase
      .from('user_subscriptions')
      .update({
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (subData.billing_cycle === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subData.id);

    if (renewError) {
      console.error('[Webhook] Error renewing subscription:', renewError);
    } else {
      console.log(`[Webhook] Subscription renewed for user ${userId}`);
    }
  }

  console.log(`[Webhook] Payment recorded: ₦${amount / 100} for user ${userId}`);
}

async function handleSubscriptionDisable(supabase: any, data: any) {
  console.log('[Webhook] Handling subscription.disable');

  const { customer } = data;

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single();

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email);
    return;
  }

  const userId = userData.user_id;

  const { data: freeTier } = await supabase
    .from('subscription_tiers')
    .select('id')
    .eq('name', 'Free')
    .single();

  if (!freeTier) {
    console.error('[Webhook] Free tier not found');
    return;
  }

  const { error: downgradeError } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: freeTier.id,
      status: 'cancelled',
      billing_cycle: 'monthly',
      payment_reference: null,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (downgradeError) {
    console.error('[Webhook] Error downgrading subscription:', downgradeError);
    return;
  }

  console.log(`[Webhook] User ${userId} downgraded to FREE tier`);
}

async function handleSubscriptionNotRenew(supabase: any, data: any) {
  console.log('[Webhook] Handling subscription.not_renew');

  const { customer } = data;

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single();

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email);
    return;
  }

  const userId = userData.user_id;

  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[Webhook] Error updating subscription:', updateError);
    return;
  }

  console.log(`[Webhook] Subscription set to not renew for user ${userId}`);
}

async function handleChargeFailed(supabase: any, data: any) {
  console.log('[Webhook] Handling charge.failed');

  const { customer, amount, reference } = data;

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single();

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email);
    return;
  }

  const userId = userData.user_id;

  const { data: subData } = await supabase
    .from('user_subscriptions')
    .select('id, tier_id, billing_cycle')
    .eq('user_id', userId)
    .single();

  const { error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: userId,
      amount: amount / 100,
      currency: 'NGN',
      status: 'failed',
      payment_provider: 'paystack',
      payment_reference: reference,
      subscription_id: subData?.id,
      tier_id: subData?.tier_id,
      billing_cycle: subData?.billing_cycle,
      paystack_response: data,
      customer_email: customer.email,
      customer_code: customer.customer_code,
      failed_at: new Date().toISOString(),
    });

  if (txError) {
    console.error('[Webhook] Error recording failed transaction:', txError);
  }

  console.log(`[Webhook] Payment failed: ₦${amount / 100} for user ${userId}`);
}

async function trackAffiliateSale(
  supabase: any,
  userId: string,
  customerEmail: string,
  customerName: string | null,
  subscriptionId: string,
  planName: string,
  amountKobo: number,
) {
  try {
    const { data: affiliateClick, error: clickError } = await supabase
      .from('affiliate_clicks')
      .select('affiliate_id, affiliate_code')
      .eq('customer_id', userId)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clickError) {
      console.error('[Webhook] Error checking affiliate click:', clickError);
      return;
    }

    if (!affiliateClick) {
      console.log('[Webhook] No affiliate attribution found for user:', userId);
      return;
    }

    const commissionKobo = Math.floor(amountKobo * 0.30);

    const { error: saleError } = await supabase
      .from('affiliate_sales')
      .insert({
        affiliate_id: affiliateClick.affiliate_id,
        customer_id: userId,
        customer_email: customerEmail,
        customer_name: customerName,
        subscription_id: subscriptionId,
        plan_name: planName,
        sale_amount_kobo: amountKobo,
        commission_amount_kobo: commissionKobo,
        status: 'pending',
      });

    if (saleError) {
      console.error('[Webhook] Error creating affiliate sale:', saleError);
      return;
    }

    const { error: statsError } = await supabase.rpc('increment_affiliate_conversion', {
      p_affiliate_id: affiliateClick.affiliate_id,
      p_commission_kobo: commissionKobo,
    });

    if (statsError) {
      console.error('[Webhook] Error updating affiliate stats:', statsError);
    } else {
      console.log(`[Webhook] ✅ Affiliate sale tracked: ${affiliateClick.affiliate_code} - ₦${commissionKobo / 100} commission`);
    }
  } catch (error) {
    console.error('[Webhook] Error in trackAffiliateSale:', error);
  }
}
