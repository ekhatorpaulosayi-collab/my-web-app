# Deploy order

Paul runs every step. This branch does not apply SQL, deploy edge functions, push `main`, or change Vercel.

Apply each migration with `psql` (not `supabase db push`), then record the version in `supabase_migrations.schema_migrations`. Wrap is already `BEGIN`/`COMMIT` inside the files that have it. Connection string stays in `~/.supabase-paystack-dburl`. Project ref: `yzlniqwzqlsftxrtapdl`.

`paystack-webhook-router` is public. Deploy it with `--no-verify-jwt`, then read `verify_jwt` back from the management API. A no-auth POST must return the function's `bad_signature`, not the gateway `UNAUTHORIZED_NO_AUTH_HEADER`. Record the flag before the redeploy.

## 1. Patch

Review this branch. The working tree is the patch. Nothing in this step touches production.

## 2. Edge functions that can ship before the new SQL

Deploy `affiliate-ledger` with `verify_jwt=true`. `mark_signup` uses `attribute_affiliate_signup` when migration 11 is present. Until then it increments `total_signups` only after it claims one unconverted click, so a repeat call does not inflate the count.

Leave `ai-chat` on the current production build until step 11. The build in this branch refuses the OpenAI call when `reserve_ai_chat_spend` is missing, so deploying it early stops help chat.

Leave `paystack-webhook-router` on the current production build until steps 6 and 10 are applied. The new handler returns 200 after `record_successful_payment` succeeds and queues a stock failure. Paystack will not retry a 200, so the inventory function and the queue table need to exist first. Deploy command, after those two files:

```
supabase functions deploy paystack-webhook-router --no-verify-jwt --project-ref yzlniqwzqlsftxrtapdl
```

## 3. SQL 01, 02, 03

In order:

1. `supabase/migrations/20261023_01_ajo_and_invoice_public_access.sql`
2. `supabase/migrations/20261023_02_invoice_numbers_stores_columns_staff.sql`
3. `supabase/migrations/20261023_03_payout_guard_payment_tx_policies.sql`

## 4. SQL 04 Stage A, then 05, then 06

1. `supabase/migrations/20261025_04_advisor_hardening.sql` (Stage A: sections 0–6, 7a, 8). This file drops open SELECT on pending product reviews. The storefront insert no longer reads the new row back.
2. `supabase/migrations/20261025_05_scope_get_sales_summary.sql`
3. `supabase/migrations/20261025_06_storefront_inventory.sql` (`apply_storefront_inventory`, idempotent on reference).

`20261025_04b_chat_policies_stage_b.sql` stays unrun in this step.

## 5. Frontend

Deploy this branch's frontend after Stage A is applied (the chat widget calls the visitor RPCs from section 6). Staff PIN login no longer selects the `pin` column when `begin_staff_session` exists. Route guards read `get_acting_staff`. Until migration 09 is applied, a missing RPC falls back to the saved local session so the app still opens.

## 6. SQL 04b

`supabase/migrations/20261025_04b_chat_policies_stage_b.sql` only after the frontend from step 5 is what customers are loading. It removes the open chat policies the old widget needs.

## 7. SQL 07

`supabase/migrations/20261025_07_revoke_storefront_client_writes.sql` only after all of these are true:

- SQL 06 has been run
- `complete-storefront-order` is deployed
- `paystack-webhook-router` from this branch is deployed (`--no-verify-jwt`, flag read back)
- the step 5 frontend is live (the browser no longer calls the revoked inventory writes)

## 8. SQL 08

`supabase/migrations/20261025_08_dashboard_summary.sql` after SQL 05. It creates `dashboard_bootstrap()`.

## 9. SQL 09 — after 08

`supabase/migrations/20261025_09_staff_sessions.sql` replaces `dashboard_bootstrap()` and `get_sales_summary()`. Run it after 08. If 08 is applied again later, run 09 again. It also revokes SELECT on `staff.pin`, which is safe only after the step 5 frontend is live.

Cashiers then fail `get_sales_summary`, receive products without `cost_price` from the bootstrap RPC, and lose SELECT on sales, customers, expenses, and invoices through restrictive policies. A direct PostgREST select of `products.cost_price` can still succeed, because the cashier uses the owner's JWT and column grants cannot tell the roles apart. The client zeros that field when the server role is cashier.

## 10. SQL 10 and the webhook deploy

`supabase/migrations/20261025_10_inventory_queue.sql`, then deploy `paystack-webhook-router` as in step 2. `charge.success` returns 200 once `record_successful_payment` has committed. A stock error upserts `storefront_inventory_queue` on `paystack_reference` and still returns 200. Replaying `apply_storefront_inventory(reference)` is idempotent via `storefront_fulfillments`.

## 11. SQL 11 and the AI chat deploy

`supabase/migrations/20261025_11_affiliate_signup_and_ai_cap.sql`, then deploy `ai-chat`. This function is called from the browser. Deploy it with `--no-verify-jwt` if that is how it is live today, then read `verify_jwt` back from the management API and confirm a browser call still reaches the function.

- `attribute_affiliate_signup` inserts one row per customer and increments `total_signups` only on that insert.
- `reserve_ai_chat_spend` is the global Lagos-day cap (`AI_DAILY_COST_CAP_USD`, default 20; `AI_CHAT_CALL_USD`, default 0.01). Over the cap, or if this function is missing, the function answers with the help-limit sentence and does not call OpenAI.
- Browser `Origin` must be storehouse.ng, `www`, `*.storehouse.ng`, localhost, `capacitor://localhost`, `AI_CHAT_EXTRA_ORIGINS`, or a `stores.custom_domain` with `custom_domain_verified = true` (apex and www, cached five minutes). A missing Origin is treated as a non-browser caller.

## Rollback

Each new migration file states its `DROP` statements in the header. After dropping 09, re-apply 05 and 08 if those function bodies are still wanted. Promoting the previous Vercel deployment restores the previous frontend. Redeploy the previous edge-function source if a function deploy misbehaves, and read `verify_jwt` back on `paystack-webhook-router`.
