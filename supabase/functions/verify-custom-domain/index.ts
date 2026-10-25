// verify-custom-domain
//
// The only path that sets stores.custom_domain_verified = true.
// The owner saves the domain with set_store_custom_domain, which stores a
// token and leaves verified false. This function checks the DNS TXT record
// _storehouse.<domain> and, on a match, sets the flag with the service role.
//
// Deploy with verify_jwt left true (the app sends the user JWT). Read the
// flag back after deploy. Do not deploy from this branch.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function txtMatches(records: string[][], token: string): boolean {
  const accepted = new Set([token, `storehouse-verify=${token}`]);
  for (const row of records) {
    const value = row.join('').trim();
    for (const candidate of accepted) {
      if (tokensMatch(value, candidate)) return true;
    }
  }
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ verified: false, error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ verified: false, error: 'not_configured' }, 503);
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return jsonResponse({ verified: false, error: 'not_signed_in' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return jsonResponse({ verified: false, error: 'not_signed_in' }, 401);
  }

  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id, custom_domain, domain_verification_token, custom_domain_verified')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle();

  if (storeError || !store) {
    return jsonResponse({ verified: false, error: 'store_not_found' }, 404);
  }
  if (store.custom_domain_verified === true) {
    return jsonResponse({ verified: true });
  }

  const domain = String(store.custom_domain || '').trim().toLowerCase();
  const expected = String(store.domain_verification_token || '').trim();
  if (!domain || !expected) {
    return jsonResponse({
      verified: false,
      error: 'domain_not_pending',
      message: 'Save the domain first, then add the TXT record.',
    }, 400);
  }

  let records: string[][] = [];
  try {
    records = await Deno.resolveDns(`_storehouse.${domain}`, 'TXT');
  } catch {
    return jsonResponse({
      verified: false,
      error: 'dns_not_found',
      message: `No TXT record at _storehouse.${domain} yet. Add it and try again in a few minutes.`,
    }, 400);
  }

  if (!txtMatches(records, expected)) {
    return jsonResponse({
      verified: false,
      error: 'dns_mismatch',
      message: `The TXT record at _storehouse.${domain} does not match this store.`,
    }, 400);
  }

  const { data: confirmed, error: updateError } = await admin.rpc('confirm_custom_domain_verified', {
    p_store_id: store.id,
    p_domain: domain,
    p_token: expected,
  });

  if (updateError || confirmed !== true) {
    return jsonResponse({ verified: false, error: 'verify_failed' }, 409);
  }

  return jsonResponse({ verified: true });
});
