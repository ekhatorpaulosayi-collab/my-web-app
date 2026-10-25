// Affiliate money writes (Builder notes B1 and B8).
// Browser code must not insert affiliate_sales, call deduct/increment
// conversion RPCs, or mark affiliate_clicks.converted. Those grants are
// removed in 20261025_04 section 3.
//
// Deploy with verify_jwt=true (the caller is a signed-in user). Do not deploy
// from this PR — Paul deploys after review.
//
// Actions:
//   record_sale   — verifies the Paystack reference, then writes the commission
//   refund        — verifies the Paystack transaction is reversed/abandoned
//   mark_signup   — attributes the signed-in user to one click (B8)
//   admin_overview — affiliates + pending sales, admin only
//
// Admin is app_metadata.role = 'admin' (not user_metadata, which the user can
// edit) or the store reviewer account.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.storehouse.ng',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REVIEWER_USER_ID = 'dffba89b-869d-422a-a542-2e2494850b44';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isAdmin(user: { id: string; app_metadata?: Record<string, unknown> }) {
  const role = user.app_metadata?.role;
  return user.id === REVIEWER_USER_ID || role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_misconfigured' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return json({ error: 'not_signed_in' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const action = String(body.action || '');

  if (action === 'admin_overview') {
    if (!isAdmin(user)) return json({ error: 'not_admin' }, 403);
    const { data: affiliates, error: affiliatesError } = await admin
      .from('affiliates')
      .select('*')
      .order('total_earnings_kobo', { ascending: false });
    if (affiliatesError) return json({ error: 'affiliates_failed' }, 500);
    const { data: sales, error: salesError } = await admin
      .from('affiliate_sales')
      .select('id, commission_amount_kobo, sale_date, customer_email, plan_name, affiliates!inner(affiliate_code, account_name)')
      .eq('status', 'pending')
      .order('sale_date', { ascending: false });
    if (salesError) return json({ error: 'sales_failed' }, 500);
    return json({ affiliates: affiliates || [], sales: sales || [] });
  }

  if (action === 'mark_signup') {
    const affiliateCode = String(body.affiliate_code || '').trim();
    if (!affiliateCode) return json({ error: 'missing_code' }, 400);
    const { data: affiliate } = await admin
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', affiliateCode)
      .maybeSingle();
    if (!affiliate) return json({ error: 'unknown_code' }, 404);

    const { data: click } = await admin
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (click) {
      await admin
        .from('affiliate_clicks')
        .update({ converted: true, customer_id: user.id })
        .eq('id', click.id)
        .eq('converted', false);
    }

    await admin.rpc('increment_affiliate_signup', { p_affiliate_id: affiliate.id });
    return json({ ok: true });
  }

  if (action === 'record_sale' || action === 'refund') {
    if (!paystackKey) return json({ error: 'server_misconfigured' }, 500);
    const reference = String(body.reference || '').trim();
    if (!reference || reference.length > 100) return json({ error: 'missing_reference' }, 400);

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } },
    );
    const verifyData = await verifyResponse.json().catch(() => null);
    const transaction = verifyData?.data;
    if (!verifyResponse.ok || !verifyData?.status || !transaction) {
      return json({ error: 'paystack_verify_failed' }, 400);
    }

    const payerEmail = String(transaction.customer?.email || '').toLowerCase();
    const userEmail = String(user.email || '').toLowerCase();
    if (!userEmail || payerEmail !== userEmail) {
      return json({ error: 'not_your_payment' }, 403);
    }

    if (action === 'record_sale') {
      if (transaction.status !== 'success') return json({ error: 'not_successful' }, 400);
      const amountKobo = Number(transaction.amount);
      if (!Number.isInteger(amountKobo) || amountKobo <= 0) return json({ error: 'bad_amount' }, 400);

      const affiliateCode = String(body.affiliate_code || '').trim();
      const { data: affiliate } = await admin
        .from('affiliates')
        .select('id, total_conversions')
        .eq('affiliate_code', affiliateCode)
        .maybeSingle();
      if (!affiliate) return json({ error: 'unknown_code' }, 404);

      const { data: existing } = await admin
        .from('affiliate_sales')
        .select('id')
        .eq('subscription_id', reference)
        .maybeSingle();
      if (existing) return json({ ok: true, already_recorded: true });

      const commissionKobo = Math.floor(amountKobo * 0.30);
      const { error: saleError } = await admin.from('affiliate_sales').insert({
        affiliate_id: affiliate.id,
        customer_id: user.id,
        customer_email: user.email,
        customer_name: body.customer_name ? String(body.customer_name).slice(0, 200) : null,
        subscription_id: reference,
        plan_name: String(body.plan_name || 'subscription').slice(0, 80),
        sale_amount_kobo: amountKobo,
        commission_amount_kobo: commissionKobo,
        status: 'pending',
      });
      if (saleError) return json({ error: 'sale_insert_failed' }, 500);

      await admin.rpc('increment_affiliate_conversion', {
        p_affiliate_id: affiliate.id,
        p_commission_kobo: commissionKobo,
      });

      const { data: click } = await admin
        .from('affiliate_clicks')
        .select('id')
        .eq('affiliate_id', affiliate.id)
        .eq('converted', false)
        .order('clicked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (click) {
        await admin
          .from('affiliate_clicks')
          .update({ converted: true, customer_id: user.id })
          .eq('id', click.id);
      }

      return json({ ok: true, commission_kobo: commissionKobo });
    }

    const refunded = transaction.status === 'reversed' || transaction.status === 'abandoned';
    if (!refunded) return json({ error: 'not_refunded' }, 400);

    const { data: sale } = await admin
      .from('affiliate_sales')
      .select('id, affiliate_id, commission_amount_kobo, status')
      .eq('subscription_id', reference)
      .maybeSingle();
    if (!sale || sale.status !== 'pending') return json({ ok: true, skipped: true });

    await admin.from('affiliate_sales').update({ status: 'refunded' }).eq('id', sale.id);
    await admin.rpc('deduct_affiliate_earnings', {
      p_affiliate_id: sale.affiliate_id,
      p_amount_kobo: sale.commission_amount_kobo,
    });
    return json({ ok: true });
  }

  return json({ error: 'unknown_action' }, 400);
});
