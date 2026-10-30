# Production containment plan

Do not run this list until you approve each line. This pull request did not run any of it. Live exposure is reported by the second assessor and was not confirmed from this sandbox.

## 1. Privileged store columns

After you approve `20261030_01`, apply it with `psql` and `ON_ERROR_STOP=1`, then record version `2026103001`. Before that, a signed-in merchant may still be able to change `frozen`, `kyc_status`, and `paystack_subaccounts_enabled` if the live grants allow it.

Check, read-only, before and after: an authenticated request that updates `stores.frozen` for the caller's store returns permission denied (`42501`). A service-role KYC approval still sets `kyc_status`. Do not test against another merchant's store.

## 2. Conversation takeover

Same file. After it is applied, merchant A calling `initiate_agent_takeover`, `send_agent_message`, or `end_agent_takeover` with merchant B's conversation id should get `42501`. Eligible staff of B, using B's owner session, can still take over B's conversation.

## 3. Five admin functions

Prefer deletion over a new secret:

```bash
supabase functions delete apply-migration --project-ref yzlniqwzqlsftxrtapdl
supabase functions delete run-migration --project-ref yzlniqwzqlsftxrtapdl
supabase functions delete update-free-tier --project-ref yzlniqwzqlsftxrtapdl
supabase functions delete upgrade-existing-users --project-ref yzlniqwzqlsftxrtapdl
supabase functions delete check-tier-limits --project-ref yzlniqwzqlsftxrtapdl
```

If you keep one, set `STOREHOUSE_ADMIN_SECRET` to a new random value of at least 16 characters and deploy that function only. The anon key must not be that secret. Confirm a no-header POST returns `unauthorized` from the function.

## 4. WhatsApp webhook

Leave the candidate marked DO NOT DEPLOY. If a live `whatsapp-webhook` exists and you have confirmed it is unused:

```bash
supabase functions delete whatsapp-webhook --project-ref yzlniqwzqlsftxrtapdl
```

Rollback is to redeploy the previous bundle only if you still need it, and only with signature checks. Do not send real WhatsApp messages as a test.

## 5. Credentials

Rotate, outside this repository, any secret that has appeared in git history: the legacy service-role JWT, the legacy anon JWT, the database password, and any Paystack, ImageKit, Resend, or VAPID private key you know was committed. Do not paste the values into chat, the pull request, or a migration. A deleted file is not a rotation. After you disable the legacy API keys, confirm those keys receive 401.

The 33 anon JWTs that the gitleaks baseline used to hide are replaced in the working tree with a placeholder. Git history still contains them, the database password, and other old secrets. Do not rewrite history from this branch.

Also rotate the Vercel OIDC token that was in `.env.vercel`. That file is gone from the working tree and is still in git history. In Vercel, open Account → Tokens (and any OIDC or team token that was created for this repo) and revoke it, then create a new one only if a script still needs it. Do not put the new value in the repo. The token type is a Vercel OIDC token. This note does not repeat the value.

Nothing in `src` or `api` posts to `/api/whatsapp`. The route file `api/whatsapp/index.js` is not in the tree. After the next deploy, a request to that path 404s. Confirm no WhatsApp provider is still configured to post there.

## 6. Order and split status checks

`20261030_05` widens `orders` so status may be `disputed` or `reversed`, and widens `paystack_split_transactions` so status may be `reversed`. Apply it after `20261030_04` (version `2026103005`, name `fail_closed_and_status_checks`) before deploying the webhook that writes those values. Until then, `charge.dispute.create` and `transfer.reversed` return 500 and record nothing.

Smoke test: a paid order updated to `disputed`, and a split row updated to `reversed`, both succeed. An expired staff session still cannot delete a sale.

## 7. Checkout and stock

Apply `20261030_02` (version `2026103002`) before deploying `initiate-storefront-payment` or `complete-storefront-order`. Apply `20261030_03` (version `2026103003`) after staff sessions and `record_sale`. Do not re-run `20261025_06` afterwards. Do not `db push`.

## 8. Daily report cron (OPS-02)

The report job `send-daily-whatsapp-reports` must stay hourly (`0 * * * *`). `send-daily-reports` sends a shop only when the Nigerian hour matches `report_settings.deliveryTime`. The shop with reports on is set to 23:00. File `20261030_05` keeps that hourly cadence and fails the job when a vault secret is missing. It does not set `0 6 * * *`.

What you still do, on a staging project first:

1. Create vault secrets `service_role_key` and `cron_secret` (names only; do not paste the values here). `cron_secret` is the same string as the edge secret `CRON_SECRET`.
2. Apply `20261025_15`, then `20261025_24` so `pg_net` is installed. Step 24 removes the duplicate job `hourly-whatsapp-reports`. It does not change `send-daily-whatsapp-reports` off hourly.
3. Apply `20261030_05` after `20261030_04`. Confirm `SELECT schedule FROM cron.job WHERE jobname = 'send-daily-whatsapp-reports'` is `0 * * * *`.
4. Deploy `send-daily-reports` only when you mean to. The Supabase gateway must accept the bearer from the vault service-role key (`verify_jwt` stays on for this function). The function itself also checks `x-cron-secret`. A missing secret must not return 200.
5. Deploy `retry-store-provisioning` with `--no-verify-jwt` when you want store-link retries, then read the flag back. It checks `x-cron-secret` in code. Do not deploy it from this branch.
6. After one hourly run, confirm the 23:00 shop is still waiting during other hours and is eligible at 23:00. This agent did not fire the live job and did not install `pg_net` on production.

Rollback for file 05 is `scripts/rollback-20261030-05.sql`. Re-applying `20261025_15` recreates the hourly job if you removed it. Re-applying `20261025_09` does not overwrite the staff functions from `20261030_04`.

## Fallback

If `20261030_01` or `20261030_04` blocks a legitimate owner profile save, the failure text will be `platform_field_locked`. Ordinary columns are not in that trigger. A name that already belongs to two shops is listed in `store_name_collisions` and both shop URLs stay. Do not delete a shop URL.
