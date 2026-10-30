# Follow-up after the c24df24 audit

Decision stays NO-GO until this commit is green in CI and Paul applies the SQL. Nothing here was merged, deployed, or run on production.

| ID | Status | Evidence |
| --- | --- | --- |
| C1 flat fee | FIXED | `flatKobo` comes from `customerChargeKobo`. Unit test checks the declaration and that a ₦10,000 subtotal has a 10,000 kobo flat fee. |
| C2 migration 01 | FIXED | `DROP FUNCTION` before recreate. Re-applied on local Postgres, exit 0. CI job `migrations` runs `scripts/rehearse-migrations.sh`. |
| H1 promo | FIXED | Server `applyPromoKobo`. 10% of 1,000,000 kobo is 900,000 before fees. Card request sends `promo_code`. |
| H2 legacy checkout | FIXED | The merchant-key button no longer charges. `saveOnlineStoreOrder` returns `legacy_card_retired` and does not call `complete-storefront-order`. |
| H3 store links | FIXED | `buildStorefrontUrl('ada-fabrics')` is `https://ada-fabrics.storehouse.ng`. Help copy and the setup fields use that host. Reserved and number-only names still cannot be DNS labels. |
| H4 typecheck | FIXED | `npm run typecheck` passed. CI runs it. |
| H5 payment tests | FIXED | Promo, binding, and catalogue-price cases are in `tests/unit/mandate-repairs.test.ts`. Full unit suite passed. |
| H6 admin functions | BLOCKED | Code refuses a missing or short secret. Paul deletes or redeploys the live copies. See `07_PRODUCTION_CONTAINMENT_PLAN.md`. |
| SEC-01 to SEC-02 | PARTIAL | SQL applies on the rehearsal database. Live grants are unchanged until Paul runs `20261030_01`. |
| SEC-04 | PARTIAL | Webhook stays DO NOT DEPLOY. |
| SEC-05 | BLOCKED | Rotation is Paul's. |
| PAY-02 PAY-04 | PARTIAL | Owned stock SQL is in the rehearsal. Crash and concurrent webhook runs are not. |
| BIZ-02 BIZ-03 | PARTIAL | Cashier trigger is in `20261030_03`. A null quantity is untracked stock. A number must cover the line. |
| OPS-01 | PARTIAL | Dead rows `pg_notify` `storefront_inventory_dead`. No customer message is sent. |
| OPS-02 | BLOCKED | Needs Supabase `pg_net` and a staging cron. CI skips file 24 when `pg_net` is absent. |
| SLUG-02 | PARTIAL | Settings shows pending. Other callers still do not block the save. |
| DB-01 | PARTIAL | 28 October files apply on the CI baseline. File 04 and 04b need the live catalogue and are not in that run. File 24 needs `pg_net`. |
| QA-02 | PARTIAL | Runbook updated. Not executed on production. |

Local Postgres rehearsal: `MIGRATIONS_APPLIED 28`, then `20261030_01` applied a second time with exit 0.
