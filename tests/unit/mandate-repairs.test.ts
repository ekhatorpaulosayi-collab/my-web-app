import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { applyPromoKobo, customerChargeKobo, priceCheckoutLines } from '../../supabase/functions/_shared/checkoutPrice.ts';
import { adminCallAllowed } from '../../supabase/functions/_shared/adminGate.ts';
import { decideAffiliateCommission } from '../../supabase/functions/_shared/affiliateDecision.ts';
import { bindPaidOrder } from '../../supabase/functions/_shared/paidOrder.ts';
import { historicHostTarget } from '../../src/utils/canonicalStoreUrl.js';
import { interpretProvisionResponse, provisioningReaderText } from '../../src/utils/provisionStatus.js';
import { assessCharge, chargeEventStatus, inventoryFollowUp } from '../../supabase/functions/_shared/moneyPolicies.ts';

const ankara = {
  id: 'p-ankara',
  user_id: 'owner-a',
  name: 'Ankara',
  selling_price: 5_000_000,
  quantity: 4,
  is_active: true,
};

test('a tampered unit price is ignored and the catalogue price is charged', () => {
  const priced = priceCheckoutLines('owner-a', [
    { product_id: 'p-ankara', quantity: 1, unit_price_kobo: 100, product_name: 'Fake' },
  ], [ankara], []);
  assert.equal(priced.ok, true);
  if (!priced.ok) return;
  assert.equal(priced.lines[0].unit_price_kobo, 5_000_000);
  assert.equal(priced.lines[0].product_name, 'Ankara');
  assert.equal(priced.subtotalKobo, 5_000_000);
  const charge = customerChargeKobo(priced.subtotalKobo);
  assert.ok(charge);
  assert.ok(charge.customerTotalKobo > priced.subtotalKobo);
  assert.equal(charge.customerTotalKobo, priced.subtotalKobo + charge.paystackTakeKobo);
});

test('foreign, inactive, variant, duplicate, and overflow lines fail closed', () => {
  const foreign = priceCheckoutLines('owner-a', [{ product_id: 'p-ankara', quantity: 1 }], [{ ...ankara, user_id: 'owner-b' }], []);
  assert.equal(foreign.ok, false);
  assert.equal(foreign.ok ? '' : foreign.error, 'unknown_product');

  const inactive = priceCheckoutLines('owner-a', [{ product_id: 'p-ankara', quantity: 1 }], [{ ...ankara, is_active: false }], []);
  assert.equal(inactive.ok ? '' : inactive.error, 'unknown_product');

  const variant = priceCheckoutLines('owner-a', [{ product_id: 'p-ankara', variant_id: 'v-other', quantity: 1 }], [ankara], [{
    id: 'v-other', product_id: 'p-other', user_id: 'owner-a', price_override: 100, quantity: 3, is_active: true,
  }]);
  assert.equal(variant.ok ? '' : variant.error, 'unknown_variant');

  const duplicate = priceCheckoutLines('owner-a', [
    { product_id: 'p-ankara', quantity: 1 },
    { product_id: 'p-ankara', quantity: 1 },
  ], [ankara], []);
  assert.equal(duplicate.ok ? '' : duplicate.error, 'duplicate_line');

  const overflow = priceCheckoutLines('owner-a', [{ product_id: 'p-ankara', quantity: 10000 }], [{ ...ankara, selling_price: Number.MAX_SAFE_INTEGER, quantity: 10000 }], []);
  assert.equal(overflow.ok ? '' : overflow.error, 'amount_overflow');

  const fraction = priceCheckoutLines('owner-a', [{ product_id: 'p-ankara', quantity: 1.5 }], [ankara], []);
  assert.equal(fraction.ok ? '' : fraction.error, 'bad_quantity');

  const ownedVariant = priceCheckoutLines('owner-a', [{ product_id: 'p-ankara', variant_id: 'v-red', quantity: 2 }], [ankara], [{
    id: 'v-red', product_id: 'p-ankara', user_id: 'owner-a', price_override: 4_000_000, quantity: 2, is_active: true,
  }]);
  assert.equal(ownedVariant.ok, true);
  if (ownedVariant.ok) assert.equal(ownedVariant.subtotalKobo, 8_000_000);
});

