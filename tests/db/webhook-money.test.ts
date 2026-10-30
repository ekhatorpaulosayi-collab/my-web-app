import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

function clientConfig() {
  const config = { connectionString: databaseUrl };
  if (process.env.PGPASSWORD) config.password = process.env.PGPASSWORD;
  return config;
}

const db = new pg.Client(clientConfig());

async function sql(text, params = []) {
  return db.query(text, params);
}

function extraClient() {
  return new pg.Client(clientConfig());
}

test.before(async () => {
  await db.connect();
  await sql(`
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')
    $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
    $$;
  `);
});

test.after(async () => {
  await db.end();
});

function payload(amount, currency, reference) {
  return {
    event: 'charge.success',
    data: { amount: String(amount), currency, reference },
  };
}

test('underpaid, wrong currency, and a failed order are not fulfilled', async () => {
  const storeId = randomUUID();
  const under = `ord_under_${storeId.slice(0, 8)}`;
  const wrong = `ord_usd_${storeId.slice(0, 8)}`;
  const failed = `ord_failed_${storeId.slice(0, 8)}`;
  await sql(
    `INSERT INTO public.stores (id, user_id, store_slug, subdomain) VALUES ($1, $2, $3, $3)`,
    [storeId, 'owner-pay', `pay-${storeId.slice(0, 8)}`],
  );
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'pending', 250000, 'buyer@example.com', '08030000000'),
            ($4, $5, $3, 'pending', 250000, 'buyer@example.com', '08030000000'),
            ($6, $7, $3, 'failed', 250000, 'buyer@example.com', '08030000000')`,
    [randomUUID(), under, storeId, randomUUID(), wrong, randomUUID(), failed],
  );

  const underpaid = await sql(`SELECT public.assess_storefront_charge($1, $2::jsonb) AS gate`, [
    under, JSON.stringify(payload(100, 'NGN', under)),
  ]);
  assert.equal(underpaid.rows[0].gate.error, 'amount_mismatch');
  const usd = await sql(`SELECT public.assess_storefront_charge($1, $2::jsonb) AS gate`, [
    wrong, JSON.stringify(payload(250000, 'USD', wrong)),
  ]);
  assert.equal(usd.rows[0].gate.error, 'wrong_currency');
  const closed = await sql(`SELECT public.record_successful_payment($1, 'charge.success', $2::jsonb) AS result`, [
    failed, JSON.stringify(payload(250000, 'NGN', failed)),
  ]);
  assert.equal(closed.rows[0].result.error, 'order_not_payable');

  const statuses = await sql(
    `SELECT paystack_reference, status FROM public.orders WHERE paystack_reference = ANY($1::text[])`,
    [[under, wrong, failed]],
  );
  const byRef = Object.fromEntries(statuses.rows.map((row) => [row.paystack_reference, row.status]));
  assert.equal(byRef[under], 'pending');
  assert.equal(byRef[wrong], 'pending');
  assert.equal(byRef[failed], 'failed');

  const exact = await sql(`SELECT public.assess_storefront_charge($1, $2::jsonb) AS gate`, [
    under, JSON.stringify(payload(250000, 'NGN', under)),
  ]);
  assert.equal(exact.rows[0].gate.accept, true);
});

test('inventory apply is idempotent and a queued failure retries once', async () => {
  const storeId = randomUUID();
  const owner = `owner-${storeId.slice(0, 8)}`;
  const slug = `stk-${storeId.slice(0, 8)}`;
  const productId = randomUUID();
  const paidRef = `ord_paid_${storeId.slice(0, 8)}`;
  const retryRef = `ord_retry_${storeId.slice(0, 8)}`;
  await sql(
    `INSERT INTO public.stores (id, user_id, store_slug, subdomain) VALUES ($1, $2, $3, $3)`,
    [storeId, owner, slug],
  );
  await sql(
    `INSERT INTO public.products (id, user_id, name, selling_price, quantity) VALUES ($1, $2, 'Bowl', 1000, 5)`,
    [productId, owner],
  );
  const paidOrder = randomUUID();
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 1000, 'buyer@example.com', '08030000000')`,
    [paidOrder, paidRef, storeId],
  );
  await sql(
    `INSERT INTO public.order_items (id, order_id, store_id, product_id, quantity, product_name)
     VALUES ($1, $2, $3, $4, 1, 'Bowl')`,
    [randomUUID(), paidOrder, storeId, productId],
  );

  await sql(`SELECT public.apply_storefront_inventory($1)`, [paidRef]);
  await sql(`SELECT public.apply_storefront_inventory($1)`, [paidRef]);
  const once = await sql(`SELECT quantity FROM public.products WHERE id = $1`, [productId]);
  assert.equal(Number(once.rows[0].quantity), 4);

  await sql(
    `INSERT INTO public.storefront_inventory_queue (paystack_reference, attempts, updated_at, last_error)
     VALUES ($1, 1, now() - interval '10 minutes', 'missing')`,
    [retryRef],
  );
  const crashed = await sql(`SELECT public.process_storefront_inventory_queue(10) AS result`);
  assert.ok(Number(crashed.rows[0].result.failed) >= 1);

  const retryOrder = randomUUID();
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 2000, 'buyer@example.com', '08030000000')`,
    [retryOrder, retryRef, storeId],
  );
  await sql(
    `INSERT INTO public.order_items (id, order_id, store_id, product_id, quantity, product_name)
     VALUES ($1, $2, $3, $4, 2, 'Bowl')`,
    [randomUUID(), retryOrder, storeId, productId],
  );
  await sql(
    `UPDATE public.storefront_inventory_queue SET updated_at = now() - interval '10 minutes' WHERE paystack_reference = $1`,
    [retryRef],
  );
  await sql(`SELECT public.process_storefront_inventory_queue(10)`);
  await sql(`SELECT public.process_storefront_inventory_queue(10)`);
  const after = await sql(`SELECT quantity FROM public.products WHERE id = $1`, [productId]);
  assert.equal(Number(after.rows[0].quantity), 2);
  const queued = await sql(
    `SELECT count(*)::int AS n FROM public.storefront_inventory_queue WHERE paystack_reference = $1`,
    [retryRef],
  );
  assert.equal(queued.rows[0].n, 0);
});

test('parallel commissions record once and parallel refunds deduct once', async () => {
  const affiliateId = randomUUID();
  const customerId = randomUUID();
  const reference = `aff_${affiliateId.slice(0, 8)}`;
  await sql(
    `INSERT INTO public.affiliates (
       id, user_id, affiliate_code, bank_account_number, bank_name, account_name,
       total_earnings_kobo, pending_earnings_kobo, total_conversions, is_active
     ) VALUES ($1, $2, $3, '0123456789', 'Test Bank', 'Buyer', 0, 0, 0, true)`,
    [affiliateId, customerId, `code-${affiliateId.slice(0, 8)}`],
  );
  const args = [affiliateId, customerId, 'buyer@example.com', 'Buyer', reference, 'starter', 10000, 3000];
  const call = `SELECT public.record_affiliate_commission($1,$2,$3,$4,$5,$6,$7,$8) AS recorded`;
  const left = extraClient();
  const right = extraClient();
  await left.connect();
  await right.connect();
  let first;
  let second;
  try {
    [first, second] = await Promise.all([left.query(call, args), right.query(call, args)]);
  } finally {
    await left.end();
    await right.end();
  }
  const recorded = [first.rows[0].recorded, second.rows[0].recorded].sort();
  assert.deepEqual(recorded, [false, true]);
  const sales = await sql(
    `SELECT count(*)::int AS n FROM public.affiliate_sales WHERE payment_reference = $1`,
    [reference],
  );
  assert.equal(sales.rows[0].n, 1);
  const earned = await sql(`SELECT total_earnings_kobo FROM public.affiliates WHERE id = $1`, [affiliateId]);
  assert.equal(Number(earned.rows[0].total_earnings_kobo), 3000);

  const refundCall = `SELECT public.refund_affiliate_commission($1) AS refunded`;
  const refundLeft = extraClient();
  const refundRight = extraClient();
  await refundLeft.connect();
  await refundRight.connect();
  let refundA;
  let refundB;
  try {
    [refundA, refundB] = await Promise.all([
      refundLeft.query(refundCall, [reference]),
      refundRight.query(refundCall, [reference]),
    ]);
  } finally {
    await refundLeft.end();
    await refundRight.end();
  }
  const refunded = [refundA.rows[0].refunded, refundB.rows[0].refunded].sort();
  assert.deepEqual(refunded, [false, true]);
  const after = await sql(
    `SELECT total_earnings_kobo, pending_earnings_kobo FROM public.affiliates WHERE id = $1`,
    [affiliateId],
  );
  assert.equal(Number(after.rows[0].total_earnings_kobo), 0);
  assert.equal(Number(after.rows[0].pending_earnings_kobo), 0);
  const status = await sql(`SELECT status FROM public.affiliate_sales WHERE payment_reference = $1`, [reference]);
  assert.equal(status.rows[0].status, 'refunded');
});

test('a full refund restocks once and a dispute is recorded', async () => {
  const storeId = randomUUID();
  const owner = `owner-ref-${storeId.slice(0, 8)}`;
  const productId = randomUUID();
  const reference = `ord_refund_${storeId.slice(0, 8)}`;
  const disputeRef = `ord_dispute_${storeId.slice(0, 8)}`;
  await sql(
    `INSERT INTO public.stores (id, user_id, store_slug, subdomain) VALUES ($1, $2, $3, $3)`,
    [storeId, owner, `ref-${storeId.slice(0, 8)}`],
  );
  await sql(
    `INSERT INTO public.products (id, user_id, name, quantity) VALUES ($1, $2, 'Cup', 2)`,
    [productId, owner],
  );
  const orderId = randomUUID();
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 500, 'buyer@example.com', '08030000000')`,
    [orderId, reference, storeId],
  );
  await sql(
    `INSERT INTO public.order_items (id, order_id, store_id, product_id, quantity, product_name)
     VALUES ($1, $2, $3, $4, 1, 'Cup')`,
    [randomUUID(), orderId, storeId, productId],
  );
  await sql(`INSERT INTO public.storefront_fulfillments (paystack_reference) VALUES ($1)`, [reference]);

  const body = {
    event: 'refund.processed',
    data: { reference: `rf_${reference}`, transaction_reference: reference, amount: '500', currency: 'NGN' },
  };
  await sql(
    `SELECT public.record_storefront_reversal($1, 'refund.processed', $2::jsonb, 'refund')`,
    [`rf_${reference}`, JSON.stringify(body)],
  );
  await sql(
    `SELECT public.record_storefront_reversal($1, 'refund.processed', $2::jsonb, 'refund')`,
    [`rf_${reference}`, JSON.stringify(body)],
  );
  const qty = await sql(`SELECT quantity FROM public.products WHERE id = $1`, [productId]);
  assert.equal(Number(qty.rows[0].quantity), 3);
  const order = await sql(`SELECT status FROM public.orders WHERE paystack_reference = $1`, [reference]);
  assert.equal(order.rows[0].status, 'refunded');
  const fulfilled = await sql(
    `SELECT count(*)::int AS n FROM public.storefront_fulfillments WHERE paystack_reference = $1`,
    [reference],
  );
  assert.equal(fulfilled.rows[0].n, 0);

  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 500, 'buyer@example.com', '08030000000')`,
    [randomUUID(), disputeRef, storeId],
  );
  await sql(
    `SELECT public.record_storefront_reversal($1, 'charge.dispute.create', $2::jsonb, 'dispute')`,
    [disputeRef, JSON.stringify({ event: 'charge.dispute.create', data: { reference: disputeRef } })],
  );
  const dispute = await sql(`SELECT status FROM public.orders WHERE paystack_reference = $1`, [disputeRef]);
  assert.equal(dispute.rows[0].status, 'disputed');
});

test('a cashier cannot create a manager PIN and an expired session is not the owner', async () => {
  const owner = randomUUID();
  const session = randomUUID();
  const cashierId = randomUUID();
  await sql(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  await sql(`SELECT set_config('request.jwt.claim.role', '', false)`);
  await sql(`SELECT set_config('request.jwt.claims', '{}', false)`);
  await sql(
    `INSERT INTO public.staff_members (id, store_owner_uid, role, is_active, name, pin)
     VALUES ($1, $2, 'cashier', true, 'Ada', 'hash')`,
    [cashierId, owner],
  );
  await sql(
    `INSERT INTO public.staff_active_sessions (owner_uid, session_id, staff_id, role, staff_name, expires_at)
     VALUES ($1, $2, $3, 'manager', 'Ada', now() + interval '1 hour')`,
    [owner, session, cashierId],
  );
  await sql(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [owner]);
  await sql(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
  await sql(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ session_id: session })]);

  const live = await sql(`SELECT public.acting_staff_role() AS role`);
  assert.equal(live.rows[0].role, 'cashier');
  await assert.rejects(
    sql(
      `INSERT INTO public.staff_members (id, store_owner_uid, role, is_active, name, pin)
       VALUES ($1, $2, 'manager', true, 'M', 'hash')`,
      [randomUUID(), owner],
    ),
    /staff_pin_locked/,
  );

  await sql(`UPDATE public.staff_active_sessions SET expires_at = now() - interval '1 hour' WHERE session_id = $1`, [session]);
  const expired = await sql(`SELECT public.acting_staff_role() AS role`);
  assert.equal(expired.rows[0].role, 'expired');

  await sql(`DELETE FROM public.staff_active_sessions WHERE session_id = $1`, [session]);
  const ownerRole = await sql(`SELECT public.acting_staff_role() AS role`);
  assert.equal(ownerRole.rows[0].role, null);
  await sql(
    `INSERT INTO public.staff_members (id, store_owner_uid, role, is_active, name, pin)
     VALUES ($1, $2, 'manager', true, 'Owner made', 'hash')`,
    [randomUUID(), owner],
  );
});

test('an owner cannot set platform flags and a privileged change is audited', async () => {
  const storeId = randomUUID();
  const owner = randomUUID();
  await sql(
    `INSERT INTO public.stores (id, user_id, store_slug, subdomain) VALUES ($1, $2, $3, $3)`,
    [storeId, owner, `flg-${storeId.slice(0, 8)}`],
  );
  await sql(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [owner]);
  await sql(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
  await assert.rejects(
    sql(`UPDATE public.stores SET is_admin = true WHERE id = $1`, [storeId]),
    /platform_field_locked/,
  );
  await sql(`SELECT set_config('request.jwt.claim.role', 'service_role', false)`);
  await sql(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  await sql(`UPDATE public.stores SET is_verified = true, kyc_approved_at = now() WHERE id = $1`, [storeId]);
  const audit = await sql(
    `SELECT count(*)::int AS n FROM public.store_platform_flag_audit WHERE store_id = $1`,
    [storeId],
  );
  assert.equal(audit.rows[0].n, 1);
  const row = await sql(`SELECT is_verified FROM public.stores WHERE id = $1`, [storeId]);
  assert.equal(row.rows[0].is_verified, true);
});

test('an owner cannot write affiliate earnings', async () => {
  const affiliateId = randomUUID();
  const userId = randomUUID();
  await sql(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await sql(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
  await sql(
    `INSERT INTO public.affiliates (
       id, user_id, affiliate_code, bank_account_number, bank_name, account_name, total_earnings_kobo
     ) VALUES ($1, $2, $3, '0123456789', 'Old', 'Owner', 0)`,
    [affiliateId, userId, `code-${affiliateId.slice(0, 8)}`],
  );
  await assert.rejects(
    sql(`UPDATE public.affiliates SET total_earnings_kobo = 900000 WHERE id = $1`, [affiliateId]),
    /affiliate_ledger_locked/,
  );
  await sql(`UPDATE public.affiliates SET bank_name = 'New' WHERE id = $1`, [affiliateId]);
  const row = await sql(`SELECT bank_name, total_earnings_kobo FROM public.affiliates WHERE id = $1`, [affiliateId]);
  assert.equal(row.rows[0].bank_name, 'New');
  assert.equal(Number(row.rows[0].total_earnings_kobo), 0);
});

test('a slug collision is recorded and both shop URLs remain', async () => {
  const a = randomUUID();
  const b = randomUUID();
  const shared = `shared-${a.slice(0, 8)}`;
  await sql(`ALTER TABLE public.stores DISABLE TRIGGER stores_guard_slug`);
  await sql(`ALTER TABLE public.stores DISABLE TRIGGER stores_reserve_names`);
  try {
    await sql(
      `INSERT INTO public.stores (id, user_id, store_slug, subdomain) VALUES ($1, 'a', $2, $3), ($4, 'b', $5, $3)`,
      [a, `${shared}-a`, shared, b, `${shared}-b`],
    );
  } finally {
    await sql(`ALTER TABLE public.stores ENABLE TRIGGER stores_guard_slug`);
    await sql(`ALTER TABLE public.stores ENABLE TRIGGER stores_reserve_names`);
  }
  await sql(`SELECT public.backfill_store_name_reservations()`);
  const stores = await sql(`SELECT count(*)::int AS n FROM public.stores WHERE id = ANY($1::uuid[])`, [[a, b]]);
  assert.equal(stores.rows[0].n, 2);
  const collisions = await sql(
    `SELECT count(*)::int AS n FROM public.store_name_collisions WHERE name = $1`,
    [shared],
  );
  assert.equal(collisions.rows[0].n, 2);
  const reserved = await sql(
    `SELECT count(*)::int AS n FROM public.store_name_reservations WHERE name = $1`,
    [shared],
  );
  assert.equal(reserved.rows[0].n, 0);
  await assert.rejects(
    sql(`SELECT public.reserve_store_name($1, $2)`, [shared, randomUUID()]),
    /store_name_taken/,
  );
});

test('an expired staff session cannot delete a sale', async () => {
  const owner = randomUUID();
  const session = randomUUID();
  const cashierId = randomUUID();
  const saleId = randomUUID();
  await sql(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  await sql(`SELECT set_config('request.jwt.claim.role', '', false)`);
  await sql(`SELECT set_config('request.jwt.claims', '{}', false)`);
  await sql(
    `INSERT INTO public.staff_members (id, store_owner_uid, role, is_active, name)
     VALUES ($1, $2, 'cashier', true, 'Ada')`,
    [cashierId, owner],
  );
  await sql(
    `INSERT INTO public.staff_active_sessions (owner_uid, session_id, staff_id, role, staff_name, expires_at)
     VALUES ($1, $2, $3, 'cashier', 'Ada', now() - interval '1 hour')`,
    [owner, session, cashierId],
  );
  await sql(
    `INSERT INTO public.sales (id, user_id, discount_amount) VALUES ($1, $2, 0)`,
    [saleId, owner],
  );
  await sql(`GRANT SELECT, DELETE ON public.sales TO authenticated`);
  await sql(`DROP POLICY IF EXISTS sales_owner_test ON public.sales`);
  await sql(`
    CREATE POLICY sales_owner_test ON public.sales
      FOR ALL TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text)
  `);
  await sql(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [owner]);
  await sql(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
  await sql(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ session_id: session })]);
  const role = await sql(`SELECT public.acting_staff_role() AS role`);
  assert.equal(role.rows[0].role, 'expired');
  try {
    await sql(`SET ROLE authenticated`);
    const deleted = await sql(`DELETE FROM public.sales WHERE id = $1`, [saleId]);
    assert.equal(deleted.rowCount, 0);
  } finally {
    await sql(`RESET ROLE`);
  }
  const left = await sql(`SELECT count(*)::int AS n FROM public.sales WHERE id = $1`, [saleId]);
  assert.equal(left.rows[0].n, 1);
});

test('a refund cancels queued stock and a dispute is allowed by the status check', async () => {
  await sql(`SELECT set_config('request.jwt.claim.role', '', false)`);
  await sql(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  const storeId = randomUUID();
  const owner = `owner-q-${storeId.slice(0, 8)}`;
  const productId = randomUUID();
  const reference = `ord_q_${storeId.slice(0, 8)}`;
  await sql(
    `INSERT INTO public.stores (id, user_id, store_slug, subdomain) VALUES ($1, $2, $3, $3)`,
    [storeId, owner, `q-${storeId.slice(0, 8)}`],
  );
  await sql(
    `INSERT INTO public.products (id, user_id, name, quantity) VALUES ($1, $2, 'Plate', 8)`,
    [productId, owner],
  );
  const orderId = randomUUID();
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 800, 'buyer@example.com', '08030000000')`,
    [orderId, reference, storeId],
  );
  await sql(
    `INSERT INTO public.order_items (id, order_id, store_id, product_id, quantity, product_name)
     VALUES ($1, $2, $3, $4, 4, 'Plate')`,
    [randomUUID(), orderId, storeId, productId],
  );
  await sql(
    `INSERT INTO public.storefront_inventory_queue (paystack_reference, attempts, updated_at)
     VALUES ($1, 1, now() - interval '10 minutes')`,
    [reference],
  );
  await sql(
    `INSERT INTO public.paystack_split_transactions (
       order_id, store_id, paystack_reference, amount_total_kobo, amount_paystack_kobo,
       amount_storehouse_kobo, amount_vendor_kobo, status
     ) VALUES ($1, $2, $3, 800, 12, 8, 780, 'success')`,
    [orderId, storeId, reference],
  );
  await sql(
    `SELECT public.record_storefront_reversal($1, 'refund.processed', $2::jsonb, 'refund')`,
    [`rf_${reference}`, JSON.stringify({
      event: 'refund.processed',
      data: { reference: `rf_${reference}`, transaction_reference: reference, amount: '800', currency: 'NGN' },
    })],
  );
  const queued = await sql(
    `SELECT count(*)::int AS n FROM public.storefront_inventory_queue WHERE paystack_reference = $1`,
    [reference],
  );
  assert.equal(queued.rows[0].n, 0);
  await sql(`SELECT public.process_storefront_inventory_queue(10)`);
  const qty = await sql(`SELECT quantity FROM public.products WHERE id = $1`, [productId]);
  assert.equal(Number(qty.rows[0].quantity), 8);

  const disputeRef = `ord_d_${storeId.slice(0, 8)}`;
  const disputeOrder = randomUUID();
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 800, 'buyer@example.com', '08030000000')`,
    [disputeOrder, disputeRef, storeId],
  );
  await sql(
    `INSERT INTO public.paystack_split_transactions (
       order_id, store_id, paystack_reference, amount_total_kobo, amount_paystack_kobo,
       amount_storehouse_kobo, amount_vendor_kobo, status
     ) VALUES ($1, $2, $3, 800, 12, 8, 780, 'success')`,
    [disputeOrder, storeId, disputeRef],
  );
  await sql(
    `SELECT public.record_storefront_reversal($1, 'charge.dispute.create', $2::jsonb, 'dispute')`,
    [disputeRef, JSON.stringify({ event: 'charge.dispute.create', data: { reference: disputeRef } })],
  );
  const disputed = await sql(`SELECT status FROM public.orders WHERE paystack_reference = $1`, [disputeRef]);
  assert.equal(disputed.rows[0].status, 'disputed');

  const reverseRef = `ord_rv_${storeId.slice(0, 8)}`;
  const reverseOrder = randomUUID();
  await sql(
    `INSERT INTO public.orders (id, paystack_reference, primary_store_id, status, total_amount_kobo, customer_email, customer_phone)
     VALUES ($1, $2, $3, 'paid', 800, 'buyer@example.com', '08030000000')`,
    [reverseOrder, reverseRef, storeId],
  );
  await sql(
    `INSERT INTO public.paystack_split_transactions (
       order_id, store_id, paystack_reference, amount_total_kobo, amount_paystack_kobo,
       amount_storehouse_kobo, amount_vendor_kobo, status
     ) VALUES ($1, $2, $3, 800, 12, 8, 780, 'success')`,
    [reverseOrder, storeId, reverseRef],
  );
  await sql(
    `SELECT public.record_storefront_reversal($1, 'transfer.reversed', $2::jsonb, 'reversal')`,
    [reverseRef, JSON.stringify({ event: 'transfer.reversed', data: { reference: reverseRef } })],
  );
  const reversed = await sql(
    `SELECT o.status AS order_status, s.status AS split_status
       FROM public.orders o
       JOIN public.paystack_split_transactions s ON s.paystack_reference = o.paystack_reference
      WHERE o.paystack_reference = $1`,
    [reverseRef],
  );
  assert.equal(reversed.rows[0].order_status, 'reversed');
  assert.equal(reversed.rows[0].split_status, 'reversed');
});

test('a forged affiliate insert is stored with a zero balance', async () => {
  const affiliateId = randomUUID();
  const userId = randomUUID();
  await sql(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await sql(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
  await sql(
    `INSERT INTO public.affiliates (
       id, user_id, affiliate_code, bank_account_number, bank_name, account_name,
       pending_earnings_kobo, total_earnings_kobo, payouts_unlocked, total_conversions
     ) VALUES ($1, $2, $3, '0123456789', 'Bank', 'Name', 999000000000, 999000000000, true, 50)`,
    [affiliateId, userId, `forge-${affiliateId.slice(0, 8)}`],
  );
  const row = await sql(
    `SELECT pending_earnings_kobo, payouts_unlocked, total_conversions
       FROM public.affiliates WHERE id = $1`,
    [affiliateId],
  );
  assert.equal(Number(row.rows[0].pending_earnings_kobo), 0);
  assert.equal(row.rows[0].payouts_unlocked, false);
  assert.equal(Number(row.rows[0].total_conversions), 0);
});

test('a closed-order charge writes an alert and the report job checks the vault', async () => {
  const alertRef = `ord_closed_${randomUUID().slice(0, 8)}`;
  await sql(
    `SELECT public.note_storefront_payment_alert($1, 'closed_order_charge', 'money taken on a failed order')`,
    [alertRef],
  );
  const alert = await sql(
    `SELECT count(*)::int AS n FROM public.operator_alerts WHERE paystack_reference = $1`,
    [alertRef],
  );
  assert.equal(alert.rows[0].n, 1);
  const job = await sql(
    `SELECT command FROM cron.job WHERE jobname = 'send-daily-whatsapp-reports'`,
  );
  assert.match(job.rows[0].command, /cron_secret_missing/);
});

test('the retry queue is scheduled and platform_config exists', async () => {
  const job = await sql(
    `SELECT count(*)::int AS n FROM cron.job WHERE jobname = 'storefront-inventory-retry'`,
  );
  assert.equal(job.rows[0].n, 1);
  const config = await sql(`SELECT api_key IS NULL AS empty FROM public.platform_config WHERE id = 1`);
  assert.equal(config.rows[0].empty, true);
});
