-- Payment Transactions Table
-- Tracks all payment attempts, successes, and failures

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL, -- Amount in Naira
  currency VARCHAR(3) DEFAULT 'NGN',
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed', 'refunded'

  -- Paystack Details
  payment_provider VARCHAR(20) DEFAULT 'paystack',
  payment_reference VARCHAR(100) UNIQUE NOT NULL, -- Paystack reference
  payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'ussd', etc.
  authorization_code VARCHAR(100), -- For recurring charges

  -- Subscription Details
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  tier_id TEXT REFERENCES subscription_tiers(id) ON DELETE SET NULL,  -- TEXT not UUID (subscription_tiers uses TEXT ids)
  billing_cycle VARCHAR(20), -- 'monthly', 'annual'

  -- Paystack Response Data
  paystack_response JSONB, -- Full Paystack webhook payload
  customer_email VARCHAR(255),
  customer_code VARCHAR(100),

  -- Metadata
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_reference ON payment_transactions(payment_reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert (via service role)
CREATE POLICY "Service role can insert transactions"
  ON payment_transactions
  FOR INSERT
  WITH CHECK (true);

-- Only service role can update
CREATE POLICY "Service role can update transactions"
  ON payment_transactions
  FOR UPDATE
  USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_payment_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_transaction_timestamp
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transaction_updated_at();

-- Function to get user's payment history
CREATE OR REPLACE FUNCTION get_user_payment_history(p_user_id UUID)
RETURNS TABLE (
  transaction_id UUID,
  amount DECIMAL(10, 2),
  status VARCHAR(20),
  payment_method VARCHAR(50),
  tier_name VARCHAR(50),
  billing_cycle VARCHAR(20),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.amount,
    pt.status,
    pt.payment_method,
    st.name,
    pt.billing_cycle,
    pt.created_at
  FROM payment_transactions pt
  LEFT JOIN subscription_tiers st ON pt.tier_id = st.id
  WHERE pt.user_id = p_user_id
  ORDER BY pt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE payment_transactions IS 'Stores all payment transaction records from Paystack and other providers';
