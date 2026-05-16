// initiate-storefront-payment
//
// Session 3: computes the capped split (§2 + §4.2 of the design doc),
// inserts orders / order_items / paystack_split_transactions rows,
// and calls Paystack POST /transaction/initialize with bearer=account
// so that Storehouse's main account absorbs Paystack's processing
// fee. Returns the real Paystack authorization_url to the client.
//
// Anonymous OK — storefront customers aren't logged in.
//
// transaction_charge sent to Paystack is Storehouse's take only,
// computed on the SUBTOTAL (merchant product price) not the
// customer-facing total. Storehouse bps applies to what the vendor
// is actually selling.
//
// Paystack errors never leak through the response body. Full
// diagnostics go to server logs only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logPaystackInteraction } from '../_shared/paystack-logger.ts';
import { resolveActiveTier, TierResolverError } from '../_shared/tier-resolver.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_INITIALIZE_URL = 'https://api.paystack.co/transaction/initialize';
const PAYSTACK_TIMEOUT_MS = 5000;

// In-memory IP rate limiter: 20 requests per 60s window per IP.
// Higher than F1/F2 because customers hit this endpoint multiple
// times in a normal checkout flow (back/forward, retry on slow
// network).
// TODO(scale-out): per-isolate Map. Replace with Upstash Redis (or
// Supabase rate-limit service) before merchant #2.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const bucket = (rateLimitBuckets.get(ip) || []).filter((t) => t > cutoff);
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  rateLimitBuckets.set(ip, bucket);
  return true;
}

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

  // Universal join key for outbound+response rows in paystack_logs.
  const correlation_id = crypto.randomUUID();

  const ENABLE = Deno.env.get('ENABLE_PAYSTACK_SUBACCOUNTS') === 'true';
  if (!ENABLE) {
    return jsonResponse({ error: 'feature_disabled' }, 503);
  }

  // Rate limit by client IP.
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'rate_limited', message: 'Too many checkout attempts. Please wait a minute and try again.' }, 429);
  }

  // TODO(remove-before-merchant-2): BYPASS_KYC_FOR_SMOKE skips the
  // kyc_status gate so smoke tests on a stock store can exercise
  // the Paystack path end-to-end. MUST be unset before any non-Paul
  // merchant onboards.
  const BYPASS_KYC = Deno.env.get('BYPASS_KYC_FOR_SMOKE') === 'true';

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
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

  // 1. Validate store: per-store gate, not frozen, KYC approved.
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id, user_id, paystack_subaccounts_enabled, frozen, kyc_status')
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
  if (!BYPASS_KYC && store.kyc_status !== 'approved') {
    return jsonResponse({ error: 'kyc_not_approved' }, 412);
  }
  if (BYPASS_KYC) {
    console.warn('kyc_bypass_active', { store_id });
  }

  // 2. Resolve effective subscription tier + platform fee config
  // via the shared helper. Parity with F2.
  let resolvedTier;
  try {
    resolvedTier = await resolveActiveTier(admin, store.user_id);
  } catch (e) {
    if (e instanceof TierResolverError) {
      return jsonResponse({ error: 'no_fee_config_for_tier', tier: e.tier }, 500);
    }
    throw e;
  }
  const tier = resolvedTier.tier_id;
  const feeConfig = resolvedTier.fee_config;

  // 2.5 Tier guard (KYC v1 step 4). Paid plans only. If the store
  // owner has downgraded, no Paystack initialization happens —
  // the merchant sees a clear "re-upgrade to receive payments"
  // message rather than an opaque Paystack error.
  if (tier === 'free') {
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'initiate-storefront-payment',
      direction: 'outbound',
      paystack_endpoint: 'N/A',
      error_tag: 'tier_not_paid',
      store_id,
      user_id: store.user_id,
    });
    return jsonResponse({
      error: 'subscription_required',
      message: 'Your subaccount is paused. Please re-upgrade to receive payments.',
    }, 403);
  }

  // 4. Look up subaccount — must be active=TRUE (Storehouse reviewer
  // approval, separate from Paystack-side verification).
  const { data: subaccount, error: subError } = await admin
    .from('paystack_subaccounts')
    .select('*')
    .eq('store_id', store_id)
    .eq('active', true)
    .maybeSingle();
  if (subError || !subaccount) {
    return jsonResponse({ error: 'no_active_subaccount' }, 412);
  }
  // Defensive — schema marks subaccount_code NOT NULL, but a NULL
  // here would mean a partial Paystack response slipped through.
  if (!subaccount.paystack_subaccount_code) {
    console.error('subaccount_code_null', { store_id, subaccount_id: subaccount.id });
    return jsonResponse({ error: 'no_active_subaccount' }, 412);
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
    return jsonResponse({
      error: 'daily_cap_exceeded',
      message: "You've reached today's transaction limit. New orders can be accepted tomorrow.",
    }, 429);
  }

  // 7. Free-tier monthly cap.
  if (feeConfig.monthly_volume_cap_kobo !== null) {
    if (Number(velocity.current_month_volume_kobo) + customerTotalKobo > Number(feeConfig.monthly_volume_cap_kobo)) {
      return jsonResponse({
        error: 'monthly_cap_exceeded',
        message: "You've reached this month's transaction limit. New orders can be accepted next month.",
      }, 429);
    }
  }

  // 8. High-value review flag.
  const requiresReview = customerTotalKobo >= Number(feeConfig.large_transaction_review_threshold_kobo);

  // Atomicity boundary: this function executes 3 DB inserts followed
  // by a Paystack API call. Failure modes:
  //   (1) Any DB insert fails → currently not wrapped in a transaction.
  //       PostgREST does not expose multi-statement transactions; the
  //       fix is a new RPC like initiate_storefront_order(...) that
  //       runs all 3 inserts in one server-side transaction. Scope
  //       deferred from Session 3.
  //   (2) DB inserts succeed but Paystack call fails → orphan rows
  //       exist with status='pending' and paystack_reference set to
  //       our ord_<uuid> (which Paystack never echoes back, so the
  //       webhook handler will never resolve them). Reconciliation
  //       cron handles cleanup. See PAYSTACK-DEBUG.md §10.1.
  //   (3) Paystack call succeeds but our DB updates fail → webhook
  //       handler defensive code reconciles via Paystack reference
  //       lookup. See §10.2.
  //
  // TODO(orphan-reconcile): Cron job to delete orders with
  // status='pending' AND created_at < NOW() - INTERVAL '1 hour' AND
  // paystack_reference matches our 'ord_' prefix but has no
  // corresponding successful paystack_split_transactions row.
  // Implement in Session 4 or 5 before any merchant onboards.
  // Tracked in PAYSTACK-DEBUG.md §10.1.
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

  // 12. Call Paystack POST /transaction/initialize with bearer=account
  // (Storehouse main account absorbs Paystack's processing fee).
  // transaction_charge is Storehouse's take only, computed on the
  // SUBTOTAL (merchant price), capped at feeConfig.cap_kobo. The
  // subaccount receives gross - transaction_charge - Paystack_fees.
  //
  // §13.1 fee-base verification still unresolved (see
  // docs/PAYSTACK-DEBUG.md §11). If Paystack's wholesale fee is
  // computed on customer_total rather than subtotal, the split row
  // we inserted at step 11 will be off by ~paystackTakeKobo. We'll
  // reconcile from the webhook event later.
  const transactionChargeKobo = Math.min(
    Math.floor(subtotalKobo * feeConfig.basis_points / 10000),
    Number(feeConfig.cap_kobo),
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
  const paystackPayload = {
    email: customer_email,
    amount: customerTotalKobo,
    currency: 'NGN',
    reference,
    subaccount: subaccount.paystack_subaccount_code,
    transaction_charge: transactionChargeKobo,
    // Storehouse main account bears Paystack's processing fee.
    // CAVEAT: per Paystack's API, a subaccount-level bearer setting
    // (configured at subaccount creation or via PUT /subaccount/{code})
    // can OVERRIDE this per-transaction value. Smoke testing on
    // 2026-05-14 verified that our request of "account" was overridden
    // to "subaccount" on the live response — meaning Paul's
    // subaccount has a subaccount-level bearer policy in effect.
    // TODO(bearer-policy): decide whether to (a) update Paul's
    // subaccount to bearer=account via Paystack dashboard so this
    // request is honoured, or (b) change our intent to "subaccount"
    // to match what's actually happening. Resolve alongside §13.1
    // fee-base verification.
    bearer: 'account',
    metadata: {
      order_id: order.id,
      store_id,
      customer_phone,
      customer_name: customer_name || null,
    },
  };

  await logPaystackInteraction(admin, {
    correlation_id,
    function_name: 'initiate-storefront-payment',
    direction: 'outbound',
    paystack_endpoint: PAYSTACK_INITIALIZE_URL,
    http_method: 'POST',
    paystack_reference: reference,
    store_id,
    user_id: store.user_id,
    order_id: order.id,
    request_body: paystackPayload,
  });

  const startedAt = Date.now();
  let paystackStatus = 0;
  let paystackBody: any = null;
  let rawText: string | null = null;
  try {
    const res = await fetch(PAYSTACK_INITIALIZE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
      signal: controller.signal,
    });
    paystackStatus = res.status;
    try {
      paystackBody = await res.json();
    } catch {
      paystackBody = null;
      try {
        rawText = await res.text();
      } catch {
        rawText = null;
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
    const isTimeout = (e as any)?.name === 'AbortError';
    console.error('paystack_initialize_fetch_failed', {
      order_id: order.id,
      store_id,
      reference,
      timeout: isTimeout,
      error: (e as any)?.message,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'initiate-storefront-payment',
      direction: 'response',
      paystack_endpoint: PAYSTACK_INITIALIZE_URL,
      http_method: 'POST',
      paystack_reference: reference,
      store_id,
      user_id: store.user_id,
      order_id: order.id,
      error_tag: isTimeout ? 'fetch_timeout' : 'fetch_failed',
      error_message: (e as any)?.message ?? null,
      duration_ms: Date.now() - startedAt,
    });
    return jsonResponse({ error: 'busy', message: 'Checkout is busy. Please try again in a moment.' }, 503);
  }
  clearTimeout(timeoutId);

  const responseBodyForLog =
    paystackBody !== null
      ? paystackBody
      : rawText !== null
        ? { raw_text: rawText, parse_failed: true }
        : null;
  const responseDurationMs = Date.now() - startedAt;

  if (paystackStatus === 422) {
    console.log('paystack_initialize_invalid', {
      order_id: order.id,
      store_id,
      reference,
      paystack_message: paystackBody?.message,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'initiate-storefront-payment',
      direction: 'response',
      paystack_endpoint: PAYSTACK_INITIALIZE_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      paystack_reference: reference,
      store_id,
      user_id: store.user_id,
      order_id: order.id,
      error_tag: 'paystack_initialize_validation_failed',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({
      error: 'checkout_rejected',
      message: "Couldn't start the payment. Please check your details and try again.",
    });
  }

  if (paystackStatus === 429) {
    console.warn('paystack_initialize_rate_limited', { order_id: order.id, store_id, reference });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'initiate-storefront-payment',
      direction: 'response',
      paystack_endpoint: PAYSTACK_INITIALIZE_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      paystack_reference: reference,
      store_id,
      user_id: store.user_id,
      order_id: order.id,
      error_tag: 'paystack_initialize_rate_limited',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({ error: 'busy', message: 'Checkout is busy. Please try again in a moment.' }, 503);
  }

  if (paystackStatus !== 200 && paystackStatus !== 201) {
    console.error('paystack_initialize_unexpected', {
      order_id: order.id,
      store_id,
      reference,
      paystack_status: paystackStatus,
      paystack_body: paystackBody,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'initiate-storefront-payment',
      direction: 'response',
      paystack_endpoint: PAYSTACK_INITIALIZE_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      paystack_reference: reference,
      store_id,
      user_id: store.user_id,
      order_id: order.id,
      error_tag: 'paystack_initialize_unexpected',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({ error: 'busy', message: 'Checkout is busy. Please try again in a moment.' }, 503);
  }
  const authorizationUrl: string | undefined = paystackBody?.data?.authorization_url;
  const accessCode: string | undefined = paystackBody?.data?.access_code;
  const paystackRef: string | undefined = paystackBody?.data?.reference;
  if (paystackBody?.status !== true || !authorizationUrl || !accessCode) {
    console.error('paystack_initialize_no_url', {
      order_id: order.id,
      store_id,
      reference,
      paystack_body: paystackBody,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'initiate-storefront-payment',
      direction: 'response',
      paystack_endpoint: PAYSTACK_INITIALIZE_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      paystack_reference: reference,
      store_id,
      user_id: store.user_id,
      order_id: order.id,
      error_tag: 'paystack_initialize_no_url',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({ error: 'busy', message: 'Checkout is busy. Please try again in a moment.' }, 503);
  }

  console.log('paystack_initialize_ok', {
    order_id: order.id,
    store_id,
    reference,
    paystack_reference: paystackRef,
    transaction_charge_kobo: transactionChargeKobo,
    tier,
  });

  await logPaystackInteraction(admin, {
    correlation_id,
    function_name: 'initiate-storefront-payment',
    direction: 'response',
    paystack_endpoint: PAYSTACK_INITIALIZE_URL,
    http_method: 'POST',
    http_status: paystackStatus,
    paystack_reference: reference,
    store_id,
    user_id: store.user_id,
    order_id: order.id,
    response_body: responseBodyForLog,
    duration_ms: responseDurationMs,
  });

  return jsonResponse({
    authorization_url: authorizationUrl,
    access_code: accessCode,
    reference,
    paystack_reference: paystackRef,
    customer_access_token: order.customer_access_token,
    breakdown: {
      subtotal_kobo: subtotalKobo,
      storehouse_take_kobo: storehouseTakeKobo,
      paystack_take_kobo: paystackTakeKobo,
      customer_total_kobo: customerTotalKobo,
      vendor_net_kobo: vendorNetKobo,
      transaction_charge_kobo: transactionChargeKobo,
      requires_review: requiresReview,
    },
    mock: false,
  });
});
