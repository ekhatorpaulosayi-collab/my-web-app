// Legacy storefront checkout (merchant's own Paystack key, not the ord_
// subaccount flow). Builder note B6: stock, customer, and promo writes
// happen here with the service role after Paystack confirms the reference.
// The browser must not call decrement_* or upsert_customer.
//
// ord_ references are fulfilled by the webhook via apply_storefront_inventory
// (migration 20261025_06). This function refuses those so stock is not
// decremented twice.
//
// verify_jwt may stay true: the storefront calls it with the anon key, which
// is a JWT. The Paystack verify call is the authorization, not the caller.
// Paul deploys this. This PR does not.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.storehouse.ng',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!supabaseUrl || !serviceKey || !paystackKey) return json({ error: 'server_misconfigured' }, 500);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const reference = String(body.reference || '').trim();
  if (!reference || reference.length > 100) return json({ error: 'missing_reference' }, 400);
  if (reference.startsWith('ord_')) {
    return json({ ok: true, delegated: 'webhook' });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > 50) return json({ error: 'bad_items' }, 400);

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } },
  );
  const verifyData = await verifyResponse.json().catch(() => null);
  const transaction = verifyData?.data;
  if (!verifyResponse.ok || !verifyData?.status || transaction?.status !== 'success') {
    return json({ error: 'paystack_verify_failed' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const lines = items.map((it) => {
    const quantity = Number(it.quantity);
    const productId = String(it.product_id || '').trim();
    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) {
      return null;
    }
    return {
      product_id: productId,
      variant_id: it.variant_id ? String(it.variant_id) : null,
      quantity,
    };
  });
  if (lines.some((line) => line === null)) {
    return json({ error: 'bad_quantity' }, 400);
  }

  const productIds = lines.map((line) => line!.product_id);
  const { data: products, error: productError } = await admin
    .from('products')
    .select('id, user_id')
    .in('id', productIds);
  if (productError || !products || products.length !== new Set(productIds).size) {
    return json({ error: 'unknown_product' }, 400);
  }
  const owner = String(products[0].user_id);
  if (products.some((p) => String(p.user_id) !== owner)) {
    return json({ error: 'mixed_store' }, 400);
  }

  const { data: claimed, error: claimError } = await admin
    .from('storefront_fulfillments')
    .insert({ paystack_reference: reference })
    .select('paystack_reference')
    .maybeSingle();

  if (claimError && claimError.code !== '23505') {
    // Table may not exist until migration 06. Do not write stock twice on retry
    // by continuing without a claim.
    console.error('[complete-storefront-order] claim failed', claimError.message);
    return json({ error: 'fulfillment_table_missing' }, 500);
  }
  if (!claimed) return json({ ok: true, already_applied: true });

  // One database call. A shortfall on a later line rolls back the earlier
  // lines, and the claim is removed so a retry starts from the same stock.
  const { error: stockError } = await admin.rpc('decrement_storefront_lines', {
    p_lines: lines,
  });
  if (stockError) {
    await admin.from('storefront_fulfillments').delete().eq('paystack_reference', reference);
    return json({ error: 'stock_failed' }, 500);
  }

  const customer = body.customer || {};
  await admin.rpc('upsert_customer', {
    p_user_id: owner,
    p_customer_name: String(customer.name || '').slice(0, 200),
    p_customer_phone: String(customer.phone || '').slice(0, 32),
    p_customer_email: customer.email ? String(customer.email).slice(0, 320) : null,
    p_order_amount: Number(transaction.amount) || 0,
    p_order_date: new Date().toISOString().slice(0, 10),
  });

  if (body.promo_code_id) {
    const { data: promo } = await admin
      .from('promo_codes')
      .select('id, user_id, discount_type, discount_value, is_active, used_count')
      .eq('id', body.promo_code_id)
      .maybeSingle();
    if (promo && String(promo.user_id) === owner && promo.is_active !== false) {
      const orderTotal = items.reduce(
        (sum: number, it: { unit_price_kobo?: number; quantity?: number }) =>
          sum + Number(it.unit_price_kobo || 0) * Number(it.quantity || 0),
        0,
      );
      const discount = promo.discount_type === 'percentage'
        ? Math.round((orderTotal * Number(promo.discount_value)) / 100)
        : Number(promo.discount_value) * 100;
      const finalTotal = orderTotal - discount;
      if (discount >= 0 && discount <= orderTotal && finalTotal === orderTotal - discount) {
        const { error: promoError } = await admin.from('promo_code_usage').insert({
          promo_code_id: promo.id,
          order_total: orderTotal,
          discount_amount: discount,
          final_total: finalTotal,
          customer_name: String(customer.name || '').slice(0, 200),
          customer_phone: String(customer.phone || '').slice(0, 32),
        });
        if (!promoError) {
          await admin
            .from('promo_codes')
            .update({ used_count: (promo.used_count || 0) + 1 })
            .eq('id', promo.id);
        }
      }
    }
  }

  return json({ ok: true });
});
