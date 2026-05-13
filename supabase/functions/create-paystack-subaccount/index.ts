// create-paystack-subaccount
//
// Session 1 stub. Gated behind ENABLE_PAYSTACK_SUBACCOUNTS — when OFF, returns
// 503. When ON, validates the request, verifies caller owns the store and KYC
// state, then calls complete_subaccount_onboarding RPC which atomically
// creates subaccount + velocity row + flips the gating flag. Live Paystack
// /subaccount POST is wired in Session 2.

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

// Nigerian bank account numbers are exactly 10 digits.
function isValidAccountNumber(s) {
  return typeof s === 'string' && /^\d{10}$/.test(s);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ENABLE = Deno.env.get('ENABLE_PAYSTACK_SUBACCOUNTS') === 'true';
  if (!ENABLE) {
    return jsonResponse({ error: 'feature_disabled', detail: 'ENABLE_PAYSTACK_SUBACCOUNTS is off' }, 503);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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
  const { store_id, business_name, settlement_bank, account_number } = body || {};
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

  // 6. KYC.
  if (store.kyc_status !== 'approved') {
    return jsonResponse({ error: 'kyc_not_approved', kyc_status: store.kyc_status }, 412);
  }

  // 7. Cooling period (24 hours after KYC approval).
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
    // KYC status is 'approved' but no approval timestamp — schema invariant
    // violation. Fail closed.
    return jsonResponse({ error: 'kyc_approved_at_missing' }, 500);
  }

  // 8. Generate mock subaccount code. Session 2 replaces this with the real
  // POST to https://api.paystack.co/subaccount and uses the returned
  // subaccount_code instead.
  const mockCode = 'ACCT_mock_' + crypto.randomUUID().slice(0, 12);

  // 9. Atomic onboarding via RPC. RPC handles insert + velocity row + flag
  // flip + bidirectional FK in one transaction with race-safe ON CONFLICT.
  const { data: rpcResult, error: rpcError } = await admin.rpc('complete_subaccount_onboarding', {
    p_store_id:        store_id,
    p_settlement_bank: settlement_bank,
    p_account_number:  account_number,
    // SESSION 2 TODO: overwrite this with Paystack-resolved account name
    // (resolveAccountNumber endpoint). Session 1 mock values must not be
    // trusted as canonical.
    p_account_name:    business_name,
    p_mock_code:       mockCode,
  });

  if (rpcError) {
    console.error('complete_subaccount_onboarding failed', { store_id, error: rpcError.message });
    return jsonResponse({ error: 'rpc_failed', detail: rpcError.message }, 500);
  }

  console.log('subaccount_onboarded', {
    store_id,
    user_id: user.id,
    reused: rpcResult?.reused,
    mock: true,
  });

  return jsonResponse({
    subaccount: rpcResult?.subaccount,
    reused: rpcResult?.reused === true,
    mock: true,
  });
});