test('a paid reference cannot fulfil a different basket', () => {
  assert.deepEqual(bindPaidOrder({
    reference: 'ord_abc',
    paystackStatus: 'success',
    paystackAmount: 100,
    paystackCurrency: 'NGN',
    order: null,
  }), { ok: true, mode: 'delegate' });
  assert.equal(bindPaidOrder({
    reference: 'legacy_1',
    paystackStatus: 'success',
    paystackAmount: 100,
    paystackCurrency: 'NGN',
    order: null,
  }).ok, false);
  const mismatch = bindPaidOrder({
    reference: 'legacy_1',
    paystackStatus: 'success',
    paystackAmount: 100,
    paystackCurrency: 'NGN',
    order: { status: 'pending', total_amount_kobo: 5_000_000, primary_store_id: 'store-a' },
  });
  assert.equal(mismatch.ok ? '' : mismatch.error, 'amount_mismatch');
  const currency = bindPaidOrder({
    reference: 'legacy_1',
    paystackStatus: 'success',
    paystackAmount: 5_000_000,
    paystackCurrency: 'USD',
    order: { status: 'pending', total_amount_kobo: 5_000_000, primary_store_id: 'store-a' },
  });
  assert.equal(currency.ok ? '' : currency.error, 'wrong_currency');
  const replay = bindPaidOrder({
    reference: 'legacy_1',
    paystackStatus: 'success',
    paystackAmount: 5_000_000,
    paystackCurrency: 'NGN',
    order: { status: 'fulfilled', total_amount_kobo: 5_000_000, primary_store_id: 'store-a' },
  });
  assert.equal(replay.ok ? '' : replay.error, 'order_not_open');
});

test('affiliate commission ignores a client code and a self referral', () => {
  const base = {
    buyerUserId: 'buyer',
    affiliateUserId: 'partner',
    affiliateActive: true,
    paymentStatus: 'success',
    amountKobo: 1_000_000,
    currency: 'NGN',
    reference: 'sub_1',
    planCode: 'starter-monthly',
    attributedAffiliateId: 'aff-1',
    affiliateId: 'aff-1',
    alreadyRecorded: false,
    attributedAtMs: Date.parse('2026-10-01T00:00:00Z'),
    paidAtMs: Date.parse('2026-10-15T00:00:00Z'),
  };
  assert.equal(decideAffiliateCommission(base).commissionKobo, 300_000);
  assert.equal(decideAffiliateCommission({ ...base, affiliateUserId: 'buyer' }).reason, 'self_referral');
  assert.equal(decideAffiliateCommission({ ...base, reference: 'ord_cart' }).reason, 'not_subscription');
  assert.equal(decideAffiliateCommission({ ...base, planCode: null }).reason, 'not_subscription');
  assert.equal(decideAffiliateCommission({ ...base, attributedAffiliateId: null, affiliateId: null }).reason, 'unattributed');
  assert.equal(decideAffiliateCommission({ ...base, alreadyRecorded: true }).reason, 'already_recorded');
  assert.equal(decideAffiliateCommission({ ...base, paidAtMs: Date.parse('2026-12-15T00:00:00Z') }).reason, 'outside_window');
});

