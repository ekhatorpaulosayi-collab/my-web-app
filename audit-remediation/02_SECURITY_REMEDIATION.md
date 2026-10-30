# Security remediation

Live state was not queried. Assessor 2's "this is live" claims stay unverified.

## SEC-01 Privileged store flags

`20261025_21` grants authenticated `UPDATE` on every stores column except the three bank columns. That list includes `kyc_status`, `frozen`, and `paystack_subaccounts_enabled`.

`20261030_01` revokes `UPDATE` on those columns plus `frozen_at`, `frozen_reason`, `frozen_by`, and `paystack_subaccount_id`. A `BEFORE INSERT OR UPDATE` trigger forces safe defaults on insert and raises `platform_field_locked` (`42501`) when a non-service session changes them. `service_role`, and a local `postgres` session with no JWT, can still change them so the existing KYC edge functions keep working.

Not proven: no database session was opened. SEC-T01 is not a SQL run.

## SEC-02 Conversations

The historical `initiate_agent_takeover`, `end_agent_takeover`, and `send_agent_message` are `SECURITY DEFINER` and update a conversation by id. `20261030_01` requires `owns_conversation` (store owner equals `auth.uid()`) and `p_agent_id = auth.uid()`. A direct table update uses policy `conv_owner_update` with the same predicate.

Not proven: two-tenant SQL was not run.

## SEC-03 One-off admin functions

`apply-migration`, `run-migration`, `update-free-tier`, `upgrade-existing-users`, and `check-tier-limits` build a service-role client and do not check the caller. `adminCallAllowed` now returns false unless `STOREHOUSE_ADMIN_SECRET` is at least 16 characters and matches `x-storehouse-admin-secret`. An unset secret refuses every call. Unit test: empty, short, and mismatched secrets are false; a matching 16+ secret is true.

The live functions, if they are still deployed, do not contain this check until you deploy or delete them. This pull request does not deploy them.

## SEC-04 WhatsApp

`supabase/functions/whatsapp-webhook/index.ts` still starts with `DO NOT DEPLOY`. It checks `x-360dialog-signature` and `X-Twilio-Signature`. Existing unit tests cover that source. This pass did not deploy it and did not delete the live function.

## SEC-05 Secrets

Added lines in this diff were scanned for service-role tokens, private-key prefixes, and Paystack secret-key prefixes. Result: `SECRET_SCAN_CLEAN`. No values are printed. Rotation of historical credentials remains the owner's action in `07_PRODUCTION_CONTAINMENT_PLAN.md`.
