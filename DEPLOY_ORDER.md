# Deploy order

You run every step. This branch does not apply SQL, deploy edge functions, push `main`, or change Vercel.

Do the steps from top to bottom. Do not skip a smoke test. If a smoke test fails, stop and use that step's rollback. Do not run `supabase db push`.

The database password lives in `~/.supabase-paystack-dburl` (permissions `600`). Never paste it into this file, a chat, or a command that prints it. Never run `echo` on that file.

Project ref: `yzlniqwzqlsftxrtapdl`.

## How to run a SQL file

From the repo root, with `DATABASE_URL` set to the contents of that file (do not print it):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/FILE.sql
```

Or, without putting the URL in your shell history:

```bash
psql "$(cat ~/.supabase-paystack-dburl)" -v ON_ERROR_STOP=1 -f supabase/migrations/FILE.sql
```

`ON_ERROR_STOP=1` makes `psql` stop at the first error instead of continuing.

After a file succeeds, record it so Supabase knows it was applied. Replace `VERSION` and `NAME` with the values in that step:

```bash
psql "$(cat ~/.supabase-paystack-dburl)" -v ON_ERROR_STOP=1 -c \
"INSERT INTO supabase_migrations.schema_migrations (version, name, statements) \
 VALUES ('VERSION', 'NAME', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING;"
