// resolve-bank-account
//
// Session 3: calls Paystack GET /bank/resolve with the test-mode secret
// key, returns the verified account name, and upserts the verified
// triple (store_id, bank_code, account_number) into bank_accounts.
//
// The function is still gated behind ENABLE_PAYSTACK_SUBACCOUNTS — the
// flag check runs first, so flag-off behavior is unchanged from
// Sessions 1/2 (returns 503).
//
// Paystack errors never leak through the response body. The client
// sees one of: a successful resolve, a friendly "couldn't verify"
// hint, or a generic "busy" 503. Full Paystack diagnostics go to
// server logs only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_RESOLVE_URL = 'https://api.paystack.co/bank/resolve';
const PAYSTACK_TIMEOUT_MS = 5000;

// In-memory IP rate limiter: 10 requests per 60s window per IP.
// TODO(scale-out): edge functions run as multiple isolates, so this
// map is per-instance, not global. Before flipping the feature flag
// to live mode for non-Paul merchants, replace with Upstash Redis
// (or Supabase rate-limit service if/when it ships) so the cap
// holds across instances. Account-number harvesting is the threat.
// TODO(thresholds): 10 req/min/IP is likely too aggressive for real
// users — fat-fingered account number 11+ times = locked out.
// Reconsider thresholds when wiring real rate-limiting service.
const RATE_LIMIT_MAX = 10;
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

function isValidAccountNumber(s) {
  return typeof s === 'string' && /^\d{10}$/.test(s);
}

function isValidBankCode(s) {
  return typeof s === 'string' && /^\d{3,6}$/.test(s);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ENABLE = Deno.env.get('ENABLE_PAYSTACK_SUBACCOUNTS') === 'true';
  if (!ENABLE) {
    return jsonResponse({ error: 'feature_disabled' }, 503);
  }

  // Rate limit by client IP. Edge function instance is per-region;
  // see TODO at top of file.
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'rate_limited', message: 'Too many bank lookups. Please wait a minute and try again.' }, 429);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  // 1. Auth: extract JWT, verify with service-role client.
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
  const { bank_code, account_number, store_id } = body || {};
  if (!bank_code || !account_number || !store_id) {
    return jsonResponse({ error: 'missing_fields' }, 400);
  }
  if (!isValidAccountNumber(account_number)) {
    return jsonResponse({ error: 'invalid_account_number', detail: 'Must be exactly 10 digits' }, 400);
  }
  if (!isValidBankCode(bank_code)) {
    return jsonResponse({ error: 'invalid_bank_code', detail: 'Must be 3-6 digits' }, 400);
  }

  // 3. Ownership check. RLS does not apply to service-role queries, so we
  // verify ownership explicitly.
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id, user_id')
    .eq('id', store_id)
    .single();
  if (storeError || !store) {
    return jsonResponse({ error: 'store_not_found' }, 404);
  }
  if (String(store.user_id) !== String(user.id)) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  // 4. Call Paystack /bank/resolve with a 5s timeout. All error paths
  // log full diagnostics server-side but return only generic messages
  // to the client.
  const last4 = account_number.slice(-4);
  const url = `${PAYSTACK_RESOLVE_URL}?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);

  let paystackStatus = 0;
  let paystackBody: any = null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      signal: controller.signal,
    });
    paystackStatus = res.status;
    try {
      paystackBody = await res.json();
    } catch {
      paystackBody = null;
    }
  } catch (e) {
    clearTimeout(timeoutId);
    const isTimeout = (e as any)?.name === 'AbortError';
    console.error('paystack_resolve_fetch_failed', {
      store_id,
      user_id: user.id,
      bank_code,
      account_number_last4: last4,
      timeout: isTimeout,
      error: (e as any)?.message,
    });
    return jsonResponse({ error: 'busy', message: 'Bank lookup is busy. Please try again in a moment.' }, 503);
  }
  clearTimeout(timeoutId);

  if (paystackStatus === 422) {
    console.log('paystack_resolve_invalid', {
      store_id,
      user_id: user.id,
      bank_code,
      account_number_last4: last4,
      paystack_message: paystackBody?.message,
    });
    return jsonResponse({
      error: 'account_not_verifiable',
      message: "Couldn't verify this account number. Please check and try again.",
      mock: false,
      persisted: false,
    });
  }

  if (paystackStatus === 429) {
    console.warn('paystack_resolve_rate_limited', {
      store_id,
      user_id: user.id,
      bank_code,
      account_number_last4: last4,
    });
    return jsonResponse({ error: 'busy', message: 'Bank lookup is busy. Please try again in a moment.' }, 503);
  }

  if (paystackStatus !== 200 || paystackBody?.status !== true || !paystackBody?.data?.account_name) {
    console.error('paystack_resolve_unexpected', {
      store_id,
      user_id: user.id,
      bank_code,
      account_number_last4: last4,
      paystack_status: paystackStatus,
      paystack_body: paystackBody,
    });
    return jsonResponse({ error: 'busy', message: 'Bank lookup is busy. Please try again in a moment.' }, 503);
  }

  const accountName: string = paystackBody.data.account_name;

  // 5. Upsert into bank_accounts. UNIQUE (store_id, bank_code,
  // account_number) means re-resolving the same triple refreshes
  // resolved_account_name + verified_at rather than failing.
  const { error: upsertError } = await admin
    .from('bank_accounts')
    .upsert(
      {
        store_id,
        bank_code,
        account_number,
        resolved_account_name: accountName,
        verified_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,bank_code,account_number' },
    );
  if (upsertError) {
    console.error('bank_accounts_upsert_failed', {
      store_id,
      user_id: user.id,
      bank_code,
      account_number_last4: last4,
      error: upsertError.message,
    });
    return jsonResponse({ error: 'busy', message: 'Bank lookup is busy. Please try again in a moment.' }, 503);
  }

  console.log('bank_account_resolve', {
    store_id,
    user_id: user.id,
    bank_code,
    account_number_last4: last4,
    mock: false,
    persisted: true,
  });

  return jsonResponse({
    account_name: accountName,
    mock: false,
    persisted: true,
  });
});
