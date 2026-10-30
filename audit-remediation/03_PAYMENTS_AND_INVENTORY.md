# Payments and inventory

## Trusted price

`initiate-storefront-payment` loads `products` and `product_variants` and calls `priceCheckoutLines`. The shopper's `unit_price_kobo` and `product_name` are not used. A line must be an integer quantity from 1 to 10000, an active product owned by `stores.user_id`, and, when a variant is sent, a variant of that product owned by the same user. Duplicate pairs are rejected. A null `quantity` is untracked stock. A numeric `quantity` must cover the line. The order row stores the server lines.

`customerChargeKobo` keeps the existing closed form: customer total equals subtotal plus the Paystack take, with the ₦100 flat fee only at or above ₦2,500. The unit test on a ₦50,000 line (5,000,000 kobo) checks that a submitted price of 100 kobo is ignored and that the charge identity holds.

## Fulfilment

`complete-storefront-order` no longer reads `body.items`. `ord_` references still return `{ delegated: 'webhook' }` and do not decrement stock here. Any other reference must match a server order on amount (kobo), currency `NGN`, an open status (`pending`, `paid`, or `verified`), and that order's store. Stock uses `decrement_owned_lines` with the store owner's id and the stored lines.

`20261030_02` makes `apply_storefront_inventory` read `order_items` joined to the order's store and the product owner. It does not read `orders.notes`. A reference with no owned lines raises `missing_order_lines` before the fulfilment claim is kept (the function raises inside one transaction). `decrement_storefront_lines` and `decrement_product_quantity` now raise `unscoped_stock_change`.

Do not re-run `20261025_06` after `20261030_02`. File 06 would put the unscoped bodies back.

## What was not executed

No Paystack call. No concurrent webhook. No crash between claim and stock. No refund ledger. Those rows stay PARTIAL in the register.