test('admin calls and subdomain registration do not trust a public key or a 200', () => {
  assert.equal(adminCallAllowed(undefined, 'anon-key'), false);
  assert.equal(adminCallAllowed('short', 'short'), false);
  assert.equal(adminCallAllowed('a-long-admin-secret', 'a-long-admin-secret'), true);
  assert.equal(adminCallAllowed('a-long-admin-secret', 'a-long-admin-secreT'), false);
  assert.equal(interpretProvisionResponse(200, {}).state, 'pending');
  assert.equal(interpretProvisionResponse(200, { status: 'active' }).state, 'active');
  assert.equal(interpretProvisionResponse(429, null).state, 'retryable_failure');
  assert.equal(interpretProvisionResponse(500, null).state, 'retryable_failure');
  assert.equal(interpretProvisionResponse(409, null).state, 'active');
  assert.equal(interpretProvisionResponse(409, { status: 'blocked' }).state, 'blocked');
  assert.equal(interpretProvisionResponse(409, { error: { code: 'domain_already_in_use' } }).state, 'blocked');
  assert.equal(interpretProvisionResponse(200, { status: 'already_registered' }).state, 'active');
  assert.equal(interpretProvisionResponse(200, { status: 'registered' }).state, 'pending');
  assert.equal(interpretProvisionResponse(0, null).state, 'retryable_failure');
  assert.equal(provisioningReaderText('active'), '');
  assert.match(provisioningReaderText('blocked'), /another site/);
  assert.match(provisioningReaderText('pending'), /retried/);
  const cron = readFileSync(new URL('../../supabase/migrations/20261030_05_fail_closed_and_status_checks.sql', import.meta.url), 'utf8');
  assert.match(cron, /v_schedule := '0 \* \* \* \*'/);
  assert.match(cron, /v_schedule = '0 6 \* \* \*'/);
  assert.doesNotMatch(cron, /'send-daily-whatsapp-reports',\s*\n\s*'0 6 \* \* \*'/);
  const staff = readFileSync(new URL('../../supabase/migrations/20261025_09_staff_sessions.sql', import.meta.url), 'utf8');
  assert.match(staff, /keeping staff functions from 04/);
  const vault = readFileSync(new URL('../../supabase/migrations/20261025_15_whatsapp_report_cron_vault.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(vault, /whatsapp_report_job_missing/);
});

test('an old subdomain label resolves to the current store host', () => {
  assert.equal(historicHostTarget('old-shop', 'new-shop', 'ankara'), 'https://new-shop.storehouse.ng/?product=ankara');
  assert.equal(historicHostTarget('old-shop', 'old-shop', 'ankara'), null);
  assert.equal(historicHostTarget('old-shop', 'https://evil.test', null), null);
  assert.equal(historicHostTarget('234', 'new-shop', null), 'https://new-shop.storehouse.ng');
  assert.equal(historicHostTarget('old-shop', '234', 'ankara'), 'https://www.storehouse.ng/store/234/?product=ankara');
});

test('the card response includes the flat fee and a promo reduces the charge', () => {
  const full = customerChargeKobo(1_000_000);
  assert.ok(full);
  assert.equal(typeof full.flatKobo, 'number');
  assert.equal(full.flatKobo, 10_000);
  const promo = applyPromoKobo(1_000_000, { discount_type: 'percentage', discount_value: 10, is_active: true });
  assert.equal(promo.ok, true);
  if (!promo.ok) return;
  assert.equal(promo.discountKobo, 100_000);
  assert.equal(promo.payableKobo, 900_000);
  const charged = customerChargeKobo(promo.payableKobo);
  assert.ok(charged);
  assert.ok(charged.customerTotalKobo < full.customerTotalKobo);
  const fixed = applyPromoKobo(500_000, { discount_type: 'fixed', discount_value: 1500, is_active: true });
  assert.equal(fixed.ok && fixed.payableKobo, 350_000);
  const expired = applyPromoKobo(500_000, {
    discount_type: 'percentage', discount_value: 10, is_active: true, expires_at: '2020-01-01T00:00:00Z',
  });
  assert.equal(expired.ok ? '' : expired.error, 'promo_expired');
  const checkout = readFileSync(new URL('../../supabase/functions/initiate-storefront-payment/index.ts', import.meta.url), 'utf8');
  assert.match(checkout, /const \{ customerTotalKobo, paystackTakeKobo, flatKobo \} = charge/);
  assert.match(checkout, /promo_code/);
  const legacy = readFileSync(new URL('../../src/utils/onlineStoreSales.ts', import.meta.url), 'utf8');
  assert.match(legacy, /legacy_card_retired/);
  assert.equal(legacy.includes('complete-storefront-order'), false);
});

test('a legal store link is the store subdomain', async () => {
  const { buildStorefrontUrl, storefrontUrlPrefix } = await import('../../src/utils/storefrontUrl.ts');
  assert.equal(buildStorefrontUrl({ storeSlug: 'ada-fabrics' }), 'https://ada-fabrics.storehouse.ng');
  assert.equal(buildStorefrontUrl({ subdomain: 'ada-fabrics' }), 'https://ada-fabrics.storehouse.ng');
  assert.equal(storefrontUrlPrefix({ storeSlug: 'ada-fabrics' }), 'ada-fabrics.storehouse.ng');
  assert.equal(storefrontUrlPrefix({ storeSlug: '234' }), 'your-store.storehouse.ng');
  const { isLegalStoreSubdomain } = await import('../../src/utils/canonicalStoreUrl.js');
  assert.equal(isLegalStoreSubdomain('a'.repeat(64)), false);
  assert.equal(isLegalStoreSubdomain('a'.repeat(63)), true);
  const docs = readFileSync(new URL('../../src/data/documentation.ts', import.meta.url), 'utf8');
  assert.equal(docs.includes('storehouse.ng/store/'), false);
  assert.equal(docs.includes('storehouse.ng/@'), false);
  const setup = readFileSync(new URL('../../src/components/StoreSetup.tsx', import.meta.url), 'utf8');
  assert.match(setup, /\.storehouse\.ng/);
  assert.equal(setup.includes('slug-prefix">storehouse.ng/</'), false);
});

test('the repair SQL and checkout source keep the tenant boundaries', () => {
  const flags = readFileSync(new URL('../../supabase/migrations/20261030_01_platform_flags_and_chat.sql', import.meta.url), 'utf8');
  assert.match(flags, /platform_field_locked/);
  assert.match(flags, /owns_conversation/);
  assert.match(flags, /REVOKE UPDATE/);
  const stock = readFileSync(new URL('../../supabase/migrations/20261030_02_owned_inventory.sql', import.meta.url), 'utf8');
  assert.match(stock, /decrement_owned_lines/);
  assert.match(stock, /missing_order_lines/);
  assert.match(stock, /unscoped_stock_change/);
  assert.equal(stock.includes("notes -> 'inventory'"), false);
  const names = readFileSync(new URL('../../supabase/migrations/20261030_03_names_discounts_queue.sql', import.meta.url), 'utf8');
  assert.match(names, /cashier_discount_locked/);
  assert.match(names, /store_name_taken/);
  assert.match(names, /dead_at/);
  const checkout = readFileSync(new URL('../../supabase/functions/initiate-storefront-payment/index.ts', import.meta.url), 'utf8');
  assert.match(checkout, /priceCheckoutLines/);
  assert.equal(checkout.includes('it.quantity * it.unit_price_kobo'), false);
  const legacy = readFileSync(new URL('../../supabase/functions/complete-storefront-order/index.ts', import.meta.url), 'utf8');
  assert.match(legacy, /bindPaidOrder/);
  assert.match(legacy, /fulfill_legacy_storefront_lines/);
  assert.equal(legacy.includes('body.items'), false);
  const closed = readFileSync(new URL('../../supabase/migrations/20261030_05_fail_closed_and_status_checks.sql', import.meta.url), 'utf8');
  assert.match(closed, /fulfill_legacy_storefront_lines/);
  assert.match(closed, /decrement_owned_lines/);
  assert.match(closed, /orders_status_check/);
  assert.match(closed, /cron_secret_missing/);
  const ledger = readFileSync(new URL('../../supabase/functions/affiliate-ledger/index.ts', import.meta.url), 'utf8');
  assert.match(ledger, /decideAffiliateCommission/);
  assert.match(ledger, /affiliate_attributions/);
  const webhook = readFileSync(new URL('../../supabase/functions/whatsapp-webhook/index.ts', import.meta.url), 'utf8');
  assert.match(webhook, /DO NOT DEPLOY/);
  for (const name of ['apply-migration', 'run-migration', 'update-free-tier', 'upgrade-existing-users', 'check-tier-limits']) {
    const source = readFileSync(new URL(`../../supabase/functions/${name}/index.ts`, import.meta.url), 'utf8');
    assert.match(source, /adminCallAllowed/, name);
  }
  const slug17 = readFileSync(new URL('../../supabase/migrations/20261025_17_store_slug_redirects.sql', import.meta.url), 'utf8');
  assert.match(slug17, /slug_redirect_owned/);
  assert.equal(slug17.includes('GRANT EXECUTE ON FUNCTION public.remember_store_slug(uuid, text, text) TO authenticated'), false);
  const namesFile = readFileSync(new URL('../../supabase/migrations/20261030_03_names_discounts_queue.sql', import.meta.url), 'utf8');
  assert.equal(namesFile.includes("RAISE EXCEPTION 'store_name_collision'"), false);
  assert.match(namesFile, /store_name_collisions/);
  const follow = readFileSync(new URL('../../supabase/migrations/20261030_04_flags_staff_affiliates_payments.sql', import.meta.url), 'utf8');
  assert.match(follow, /is_admin/);
  assert.match(follow, /staff_pin_locked/);
  assert.match(follow, /record_affiliate_commission/);
  assert.match(follow, /platform_config/);
  assert.match(follow, /storefront-inventory-retry/);
  const handler = readFileSync(new URL('../../supabase/functions/_shared/paystack-subaccount-handler.ts', import.meta.url), 'utf8');
  assert.match(handler, /inventory_queue_failed/);
  assert.match(handler, /record_storefront_reversal/);
  assert.match(handler, /assess_storefront_charge/);
  assert.match(ledger, /record_affiliate_commission/);
  assert.match(ledger, /refund_affiliate_commission/);
});

test('an underpaid or wrong-currency charge is rejected and a closed order is not fulfilled', () => {
  assert.deepEqual(assessCharge({
    orderStatus: 'pending', orderAmountKobo: 250000, paidAmountKobo: 100, currency: 'NGN',
  }), { accept: false, error: 'amount_mismatch' });
  assert.equal(chargeEventStatus({ accept: false, error: 'amount_mismatch' }).httpStatus, 400);
  assert.deepEqual(assessCharge({
    orderStatus: 'pending', orderAmountKobo: 250000, paidAmountKobo: 250000, currency: 'USD',
  }).error, 'wrong_currency');
  assert.equal(assessCharge({
    orderStatus: 'failed', orderAmountKobo: 250000, paidAmountKobo: 250000, currency: 'NGN',
  }).error, 'order_not_payable');
  assert.equal(chargeEventStatus({ accept: false, error: 'order_not_payable' }).httpStatus, 200);
  assert.equal(assessCharge({
    orderStatus: 'pending', orderAmountKobo: 250000, paidAmountKobo: 250000, currency: 'NGN',
  }).accept, true);
  assert.deepEqual(inventoryFollowUp(true, true), { httpStatus: 500, inventoryQueued: false });
  assert.deepEqual(inventoryFollowUp(true, false), { httpStatus: 200, inventoryQueued: true });
});
