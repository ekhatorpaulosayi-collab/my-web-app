# Release runbook

Decision remains NO-GO until you approve the containment plan and a disposable database rehearsal passes.

## Order

Follow `DEPLOY_ORDER.md` for the 23 Oct and 25 Oct files. Then, still by hand:

1. `20261030_01_platform_flags_and_chat.sql` after files 04 and 21.
2. `20261030_02_owned_inventory.sql` after file 06. Do not re-run 06 after this.
3. `20261030_03_names_discounts_queue.sql` after files 09, 12, and 18.
4. Deploy `initiate-storefront-payment` and `complete-storefront-order` only after step 2.
5. Do not deploy `whatsapp-webhook`.
6. Delete or gate the five admin functions before treating the project as closed.

Record versions `2026103001`, `2026103002`, and `2026103003` yourself. Do not `db push`.

## Stop points

- `store_name_collision`: two stores already share a label. Do not delete either row.
- `platform_field_locked` on a normal shop-name save: stop and inspect the statement. A name change must not send `kyc_status` or `frozen`.
- Checkout insert fails on `variant_id`: file 02 was not applied. Roll the function deploy back. Do not point checkout at client prices.
- Inventory queue `dead_at` is set: the payment is stored and stock was not applied. Run `SELECT public.apply_storefront_inventory('<reference>');` once you have fixed the cause, then `UPDATE storefront_inventory_queue SET dead_at = NULL, attempts = 1 WHERE paystack_reference = '<reference>';` or delete the queue row after a successful apply. The fulfilment table makes a second apply a no-op.

## What not to roll back

Do not restore `decrement_storefront_lines` from file 06. Do not grant `remember_store_slug` to `authenticated`. Do not drop `store_slug_redirects` to undo a rename.
