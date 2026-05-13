// approve-transaction-for-fulfillment
//
// Reviewer endpoint. For high-value transactions where requires_review = true,
// the reviewer (hard-coded REVIEWER_USER_ID env var per §3.4) calls this to
// flip review_status to 'approved' and unblock order_items fulfillment for
// the vendor.
//
// Tech debt note (§3.4): hard-coded reviewer UUID is brittle; Session 3
// replaces it with a `reviewers` table.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NOTES_MAX_LENGTH = 2000;

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

  // 2. Reviewer check. Hard-coded single reviewer until Session 3 ships the
  // reviewers table.
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
  const { split_transaction_id, notes } = body || {};
  if (!split_transaction_id) {
    return jsonResponse({ error: 'missing_split_transaction_id' }, 400);
  }
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      return jsonResponse({ error: 'invalid_notes_type' }, 400);
    }
    if (notes.length > NOTES_MAX_LENGTH) {
      return jsonResponse({ error: 'notes_too_long', max: NOTES_MAX_LENGTH }, 400);
    }
  }

  // 4. Atomic approval via RPC.
  const { data: rpcResult, error: rpcError } = await admin.rpc('approve_review', {
    p_split_id:    split_transaction_id,
    p_reviewer_id: REVIEWER_USER_ID,
    p_notes:       notes || null,
  });

  if (rpcError) {
    console.error('approve_review rpc failed', {
      split_id: split_transaction_id,
      reviewer_id: REVIEWER_USER_ID,
      error: rpcError.message,
    });
    return jsonResponse({ error: 'rpc_failed', detail: rpcError.message }, 500);
  }

  // RPC returns an error envelope for state-machine refusals.
  if (rpcResult?.error) {
    const errorToStatus = {
      split_not_found:          404,
      review_not_required:      412,
      cannot_approve_rejected:  409,
    };
    const status = errorToStatus[rpcResult.error] || 400;
    return jsonResponse(rpcResult, status);
  }

  console.log('review_approved', {
    split_id:          split_transaction_id,
    reviewer_id:       REVIEWER_USER_ID,
    order_id:          rpcResult?.order_id,
    store_id:          rpcResult?.store_id,
    amount_total_kobo: rpcResult?.amount_total_kobo,
    already_approved:  rpcResult?.already_approved === true,
    notes_length:      notes ? notes.length : 0,
  });

  return jsonResponse(rpcResult);
});
