// Retries store-link registration for rows that are pending or failed.
// pg_cron posts here with the vault bearer and x-cron-secret. Deploy with
// --no-verify-jwt, same as the other public cron function, and confirm the
// flag afterwards. Do not deploy from this branch.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERCEL_API_BASE = 'https://api.vercel.com/v10';
const VERCEL_PROJECT = 'smartstock-v2';
const VERCEL_TEAM_ID = 'pauls-projects-cfe953d7';
const APEX = 'storehouse.ng';

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const expected = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');
  if (!expected) return json({ error: 'Server not configured' }, 500);
  if (!provided || provided !== expected) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = Deno.env.get('VERCEL_API_TOKEN');
  if (!supabaseUrl || !serviceKey || !token) return json({ error: 'Server not configured' }, 500);

  const supa = createClient(supabaseUrl, serviceKey);
  const { data: due, error } = await supa.rpc('claim_store_provisioning_retries', { p_limit: 20 });
  if (error) return json({ error: 'claim_failed' }, 500);

  let active = 0;
  let blocked = 0;
  let waiting = 0;
  for (const row of due || []) {
    const name = `${row.subdomain}.${APEX}`;
    const outcome = await askVercel(token, name);
    const { error: saved } = await supa.rpc('record_store_provisioning', {
      p_store_id: row.store_id,
      p_subdomain: row.subdomain,
      p_status: outcome.status,
      p_http_status: outcome.httpStatus,
      p_detail: outcome.detail,
    });
    if (saved) continue;
    if (outcome.status === 'active') active += 1;
    else if (outcome.status === 'blocked') blocked += 1;
    else waiting += 1;
  }
  return json({ ok: true, checked: (due || []).length, active, blocked, waiting }, 200);
});

async function askVercel(token: string, name: string): Promise<{ status: string; httpStatus: number; detail: string }> {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const projectUrl = `${VERCEL_API_BASE}/projects/${VERCEL_PROJECT}/domains/${encodeURIComponent(name)}?teamId=${VERCEL_TEAM_ID}`;
  let resp: Response;
  try {
    resp = await fetch(projectUrl, { headers });
  } catch {
    return { status: 'retryable_failure', httpStatus: 0, detail: 'network' };
  }
  if (resp.status === 200) {
    const body = await resp.json().catch(() => ({}));
    const verified = Boolean((body as { verified?: boolean }).verified);
    return verified
      ? { status: 'active', httpStatus: 200, detail: 'verified' }
      : { status: 'pending', httpStatus: 200, detail: 'registered' };
  }
  if (resp.status === 404) {
    const add = await fetch(`${VERCEL_API_BASE}/projects/${VERCEL_PROJECT}/domains?teamId=${VERCEL_TEAM_ID}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    }).catch(() => null);
    if (!add) return { status: 'retryable_failure', httpStatus: 0, detail: 'network' };
    const body = await add.json().catch(() => ({}));
    const code = (body as { error?: { code?: string } })?.error?.code;
    if (code === 'domain_already_in_use') {
      return { status: 'blocked', httpStatus: add.status, detail: 'domain_already_in_use' };
    }
    if (add.status === 200 || add.status === 201 || add.status === 409 || code === 'domain_already_exists') {
      return { status: 'pending', httpStatus: add.status, detail: 'registered' };
    }
    if (add.status === 429 || add.status >= 500) {
      return { status: 'retryable_failure', httpStatus: add.status, detail: 'vercel_unreachable' };
    }
    return { status: 'retryable_failure', httpStatus: add.status, detail: 'vercel_rejected' };
  }
  if (resp.status === 429 || resp.status >= 500) {
    return { status: 'retryable_failure', httpStatus: resp.status, detail: 'vercel_unreachable' };
  }
  return { status: 'retryable_failure', httpStatus: resp.status, detail: 'vercel_rejected' };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