```

## Step 0 — before any SQL

Do this once, before the files below. Do not paste any new secret into git, this file, or a chat. Old copies stay in git history. Do not rewrite history.

1. **Backup.** In the Supabase dashboard open Database → Backups. Confirm a backup exists. Turn on Point-in-Time Recovery (PITR) if the project is on the Pro plan. If PITR is not available, take your own dump before any migration and keep the file off the repo:

   ```bash
   pg_dump "$(cat ~/.supabase-paystack-dburl)" -Fc -f ~/storehouse-prechange.dump
   ```

   Do not echo that URL. Check the file exists and is not empty (`ls -lh ~/storehouse-prechange.dump`). Restore later with `pg_restore` only if you mean to replace the database.

2. **Reset the database password.** The old password is still in old git commits. This branch removed it from the current files. Supabase dashboard → Project Settings → Database → Database password → Reset. Update `~/.supabase-paystack-dburl` (permissions `600`) with the new URL. Do not commit that file. The new value goes only in that file. Old copies of the password stop working after the reset.

3. **Rotate the Supabase access token (`sbp_`).** Dashboard → Account (your avatar) → Access Tokens. Revoke the token that was committed. Create a new token. Put it in the environment variable `SUPABASE_ACCESS_TOKEN` for the Supabase CLI (`supabase login` or that variable). Scripts that call the management API read that variable. It does not go in the repo.

4. **Rotate the ImageKit private key.** ImageKit dashboard → Developer options → API keys → regenerate the private key. Put the new value in `IMAGEKIT_PRIVATE_KEY` for the upload scripts only. The public endpoint key can stay. Do not commit the private key.

5. **Rotate the Resend key.** Resend dashboard → API Keys → revoke the old key → create a new one. Put it in the edge secret `RESEND_API_KEY` (Supabase → Project Settings → Edge Functions → Secrets). It does not go in a markdown file.

6. **Rotate the VAPID key pair.** Generate a new pair (the web-push docs describe the generator). The new private key goes in the edge secret `VAPID_PRIVATE_KEY` for `send-push-notification`. The new public key goes in the website variable `VITE_VAPID_PUBLIC_KEY`. Phones that subscribed with the old key must subscribe again. Do not commit the private key.

7. **Rotate Supabase API keys.** The old service-role key was committed in the past. Create a new secret key and point edge functions at it. Point the website's `VITE_SUPABASE_ANON_KEY` at the new publishable key (`sb_publishable_...`). After the site and the functions are using the new keys, disable the legacy anon and service-role keys. Check both old keys return 401. The old Play Store app will stop loading. That is expected.

8. **Auth settings.** Authentication → Providers → Email:
   - Minimum password length **8**
   - Turn on leaked-password protection
   - Confirm anonymous sign-ins are off

Smoke test: you can still sign in to https://www.storehouse.ng with your account. A password shorter than 8 characters is rejected on sign-up.

Rollback: a password reset cannot be undone. The new password is the password. If sign-in breaks, reset it again and update the local URL file. If a migration goes wrong and PITR is off, restore `~/storehouse-prechange.dump`. Do not put any of these secrets back into git.

## Step 1 — affiliate ledger function

Deploy `affiliate-ledger` **before** the Stage A SQL file. Leave `verify_jwt` **true**.

Before you deploy, write down the current `verify_jwt` value. After you deploy, read it back. It must still be true.

```bash
supabase functions deploy affiliate-ledger --project-ref yzlniqwzqlsftxrtapdl
```

Smoke test: open the affiliate page while signed in. It should load, not return a gateway 401.

Rollback: deploy the previous copy of `supabase/functions/affiliate-ledger` and read `verify_jwt` back.

## Step 2 — public ajo and invoice access

File: `supabase/migrations/20261023_01_ajo_and_invoice_public_access.sql`

Version `2026102301`, name `ajo_and_invoice_public_access`.

Smoke test: a shared ajo link still opens that one group. A public invoice link still opens that one invoice. A stranger cannot list every group.

Rollback: the `ROLLBACK` section at the bottom of that file. If you are unsure, restore the Step 0 backup instead of guessing.

## Step 3 — invoice numbers and store columns

File: `supabase/migrations/20261023_02_invoice_numbers_stores_columns_staff.sql`

Version `2026102302`, name `invoice_numbers_stores_columns_staff`.

Run the pre-check in the file first (duplicate invoice numbers). It must return no rows.

Smoke test: open store settings and save. Create a second invoice. Both save.

Rollback: the `ROLLBACK` section at the bottom of that file.

## Step 4 — payouts and payment transactions

File: `supabase/migrations/20261023_03_payout_guard_payment_tx_policies.sql`

Version `2026102303`, name `payout_guard_payment_tx_policies`.

Run the pre-check in the file first (duplicate payouts). It must return no rows.

Smoke test: record stays as it was. You should not be able to insert into `payment_transactions` from the browser.

Rollback: drop the unique index `contribution_payouts_one_per_member` only if you are certain, and restore the Step 0 backup if a real payout was blocked. Do not drop it just to “make the error go away” while two payouts exist.

## Step 5 — Stage A security SQL

File: `supabase/migrations/20261025_04_advisor_hardening.sql`

Version `2026102504`, name `advisor_hardening_stage_a`.

This file is safe to run before the new website. It does **not** include the chat-policy drop. That is the next file, later.

Before you run it on the live database, you can rehearse it. The rehearsal needs a local Supabase Postgres (`supabase start`), not an empty stock Postgres. Migration 04 expects that schema (`auth`, `public.green_api_pool`, and the rest of a schema-only dump). Dump the schema only, then run `scripts/dry-run-04.sh` against that file. The script loads the dump into a throwaway local database, runs this file and `20261025_04b_chat_policies_stage_b.sql` inside one transaction, and rolls back. It refuses a Supabase URL (`*.supabase.com` / `*.supabase.co`). Point it at the database from `supabase start`.

```bash
supabase start
supabase db dump --schema-only -f ~/storehouse-schema.sql
scripts/dry-run-04.sh ~/storehouse-schema.sql
```

Smoke test: the storefront opens, the chat widget still answers, you can add a product, and you can record a sale.

Rollback: open the `ROLLBACK` section at the bottom of that same file and run **only** the numbered piece that matches what broke. Do not run the whole file backwards. If more than one section is wrong, restore the Step 0 backup / PITR instead.

## Step 6 — sales summary

File: `supabase/migrations/20261025_05_scope_get_sales_summary.sql`

Version `2026102505`, name `scope_get_sales_summary`.

Smoke test: the dashboard total still matches today's sales for your own store. You do not see another store's sales.

Rollback: the `ROLLBACK` note at the top of that file (drop and restore the previous function). File `20261025_09_staff_sessions.sql` replaces this function again later, so if you have already run that file, re-run it instead of restoring this one.

## Step 7 — storefront stock function

File: `supabase/migrations/20261025_06_storefront_inventory.sql`

Version `2026102506`, name `storefront_inventory`.

This file also creates `decrement_product_quantity(uuid, integer)` for a product that has no variant, and `decrement_storefront_lines(jsonb)` for a legacy checkout with several lines. Only `service_role` may run them. If there is not enough stock either function raises `insufficient_stock`. `decrement_storefront_lines` does every line in one transaction, so a shortfall on a later line puts the earlier lines back. If you already ran an older copy of this file, run it again. `CREATE OR REPLACE` keeps the fulfillment table.

Smoke test: nothing visible changes yet. In the SQL editor, `SELECT proname FROM pg_proc WHERE proname IN ('apply_storefront_inventory', 'decrement_storefront_lines', 'decrement_product_quantity');` returns three rows.

Rollback. Drop `apply_storefront_inventory` first, then `decrement_storefront_lines`. Both call `decrement_product_quantity`.

```sql
DROP FUNCTION IF EXISTS public.apply_storefront_inventory(text);
DROP FUNCTION IF EXISTS public.decrement_storefront_lines(jsonb);
DROP FUNCTION IF EXISTS public.decrement_product_quantity(uuid, integer);
DROP TABLE IF EXISTS public.storefront_fulfillments;
```

## Step 8 — deploy complete-storefront-order

Deploy `complete-storefront-order` **before** Step 13 (the file that revokes browser stock writes). Keep `verify_jwt` as it is live today (expected **true**, because the app calls it with a user token). Write the flag down before the deploy and read it back after.

This copy checks the lines, claims the Paystack reference, then calls `decrement_storefront_lines` once. A shortfall rolls the earlier lines back and removes the claim, so a retry starts from the same stock. Deploy it only after Step 7 has created that function.

```bash
supabase functions deploy complete-storefront-order --project-ref yzlniqwzqlsftxrtapdl
```

Smoke test: a storefront checkout still creates an order. Do not use a real card until Step 10 is also done if this function is what records the payment.

Rollback: deploy the previous copy of that function and read `verify_jwt` back.

## Step 9 — stock queue and the queue worker

Files, in this order:

1. `supabase/migrations/20261025_10_inventory_queue.sql` — version `2026102510`, name `inventory_queue`
2. `supabase/migrations/20261025_13_inventory_queue_processor.sql` — version `2026102513`, name `inventory_queue_processor`

Smoke test:

```sql
SELECT proname FROM pg_proc WHERE proname = 'process_storefront_inventory_queue';
```

returns one row.

Rollback:

```sql
DROP FUNCTION IF EXISTS public.process_storefront_inventory_queue(integer);
DROP TABLE IF EXISTS public.storefront_inventory_alerts;
DROP TABLE IF EXISTS public.storefront_inventory_queue;
```

## Step 10 — Paystack webhook

Only after Steps 7 and 9. Deploy `paystack-webhook-router` with JWT verification **off**. Paystack does not send a Supabase token. If the flag flips to true, every payment is rejected before your code runs.

Write down `verify_jwt` before you deploy.

```bash
supabase functions deploy paystack-webhook-router --no-verify-jwt --project-ref yzlniqwzqlsftxrtapdl
```

Read the flag back from the management API. It must be false. Then POST with no auth header and a fake body. You must get the function's `bad_signature`, not the gateway message `UNAUTHORIZED_NO_AUTH_HEADER`.

Set these function secrets if they are not set. Do not paste the values into git:

- `AI_DAILY_COST_CAP_USD` (used by the chat function in Step 15; default 20 if you leave it unset)
- `AI_CHAT_CALL_USD` (default 0.01)
- `AI_CHAT_EXTRA_ORIGINS` (extra https origins, comma-separated, or leave empty)

The new publishable key from Step 0 is a **website** variable (`VITE_SUPABASE_ANON_KEY`), not a webhook secret.

Smoke test: the fake-signature POST returns `bad_signature`. After the next real payment, the order shows paid and stock has moved. If stock did not move, the payment must still show paid (the webhook returns 200 and queues stock).

Rollback: deploy the previous webhook source **with** `--no-verify-jwt` and read the flag back. Do not deploy it without that flag.

## Step 11 — dashboard summary, then staff sessions, then record_sale

Do these three files, then deploy the website, in one sitting.

1. `supabase/migrations/20261025_08_dashboard_summary.sql` — version `2026102508`, name `dashboard_summary`
2. `supabase/migrations/20261025_09_staff_sessions.sql` — version `2026102509`, name `staff_sessions`
3. `supabase/migrations/20261025_12_record_sale.sql` — version `2026102512`, name `record_sale`
4. `supabase/migrations/20261025_14_custom_domain_verification.sql` — version `2026102514`, name `custom_domain_verification`

If you already applied an older copy of 09 or 12, run these files again. `CREATE OR REPLACE` replaces the functions. 09 must return `pin_locked` / `invalid_pin` in the JSON (a `RAISE` rolls the attempt counter back, so the lock never sticks). 12 must cast `sale_time` to `timetz` and `client_sale_id` to `uuid`. Those are the live column types. A bad client id comes back as `invalid_client_sale_id`, not `22P02`.

`20261025_14` makes `custom_domain` unique, takes away the owner's ability to update `custom_domain`, `domain_verification_token`, and `custom_domain_verified`, and adds `set_store_custom_domain` (that call sets verified to false and issues a new token). Run its pre-check first. Duplicate domains must be cleared or the file stops.

Deploy `verify-custom-domain` after 14 and before you rely on custom domains. Leave `verify_jwt` **true**. Write the flag down, deploy, read it back. It must stay true. This function is the only path that sets `custom_domain_verified` to true, and only after the TXT record `_storehouse.<domain>` matches the token. It reads `EDGE_SECRET_KEY` and, if that is unset, `SUPABASE_SERVICE_ROLE_KEY`.

```bash
supabase functions deploy verify-custom-domain --project-ref yzlniqwzqlsftxrtapdl
```

`20261025_09_staff_sessions.sql` replaces the functions from the dashboard file and from Step 6. If you run the dashboard file again later, run the staff-sessions file again after it.

After the staff-sessions file, the **old** website cannot read staff PINs. Staff sign-in on the old website stops until you deploy this branch. Owner sign-in still works. That is why the website deploy is the next action, not a later day.

`record_sale` is what actually saves a sale and drops stock for a cashier. The new website does not update products from the browser. If you deploy the website **before** this file, sales can still be saved but server stock will not drop, and those sales will not drop stock later. Run this file first.

`20261025_12` also adds `stores.allow_staff_price_change` (default false). That is the Store Settings switch **Allow staff to change the price at the till**. While it is off, a cashier must use the catalogue price or that product's discount. While it is on, a cashier may type another price that is not below `cost_price`. By design, a manager may record any price that is not negative, including a price below cost, and the owner may sell below cost. The cost floor applies only to a cashier, and only when the switch is on. A staff session that changes the switch gets `staff_price_setting_locked` (42501). An update that leaves the switch as it is still succeeds. `20261025_09` adds `sales_staff_no_direct_insert`, so a staff session cannot insert into `sales` except through `record_sale`.

Smoke test, after the website deploy in Step 12 as well:

- `SELECT proname FROM pg_proc WHERE proname IN ('begin_staff_session', 'record_sale');` returns two rows.
- You (the owner) can still open the dashboard.

Rollback for these four, if you have not deployed the website yet. Drop the trigger first, then the policies that call `acting_staff_role()`, then the functions that call it, then `acting_staff_role()` itself. The other way round stops at the first error when `ON_ERROR_STOP` is on.

```sql
DROP TRIGGER IF EXISTS stores_protect_custom_domain ON public.stores;
DROP TRIGGER IF EXISTS stores_protect_staff_price_setting ON public.stores;
DROP POLICY IF EXISTS sales_cashier_no_read ON public.sales;
DROP POLICY IF EXISTS sales_cashier_no_write ON public.sales;
DROP POLICY IF EXISTS sales_cashier_no_delete ON public.sales;
DROP POLICY IF EXISTS sales_staff_no_direct_insert ON public.sales;
DROP POLICY IF EXISTS customers_cashier_no_read ON public.customers;
DROP POLICY IF EXISTS expenses_cashier_no_read ON public.expenses;
DROP POLICY IF EXISTS invoices_cashier_no_read ON public.invoices;
DROP POLICY IF EXISTS products_staff_no_edit ON public.products;
DROP POLICY IF EXISTS products_staff_no_delete ON public.products;
DROP POLICY IF EXISTS products_cashier_no_insert ON public.products;
DROP FUNCTION IF EXISTS public.record_sale(text, text, integer, bigint, bigint, text, text, text, text, text, text, text, date, text, text, bigint, bigint);
DROP FUNCTION IF EXISTS public.confirm_custom_domain_verified(uuid, text, text);
DROP FUNCTION IF EXISTS public.set_store_custom_domain(text);
DROP FUNCTION IF EXISTS public.get_sales_summary(uuid, date, date);
DROP FUNCTION IF EXISTS public.dashboard_bootstrap();
DROP FUNCTION IF EXISTS public.begin_staff_session(text);
DROP FUNCTION IF EXISTS public.end_staff_session(text);
DROP FUNCTION IF EXISTS public.get_acting_staff();
DROP FUNCTION IF EXISTS public.protect_staff_price_setting();
DROP FUNCTION IF EXISTS public.acting_staff_role();
DROP FUNCTION IF EXISTS public.protect_custom_domain_columns();
DROP INDEX IF EXISTS public.stores_custom_domain_uniq;
DROP TABLE IF EXISTS public.staff_pin_attempts;
DROP TABLE IF EXISTS public.staff_active_sessions;
GRANT UPDATE ON public.stores TO authenticated;
```

Then re-run `supabase/migrations/20261025_05_scope_get_sales_summary.sql` and `supabase/migrations/20261025_08_dashboard_summary.sql` if you still want those function bodies.

## Step 12 — website

Deploy this branch's website (Vercel production for `smartstock-v2`) only after Step 11. Do not change unrelated Vercel settings.

The site build needs the new publishable key in `VITE_SUPABASE_ANON_KEY` if you already disabled the legacy anon key in Step 0. If you have not rotated keys yet, leave the current key until Step 0 is done, then redeploy the site with the new key before you disable the old one.

Smoke test:

- Record a sale. The line appears, the total is the price minus any discount, and the product's stock dropped by the quantity you sold.
- Record the same sale again only if the app retries it. You should still have one row, and stock should not drop a second time.
- Sign in with a wrong password. The message is `Email or password is incorrect`, once, not a second generic error.
- Open the site as a cashier (staff PIN). Sales history, customers, and Invoices are hidden. Recording a sale still works.
- Enter a wrong staff PIN six times. The fifth try locks the account. The sixth try still says to wait 15 minutes (the counter was saved).
- Open the dashboard and the online-store setup page. Body text is readable (dark grey on white, not light grey). Buttons with white text use a dark blue, not pale purple.

Rollback: in Vercel, open Deployments, find the last good production deploy, and choose Promote. That restores the previous website in about a minute. If you already ran Step 13, do not roll the website back without also running Step 13's rollback, or checkout stock writes will fail.

## Step 13 — revoke browser stock writes

File: `supabase/migrations/20261025_07_revoke_storefront_client_writes.sql`

Version `2026102507`, name `revoke_storefront_client_writes`.

Run this only when **all** of these are true:

- Step 7 (storefront stock function) has been run
- Step 8 (`complete-storefront-order`) is deployed
- Step 10 (webhook) is deployed
- Step 12 (this website) is what customers are loading

Smoke test: place a small storefront order. Stock drops once. Refreshing the success page does not drop it again.

Rollback — paste this, then redeploy the previous website if customers are still on the old checkout:

```sql
GRANT EXECUTE ON FUNCTION public.decrement_variant_quantity(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer(text, text, text, text, bigint, date) TO anon, authenticated;
```

If the function argument types differ, the file's header tells you to read them from `pg_proc` instead of guessing. Recreate `promo_usage_insert_checkout` from section 8 of `20261025_04_advisor_hardening.sql` only if checkout promo codes start failing.

## Step 14 — chat policies (Stage B)

File: `supabase/migrations/20261025_04b_chat_policies_stage_b.sql`

Version `2026102504b`, name `chat_policies_stage_b`.

Run this only after Step 12 is live. It removes the open chat policies the old widget needs.

Smoke test: the storefront chat still answers, and a shopper can still ask to talk to the store owner.

Rollback (this opens chat rows to the public again; use it only to get the widget back, then fix forward):

```sql
DROP POLICY IF EXISTS conv_owner_select ON public.ai_chat_conversations;
DROP POLICY IF EXISTS conv_owner_delete ON public.ai_chat_conversations;
DROP POLICY IF EXISTS msg_owner_select ON public.ai_chat_messages;
DROP POLICY IF EXISTS msg_owner_insert ON public.ai_chat_messages;
DROP POLICY IF EXISTS msg_owner_update ON public.ai_chat_messages;
DROP POLICY IF EXISTS msg_owner_delete ON public.ai_chat_messages;
CREATE POLICY temp_allow_all_conversations ON public.ai_chat_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY temp_allow_all_messages ON public.ai_chat_messages FOR ALL USING (true) WITH CHECK (true);
```

## Step 15 — affiliate signup SQL and the chat function

File: `supabase/migrations/20261025_11_affiliate_signup_and_ai_cap.sql`

Version `2026102511`, name `affiliate_signup_and_ai_cap`.

Then deploy `ai-chat`. If the live function was deployed with `--no-verify-jwt`, deploy it that way again. Write `verify_jwt` down first and read it back after. Do not flip it by accident.

```bash
supabase functions deploy ai-chat --no-verify-jwt --project-ref yzlniqwzqlsftxrtapdl
```

Use that flag only when the value you wrote down was false. If it was true, deploy without the flag.

Secrets from Step 10 (`AI_DAILY_COST_CAP_USD`, `AI_CHAT_CALL_USD`, `AI_CHAT_EXTRA_ORIGINS`) apply here. A custom domain is allowed only when `stores.custom_domain_verified` is true. That column exists. An empty `domain_verification_token` does not count. Store Settings calls `set_store_custom_domain`, which leaves the flag false until `verify-custom-domain` sees the TXT record.

A browser call with no `Origin` header is rejected even when the caller is signed in. There is no exception for a native app or for a client header. `capacitor://localhost` is allowed only when that Origin header is actually present.

Smoke test: the storefront chat answers. A request with no Origin and no user token is rejected. Chat still answers the next day; if you set the daily cap very low on purpose, the widget shows the help-limit sentence and does not call OpenAI.

Rollback:

```sql
DROP FUNCTION IF EXISTS public.attribute_affiliate_signup(uuid, uuid);
DROP TABLE IF EXISTS public.affiliate_attributions;
DROP FUNCTION IF EXISTS public.reserve_ai_chat_spend(numeric, numeric);
DROP TABLE IF EXISTS public.ai_chat_daily_spend;
```

Then deploy the previous `ai-chat` source and read `verify_jwt` back. The previous chat build does not need this SQL.

## Step 16 — retry stock that got stuck

When a payment is saved but stock fails, the webhook returns 200 and stores the Paystack reference in `storefront_inventory_queue`. Paystack will not retry a 200. You retry stock yourself.

Run:

```sql
SELECT public.process_storefront_inventory_queue(50);
```

Then look at what is still stuck, and at the alerts (one row per reference per hour after the second failure):

```sql
SELECT paystack_reference, attempts, last_error, updated_at
  FROM public.storefront_inventory_queue
 ORDER BY updated_at;
SELECT paystack_reference, attempts, last_error, created_at
  FROM public.storefront_inventory_alerts
 ORDER BY created_at DESC
 LIMIT 20;
```

A reference that disappears from the queue was applied. Applying the same reference again does not drop stock twice. If `last_error` is still set after a few runs, fix that error (usually a missing product) and run the `SELECT` again.

The webhook also calls this function once after it queues a failure. You still run it yourself when the alert table has rows, because Paystack will not keep retrying.

## Step 17 — daily WhatsApp report cron reads Vault

File: `supabase/migrations/20261025_15_whatsapp_report_cron_vault.sql`

Version `2026102515`, name `whatsapp_report_cron_vault`.

The live job `send-daily-whatsapp-reports` calls `send-daily-reports` with the old service-role key written into the schedule. This file keeps that job's schedule and replaces the command. The new command reads two Vault secrets when the job runs. It does not copy the secret into `cron.job`.

This file does not change `hourly-whatsapp-reports`.

Before the file, create the secrets yourself in the SQL editor. Do not paste the values into this file, a ticket, or a screenshot.

- `service_role_key` — the new service-role key. The leaked legacy JWT must not go back into the job.
- `cron_secret` — the same string as the edge secret `CRON_SECRET`. The function rejects a call that does not send `x-cron-secret`.

Confirm the names only. Do not select `decrypted_secret` on a shared screen.

```sql
SELECT name FROM vault.decrypted_secrets
 WHERE name IN ('service_role_key', 'cron_secret');
```

That must return both names. If it does not, stop. The file also stops if the job is missing, so it cannot create a second schedule by guessing.

Smoke test. The command text is safe to read after this file: it names the Vault secrets and does not contain the key.

```sql
SELECT jobname, schedule,
       command LIKE '%vault.decrypted_secrets%' AS reads_vault,
       command LIKE '%eyJ%' AS has_legacy_jwt_marker
  FROM cron.job
 WHERE jobname = 'send-daily-whatsapp-reports';
```

`reads_vault` is true and `has_legacy_jwt_marker` is false. `schedule` is the same value the job had before this file.

Rollback. This removes the job. Do not paste the old command back in. That command is where the old key was hardcoded.

```sql
SELECT cron.unschedule('send-daily-whatsapp-reports');
```

## Step 18 — signed-in customers can read public stores

File: `supabase/migrations/20261025_16_stores_public_read.sql`

Version `2026102516`, name `stores_public_read`.

`stores_public_read` allowed only `anon`. A signed-in customer who does not own the store was left out, so a public shop looked empty after login. This recreates the same SELECT policy for `anon` and `authenticated`. It does not grant writes. The owner policy stays.

A public store row still includes settlement columns. The storefront must keep selecting only the columns it shows.

Smoke test:

```sql
SELECT r.rolname
  FROM pg_policy p
  JOIN pg_roles r ON r.oid = ANY (p.polroles)
 WHERE p.polname = 'stores_public_read'
 ORDER BY 1;
```

That returns `anon` and `authenticated`.

Rollback. This puts the policy back to anon only.

```sql
DROP POLICY IF EXISTS stores_public_read ON public.stores;
CREATE POLICY stores_public_read ON public.stores
  FOR SELECT TO anon
  USING (is_public = true);
```

## Step 19 — old slugs redirect, and new slugs stay short

File: `supabase/migrations/20261025_17_store_slug_redirects.sql`

Version `2026102517`, name `store_slug_redirects`.

Six live slugs are longer than 30 characters. The settings screen now keeps an existing slug when you save, so those shops are not forced to rename. A new slug is 3–30 characters, is checked against the reserved-word list, and shows Available or Taken before save. Signup builds a slug of at most 20 characters and checks `stores`, not the user id.

`generate_store_slug` used to look at `public.users`. It now looks at `public.stores` and `store_slug_redirects`. Step 19b removes `remember_store_slug`. Do not call it. Run step 19b in the same session as this file. The storefront follows a redirect only through `resolve_store_redirect`.

Smoke test:

```sql
SELECT pg_get_functiondef('public.generate_store_slug(text)'::regprocedure)
       LIKE '%public.users%' AS still_checks_users;
SELECT length(public.generate_store_slug('A Very Long Fabric Shop Name')) <= 20 AS short_enough;
```

`still_checks_users` is false. `short_enough` is true when that slug is free.

Rollback. This drops the new function. Do not restore the old body that checked `public.users`. The app still builds a short slug if the function is gone.

```sql
DROP FUNCTION IF EXISTS public.remember_store_slug(uuid, text, text);
DROP FUNCTION IF EXISTS public.generate_store_slug(text);
DROP TABLE IF EXISTS public.store_slug_redirects;
```

Do not use that rollback after step 19b. Step 19's rollback drops `store_slug_redirects`. Step 19b writes old slugs into that table, so undoing step 19 after 19b removes the redirects 19b just recorded. After 19b is applied, use only the step 19b rollback below. That rollback removes the trigger. It does not restore `remember_store_slug`, and it does not drop the redirect table.

## Step 19b — slug guard, private-store slug check, public variants

File: `supabase/migrations/20261025_18_slug_guard.sql`

Version `2026102518`, name `slug_guard`.

Run this after step 19. Do not run it against the two live TEST signup rows. This file does not `UPDATE` or `DELETE` those rows. A save that leaves `store_slug` unchanged still works, including a slug longer than 30 characters.

`remember_store_slug` is dropped. Changing a slug records that store's own previous slug in a trigger. An owner cannot register someone else's hidden slug. `generate_store_slug` and `store_slug_is_available` are security definer, so a private store blocks the slug. Reserved words and number-only slugs are rejected. Anon cannot list `store_slug_redirects`. Old links resolve one slug at a time through `resolve_store_redirect`. Shoppers can read variants of a public product on a public store.

If `CREATE UNIQUE INDEX stores_store_slug_uniq` stops, two stores share a `store_slug`. Stop. Do not delete either row, and do not change the TEST signups.

Smoke test:

```sql
SELECT COUNT(*) AS remember_still_there
  FROM pg_proc
 WHERE proname = 'remember_store_slug';
SELECT public.store_slug_is_available('admin', NULL) AS admin_free;
SELECT has_table_privilege('anon', 'public.store_slug_redirects', 'SELECT') AS anon_lists_redirects;
SELECT COUNT(*) AS public_variant_policy
  FROM pg_policy
 WHERE polname = 'product_variants_public_read';
```

`remember_still_there` is 0. `admin_free` is false. `anon_lists_redirects` is false. `public_variant_policy` is 1.

Rollback. This removes the guard. It does not restore `remember_store_slug` and it does not grant `SELECT` on `store_slug_redirects`. `generate_store_slug`, `store_slug_is_available`, and `resolve_store_redirect` stay, so a private store still blocks a slug and an old link still resolves. Run this file again to put the trigger back.

```sql
DROP TRIGGER IF EXISTS stores_guard_slug ON public.stores;
DROP FUNCTION IF EXISTS public.stores_guard_slug();
DROP INDEX IF EXISTS public.stores_store_slug_uniq;
DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
```

## Step 21 — hide settlement columns from anon, and check subdomain

File: `supabase/migrations/20261025_19_public_store_columns.sql`

Version `2026102519`, name `public_store_columns`.

Run this after step 19b. Do not run it against the two live TEST signup rows. This file does not `UPDATE` or `DELETE` those rows.

Anon can still read a public store, including `payment_methods`, which checkout shows to a customer. Anon cannot read `bank_name`, `account_number`, or `account_name`. The owner is signed in, and that role still has table select, so the dashboard and Store Settings keep those three columns. Do not revoke them from `authenticated`.

A subdomain is checked only when it changes. An existing subdomain, including `234`, is left as it is. A new subdomain uses the same reserved-word and uniqueness rules as a slug. `resolve_store_redirect` matches an old slug in any letter case.

Smoke test:

```sql
SELECT has_column_privilege('anon', 'public.stores', 'account_number', 'SELECT') AS anon_sees_account;
SELECT has_column_privilege('authenticated', 'public.stores', 'account_number', 'SELECT') AS owner_sees_account;
SELECT has_column_privilege('anon', 'public.stores', 'payment_methods', 'SELECT') AS anon_sees_checkout;
SELECT pg_get_functiondef('public.resolve_store_redirect(text)'::regprocedure) LIKE '%lower(old_slug)%' AS old_slug_ignores_case;
```

`anon_sees_account` is false. `owner_sees_account` is true. `anon_sees_checkout` is true when `payment_methods` exists. `old_slug_ignores_case` is true.

Rollback. Do not use the step 19 rollback after 19b. That rollback drops `store_slug_redirects`. To undo only this step, grant anon table select again and run the step 19b file again. The grant reopens the settlement columns. The step 19b file puts the previous trigger back, without the subdomain check.

```sql
GRANT SELECT ON TABLE public.stores TO anon;
```

Then run `supabase/migrations/20261025_18_slug_guard.sql` again.

## Wildcard shop addresses

An unknown name such as `not-a-store.storehouse.ng` currently closes the connection before this app can answer. The code now has a Store not found page, with a link to sign up, for a reserved or missing shop. That page only runs after the hostname reaches Vercel.

This pull request does not change the Vercel project. In the `smartstock-v2` project:

1. Add the domain `*.storehouse.ng`.
2. At the DNS host, add the CNAME `*` to the target Vercel shows for that domain.
3. Wait until Vercel shows a certificate for `*.storehouse.ng`.
4. Open `https://not-a-real-store.storehouse.ng`. It should show Store not found and a sign-up link.

`www.storehouse.ng` and `storehouse.ng` stay the Storehouse home page.

The return page asks `/api/verify-order-return` before it says a payment was received. That route needs `PAYSTACK_SECRET_KEY` on the Vercel project. Until the key is set, the page says the payment was not confirmed.

## If everything is on fire

Promote the previous Vercel deployment. Redeploy the previous edge functions. Read `verify_jwt` back on `paystack-webhook-router` (it must be false). Restore the database with the Step 0 PITR point if a SQL file corrupted data. Do not run `DELETE` or `UPDATE` without a `WHERE`.
