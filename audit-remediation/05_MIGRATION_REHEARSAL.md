# Migration rehearsal

**Result: NOT RUN.** `psql` is not installed in this sandbox. Production was not contacted. No migration was applied or recorded.

The October files on this branch, with SHA-256 of the bytes in the worktree:

| File | SHA-256 |
| --- | --- |
| 20261023_01_ajo_and_invoice_public_access.sql | b581a45ee67ab6a266188ea67300217393cd53a485f3f2c61c4c3ef4be948a4b |
| 20261023_02_invoice_numbers_stores_columns_staff.sql | a236eb1b3111b9ceb0af121e6642f6c3c93490f9d978eeb406d92367dd8d5573 |
| 20261023_03_payout_guard_payment_tx_policies.sql | 2a613ffeb9bc9a332ccfceb8cbb985fcd9e035f8951a2b2a3e52aa43c58f5f42 |
| 20261025_04_advisor_hardening.sql | 13a58edb89f6f3c1bff8527dd179d4b137d8db98b290f947de3c08e25c91f30a |
| 20261025_04b_chat_policies_stage_b.sql | 73ce70ec2bcc9d1801484f95464d99b80375d30d64768254bc7d3e333c454fb1 |
| 20261025_05_scope_get_sales_summary.sql | eaf2098f24746dae5f59e8faceabb42a21cf2cbab3b41d2296045ba112a9802e |
| 20261025_06_storefront_inventory.sql | 080b7e0fceca82da797b2756f36ee9ec9e28bab67304da968159f0f58f036842 |
| 20261025_07_revoke_storefront_client_writes.sql | 55b39055685199ab2de4be26395e22255423baa5476e53b262908ff9df01064b |
| 20261025_08_dashboard_summary.sql | a4e45dd37b3fc874aef552cde0b1ba1bbefd7339d8db5a7c2b2c6fa70b87eec1 |
| 20261025_09_staff_sessions.sql | 96949e5d7576c9b4a39000d2b4c6e338c7a2a3be98d66d9883e40ea54f5d49b8 |
| 20261025_10_inventory_queue.sql | 75d13376159031cfecd3cb9d5b6aa9dce231fdf83b4473e204c9e9bf5cad4560 |
| 20261025_11_affiliate_signup_and_ai_cap.sql | e301f60056bc5e0ddabcad4b568ec3a17ad36b8e379ef3ed5b218f97d2dd1ec9 |
| 20261025_12_record_sale.sql | 3fbc1792c14cfe4081fae0ef478575f75cea5061bfc22021f8fc3c4791788268 |
| 20261025_13_inventory_queue_processor.sql | b85b52d5d2afa133a718d0ce98fb4644c97dec1d72273bfe588b547441c9d242 |
| 20261025_14_custom_domain_verification.sql | 6ec0f6347302cacbe332122d754c13035c32806d41b87959368d6129c7ab00dc |
| 20261025_15_whatsapp_report_cron_vault.sql | a32d7237fa45d2052bef50e1317b7eb2c12fe62d90e373a0c69f0ef7663cae0a |
| 20261025_16_stores_public_read.sql | 41df50e7612dc42c5e71328444f39c26d85cd7e9ccdc4cc23bfd40f34b33e265 |
| 20261025_17_store_slug_redirects.sql | e0be1a6477ab134ddff61f783f211c98a110fa1442d9bab7197e27af454ca891 |
| 20261025_18_slug_guard.sql | 9e71221bf0d2143ca600957168b251feb77040c1633196db0f5982cdce359eea |
| 20261025_19_public_store_columns.sql | fe56a18ae946b867528be9eaa8b5f6aa5fce2cb2c604043556bb1d48c77e9bf9 |
| 20261025_20_legacy_bank_to_payment_methods.sql | 237401c71c3a07571eb704268b1cfc5dca157be36461e5a2ff930f024b7c4f01 |
| 20261025_21_store_bank_details.sql | 1bc36a87b9f4d47319df304d04b936fb62a4d18114921201ef7c2d8745877d99 |
| 20261025_22_users_store_type.sql | fff3e717d0924f96412b1fb93691c8a1eabd310c538c352660510f9fcb5b38b1 |
| 20261025_23_users_business_type_prompt.sql | ca7bde1a2b8cc5ef4e6253ed0677a26213b893fab09fe7f5c8af6f66a2d97578 |
| 20261025_24_whatsapp_cron_pg_net.sql | 7cc806fdf0046255cbc9c6b08a813d90f9a4899839b81079069293dfba9d016c |
| 20261025_25_whatsapp_seen_messages.sql | 1d83d15941c4062a73c43b2b2b4242a74c3a1b7893a5dd46174885fd87668664 |
| 20261025_26_atomic_chat_quota.sql | 4969d4f3e1c14b856a5441db0079ebb48973f0792b8f0b8db8554a3b22598fbf |
| 20261030_01_platform_flags_and_chat.sql | 85f1ae25371d71b7334049842b4d57fe03b8cbc0956b4b94e7f41cc14d684ef5 |
| 20261030_02_owned_inventory.sql | 47da09f89843155a27a2c873e529b0b919eff99b52373b07374482efe7072f38 |
| 20261030_03_names_discounts_queue.sql | 2eda772aabebf06103e0ce12d197ce35ca61d4abf94703b401ca9b3ffb103202 |

That is 30 files, not a confirmed count of 27 applied versions. Supabase version ids for the 30 Oct files should be `2026103001`, `2026103002`, and `2026103003` if you record them by hand. Do not assume the filename date equals a row already in `schema_migrations`.

The three new files do not `DROP` or `TRUNCATE` shop tables. `20261030_03` raises if one label already belongs to two stores. Rehearsal of lock time, NULL staff rows, and legacy slugs is NOT RUN.

DB-T01: NOT RUN. DB-T02: NOT RUN.
