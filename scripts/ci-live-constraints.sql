-- Live public constraints other than primary keys.
-- Applied after the October migrations on the disposable CI database.
-- A constraint name that already exists is left alone, so the widened
-- order and split status checks from 20261030_05 stay widened.
-- A missing table or column is skipped. This file is not run on production.
CREATE TEMP TABLE live_constraint_catalogue (
  tbl text NOT NULL,
  cname text NOT NULL,
  def text NOT NULL
);

INSERT INTO live_constraint_catalogue (tbl, cname, def) VALUES
('affiliates', 'affiliates_affiliate_code_key', 'UNIQUE (affiliate_code)'),
('affiliates', 'affiliates_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
('affiliate_sales', 'affiliate_sales_affiliate_id_fkey', 'FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE'),
('affiliate_sales', 'affiliate_sales_customer_id_fkey', 'FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
('affiliate_sales', 'affiliate_sales_payout_id_fkey', 'FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id)'),
('affiliate_sales', 'affiliate_sales_subscription_id_fkey', 'FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id)'),
('affiliate_clicks', 'affiliate_clicks_affiliate_id_fkey', 'FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE'),
('affiliate_clicks', 'affiliate_clicks_customer_id_fkey', 'FOREIGN KEY (customer_id) REFERENCES auth.users(id)'),
('affiliate_payouts', 'affiliate_payouts_affiliate_id_fkey', 'FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE'),
('affiliate_payouts', 'affiliate_payouts_approved_by_fkey', 'FOREIGN KEY (approved_by) REFERENCES auth.users(id)'),
('ai_chat_conversations', 'ai_chat_conversations_context_type_check', $$CHECK (context_type IS NULL OR context_type IN ('onboarding', 'help', 'storefront'))$$),
('ai_chat_conversations', 'ai_chat_conversations_user_type_check', $$CHECK ((user_type = ANY (ARRAY['retail'::text, 'ecommerce'::text, 'wholesale'::text, 'multilocation'::text, 'service'::text, 'unknown'::text])))$$),
('ai_chat_conversations', 'ai_chat_conversations_session_id_key', 'UNIQUE (session_id)'),
('ai_chat_conversations', 'ai_chat_conversations_user_id_session_id_key', 'UNIQUE (user_id, session_id)'),
('ai_chat_conversations', 'ai_chat_conversations_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('ai_chat_conversations', 'ai_chat_conversations_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
('ai_chat_conversations', 'ai_chat_conversations_agent_id_fkey', 'FOREIGN KEY (agent_id) REFERENCES auth.users(id)'),
('ai_chat_messages', 'ai_chat_messages_role_check', $$CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))$$),
('ai_chat_messages', 'ai_chat_messages_conversation_id_fkey', 'FOREIGN KEY (conversation_id) REFERENCES ai_chat_conversations(id) ON DELETE CASCADE'),
('ai_chat_messages', 'ai_chat_messages_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('ai_chat_messages', 'ai_chat_messages_agent_id_fkey', 'FOREIGN KEY (agent_id) REFERENCES auth.users(id)'),
('ai_chat_rate_limits', 'ai_chat_rate_limits_identifier_hour_bucket_key', 'UNIQUE (identifier, hour_bucket)'),
('ai_chat_usage', 'ai_chat_usage_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
('ai_chat_usage', 'ai_chat_usage_user_id_month_key', 'UNIQUE (user_id, month)'),
('customers', 'unique_customer_phone', 'UNIQUE (user_id, customer_phone)'),
('expenses', 'expenses_positive_amount', 'CHECK ((amount > 0))'),
('invoices', 'invoices_invoice_number_key', 'UNIQUE (invoice_number)'),
('invoices', 'invoices_paystack_reference_key', 'UNIQUE (paystack_reference)'),
('invoices', 'invoices_status_check', $$CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))$$),
('invoices', 'invoices_payment_terms_check', $$CHECK ((payment_terms = ANY (ARRAY['DUE_ON_RECEIPT'::text, 'NET_7'::text, 'NET_15'::text, 'NET_30'::text, 'NET_60'::text, 'CUSTOM'::text])))$$),
('invoices', 'invoices_recurring_frequency_check', $$CHECK ((recurring_frequency = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])))$$),
('invoices', 'invoices_parent_invoice_id_fkey', 'FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id)'),
('invoice_items', 'invoice_items_invoice_id_fkey', 'FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE'),
('order_items', 'order_items_quantity_check', 'CHECK ((quantity > 0))'),
('order_items', 'order_items_unit_price_kobo_check', 'CHECK ((unit_price_kobo >= 0))'),
('order_items', 'order_items_total_price_kobo_check', 'CHECK ((total_price_kobo >= 0))'),
('order_items', 'order_items_order_id_fkey', 'FOREIGN KEY (order_id) REFERENCES orders(id)'),
('order_items', 'order_items_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('order_items', 'order_items_product_id_fkey', 'FOREIGN KEY (product_id) REFERENCES products(id)'),
('order_items', 'order_items_fulfilled_by_fkey', 'FOREIGN KEY (fulfilled_by) REFERENCES auth.users(id)'),
('orders', 'orders_order_type_check', $$CHECK ((order_type = ANY (ARRAY['storefront'::text, 'marketplace'::text])))$$),
('orders', 'orders_storefront_requires_store', $$CHECK ((((order_type = 'storefront'::text) AND (primary_store_id IS NOT NULL)) OR (order_type = 'marketplace'::text)))$$),
('orders', 'orders_total_amount_kobo_check', 'CHECK ((total_amount_kobo > 0))'),
('orders', 'orders_paystack_reference_key', 'UNIQUE (paystack_reference)'),
('orders', 'orders_customer_access_token_key', 'UNIQUE (customer_access_token)'),
('orders', 'orders_primary_store_id_fkey', 'FOREIGN KEY (primary_store_id) REFERENCES stores(id)'),
('paystack_split_transactions', 'split_tx_amount_invariant', 'CHECK ((amount_total_kobo = ((amount_paystack_kobo + amount_storehouse_kobo) + amount_vendor_kobo)))'),
('paystack_split_transactions', 'paystack_split_transactions_review_status_check', $$CHECK ((review_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))$$),
('paystack_split_transactions', 'paystack_split_transactions_order_id_fkey', 'FOREIGN KEY (order_id) REFERENCES orders(id)'),
('paystack_split_transactions', 'paystack_split_transactions_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('paystack_split_transactions', 'paystack_split_transactions_order_item_id_fkey', 'FOREIGN KEY (order_item_id) REFERENCES order_items(id)'),
('paystack_split_transactions', 'paystack_split_transactions_reviewer_id_fkey', 'FOREIGN KEY (reviewer_id) REFERENCES auth.users(id)'),
('products', 'products_positive_price', 'CHECK ((selling_price > 0))'),
('products', 'products_positive_quantity', 'CHECK ((quantity >= 0))'),
('products', 'products_approval_status_check', $$CHECK ((approval_status = ANY (ARRAY['pending'::text, 'auto_approved'::text, 'manual_approved'::text, 'rejected'::text])))$$),
('product_variants', 'positive_quantity_variants', 'CHECK ((quantity >= 0))'),
('product_variants', 'unique_variant_per_product', 'UNIQUE (product_id, variant_name)'),
('product_variants', 'product_variants_product_id_fkey', 'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'),
('sales', 'sales_positive_quantity', 'CHECK ((quantity > 0))'),
('sales', 'sales_non_negative_amounts', 'CHECK (((total_amount >= 0) AND (final_amount >= 0)))'),
('sales', 'valid_sale_channel', $$CHECK ((sale_channel = ANY (ARRAY['in-person'::text, 'online-store'::text, 'wholesale'::text, 'social-media'::text, 'offline-sync'::text])))$$),
('sales', 'sales_recorded_by_staff_id_fkey', 'FOREIGN KEY (recorded_by_staff_id) REFERENCES staff_members(id) ON DELETE SET NULL'),
('sales', 'sales_variant_id_fkey', 'FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL'),
('staff_members', 'staff_members_role_check', $$CHECK ((role = ANY (ARRAY['manager'::text, 'cashier'::text])))$$),
('staff_members', 'staff_members_store_owner_uid_email_key', 'UNIQUE (store_owner_uid, email)'),
('staff_members', 'staff_members_store_owner_uid_pin_key', 'UNIQUE (store_owner_uid, pin)'),
('stores', 'stores_slug_format', $$CHECK ((store_slug ~ '^[a-z0-9-]{3,50}$'::citext))$$),
('stores', 'subdomain_format', $$CHECK ((subdomain ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'::text))$$),
('stores', 'stores_kyc_status_check', $$CHECK ((kyc_status = ANY (ARRAY['not_started'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'frozen'::text])))$$),
('stores', 'stores_store_slug_key', 'UNIQUE (store_slug)'),
('stores', 'stores_subdomain_key', 'UNIQUE (subdomain)'),
('stores', 'one_store_per_user', 'UNIQUE (user_id)'),
('stores', 'stores_custom_domain_key', 'UNIQUE (custom_domain)'),
('stores', 'stores_frozen_by_fkey', 'FOREIGN KEY (frozen_by) REFERENCES auth.users(id)'),
('user_subscriptions', 'user_subscriptions_user_id_key', 'UNIQUE (user_id)'),
('user_subscriptions', 'user_subscriptions_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
('users', 'users_email_key', 'UNIQUE (email)'),
('users', 'users_firebase_uid_key', 'UNIQUE (firebase_uid)'),
('users', 'users_subscription_tier_check', $$CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'basic'::text, 'pro'::text])))$$),
('contribution_groups', 'contribution_groups_share_code_key', 'UNIQUE (share_code)'),
('contribution_groups', 'contribution_groups_frequency_check', $$CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text])))$$),
('contribution_groups', 'contribution_groups_status_check', $$CHECK ((status = ANY (ARRAY['forming'::text, 'active'::text, 'completed'::text, 'paused'::text, 'dissolved'::text])))$$),
('contribution_members', 'contribution_members_status_check', $$CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])))$$),
('contribution_members', 'contribution_members_group_id_fkey', 'FOREIGN KEY (group_id) REFERENCES contribution_groups(id) ON DELETE CASCADE'),
('contribution_payments', 'contribution_payments_group_id_fkey', 'FOREIGN KEY (group_id) REFERENCES contribution_groups(id) ON DELETE CASCADE'),
('contribution_payments', 'contribution_payments_member_id_fkey', 'FOREIGN KEY (member_id) REFERENCES contribution_members(id) ON DELETE CASCADE'),
('contribution_payments', 'contribution_payments_payment_method_check', $$CHECK ((payment_method = ANY (ARRAY['cash'::text, 'transfer'::text, 'pos'::text, 'other'::text])))$$),
('contribution_payouts', 'contribution_payouts_group_id_fkey', 'FOREIGN KEY (group_id) REFERENCES contribution_groups(id) ON DELETE CASCADE'),
('contribution_payouts', 'contribution_payouts_member_id_fkey', 'FOREIGN KEY (member_id) REFERENCES contribution_members(id) ON DELETE CASCADE'),
('promo_codes', 'promo_codes_discount_type_check', $$CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))$$),
('promo_codes', 'promo_codes_discount_value_check', 'CHECK ((discount_value > 0))'),
('promo_codes', 'unique_code_per_user', 'UNIQUE (user_id, code)'),
('product_reviews', 'product_reviews_rating_check', 'CHECK (((rating >= 1) AND (rating <= 5)))'),
('product_reviews', 'product_reviews_status_check', $$CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))$$),
('product_reviews', 'product_reviews_product_id_fkey', 'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'),
('green_api_pool', 'green_api_pool_instance_id_key', 'UNIQUE (instance_id)'),
('green_api_pool', 'green_api_pool_status_check', $$CHECK ((status = ANY (ARRAY['available'::text, 'in_use'::text, 'maintenance'::text, 'error'::text])))$$),
('paystack_webhook_events', 'paystack_webhook_events_uniq', 'UNIQUE (paystack_reference, event_type)'),
('paystack_subaccounts', 'paystack_subaccounts_paystack_subaccount_code_key', 'UNIQUE (paystack_subaccount_code)'),
('paystack_subaccounts', 'paystack_subaccounts_store_id_key', 'UNIQUE (store_id)'),
('paystack_subaccounts', 'paystack_subaccounts_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('platform_fee_config', 'platform_fee_config_tier_check', $$CHECK ((tier = ANY (ARRAY['free'::text, 'starter'::text, 'pro'::text])))$$),
('vendor_kyc', 'vendor_kyc_store_id_key', 'UNIQUE (store_id)'),
('vendor_kyc', 'vendor_kyc_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('vendor_kyc', 'vendor_kyc_status_check', $$CHECK ((status = ANY (ARRAY['not_started'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'frozen'::text])))$$),
('whatsapp_config', 'whatsapp_config_store_id_key', 'UNIQUE (store_id)'),
('whatsapp_config', 'whatsapp_config_phone_number_key', 'UNIQUE (phone_number)'),
('whatsapp_config', 'whatsapp_config_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE'),
('whatsapp_settings', 'whatsapp_settings_user_id_key', 'UNIQUE (user_id)'),
('whatsapp_settings', 'whatsapp_settings_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
('bank_accounts', 'bank_accounts_uniq', 'UNIQUE (store_id, bank_code, account_number)'),
('bank_accounts', 'bank_accounts_store_id_fkey', 'FOREIGN KEY (store_id) REFERENCES stores(id)'),
('error_logs', 'error_logs_severity_check', $$CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))$$),
('error_logs', 'error_logs_error_type_check', $$CHECK ((error_type = ANY (ARRAY['auth'::text, 'network'::text, 'api'::text, 'ui'::text, 'unknown'::text])))$$),
('chat_abuse_log', 'chat_abuse_log_message_type_check', $$CHECK ((message_type = ANY (ARRAY['off_topic'::text, 'jailbreak'::text, 'spam'::text, 'suspicious_response'::text])))$$);

-- Columns the live checks name. Nullable so existing rows stay valid.
ALTER TABLE public.ai_chat_conversations ADD COLUMN IF NOT EXISTS context_type text;
ALTER TABLE public.ai_chat_conversations ADD COLUMN IF NOT EXISTS user_type text;
ALTER TABLE public.ai_chat_messages ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.ai_chat_rate_limits ADD COLUMN IF NOT EXISTS identifier text;
ALTER TABLE public.ai_chat_rate_limits ADD COLUMN IF NOT EXISTS hour_bucket timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paystack_reference text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recurring_frequency text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS parent_invoice_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS fulfilled_by uuid;
ALTER TABLE public.paystack_split_transactions ADD COLUMN IF NOT EXISTS order_item_id uuid;
ALTER TABLE public.paystack_split_transactions ADD COLUMN IF NOT EXISTS reviewer_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS variant_name text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS recorded_by_staff_id uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS variant_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS firebase_uid text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.contribution_groups ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE public.contribution_groups ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.contribution_members ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.contribution_payments ADD COLUMN IF NOT EXISTS member_id uuid;
ALTER TABLE public.contribution_payments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS discount_type text;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS discount_value numeric;
ALTER TABLE public.green_api_pool ADD COLUMN IF NOT EXISTS instance_id text;
ALTER TABLE public.green_api_pool ADD COLUMN IF NOT EXISTS status text;
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

DO $apply$
DECLARE
  r record;
  added integer := 0;
  skipped integer := 0;
BEGIN
  FOR r IN SELECT * FROM live_constraint_catalogue LOOP
    BEGIN
      IF to_regclass('public.' || r.tbl) IS NULL THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.cname) THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      IF r.cname IN ('orders_status_check', 'paystack_split_transactions_status_check') THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', r.tbl, r.cname, r.def);
      added := added + 1;
    EXCEPTION
      WHEN OTHERS THEN
        skipped := skipped + 1;
        RAISE NOTICE 'skip %: %', r.cname, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'live_constraints_added % skipped %', added, skipped;
END
$apply$;
