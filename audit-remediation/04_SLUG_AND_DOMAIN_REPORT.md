# Slugs and domains

Store links stay on `https://<storename>.storehouse.ng` when the label is a legal subdomain. Reserved and number-only labels stay on `https://www.storehouse.ng/store/<label>`.

## Kept

Migrations 17, 18, and 19 still own reserved names, case folding, the unique `store_slug` index, and `resolve_store_redirect`. They were not rewritten into a new slug system.

## SLUG-01

If `oldname.storehouse.ng` does not match `stores.subdomain`, the storefront calls `resolve_store_redirect` with that label. When the public store's current subdomain or slug is different, `historicHostTarget` sends the browser to the canonical URL and keeps only the `product` query. A label with a slash, a colon, or a dot is not used as a host. Unit result: `old-shop` plus product `ankara` becomes `https://new-shop.storehouse.ng/?product=ankara`.

This works only when the old hostname still reaches the Storehouse app. Certificate and Vercel domain coverage are an owner action.

## SLUG-02

`interpretProvisionResponse` treats 401, 403, 409, 429, 500, and a network failure as `retryable_failure`. A 200 is `pending` unless the JSON body says `status: "active"`. Store Settings says the settings were saved and the storehouse.ng link is not confirmed yet. No Vercel domain was created.

## SLUG-03 and SLUG-04

`store_name_reservations.name` is a primary key filled from the slug, the subdomain, and historic redirects. A second store loses with `store_name_taken`. The migration raises `store_name_collision` if existing data already maps one label to two stores, and it does not delete either shop.

`20261025_17` no longer grants `remember_store_slug` to `authenticated`, and the function raises `slug_redirect_owned` instead of overwriting another store's row. Apply 17 and 18 in one window if an older copy of 17 is already on the database.
