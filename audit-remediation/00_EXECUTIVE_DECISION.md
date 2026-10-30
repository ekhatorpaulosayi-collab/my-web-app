# Executive decision

**NO-GO** for merge, for applying migrations, and for expanding card payments.

The branch `cursor/audit-fixes-50fe` now contains the repair code. It has not been merged. Nothing was deployed. No SQL was run against production.

Verified in this pass: checkout no longer prices from the shopper's `unit_price_kobo`; a paid reference without a matching server order is refused; affiliate commission ignores a client code; the five one-off admin functions refuse a public key; an old subdomain label can be sent to the current store host when the app loads; a Vercel 200 is not treated as a live certificate.

Not verified: the new SQL was not executed on any database (`psql` is not installed here, and production was not touched). Live exposure of privileged columns, chat functions, and the five admin functions is therefore still an owner decision.

## Owner actions

See `07_PRODUCTION_CONTAINMENT_PLAN.md`. Do not run them until you approve each one.
