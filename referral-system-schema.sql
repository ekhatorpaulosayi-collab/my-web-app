-- Referral System Database Schema
-- Additive Reward Model: Rewards stack at each milestone
-- Created: 2025-11-20

-- ============================================
-- REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referrer info (person sharing)
  referrer_uid TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL, -- e.g., "JOHN2024"

  -- Referee info (person who signed up)
  referee_uid TEXT,
  referee_email TEXT,
  referee_name TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'clicked', 'signed_up', 'converted', 'rewarded')),

  -- Timestamps
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ, -- When referee upgraded to paid
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  utm_source TEXT, -- Track where link was shared
  utm_medium TEXT,

  CONSTRAINT fk_referrer FOREIGN KEY (referrer_uid) REFERENCES auth.users(uid) ON DELETE CASCADE
);

-- ============================================
-- REFERRAL REWARDS TABLE (Track all rewards)
-- ============================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who earned the reward
  user_uid TEXT NOT NULL,

  -- Link to referral that triggered this reward
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,

  -- Reward details
  reward_type TEXT NOT NULL CHECK (reward_type IN ('account_credit', 'airtime', 'free_month', 'feature_unlock', 'lifetime_access')),
  reward_value INTEGER, -- In kobo for money, days for time

  -- For account credits
  credit_amount_kobo INTEGER DEFAULT 0,
  credit_remaining_kobo INTEGER DEFAULT 0,

  -- For free months
  free_months INTEGER DEFAULT 0,
  free_until_date DATE,

  -- For feature unlocks
  features_unlocked JSONB, -- Array of feature names
  features_until_date DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'used', 'expired', 'cancelled')),

  -- Timestamps
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,

  CONSTRAINT fk_user FOREIGN KEY (user_uid) REFERENCES auth.users(uid) ON DELETE CASCADE
);

-- ============================================
-- REFERRAL MILESTONES TABLE (Track progress)
-- ============================================
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_uid TEXT NOT NULL,

  -- Milestone counts
  total_referrals INTEGER DEFAULT 0,
  successful_conversions INTEGER DEFAULT 0, -- How many upgraded to paid

  -- Milestones achieved
  milestone_3_achieved BOOLEAN DEFAULT false,
  milestone_3_claimed_at TIMESTAMPTZ,

  milestone_5_achieved BOOLEAN DEFAULT false,
  milestone_5_claimed_at TIMESTAMPTZ,

  milestone_10_achieved BOOLEAN DEFAULT false,
  milestone_10_claimed_at TIMESTAMPTZ,

  milestone_25_achieved BOOLEAN DEFAULT false,
  milestone_25_claimed_at TIMESTAMPTZ,

  milestone_50_achieved BOOLEAN DEFAULT false,
  milestone_50_claimed_at TIMESTAMPTZ,

  -- Totals earned (for display)
  total_credit_earned_kobo INTEGER DEFAULT 0,
  total_free_months_earned INTEGER DEFAULT 0,

  -- Special status
  is_ambassador BOOLEAN DEFAULT false, -- 10+ referrals
  is_legend BOOLEAN DEFAULT false,     -- 50+ referrals
  has_lifetime_access BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_user_milestone FOREIGN KEY (user_uid) REFERENCES auth.users(uid) ON DELETE CASCADE,
  CONSTRAINT unique_user_milestone UNIQUE (user_uid)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_uid);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_uid);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

CREATE INDEX IF NOT EXISTS idx_rewards_user ON referral_rewards(user_uid);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON referral_rewards(reward_type);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON referral_milestones(user_uid);
CREATE INDEX IF NOT EXISTS idx_milestones_conversions ON referral_milestones(successful_conversions);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_uid);

-- Users can create referrals
CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_uid);

-- Users can update their own referrals
CREATE POLICY "Users can update own referrals"
  ON referrals FOR UPDATE
  USING (auth.uid() = referrer_uid);

-- Users can view own rewards
CREATE POLICY "Users can view own rewards"
  ON referral_rewards FOR SELECT
  USING (auth.uid() = user_uid);

-- Users can view own milestones
CREATE POLICY "Users can view own milestones"
  ON referral_milestones FOR SELECT
  USING (auth.uid() = user_uid);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update referral milestones after conversion
CREATE OR REPLACE FUNCTION update_referral_milestones(p_user_uid TEXT)
RETURNS void AS $$
DECLARE
  v_conversions INTEGER;
BEGIN
  -- Count successful conversions
  SELECT COUNT(*) INTO v_conversions
  FROM referrals
  WHERE referrer_uid = p_user_uid
    AND status = 'converted';

  -- Upsert milestone record
  INSERT INTO referral_milestones (
    user_uid,
    successful_conversions,
    total_referrals,
    milestone_3_achieved,
    milestone_5_achieved,
    milestone_10_achieved,
    milestone_25_achieved,
    milestone_50_achieved,
    is_ambassador,
    is_legend,
    updated_at
  ) VALUES (
    p_user_uid,
    v_conversions,
    (SELECT COUNT(*) FROM referrals WHERE referrer_uid = p_user_uid),
    v_conversions >= 3,
    v_conversions >= 5,
    v_conversions >= 10,
    v_conversions >= 25,
    v_conversions >= 50,
    v_conversions >= 10,
    v_conversions >= 50,
    NOW()
  )
  ON CONFLICT (user_uid)
  DO UPDATE SET
    successful_conversions = v_conversions,
    total_referrals = (SELECT COUNT(*) FROM referrals WHERE referrer_uid = p_user_uid),
    milestone_3_achieved = v_conversions >= 3,
    milestone_5_achieved = v_conversions >= 5,
    milestone_10_achieved = v_conversions >= 10,
    milestone_25_achieved = v_conversions >= 25,
    milestone_50_achieved = v_conversions >= 50,
    is_ambassador = v_conversions >= 10,
    is_legend = v_conversions >= 50,
    has_lifetime_access = v_conversions >= 50,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================
-- Uncomment to test:
-- INSERT INTO referrals (referrer_uid, referral_code, status)
-- VALUES ('test-user-uid', 'TEST2024', 'pending');

-- ============================================
-- NOTES
-- ============================================
-- Reward Structure (Additive):
-- - Every referral: ₦500 credit OR ₦300 airtime
-- - 3 referrals: +7 days Pro trial
-- - 5 referrals: +1 FREE MONTH (total: 1 month)
-- - 10 referrals: +3 FREE MONTHS (total: 4 months)
-- - 25 referrals: +8 FREE MONTHS (total: 12 months = 1 year)
-- - 50 referrals: LIFETIME ACCESS + revenue share
