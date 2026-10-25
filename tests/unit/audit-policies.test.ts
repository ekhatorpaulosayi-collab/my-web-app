import assert from 'node:assert/strict';
import test from 'node:test';
import { friendlyAuthError } from '../../src/lib/authErrors.js';
import { addCalendarDays, addCalendarMonths, businessDayKey } from '../../src/utils/businessDate.ts';
import { saleRevenueKobo } from '../../src/utils/money.ts';
import { canManageCustomers, canViewReports } from '../../src/utils/staffPermissions.ts';
import {
  aiSpendGate,
  chargeSuccessOutcome,
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

test('cashiers cannot open money, export, or customers', () => {
  assert.equal(canViewReports('cashier'), false);
  assert.equal(canManageCustomers('cashier'), false);
  assert.equal(canViewReports('manager'), true);
  assert.equal(canManageCustomers('manager'), true);
  assert.equal(canViewReports('owner'), true);
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
