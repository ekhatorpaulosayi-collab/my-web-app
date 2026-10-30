# Test evidence

Environment: Linux sandbox, Node.js v22.23.4, repo `/workspace`, branch `cursor/audit-fixes-50fe`. No production database. No Paystack charge. No browser screenshot: the visible change is the Store Settings alert text, not a new layout.

| Command | Result |
| --- | --- |
| `npm ci` | PASS, 713 packages, 13s. Audit reported 65 existing dependency advisories. Not treated as a product failure. |
| `npm run test:unit` | PASS. 40 tests, 0 failed, 0 skipped. About 413 ms. Includes the 7 tests in `tests/unit/mandate-repairs.test.ts`. |
| `npm run check:chat` | PASS. Critical checks passed. 3 existing warnings. `setMessages` at lines 933, 960, 1205, 2066. |
| `npm run build` | PASS. Exit 0. About 10s. |
| `npx -p typescript@5.9.3 tsc --noEmit --strict` on `checkoutPrice.ts`, `adminGate.ts`, `affiliateDecision.ts`, `paidOrder.ts` | PASS. Exit 0. The app has no root tsconfig, so this is not a full-project typecheck. |
| `npm run lint` | FAIL. 306 errors and 16 warnings, almost all pre-existing `process is not defined` in old scripts. `tests/unit/mandate-repairs.test.ts` is ignored by the ESLint config. |
| `npx eslint` on `canonicalStoreUrl.js` and `provisionStatus.js` | No errors reported for those two files. The `.tsx` files are ignored by the ESLint config. |
| `npm run test:ux` | NOT RUN. Needs a browser and does not exercise the payment SQL. |
| Migration apply | NOT RUN. `psql` is absent. |

## Assertions that ran

- A ₦1 client price on a ₦50,000 catalogue product prices at 5,000,000 kobo.
- Another store's product, an inactive product, a mismatched variant, a duplicate line, a fractional quantity, and an overflowing total are rejected.
- An owned variant price override of 4,000,000 kobo times quantity 2 is 8,000,000 kobo.
- `ord_` delegates. A missing order, a short amount, USD, and a fulfilled order are rejected.
- Own affiliate code, an `ord_` payment, a missing plan code, a missing attribution, a replay, and a payment outside 30 days earn no commission. One eligible payment of 1,000,000 kobo earns 300,000 kobo.
- Admin secret: unset, short, and mismatched fail. A matching secret passes.
- Provision HTTP 200 without `status: "active"` is pending. 429, 500, 409, and status 0 fail.
- `old-shop` to `new-shop` with product `ankara` is `https://new-shop.storehouse.ng/?product=ankara`. An external host is rejected.
- Source checks: platform-flag SQL, owned stock SQL, cashier trigger, checkout no longer multiplies `it.quantity * it.unit_price_kobo`, legacy fulfilment does not read `body.items`, admin functions call `adminCallAllowed`, webhook still says `DO NOT DEPLOY`, migration 17 does not grant `remember_store_slug` to `authenticated`.
