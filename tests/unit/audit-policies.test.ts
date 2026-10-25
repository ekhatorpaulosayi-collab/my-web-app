import assert from 'node:assert/strict';
import test from 'node:test';
import { friendlyAuthError } from '../../src/lib/authErrors.js';
import { addCalendarDays, addCalendarMonths, businessDayKey } from '../../src/utils/businessDate.ts';
import { saleRevenueKobo } from '../../src/utils/money.ts';
import { canManageCustomers, canViewInvoices, canViewReports } from '../../src/utils/staffPermissions.ts';
import { nextPinFailure } from '../../src/utils/pinLockout.ts';
import { isPermanentSaleError } from '../../src/utils/saleSync.ts';
import { scrubSentryEvent } from '../../src/lib/sentryScrub.ts';
import {
  aiSpendGate,
  chargeSuccessOutcome,
  chatCallAllowed,
  customDomainIsVerified,
  isNativeChatClient,
  isBuiltInChatOrigin,
  markSignupAction,
  originsForVerifiedDomain,
} from '../../supabase/functions/_shared/moneyPolicies.ts';

test('wrong password and unknown email share one sentence', () => {
  assert.equal(friendlyAuthError({ message: 'Invalid login credentials' }), 'Email or password is incorrect');
  assert.equal(friendlyAuthError({ code: 'user_not_found' }), 'Email or password is incorrect');
  assert.equal(friendlyAuthError({ message: 'Wrong password' }), 'Email or password is incorrect');
  assert.equal(friendlyAuthError({ message: 'No account found' }), 'Email or password is incorrect');
  assert.match(friendlyAuthError({ message: 'Network request failed' }), /Network error/);
  const once = friendlyAuthError({ message: 'Invalid login credentials' });
  assert.equal(friendlyAuthError({ message: once }), once);
});

test('Lagos calendar day is one hour ahead of UTC', () => {
  const justBeforeLagosMidnight = new Date('2026-01-15T22:30:00.000Z');
  const justAfterLagosMidnight = new Date('2026-01-15T23:30:00.000Z');
  assert.equal(businessDayKey(justBeforeLagosMidnight), '2026-01-15');
  assert.equal(businessDayKey(justAfterLagosMidnight), '2026-01-16');
  assert.equal(addCalendarDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addCalendarMonths('2026-01-31', 1), '2026-02-28');
});

test('revenue subtracts the discount and prefers the stored final amount', () => {
  assert.equal(saleRevenueKobo({ sellKobo: 10000, qty: 2, discountKobo: 1500 }), 18500);
  assert.equal(
    saleRevenueKobo({ sellKobo: 10000, qty: 2, discountKobo: 1500, finalKobo: 5000 }),
    5000,
  );
  assert.equal(saleRevenueKobo({ unit_price: 2500, quantity: 1, discount_amount: 2500 }), 0);
});

test('cashiers cannot open money, export, customers, or invoices', () => {
  assert.equal(canViewReports('cashier'), false);
  assert.equal(canManageCustomers('cashier'), false);
  assert.equal(canViewInvoices('cashier'), false);
  assert.equal(canViewReports('manager'), true);
  assert.equal(canManageCustomers('manager'), true);
  assert.equal(canViewInvoices('manager'), true);
  assert.equal(canViewInvoices('owner'), true);
  assert.equal(canViewReports('owner'), true);
});

test('permanent sale errors are not retried and a PIN locks after five misses', () => {
  assert.equal(isPermanentSaleError({ code: '42501', message: 'permission denied' }), true);
  assert.equal(isPermanentSaleError({ code: '23503', message: 'foreign key' }), true);
  assert.equal(isPermanentSaleError({ message: 'Product selection is required' }), true);
  assert.equal(isPermanentSaleError({ message: 'insufficient_stock: not enough items left to record this sale' }), true);
  assert.equal(isPermanentSaleError({ message: 'unknown_product: this product is not in your catalogue' }), true);
  assert.equal(isPermanentSaleError({ message: 'price_mismatch: the price does not match this product or its discount' }), true);
  assert.equal(isPermanentSaleError({ message: 'invalid_client_sale_id' }), true);
  assert.equal(isPermanentSaleError({ code: '42804' }), true);
  assert.equal(isPermanentSaleError({ message: 'Failed to fetch' }), false);
  assert.equal(isPermanentSaleError(null), false);
  let state = { attempts: 0, lockedUntil: 0 };
  for (let i = 0; i < 4; i++) state = nextPinFailure(state, 1_000);
  assert.equal(state.lockedUntil, 0);
  state = nextPinFailure(state, 1_000);
  assert.equal(state.lockedUntil, 1_000 + 15 * 60 * 1000);
  const sixth = nextPinFailure(state, 1_500);
  assert.equal(sixth.attempts, 5);
  assert.equal(sixth.locked, true);
});

