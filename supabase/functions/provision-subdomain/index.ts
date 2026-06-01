// provision-subdomain
//
// Registers a merchant subdomain (e.g. "chopsnshakes.storehouse.ng") with
// Vercel so a TLS certificate is issued and the host routes to the
// smartstock-v2 project. Called fire-and-forget from the frontend
// (authService-supabase.js signup, supabase-hooks.js createStore,
// StoreSettings.tsx save) after a subdomain is written to stores.subdomain.
//
// Auth: requires the caller's Supabase JWT in Authorization header. The
// function verifies the caller owns the store row matching the requested
// subdomain — without this, any authenticated user could squat arbitrary
// subdomains and burn through the Vercel project quota.
//
// Idempotent: a 409 / "domain already exists" response from Vercel is
// treated as success, so the backfill script and the fire-and-forget
// frontend calls can re-run safely.
//
// Reserved list is hard-coded here so the function has no shared-source
// dependency on the frontend. Keep in sync with
// src/utils/reservedSubdomains.ts manually — both lists are short.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERCEL_API_BASE = 'https://api.vercel.com/v10';
const VERCEL_PROJECT = 'smartstock-v2';
const VERCEL_TEAM_ID = 'pauls-projects-cfe953d7';
const APEX = 'storehouse.ng';

// Mirrors src/utils/reservedSubdomains.ts — keep in sync manually.
const RESERVED_SUBDOMAINS = new Set<string>([
  'www', 'admin', 'api', 'app', 'dashboard', 'mail', 'ftp', 'accounts',
  'auth', 'login', 'signup', 'register', 'oauth', 'cart', 'checkout',
  'pay', 'paystack', 'order', 'orders', 'billing', 'payments', 'webhooks',
  'account', 'me', 'my', 'blog', 'support', 'help', 'docs', 'status',
  'news', 'about', 'dev', 'staging', 'test', 'demo', 'beta', 'preview',
  'local', 'cdn', 'assets', 'static', 'media', 'img', 'images',
  'storehouse', 'email', 'unsubscribe', 'notify', 'hello', 'info',
  'contact', 'new', 'edit', 'settings', 'search',
  '234',
]);
const NUMERIC_ONLY = /^\d+$/;
// Matches the DB subdomain_format CHECK: ^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$
const LABEL_OK = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const RETRY_DELAYS_MS = [500, 1500, 4000];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VERCEL_API_TOKEN) {
    console.error('[provision-subdomain] missing env', {
      has_supabase_url: !!SUPABASE_URL,
      has_service_role: !!SUPABASE_SERVICE_ROLE_KEY,
      has_vercel_token: !!VERCEL_API_TOKEN,
    });
    return json({ error: 'misconfigured' }, 500);
  }

  // 1. Auth — require caller JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer /, '').trim();
  if (!jwt) return json({ error: 'unauthenticated' }, 401);

  // 2. Parse + validate payload
  let payload: { subdomain?: unknown; store_id?: unknown } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_request', detail: 'invalid json' }, 400);
  }
  const { subdomain, store_id } = payload;
  if (typeof subdomain !== 'string' || typeof store_id !== 'string') {
    return json({ error: 'bad_request', detail: 'subdomain and store_id required' }, 400);
  }
  const label = subdomain.toLowerCase();
  if (!LABEL_OK.test(label) || RESERVED_SUBDOMAINS.has(label) || NUMERIC_ONLY.test(label)) {
    return json({ error: 'invalid_or_reserved_subdomain', label }, 400);
  }

  // 3. Ownership check
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json({ error: 'unauthenticated' }, 401);
  }
  const callerId = String(userData.user.id);

  const { data: store, error: storeErr } = await supa
    .from('stores')
    .select('id, user_id, subdomain')
    .eq('id', store_id)
    .maybeSingle();
  if (storeErr) {
    console.error('[provision-subdomain] store lookup error', storeErr);
    return json({ error: 'db_error' }, 500);
  }
  if (!store) return json({ error: 'store_not_found' }, 404);
  if (String(store.user_id) !== callerId) return json({ error: 'forbidden' }, 403);
  if (store.subdomain !== label) {
    return json({ error: 'subdomain_mismatch', expected: store.subdomain, got: label }, 409);
  }

  // 4. Vercel POST /domains with retry on 429/5xx
  const url = `${VERCEL_API_BASE}/projects/${VERCEL_PROJECT}/domains?teamId=${VERCEL_TEAM_ID}`;
  const name = `${label}.${APEX}`;

  let lastStatus = 0;
  let lastBody: unknown = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
    } catch (e) {
      lastStatus = 0;
      lastBody = { network_error: String(e) };
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      break;
    }

    lastStatus = resp.status;
    lastBody = await resp.json().catch(() => ({}));

    if (resp.status === 200 || resp.status === 201) {
      console.log('[provision-subdomain] registered', { name, status: resp.status });
      return json({ ok: true, status: 'registered', name }, 200);
    }

    const errCode = (lastBody as { error?: { code?: string } })?.error?.code;
    if (
      resp.status === 409 ||
      errCode === 'domain_already_exists' ||
      errCode === 'domain_already_in_use'
    ) {
      console.log('[provision-subdomain] already registered', { name });
      return json({ ok: true, status: 'already_registered', name }, 200);
    }

    // 4xx other than 429 are hard fails — do not retry
    if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
      console.error('[provision-subdomain] vercel hard 4xx', { name, status: resp.status, body: lastBody });
      return json({ error: 'vercel_rejected', status: resp.status, detail: lastBody }, 502);
    }

    // 429 or 5xx — backoff and retry
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }

  console.error('[provision-subdomain] gave up after retries', { name, lastStatus, lastBody });
  return json({ error: 'vercel_unreachable', last_status: lastStatus, last_body: lastBody }, 502);
});
