-- ============================================
-- STOREHOUSE AFFILIATE PROGRAM (30% Commission)
-- Created: January 15, 2026
-- ============================================
-- Rules:
-- - 30% commission on all paid subscriptions
-- - 2 conversions minimum to unlock payouts
-- - 7-day confirmation period (refund protection)
-- - Weekly payouts every Monday
-- ============================================

-- 1. AFFILIATES TABLE
-- Stores affiliate accounts and their settings
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT UNIQUE NOT NULL,

  -- Bank details for payouts
  bank_account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  paystack_recipient_code TEXT, -- Auto-generated when first payout happens

  -- Performance stats
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earnings_kobo BIGINT DEFAULT 0,
  pending_earnings_kobo BIGINT DEFAULT 0,
  paid_out_kobo BIGINT DEFAULT 0,

  -- Status flags
  is_active BOOLEAN DEFAULT true,
  payouts_unlocked BOOLEAN DEFAULT false, -- True after 2+ conversions

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_active ON affiliates(is_active);

-- ============================================
-- 2. AFFILIATE CLICKS TABLE
-- Track all clicks on affiliate links
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,

  -- Visitor information
  visitor_ip TEXT,
  visitor_country TEXT,
  visitor_device TEXT,
  referrer_url TEXT,

  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  customer_id UUID REFERENCES auth.users(id),

  clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clicks_converted ON affiliate_clicks(converted);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(clicked_at);

