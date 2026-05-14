// create-paystack-subaccount
//
// Session 3: validates request + ownership + KYC + cooling period, looks
// up the caller's effective subscription tier, computes percentage_charge
// from platform_fee_config, calls Paystack POST /subaccount with the
// test-mode secret, then hands the real ACCT_ code to the
// complete_subaccount_onboarding RPC (which atomically writes the row,
// velocity record, and flips the per-store gate). Gated by
// ENABLE_PAYSTACK_SUBACCOUNTS — flag check runs first.
//
// Paystack errors never leak through the response body. Full
// diagnostics go to server logs only.
//
// TODO(orphan-reconcile): if Paystack POST succeeds but the RPC fails,
// the Paystack-side subaccount exists with no DB row. The RPC is
// idempotent on store_id so a retry overwrites cleanly, but a true
// reconcile job (cron that lists Paystack subaccounts and inserts
// missing rows) should land before merchant #2 onboards.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logPaystackInteraction } from '../_shared/paystack-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_SUBACCOUNT_URL = 'https://api.paystack.co/subaccount';
const PAYSTACK_TIMEOUT_MS = 5000;

// In-memory IP rate limiter: 5 requests per hour per IP.
// Looser threshold than resolve-bank-account (10/min) because
// subaccount creation is a rare per-user action.
// TODO(scale-out): edge function isolates each have their own Map.
// Replace with Upstash Redis (or Supabase rate-limit service) before
// merchant #2 onboards. Account-creation harvesting is the threat.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
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