test('six wrong PINs end in a lock that does not add a seventh attempt', () => {
  let state = { attempts: 0, lockedUntil: 0 };
  const results = [];
  for (let i = 0; i < 6; i++) {
    state = nextPinFailure(state, 1_000);
    results.push(state.locked);
  }
  assert.deepEqual(results, [false, false, false, false, true, true]);
  assert.equal(state.attempts, 5);
  assert.equal(nextPinFailure(state, 1_000).attempts, 5);
});

test('Sentry events drop email and a chat call with no Origin is rejected', () => {
  const event = scrubSentryEvent({
    user: { id: 'user-1', email: 'merchant@example.com', ip_address: '1.2.3.4' },
    extra: { email: 'merchant@example.com', note: 'ok' },
    contexts: { user: { email: 'merchant@example.com' } },
  });
  assert.equal(event.user?.id, 'user-1');
  assert.equal(event.user?.email, undefined);
  assert.equal(event.extra?.email, undefined);
  assert.equal(event.extra?.note, 'ok');
  assert.equal(chatCallAllowed({ origin: null, originAllowed: false, authenticated: false }), false);
  assert.equal(chatCallAllowed({ origin: null, originAllowed: false, authenticated: true }), false);
  assert.equal(chatCallAllowed({ origin: null, originAllowed: false, authenticated: true, nativeApp: true }), true);
  assert.equal(isNativeChatClient('capacitor'), true);
  assert.equal(isNativeChatClient('browser'), false);
  assert.equal(chatCallAllowed({ origin: 'https://evil.example', originAllowed: false, authenticated: true, nativeApp: true }), false);
  assert.equal(customDomainIsVerified({ custom_domain: 'pay.example.com', custom_domain_verified: true }), true);
  assert.equal(customDomainIsVerified({ custom_domain: 'pay.example.com', custom_domain_verified: false }), false);
  assert.equal(customDomainIsVerified({ custom_domain: 'pay.example.com' }), false);
  assert.equal(customDomainIsVerified({ custom_domain: '', custom_domain_verified: true }), false);
});

test('a recorded payment returns 200 and queues a stock failure', () => {
  assert.deepEqual(chargeSuccessOutcome(true, true), { httpStatus: 200, queueInventory: true });
  assert.deepEqual(chargeSuccessOutcome(true, false), { httpStatus: 200, queueInventory: false });
  assert.deepEqual(chargeSuccessOutcome(false, true), { httpStatus: 500, queueInventory: false });
});

test('mark_signup does not increment when the customer is already attributed', () => {
  assert.equal(
    markSignupAction({ rpcAvailable: true, rpcCounted: false, claimedClick: true }),
    'already_counted',
  );
  assert.equal(
    markSignupAction({ rpcAvailable: true, rpcCounted: true, claimedClick: false }),
    'count_in_rpc',
  );
  assert.equal(
    markSignupAction({ rpcAvailable: false, rpcCounted: false, claimedClick: false }),
    'already_counted',
  );
  assert.equal(
    markSignupAction({ rpcAvailable: false, rpcCounted: false, claimedClick: true }),
    'increment_fallback',
  );
});

test('AI spend fails closed when the cap RPC is missing or the cap is used up', () => {
  assert.equal(aiSpendGate({ rpcMissing: true, reserved: true }), 'uninstalled');
  assert.equal(aiSpendGate({ rpcMissing: false, reserved: false }), 'capped');
  assert.equal(aiSpendGate({ rpcMissing: false, reserved: true }), 'ok');
});

test('chat origins allow storehouse, localhost, and verified custom domains only', () => {
  assert.equal(isBuiltInChatOrigin('https://shop.storehouse.ng'), true);
  assert.equal(isBuiltInChatOrigin('https://evil.example'), false);
  assert.equal(isBuiltInChatOrigin('capacitor://localhost'), true);
  assert.equal(isBuiltInChatOrigin('https://pay.example', ['https://pay.example']), true);
  assert.deepEqual(originsForVerifiedDomain('Pay.Example.com'), [
    'https://pay.example.com',
    'https://www.pay.example.com',
  ]);
  assert.deepEqual(originsForVerifiedDomain('not a host'), []);
});
