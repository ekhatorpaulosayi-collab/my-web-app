// resolve-bank-account
//
// Session 1 stub. Returns a mock account_name to the caller but does NOT
// persist to bank_accounts. The bank_accounts table is meant to hold only
// Paystack-verified data; persisting mock entries here would poison the
// cache for Session 2 consumers.
//
// Session 2 replaces the mock block with a real GET to
// https://api.paystack.co/bank/resolve?account_number=...&bank_code=...
// and persists the verified result.

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

function isValidAccountNumber(s) {
  return typeof s === 'string' && /^\d{10}$/.test(s);
}

function isValidBankCode(s) {
  return typeof s === 'string' && /^\d{3}$/.test(s);
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
    return jsonResponse({ error: 'invalid_bank_code', detail: 'Must be exactly 3 digits' }, 400);
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

  // 4. SESSION 1 MOCK: return a deterministic mock name without persisting.
  // Session 2 replaces this block with a real Paystack call AND persists the
  // verified result to bank_accounts. Do NOT persist mock data — bank_accounts
  // is meant to be a trustworthy cache of Paystack-verified entries only.
  //
  // SESSION 2 TODO: add per-user rate limiting on this endpoint. Paystack
  // charges per /bank/resolve call in production, and an unrate-limited
  // endpoint enables account-number harvesting attacks.
  const mockName = 'MOCK ACCOUNT - ' + account_number.slice(-4);

  console.log('bank_account_resolve', {
    store_id,
    user_id: user.id,
    bank_code,
    account_number_last4: account_number.slice(-4),
    mock: true,
  });

  return jsonResponse({
    account_name: mockName,
    mock: true,
    persisted: false,
  });
});