// Nigerian bank account numbers are exactly 10 digits.
function isValidAccountNumber(s) {
  return typeof s === 'string' && /^\d{10}$/.test(s);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Universal join key for outbound+response rows in paystack_logs.
  const correlation_id = crypto.randomUUID();

  const ENABLE = Deno.env.get('ENABLE_PAYSTACK_SUBACCOUNTS') === 'true';
  if (!ENABLE) {
    return jsonResponse({ error: 'feature_disabled', detail: 'ENABLE_PAYSTACK_SUBACCOUNTS is off' }, 503);
  }

  // Rate limit by client IP.
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'rate_limited', message: 'Too many onboarding attempts. Please wait an hour and try again.' }, 429);
  }

  // TODO(remove-before-merchant-2): BYPASS_KYC_FOR_SMOKE skips the
  // kyc_status / cooling-period gate so smoke tests on a stock store
  // can exercise the Paystack path end-to-end. MUST be unset before
  // any non-Paul merchant onboards (Session 5 or earlier).
  const BYPASS_KYC = Deno.env.get('BYPASS_KYC_FOR_SMOKE') === 'true';

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  // 1. Auth: extract JWT from Authorization header, verify with service-role
  // client. No dual-client mixing — one admin client, one explicit JWT verify.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'unauthorized', detail: userError?.message }, 401);
  }
  const user = userData.user;

  // 2. Parse + validate body.
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  // Accept either bank_code (Session 3 client contract) or
  // settlement_bank (Session 1 contract) for the bank field. Paystack
  // calls this `settlement_bank` in their API, so that's the name we
  // use internally past validation.
  const { store_id, business_name, account_number } = body || {};
  const settlement_bank: string | undefined = body?.bank_code ?? body?.settlement_bank;
  if (!store_id || !business_name || !settlement_bank || !account_number) {
    return jsonResponse({ error: 'missing_fields' }, 400);
  }
  if (!isValidAccountNumber(account_number)) {
    return jsonResponse({ error: 'invalid_account_number', detail: 'Must be exactly 10 digits' }, 400);
  }
  if (typeof settlement_bank !== 'string' || settlement_bank.trim().length === 0) {
    return jsonResponse({ error: 'invalid_settlement_bank' }, 400);
  }

  // 3. Single combined SELECT on stores for ownership + state checks.
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id, user_id, kyc_status, kyc_approved_at, paystack_subaccounts_enabled, frozen')
    .eq('id', store_id)
    .single();
  if (storeError || !store) {
    return jsonResponse({ error: 'store_not_found' }, 404);
  }

  // 4. Ownership.
  if (String(store.user_id) !== String(user.id)) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  // 5. Frozen.
  if (store.frozen === true) {
    return jsonResponse({ error: 'store_frozen' }, 412);
  }

  // 6. KYC + cooling period — bypassable via BYPASS_KYC_FOR_SMOKE for
  // smoke testing on a stock store. Must remain a hard gate in prod.
  if (!BYPASS_KYC) {
    if (store.kyc_status !== 'approved') {
      return jsonResponse({ error: 'kyc_not_approved', kyc_status: store.kyc_status }, 412);
    }
    if (store.kyc_approved_at) {
      const elapsedMs = Date.now() - new Date(store.kyc_approved_at).getTime();
      const COOLING_MS = 24 * 60 * 60 * 1000;
      if (elapsedMs < COOLING_MS) {
        return jsonResponse({
          error: 'cooling_period_active',
          remaining_ms: COOLING_MS - elapsedMs,
        }, 425);
      }
    } else {
      // KYC status is 'approved' but no approval timestamp — schema
      // invariant violation. Fail closed.
      return jsonResponse({ error: 'kyc_approved_at_missing' }, 500);
    }
  } else {
    console.warn('kyc_bypass_active', { store_id, user_id: user.id });
  }

  // 7. Resolve caller's effective subscription tier. Treat anything
  // not active/non_renewing/trialing (or past period_end) as 'free'.
  // TODO(billing-dunning): add 'past_due' to the active set once the
  // dunning policy is decided.
  const { data: subRow } = await admin
    .from('user_subscriptions')
    .select('tier_id, status, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'non_renewing', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const periodOk =
    !subRow?.current_period_end || new Date(subRow.current_period_end).getTime() > Date.now();
  const effectiveTier: 'free' | 'starter' | 'pro' =
    subRow && periodOk && ['free', 'starter', 'pro'].includes(subRow.tier_id)
      ? (subRow.tier_id as 'free' | 'starter' | 'pro')
      : 'free';

  const { data: feeRow, error: feeErr } = await admin
    .from('platform_fee_config')
    .select('basis_points')
    .eq('tier', effectiveTier)
    .eq('active', true)
    .single();
  if (feeErr || !feeRow) {
    console.error('platform_fee_config_lookup_failed', { store_id, user_id: user.id, tier: effectiveTier, error: feeErr?.message });
    return jsonResponse({ error: 'busy', message: 'Onboarding is busy. Please try again in a moment.' }, 503);
  }
  // §13.1 fee-base verification is unresolved (see docs/PAYSTACK-DEBUG.md §11).
  // basis_points is Storehouse's take. Paystack's `percentage_charge`
  // field on /subaccount is the percentage that goes to the *main
  // account* (Storehouse). If §13.1 reveals the math should compute
  // against post-Paystack-fee net rather than gross, this value can
  // be updated later via Paystack's PUT /subaccount/{code}.
  //
  // Paystack /subaccount validates `percentage_charge` as a JSON
  // number, not a string. Stringified values produce a misleading
  // 400 "Account details are invalid" response. Send as Number.
  const percentageCharge: number = feeRow.basis_points / 100;

  // 8. Call Paystack POST /subaccount with a 5s timeout. All error
  // paths log full diagnostics server-side but return only generic
  // messages to the client.
  //
  // TODO(payload-extras): `description` and `primary_contact_email`
  // are intentionally NOT forwarded to Paystack until we verify
  // they don't trigger the 400 "Account details are invalid" error.
  // Re-add in a separate session by including each field one at a
  // time and smoke-testing after each. The values are still
  // accepted into our internal logging above; only the outbound
  // body is minimised.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
  const paystackPayload = {
    business_name,
    settlement_bank,
    account_number,
    percentage_charge: percentageCharge,
  };

  await logPaystackInteraction(admin, {
    correlation_id,
    function_name: 'create-paystack-subaccount',
    direction: 'outbound',
    paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
    http_method: 'POST',
    store_id,
    user_id: user.id,
    request_body: paystackPayload,
  });

  const startedAt = Date.now();
  let paystackStatus = 0;
  let paystackBody: any = null;
  let rawText: string | null = null;
  try {
    const res = await fetch(PAYSTACK_SUBACCOUNT_URL, {
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
    console.error('paystack_subaccount_fetch_failed', {
      store_id,
      user_id: user.id,
      tier: effectiveTier,
      timeout: isTimeout,
      error: (e as any)?.message,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'create-paystack-subaccount',
      direction: 'response',
      paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
      http_method: 'POST',
      store_id,
      user_id: user.id,
      error_tag: isTimeout ? 'fetch_timeout' : 'fetch_failed',
      error_message: (e as any)?.message ?? null,
      duration_ms: Date.now() - startedAt,
    });
    return jsonResponse({ error: 'busy', message: 'Onboarding is busy. Please try again in a moment.' }, 503);
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
    console.log('paystack_subaccount_invalid', {
      store_id,
      user_id: user.id,
      paystack_message: paystackBody?.message,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'create-paystack-subaccount',
      direction: 'response',
      paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      store_id,
      user_id: user.id,
      error_tag: 'paystack_subaccount_validation_failed',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({
      error: 'subaccount_creation_rejected',
      message: "Couldn't create your payout account. Please double-check the business name and bank details.",
    });
  }

  if (paystackStatus === 429) {
    console.warn('paystack_subaccount_rate_limited', { store_id, user_id: user.id });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'create-paystack-subaccount',
      direction: 'response',
      paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      store_id,
      user_id: user.id,
      error_tag: 'paystack_subaccount_rate_limited',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({ error: 'busy', message: 'Onboarding is busy. Please try again in a moment.' }, 503);
  }

  if (paystackStatus !== 200 && paystackStatus !== 201) {
    console.error('paystack_subaccount_unexpected', {
      store_id,
      user_id: user.id,
      paystack_status: paystackStatus,
      paystack_body: paystackBody,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'create-paystack-subaccount',
      direction: 'response',
      paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      store_id,
      user_id: user.id,
      error_tag: 'paystack_subaccount_unexpected',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({ error: 'busy', message: 'Onboarding is busy. Please try again in a moment.' }, 503);
  }
  if (paystackBody?.status !== true || !paystackBody?.data?.subaccount_code) {
    console.error('paystack_subaccount_no_code', {
      store_id,
      user_id: user.id,
      paystack_body: paystackBody,
    });
    await logPaystackInteraction(admin, {
      correlation_id,
      function_name: 'create-paystack-subaccount',
      direction: 'response',
      paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
      http_method: 'POST',
      http_status: paystackStatus,
      store_id,
      user_id: user.id,
      error_tag: 'paystack_subaccount_no_code',
      response_body: responseBodyForLog,
      duration_ms: responseDurationMs,
    });
    return jsonResponse({ error: 'busy', message: 'Onboarding is busy. Please try again in a moment.' }, 503);
  }

  const realCode: string = paystackBody.data.subaccount_code;

  await logPaystackInteraction(admin, {
    correlation_id,
    function_name: 'create-paystack-subaccount',
    direction: 'response',
    paystack_endpoint: PAYSTACK_SUBACCOUNT_URL,
    http_method: 'POST',
    http_status: paystackStatus,
    paystack_reference: realCode,
    store_id,
    user_id: user.id,
    response_body: responseBodyForLog,
    duration_ms: responseDurationMs,
  });

  // 9. Atomic onboarding via RPC. RPC handles insert + velocity row +
  // flag flip + bidirectional FK in one transaction with race-safe
  // ON CONFLICT. The p_mock_code parameter is named for Session 1 —
  // in Session 3 it carries the real ACCT_xxx code returned by
  // Paystack. Renaming would require a migration; the comment is
  // sufficient for now.
  const { data: rpcResult, error: rpcError } = await admin.rpc('complete_subaccount_onboarding', {
    p_store_id:        store_id,
    p_settlement_bank: settlement_bank,
    p_account_number:  account_number,
    // SESSION 3 NOTE: business_name is still used as the account_name
    // hint here. Callers should have already invoked resolve-bank-account
    // (Session 3 F1) to obtain the Paystack-verified account name and
    // can pass that as business_name if they want to canonicalise.
    p_account_name:    business_name,
    p_mock_code:       realCode,
  });

  if (rpcError) {
    console.error('complete_subaccount_onboarding failed', {
      store_id,
      user_id: user.id,
      paystack_subaccount_code: realCode,
      error: rpcError.message,
    });
    return jsonResponse({ error: 'busy', message: 'Onboarding is busy. Please try again in a moment.' }, 503);
  }

  console.log('subaccount_onboarded', {
    store_id,
    user_id: user.id,
    tier: effectiveTier,
    percentage_charge: percentageCharge,
    paystack_subaccount_code: realCode,
    reused: rpcResult?.reused,
    mock: false,
  });

  return jsonResponse({
    subaccount: rpcResult?.subaccount,
    reused: rpcResult?.reused === true,
    mock: false,
  });
});
