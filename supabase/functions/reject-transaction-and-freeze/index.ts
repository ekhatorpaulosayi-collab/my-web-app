// reject-transaction-and-freeze
//
// Reviewer endpoint. Rejects a high-value transaction AND freezes the vendor
// store. Used when the reviewer determines the transaction is fraud, money
// laundering, or otherwise illegitimate.
//
// State machine: only pending→rejected is permitted. approved→rejected is
// refused (post-approval recovery is a different workflow; build a separate
// reverse-approval-and-refund endpoint in Session 3+ when needed).
//
// Tech debt note (§3.4): hard-coded reviewer UUID is brittle; Session 3
// replaces it with a `reviewers` table. Session 3 also adds an `unfreeze-store`
// endpoint and an audit_log table for re-freeze tracking.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REASON_MAX_LENGTH = 2000;

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
  const REVIEWER_USER_ID = Deno.env.get('REVIEWER_USER_ID');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !REVIEWER_USER_ID) {
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

  // 2. Reviewer check.
  if (String(user.id) !== String(REVIEWER_USER_ID)) {
    return jsonResponse({ error: 'forbidden_not_reviewer' }, 403);
  }

  // 3. Parse + validate body.
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  const { split_transaction_id, freeze_reason } = body || {};
  if (!split_transaction_id) {
    return jsonResponse({ error: 'missing_split_transaction_id' }, 400);
  }
  if (!freeze_reason || typeof freeze_reason !== 'string' || freeze_reason.trim().length === 0) {
    return jsonResponse({ error: 'missing_freeze_reason', detail: 'A non-empty reason is required for rejection.' }, 400);
  }
  if (freeze_reason.length > REASON_MAX_LENGTH) {
    return jsonResponse({ error: 'reason_too_long', max: REASON_MAX_LENGTH }, 400);
  }

  // 4. Atomic rejection + freeze via RPC.
  const { data: rpcResult, error: rpcError } = await admin.rpc('reject_review_and_freeze', {
    p_split_id:    split_transaction_id,
    p_reviewer_id: REVIEWER_USER_ID,
    p_reason:      freeze_reason,
  });

  if (rpcError) {
    console.error('reject_review_and_freeze rpc failed', {
      split_id: split_transaction_id,
      reviewer_id: REVIEWER_USER_ID,
      error: rpcError.message,
    });
    return jsonResponse({ error: 'rpc_failed', detail: rpcError.message }, 500);
  }

  // RPC returns an error envelope for state-machine refusals.
  if (rpcResult?.error) {
    const errorToStatus = {
      split_not_found:        404,
      store_not_found:        404,
      review_not_required:    412,
      cannot_reject_approved: 409,
    };
    const status = errorToStatus[rpcResult.error] || 400;
    return jsonResponse(rpcResult, status);
  }

  // 5. Structured success log — this is a high-stakes administrative action.
  console.log('review_rejected_and_store_frozen', {
    split_id:                  split_transaction_id,
    reviewer_id:               REVIEWER_USER_ID,
    store_id:                  rpcResult?.store_id,
    order_id:                  rpcResult?.order_id,
    amount_total_kobo:         rpcResult?.amount_total_kobo,
    store_was_already_frozen:  rpcResult?.store_was_already_frozen === true,
    already_rejected:          rpcResult?.already_rejected === true,
    reason_length:             freeze_reason.length,
  });

  // 6. Stub vendor notification. Session 5+ wires real WhatsApp notification
  // using the existing notification path. For now we log the intent so
  // Session 5 can grep for these.
  if (rpcResult?.store_was_already_frozen === false && rpcResult?.already_rejected !== true) {
    console.log('vendor_notification_pending', {
      kind:       'store_frozen',
      store_id:   rpcResult?.store_id,
      reason:     freeze_reason,
      channel:    'whatsapp',
      session5:   true,
    });
  }

  return jsonResponse(rpcResult);
});
