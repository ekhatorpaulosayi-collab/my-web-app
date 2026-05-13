// initiate-storefront-payment
//
// Session 1 stub. Computes the capped split (§2 + §4.2 of the design doc) and
// inserts orders / order_items / paystack_split_transactions rows, but returns
// a MOCK authorization_url instead of calling Paystack. Session 5 wires the
// real Paystack /transaction/initialize call.
//
// Anonymous OK — storefront customers aren't logged in.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ENABLE = Deno.env.get('ENABLE_PAYSTACK_SUBACCOUNTS') === 'true';
  if (!ENABLE) {
    return jsonResponse({ error: 'feature_disabled' }, 503);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const { store_id, items, customer_email, customer_phone, customer_name } = body || {};
  if (!store_id || !Array.isArray(items) || items.length === 0 || !customer_email || !customer_phone) {
    return jsonResponse({ error: 'missing_fields' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Validate store: enabled + not frozen.
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id, user_id, paystack_subaccounts_enabled, frozen')
    .eq('id', store_id)
    .single();
  if (storeError || !store) {
    return jsonResponse({ error: 'store_not_found' }, 404);
  }
  if (!store.paystack_subaccounts_enabled) {
    return jsonResponse({ error: 'store_not_onboarded' }, 412);
  }
  if (store.frozen) {
    return jsonResponse({ error: 'store_frozen' }, 412);
  }

  // 2. Look up tier via user_subscriptions.
  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('tier_id')
    .eq('user_id', store.user_id)
    .eq('status', 'active')
    .maybeSingle();
  const tier = sub?.tier_id || 'free';

  // 3. Look up platform_fee_config.
  const { data: feeConfig, error: feeError } = await admin
    .from('platform_fee_config')
    .select('*')
    .eq('tier', tier)
    .single();
  if (feeError || !feeConfig) {
    return jsonResponse({ error: 'no_fee_config_for_tier', tier }, 500);
  }

  // 4. Look up subaccount.
  const { data: subaccount, error: subError } = await admin
    .from('paystack_subaccounts')
    .select('*')
    .eq('store_id', store_id)
    .single();
  if (subError || !subaccount) {
    return jsonResponse({ error: 'no_subaccount' }, 412);
  }

  // 5. Compute totals — IN THIS EXACT ORDER. Each take is computed (and capped
  // where applicable) BEFORE the customer total. See §4.2 step 5 of the design
  // doc; deviating from this ordering re-introduces the cap-hit windfall bug.
  let subtotalKobo = 0;
  for (const it of items) {
    if (typeof it.quantity !== 'number' || typeof it.unit_price_kobo !== 'number'
        || it.quantity <= 0 || it.unit_price_kobo < 0 || !it.product_name) {
      return jsonResponse({ error: 'invalid_item', item: it }, 400);
    }
    subtotalKobo += it.quantity * it.unit_price_kobo;
  }
  if (subtotalKobo <= 0) {
    return jsonResponse({ error: 'zero_subtotal' }, 400);
  }

  const paystackTakeKobo = Math.floor(subtotalKobo * feeConfig.paystack_wholesale_bps / 10000);
  const storehouseTakeUncapped = Math.floor(subtotalKobo * feeConfig.basis_points / 10000);
  const storehouseTakeKobo = Math.min(storehouseTakeUncapped, Number(feeConfig.cap_kobo));
  const customerTotalKobo = subtotalKobo + storehouseTakeKobo + paystackTakeKobo;
  const vendorNetKobo = subtotalKobo;

  // Sanity invariant per §4.2 step 5.
  if (customerTotalKobo !== vendorNetKobo + storehouseTakeKobo + paystackTakeKobo) {
    return jsonResponse({ error: 'fee_math_drift' }, 500);
  }

  // 6. Velocity check. Defense in depth: if paystack_subaccounts_enabled is
  // true but the velocity row is missing (manual deletion, failed onboarding
  // backfill, etc.), fail closed rather than silently bypass the cap.
  const { data: velocity } = await admin
    .from('vendor_velocity_limits')
    .select('*')
    .eq('store_id', store_id)
    .maybeSingle();
  if (!velocity) {
    return jsonResponse({ error: 'velocity_row_missing' }, 500);
  }
  if (Number(velocity.current_day_volume_kobo) + customerTotalKobo > Number(velocity.daily_cap_kobo)) {
    return jsonResponse({ error: 'daily_cap_exceeded' }, 429);
  }

  // 7. Free-tier monthly cap.
  if (feeConfig.monthly_volume_cap_kobo !== null) {
    if (Number(velocity.current_month_volume_kobo) + customerTotalKobo > Number(feeConfig.monthly_volume_cap_kobo)) {
      return jsonResponse({ error: 'monthly_cap_exceeded' }, 429);
    }
  }

  // 8. High-value review flag.
  const requiresReview = customerTotalKobo >= Number(feeConfig.large_transaction_review_threshold_kobo);

  // SESSION 5 TODO: wrap inserts 9–11 (orders, order_items,
  // paystack_split_transactions) in a Supabase RPC transaction. Currently
  // these are three sequential inserts; a failure between them leaves an
  // orphan order or an order without a ledger entry. Acceptable for the
  // Session 1 mock flow where no money moves. Before Session 5 wires the
  // real Paystack /transaction/initialize call, this must be a single
  // atomic operation (Postgres function called via supabase.rpc()).
  // 9. Insert orders row.
  const reference = 'ord_' + crypto.randomUUID().replace(/-/g, '');
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      customer_email,
      customer_phone,
      customer_name: customer_name || null,
      total_amount_kobo: customerTotalKobo,
      paystack_reference: reference,
      order_type: 'storefront',
      primary_store_id: store_id,
      status: 'pending',
    })
    .select()
    .single();
  if (orderError || !order) {
    return jsonResponse({ error: 'order_insert_failed', detail: orderError?.message }, 500);
  }

  // 10. Insert order_items.
  const itemRows = items.map((it) => ({
    order_id: order.id,
    store_id,
    product_id: it.product_id || null,
    product_name: it.product_name,
    quantity: it.quantity,
    unit_price_kobo: it.unit_price_kobo,
    total_price_kobo: it.quantity * it.unit_price_kobo,
    vendor_can_fulfill: !requiresReview,
  }));
  const { error: itemsError } = await admin.from('order_items').insert(itemRows);
  if (itemsError) {
    return jsonResponse({ error: 'items_insert_failed', detail: itemsError.message }, 500);
  }

  // 11. Insert paystack_split_transactions row.
  const { error: splitError } = await admin.from('paystack_split_transactions').insert({
    order_id: order.id,
    store_id,
    paystack_reference: reference,
    amount_total_kobo: customerTotalKobo,
    amount_paystack_kobo: paystackTakeKobo,
    amount_storehouse_kobo: storehouseTakeKobo,
    amount_vendor_kobo: vendorNetKobo,
    status: 'pending',
    requires_review: requiresReview,
    review_status: requiresReview ? 'pending' : 'not_required',
  });
  if (splitError) {
    return jsonResponse({ error: 'split_insert_failed', detail: splitError.message }, 500);
  }

  // 12. SESSION 1 MOCK: return mock authorization_url.
  // Session 5 replaces this with a real POST to https://api.paystack.co/transaction/initialize
  // with body:
  //   {
  //     email, amount: customerTotalKobo, currency: 'NGN', reference,
  //     subaccount: subaccount.paystack_subaccount_code,
  //     transaction_charge: storehouseTakeKobo + paystackTakeKobo,
  //     bearer: 'subaccount',
  //     metadata: { order_id: order.id, store_id, customer_phone, customer_name }
  //   }
  return jsonResponse({
    authorization_url: 'https://paystack-mock.local/redirect/' + reference,
    reference,
    public_key: 'pk_mock',
    customer_access_token: order.customer_access_token,
    breakdown: {
      subtotal_kobo: subtotalKobo,
      storehouse_take_kobo: storehouseTakeKobo,
      paystack_take_kobo: paystackTakeKobo,
      customer_total_kobo: customerTotalKobo,
      vendor_net_kobo: vendorNetKobo,
      requires_review: requiresReview,
    },
    mock: true,
  });
});