-- ============================================
-- 3. AFFILIATE SALES TABLE
-- Track all sales made through affiliate links
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Customer information
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_name TEXT,

  -- Sale details
  subscription_id UUID REFERENCES user_subscriptions(id),
  plan_name TEXT NOT NULL,
  sale_amount_kobo BIGINT NOT NULL,
  commission_amount_kobo BIGINT NOT NULL, -- 30% of sale_amount_kobo

  -- Status tracking
  status TEXT DEFAULT 'pending',
  -- pending: Just happened, waiting 7 days
  -- confirmed: 7 days passed, no refund, ready for payout
  -- paid: Commission paid to affiliate
  -- refunded: Customer refunded, commission cancelled

  -- Important dates
  sale_date TIMESTAMP DEFAULT NOW(),
  confirmation_date TIMESTAMP, -- Set after 7 days
  payout_date TIMESTAMP,
  payout_id UUID REFERENCES affiliate_payouts(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_affiliate ON affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON affiliate_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON affiliate_sales(sale_date);

-- ============================================
-- 4. AFFILIATE PAYOUTS TABLE
-- Track payout batches to affiliates
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Payout details
  total_amount_kobo BIGINT NOT NULL,
  sales_count INTEGER NOT NULL,
  sales_ids UUID[] NOT NULL, -- Array of affiliate_sales IDs included

  -- Paystack integration
  paystack_transfer_id TEXT,
  paystack_transfer_code TEXT,
  paystack_status TEXT, -- pending, processing, success, failed

  -- Status workflow
  status TEXT DEFAULT 'pending',
  -- pending: Created, waiting for admin approval (manual phase)
  -- approved: Admin approved, ready to process
  -- processing: Paystack transfer initiated
  -- completed: Money sent successfully
  -- failed: Paystack transfer failed

  failure_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Admin tracking
  approved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_date ON affiliate_payouts(created_at);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Increment affiliate click count
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(p_affiliate_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET total_clicks = total_clicks + 1,
      updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment affiliate signup count
CREATE OR REPLACE FUNCTION increment_affiliate_signup(p_affiliate_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET total_signups = total_signups + 1,
      updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment conversion and earnings
CREATE OR REPLACE FUNCTION increment_affiliate_conversion(
  p_affiliate_id UUID,
  p_commission_kobo BIGINT
)
RETURNS VOID AS $$
DECLARE
  v_new_conversions INTEGER;
BEGIN
  -- Increment stats
  UPDATE affiliates
  SET total_conversions = total_conversions + 1,
      total_earnings_kobo = total_earnings_kobo + p_commission_kobo,
      pending_earnings_kobo = pending_earnings_kobo + p_commission_kobo,
      updated_at = NOW()
  WHERE id = p_affiliate_id
  RETURNING total_conversions INTO v_new_conversions;

  -- Check if payouts should be unlocked (2+ conversions)
  IF v_new_conversions >= 2 THEN
    UPDATE affiliates
    SET payouts_unlocked = true
    WHERE id = p_affiliate_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct earnings (when refund happens)
CREATE OR REPLACE FUNCTION deduct_affiliate_earnings(
  p_affiliate_id UUID,
  p_amount_kobo BIGINT
)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET total_earnings_kobo = total_earnings_kobo - p_amount_kobo,
      pending_earnings_kobo = pending_earnings_kobo - p_amount_kobo,
      total_conversions = total_conversions - 1,
      updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-confirm sales after 7 days (cron job)
CREATE OR REPLACE FUNCTION confirm_pending_sales()
RETURNS INTEGER AS $$
DECLARE
  v_confirmed_count INTEGER := 0;
  v_sale RECORD;
BEGIN
  -- Find sales 7+ days old, still pending, with active subscription
  FOR v_sale IN
    SELECT s.*
    FROM affiliate_sales s
    INNER JOIN user_subscriptions us ON s.subscription_id = us.id
    WHERE s.status = 'pending'
      AND s.sale_date <= NOW() - INTERVAL '7 days'
      AND us.status = 'active' -- Check subscription not cancelled
  LOOP
    -- Confirm the sale
    UPDATE affiliate_sales
    SET status = 'confirmed',
        confirmation_date = NOW()
    WHERE id = v_sale.id;

    v_confirmed_count := v_confirmed_count + 1;
  END LOOP;

  RETURN v_confirmed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get affiliates ready for payout
CREATE OR REPLACE FUNCTION get_affiliates_ready_for_payout()
RETURNS TABLE (
  affiliate_id UUID,
  affiliate_code TEXT,
  account_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  payouts_unlocked BOOLEAN,
  confirmed_sales_count BIGINT,
  total_commission_kobo BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.affiliate_code,
    a.account_name,
    a.bank_name,
    a.bank_account_number,
    a.payouts_unlocked,
    COUNT(s.id),
    SUM(s.commission_amount_kobo)
  FROM affiliates a
  INNER JOIN affiliate_sales s ON a.id = s.affiliate_id
  WHERE s.status = 'confirmed' -- Only confirmed sales
    AND a.payouts_unlocked = true -- Only unlocked affiliates
  GROUP BY a.id
  HAVING SUM(s.commission_amount_kobo) >= 500000; -- Minimum ₦5,000
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_affiliate_clicks TO authenticated;
GRANT EXECUTE ON FUNCTION increment_affiliate_signup TO authenticated;
GRANT EXECUTE ON FUNCTION increment_affiliate_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_affiliate_earnings TO service_role;
GRANT EXECUTE ON FUNCTION confirm_pending_sales TO service_role;
GRANT EXECUTE ON FUNCTION get_affiliates_ready_for_payout TO service_role;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Affiliates: Users can only see/edit their own affiliate account
CREATE POLICY affiliates_select_own ON affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY affiliates_insert_own ON affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY affiliates_update_own ON affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- Affiliate clicks: Anyone can insert (for tracking), only affiliate can view
CREATE POLICY clicks_insert_all ON affiliate_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY clicks_select_own ON affiliate_clicks
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Affiliate sales: Only affiliate can view their sales
CREATE POLICY sales_select_own ON affiliate_sales
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Service role can insert sales (when payment happens)
CREATE POLICY sales_insert_service ON affiliate_sales
  FOR INSERT WITH CHECK (true);

-- Affiliate payouts: Only affiliate can view their payouts
CREATE POLICY payouts_select_own ON affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE affiliates IS 'Stores affiliate accounts for 30% commission program';
COMMENT ON TABLE affiliate_clicks IS 'Tracks clicks on affiliate links for performance analytics';
COMMENT ON TABLE affiliate_sales IS 'Records sales made through affiliate links (30% commission)';
COMMENT ON TABLE affiliate_payouts IS 'Batch payouts to affiliates (weekly on Mondays)';

COMMENT ON FUNCTION confirm_pending_sales IS 'Auto-confirms sales after 7 days (refund protection). Run daily via cron.';
COMMENT ON FUNCTION get_affiliates_ready_for_payout IS 'Gets all affiliates with confirmed sales ready for weekly payout';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
