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
import { bindPaidOrder } from '../_shared/paidOrder.ts';

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
  const early = bindPaidOrder({
    reference,
    paystackStatus: 'success',
    paystackAmount: 0,
    paystackCurrency: 'NGN',
    order: null,
  });
  if (early.ok && early.mode === 'delegate') {
    return json({ ok: true, delegated: 'webhook' });
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } },
  );
  const verifyData = await verifyResponse.json().catch(() => null);
  const transaction = verifyData?.data;
  if (!verifyResponse.ok || !verifyData?.status || !transaction) {
    return json({ error: 'paystack_verify_failed' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, status, total_amount_kobo, primary_store_id, customer_name, customer_phone, customer_email')
    .eq('paystack_reference', reference)
    .maybeSingle();
  if (orderError) return json({ error: 'order_lookup_failed' }, 500);

  const decision = bindPaidOrder({
    reference,
    paystackStatus: String(transaction.status || ''),
    paystackAmount: Number(transaction.amount),
    paystackCurrency: String(transaction.currency || ''),
    order: order
      ? {
        status: String(order.status || ''),
        total_amount_kobo: Number(order.total_amount_kobo),
        primary_store_id: String(order.primary_store_id || ''),
      }
      : null,
  });
  if (!decision.ok) return json({ error: decision.error }, 400);
  if (!order?.primary_store_id) return json({ error: 'missing_store' }, 400);

  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('user_id')
    .eq('id', order.primary_store_id)
    .maybeSingle();
  if (storeError || !store?.user_id) return json({ error: 'missing_store' }, 400);

  const { data: orderItems, error: itemsError } = await admin
    .from('order_items')
    .select('product_id, variant_id, quantity, store_id')
    .eq('order_id', order.id);
  if (itemsError) return json({ error: 'items_lookup_failed' }, 500);
  const lines = (orderItems || []).filter((line) => String(line.store_id) === String(order.primary_store_id));
  if (lines.length === 0) return json({ error: 'missing_order_lines' }, 400);

  const { data: claimed, error: claimError } = await admin
    .from('storefront_fulfillments')
    .insert({ paystack_reference: reference })
    .select('paystack_reference')
    .maybeSingle();

  if (claimError && claimError.code !== '23505') {
    console.error('[complete-storefront-order] claim failed', claimError.code || 'error');
    return json({ error: 'fulfillment_table_missing' }, 500);
  }
  if (!claimed) return json({ ok: true, already_applied: true });

  const { error: stockError } = await admin.rpc('decrement_owned_lines', {
    p_owner_user_id: String(store.user_id),
    p_lines: lines.map((line) => ({
      product_id: line.product_id,
      variant_id: line.variant_id,
      quantity: line.quantity,
    })),
  });
  if (stockError) {
    await admin.from('storefront_fulfillments').delete().eq('paystack_reference', reference);
    return json({ error: 'stock_failed' }, 500);
  }

  await admin.rpc('upsert_customer', {
    p_user_id: String(store.user_id),
    p_customer_name: String(order.customer_name || '').slice(0, 200),
    p_customer_phone: String(order.customer_phone || '').slice(0, 32),
    p_customer_email: order.customer_email ? String(order.customer_email).slice(0, 320) : null,
    p_order_amount: Number(transaction.amount) || 0,
    p_order_date: new Date().toISOString().slice(0, 10),
  });

  return json({ ok: true });
});
