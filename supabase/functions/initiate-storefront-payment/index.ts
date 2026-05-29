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

// Paystack pricing knobs. Customer absorbs Paystack's fee on top of
// subtotal; closed-form solves the self-reference between
// paystack_take (% of customer_total) and customer_total (subtotal +
// paystack_take + flat). See worked examples in PAYSTACK-DEBUG.md §11.
const FLAT_FEE_KOBO = 10000;             // ₦100 in kobo
const FLAT_FEE_THRESHOLD_KOBO = 250000;  // Paystack waives the flat fee below ₦2,500
const PAYSTACK_RATE = 0.015;             // 1.5% wholesale

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

  // Customer absorbs Paystack's percentage + (above ₦2,500) flat ₦100.
  // Closed-form: customer_total × (1 − rate) = subtotal + flat
  //              ⇒ customer_total = (subtotal + flat) / (1 − rate)
  // Storehouse take comes from vendor's share, capped per fee config.
  // feeConfig.paystack_wholesale_bps is intentionally NOT read here —
  // the closed-form embeds the 1.5% rate directly because the algebraic
  // identity below ties the formula to that specific constant.
  const flatKobo = subtotalKobo >= FLAT_FEE_THRESHOLD_KOBO ? FLAT_FEE_KOBO : 0;
  const customerTotalKobo = Math.round((subtotalKobo + flatKobo) / (1 - PAYSTACK_RATE));
  const paystackTakeKobo = customerTotalKobo - subtotalKobo;

  const storehouseTakeUncapped = Math.floor(subtotalKobo * feeConfig.basis_points / 10000);
  const storehouseTakeKobo = Math.min(storehouseTakeUncapped, Number(feeConfig.cap_kobo));
  const vendorNetKobo = subtotalKobo - storehouseTakeKobo;

  // Sanity invariant: the closed-form must have actually solved.
  // paystack_take should equal customer_total × rate + flat (within 1
  // kobo for Math.round error). If this fails, the algebra above is
  // wrong — fail closed rather than over/undercharge the customer.
  const expectedPaystackTakeKobo = Math.round(customerTotalKobo * PAYSTACK_RATE + flatKobo);
  if (Math.abs(paystackTakeKobo - expectedPaystackTakeKobo) > 1) {
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

  // 6.5 Velocity override lookup (KYC v1 step 5). Reviewer-granted
  // overrides supersede tier defaults for both daily and monthly
  // dimensions. Override bites whenever the dimension's column is
  // non-NULL — including the case where the tier default is NULL
  // (override can introduce a cap where none existed before, per
  // the v1.5 spec decision to honour grants regardless of direction).
  //
  // Most-recent active override wins (order by created_at DESC,
  // limit 1). Active = expires_at NULL OR > now().
  //
  // TODO(single-txn-cap-enforcement, KYC v1.5): The override table's
  // single_txn_cap_kobo column exists for Phase 2 reviewer UI forward
  // compatibility, but F3 does not currently enforce single-transaction
  // caps. Enforcement requires either (a) adding single_txn_cap_kobo to
  // platform_fee_config tier defaults (product decision), or (b)
  // accepting override-only semantics (a single-txn cap is only enforced
  // when an override sets it). Either path is a v1.5 task.
  const { data: override } = await admin
    .from('vendor_velocity_overrides')
    .select('id, daily_cap_kobo, monthly_cap_kobo, single_txn_cap_kobo, expires_at, reason')
    .eq('store_id', store_id)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectiveDailyCap = override?.daily_cap_kobo ?? velocity.daily_cap_kobo;
  const effectiveMonthlyCap = override?.monthly_cap_kobo ?? feeConfig.monthly_volume_cap_kobo;

  if (override) {
    console.log('velocity_override_applied', {
      store_id,
      override_id: override.id,
      override_daily_cap_kobo: override.daily_cap_kobo,
      override_monthly_cap_kobo: override.monthly_cap_kobo,
      override_single_txn_cap_kobo: override.single_txn_cap_kobo,
      override_expires_at: override.expires_at,
      override_reason: override.reason,
      effective_daily_cap_kobo: effectiveDailyCap,
      effective_monthly_cap_kobo: effectiveMonthlyCap,
    });
  }

  if (Number(velocity.current_day_volume_kobo) + customerTotalKobo > Number(effectiveDailyCap)) {
    return jsonResponse({
      error: 'daily_cap_exceeded',
      message: "You've reached today's transaction limit. New orders can be accepted tomorrow.",
    }, 429);
  }

  // 7. Monthly cap. Bites whenever effectiveMonthlyCap is non-NULL —
  // either the tier sets one (free tier), or an override introduces
  // one (any tier). Pro/Starter default = NULL (no monthly limit)
  // unless overridden.
  if (effectiveMonthlyCap !== null) {
    if (Number(velocity.current_month_volume_kobo) + customerTotalKobo > Number(effectiveMonthlyCap)) {
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

  // 12. Call Paystack POST /transaction/initialize.
  //
  // transaction_charge = storehouse_take + paystack_fee.
  //
  // Per Paystack docs (support article 2132802): "When a transaction is split
  // with one subaccount, the transaction fee is automatically charged to the
  // main account. If the main account receives a 0% percentage deduction, the
  // subaccount gets charged the transaction fee."
  //
  // Setting transaction_charge >= paystack_fee ensures the main slice has
  // enough balance for Paystack to deduct its fee from there, not from the
  // merchant's subaccount slice. Paystack's actual slice algorithm
  // (verified empirically in Session 8 spikes): subaccount = amount −
  // transaction_charge; integration = transaction_charge − paystack_fee.
  //
  // No +N pad is added. Phase 2B/2C empirically verified that for
  // transactions where Paystack's actual fee matches F3's prediction
  // (transactions at or above the ₦2,500 flat-fee threshold), the merchant
  // subaccount receives the clean expected amount (subtotal − storehouse_take).
  //
  // Edge case: on sub-₦2,500 transactions where Paystack's ceil-based fee
  // exceeds F3's Math.round-based paystackTakeKobo by 1 kobo, Paystack falls
  // back to bearer="subaccount" semantics and the merchant absorbs the
  // 1-kobo shortfall. Accepted trade-off (Session 8); documented in
  // PAYSTACK-DEBUG.md §11.4. A future Option-2 fix (Math.ceil on F3's
  // paystackTakeKobo derivation, customer absorbs the rounding) would
  // close this edge if it ever matters operationally.
  //
  // Verification refs (Session 8): zqd488sxbshceww, 8t3nqini3w07al7,
  // wxwxo4upw42zag5, xbmcosfdxorr82z, zktn723v3tg0n7p, tqi0t3rm6nelg9i
  // (pre-correction +1 pad), and the Phase 3-corrected post-redeploy
  // verification charge ref added to PAYSTACK-DEBUG.md §11.3.
  const transactionChargeKobo = storehouseTakeKobo + paystackTakeKobo;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
  const paystackPayload = {
    email: customer_email,
    amount: customerTotalKobo,
    currency: 'NGN',
    reference,
    subaccount: subaccount.paystack_subaccount_code,
    transaction_charge: transactionChargeKobo,
    // bearer='account' is Paystack's default. Sent explicitly for
    // documentation of intent; the main-slice-zero fallback rule above
    // is what actually governs fee routing on subaccount transactions.
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
      paystack_flat_kobo: flatKobo,
      customer_total_kobo: customerTotalKobo,
      vendor_net_kobo: vendorNetKobo,
      transaction_charge_kobo: transactionChargeKobo,
      requires_review: requiresReview,
    },
    mock: false,
  });
});
