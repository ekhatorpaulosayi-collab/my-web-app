# Owner summary

The repair branch is not ready to merge. Card payments should stay as they are until you apply the new SQL and deploy the checkout functions yourself.

## Fixed in code, and tested here

- A shopper cannot set the card price. The server uses the catalogue.
- A payment reference cannot be turned into a different basket. `ord_` payments stay on the webhook path.
- Affiliate commission ignores the code the browser sends. A self-referral and a shop payment earn zero. One attributed subscription earns 30 percent once.
- The five old admin functions refuse a call that does not carry a long server secret.
- Saving a slug no longer treats a bare HTTP 200 as a live store link.
- An old subdomain that still opens the app is sent to the current `storename.storehouse.ng` address, including the product.

## Written, not proven on a database

- Merchants cannot unfreeze themselves, approve KYC, or turn on subaccounts.
- A merchant cannot take over another shop's chat.
- Stock changes stay on the store that was paid.
- Cashiers cannot add a discount on top of the price.
- Two shops cannot finish a race for the same name.
- A stuck stock job stops after eight tries and shows an alert row.

`psql` was not available, and production was not used, so those SQL files have not been executed.

## Please approve before anything touches production

1. Apply `20261030_01`, `20261030_02`, and `20261030_03` in that order, after the October files they depend on.
2. Deploy checkout only after `20261030_02`.
3. Delete `apply-migration`, `run-migration`, `update-free-tier`, `upgrade-existing-users`, and `check-tier-limits`, or set a new `STOREHOUSE_ADMIN_SECRET` and deploy those functions.
4. Leave the WhatsApp webhook undeployed. Delete the live one only if you have confirmed it is unused.
5. Rotate credentials that remain in git history. A removed file is not a rotation.

## Next step

Rehearse the October migrations plus these three files on a copy of the database, then decide again. Until that rehearsal and your approval, the release stays NO-GO.
