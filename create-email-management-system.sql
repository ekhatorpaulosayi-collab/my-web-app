-- =====================================================
-- EMAIL MANAGEMENT SYSTEM FOR STOREHOUSE
-- =====================================================
-- This creates a comprehensive email collection and management system
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- 1. CREATE EMAIL MASTER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  store_name VARCHAR(255),

  -- Subscription Status
  subscription_tier VARCHAR(50) DEFAULT 'Free',
  is_paying_customer BOOLEAN DEFAULT false,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,

  -- Engagement Metrics
  last_login TIMESTAMP,
  total_logins INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue_kobo BIGINT DEFAULT 0,
  products_added INTEGER DEFAULT 0,
  ai_chats_used INTEGER DEFAULT 0,

  -- Email Marketing Fields
  email_verified BOOLEAN DEFAULT false,
  email_consent BOOLEAN DEFAULT true,
  email_bounce_count INTEGER DEFAULT 0,
  unsubscribed BOOLEAN DEFAULT false,
  unsubscribe_date TIMESTAMP,
  unsubscribe_reason TEXT,

  -- Segmentation Tags
  tags TEXT[] DEFAULT '{}',
  user_segment VARCHAR(50), -- 'active', 'churned', 'at_risk', 'champion'
  lifecycle_stage VARCHAR(50), -- 'lead', 'trial', 'customer', 'evangelist'

  -- Geographic Data
  country VARCHAR(100) DEFAULT 'Nigeria',
  state VARCHAR(100),
  city VARCHAR(100),

  -- Business Type
  business_type VARCHAR(100),
  business_category VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_email_sent TIMESTAMP,

  -- Custom Fields
  notes TEXT,
  custom_data JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_email_list_email ON email_list(email);
CREATE INDEX idx_email_list_user_id ON email_list(user_id);
CREATE INDEX idx_email_list_segment ON email_list(user_segment);
CREATE INDEX idx_email_list_tier ON email_list(subscription_tier);
CREATE INDEX idx_email_list_tags ON email_list USING gin(tags);

-- 2. EMAIL CAMPAIGN TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50), -- 'newsletter', 'promotional', 'transactional', 'onboarding'
  subject_line TEXT,
  preview_text TEXT,

  -- Targeting
  target_segment VARCHAR(50),
  target_tags TEXT[],
  target_tiers TEXT[],

  -- Metrics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent'
  scheduled_date TIMESTAMP,
  sent_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- 3. EMAIL INTERACTION TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS email_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES email_list(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50), -- 'sent', 'delivered', 'opened', 'clicked', 'unsubscribed'
  interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  click_url TEXT,
  user_agent TEXT,
  ip_address INET
);

-- 4. POPULATE EMAIL LIST FROM EXISTING USERS
-- =====================================================
INSERT INTO email_list (
  user_id,
  email,
  full_name,
  store_name,
  subscription_tier,
  is_paying_customer,
  business_type,
  created_at
)
SELECT DISTINCT
  u.id,
  u.email,
  COALESCE(u.full_name, u.display_name, ''),
  COALESCE(u.store_name, u.business_name, ''),
  COALESCE(us.tier_name, 'Free'),
  CASE WHEN us.tier_name != 'Free' THEN true ELSE false END,
  u.store_type,
  u.created_at
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  store_name = EXCLUDED.store_name,
  subscription_tier = EXCLUDED.subscription_tier,
  is_paying_customer = EXCLUDED.is_paying_customer;

-- 5. UPDATE ENGAGEMENT METRICS FROM SALES DATA
-- =====================================================
UPDATE email_list el
SET
  total_sales = subquery.sale_count,
  total_revenue_kobo = subquery.total_revenue,
  last_login = subquery.last_sale_date
FROM (
  SELECT
    u.email,
    COUNT(s.id) as sale_count,
    SUM(s.final_amount) as total_revenue,
    MAX(s.created_at) as last_sale_date
  FROM users u
  LEFT JOIN sales s ON u.id = s.user_id
  GROUP BY u.email
) AS subquery
WHERE el.email = subquery.email;

-- 6. CREATE SEGMENTATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_segments()
RETURNS void AS $$
BEGIN
  -- Mark active users
  UPDATE email_list
  SET user_segment = 'active'
  WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '7 days';

  -- Mark at-risk users (no login in 14-30 days)
  UPDATE email_list
  SET user_segment = 'at_risk'
  WHERE last_login BETWEEN CURRENT_TIMESTAMP - INTERVAL '30 days'
    AND CURRENT_TIMESTAMP - INTERVAL '14 days';

  -- Mark churned users (no login in 30+ days)
  UPDATE email_list
  SET user_segment = 'churned'
  WHERE last_login < CURRENT_TIMESTAMP - INTERVAL '30 days'
    OR last_login IS NULL;

  -- Mark champions (paying customers with high engagement)
  UPDATE email_list
  SET user_segment = 'champion'
  WHERE is_paying_customer = true
    AND total_sales > 50
    AND last_login > CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Run segmentation
SELECT update_user_segments();

-- 7. CREATE EXPORT VIEW FOR EASY ACCESS
-- =====================================================
CREATE OR REPLACE VIEW email_export_view AS
SELECT
  email,
  full_name,
  phone,
  store_name,
  subscription_tier,
  CASE
    WHEN is_paying_customer THEN 'Paid'
    ELSE 'Free'
  END as customer_type,
  user_segment,
  business_type,
  total_sales,
  ROUND(total_revenue_kobo / 100.0, 2) as total_revenue_naira,
  last_login::date as last_active_date,
  created_at::date as signup_date,
  CASE
    WHEN unsubscribed THEN 'Unsubscribed'
    WHEN email_verified THEN 'Verified'
    ELSE 'Unverified'
  END as email_status
FROM email_list
WHERE email_consent = true
  AND unsubscribed = false
ORDER BY created_at DESC;

-- 8. CREATE FUNCTION TO GET EMAILS BY SEGMENT
-- =====================================================
CREATE OR REPLACE FUNCTION get_emails_by_segment(
  p_segment VARCHAR DEFAULT NULL,
  p_tier VARCHAR DEFAULT NULL,
  p_paying_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  email VARCHAR,
  full_name VARCHAR,
  store_name VARCHAR,
  subscription_tier VARCHAR,
  user_segment VARCHAR,
  total_sales INTEGER,
  last_login TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.email,
    el.full_name,
    el.store_name,
    el.subscription_tier,
    el.user_segment,
    el.total_sales,
    el.last_login
  FROM email_list el
  WHERE
    el.email_consent = true
    AND el.unsubscribed = false
    AND (p_segment IS NULL OR el.user_segment = p_segment)
    AND (p_tier IS NULL OR el.subscription_tier = p_tier)
    AND (NOT p_paying_only OR el.is_paying_customer = true);
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE STATISTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW email_statistics AS
SELECT
  COUNT(*) as total_emails,
  COUNT(CASE WHEN email_verified THEN 1 END) as verified_emails,
  COUNT(CASE WHEN is_paying_customer THEN 1 END) as paying_customers,
  COUNT(CASE WHEN user_segment = 'active' THEN 1 END) as active_users,
  COUNT(CASE WHEN user_segment = 'at_risk' THEN 1 END) as at_risk_users,
  COUNT(CASE WHEN user_segment = 'churned' THEN 1 END) as churned_users,
  COUNT(CASE WHEN user_segment = 'champion' THEN 1 END) as champion_users,
  COUNT(CASE WHEN unsubscribed THEN 1 END) as unsubscribed_count,
  COUNT(CASE WHEN subscription_tier = 'Free' THEN 1 END) as free_tier,
  COUNT(CASE WHEN subscription_tier = 'Starter' THEN 1 END) as starter_tier,
  COUNT(CASE WHEN subscription_tier = 'Pro' THEN 1 END) as pro_tier,
  COUNT(CASE WHEN subscription_tier = 'Business' THEN 1 END) as business_tier
FROM email_list;

-- 10. CREATE TRIGGER TO KEEP EMAIL LIST UPDATED
-- =====================================================
CREATE OR REPLACE FUNCTION sync_email_list()
RETURNS TRIGGER AS $$
BEGIN
  -- On user insert or update
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO email_list (
      user_id,
      email,
      full_name,
      store_name,
      business_type,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.full_name, NEW.display_name, ''),
      COALESCE(NEW.store_name, NEW.business_name, ''),
      NEW.store_type,
      NEW.created_at
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      store_name = EXCLUDED.store_name,
      business_type = EXCLUDED.business_type,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_email_list_trigger ON users;
CREATE TRIGGER sync_email_list_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_email_list();

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Get all active paying customers:
-- SELECT * FROM get_emails_by_segment(p_segment := 'active', p_paying_only := true);

-- Get all emails for newsletter:
-- SELECT email, full_name FROM email_export_view;

-- Get segmented counts:
-- SELECT * FROM email_statistics;

-- Export to CSV (run in Supabase dashboard):
-- COPY (SELECT * FROM email_export_view) TO '/tmp/email_list.csv' WITH CSV HEADER;