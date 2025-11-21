-- =====================================================
-- PROMO CODES FEATURE
-- Enable merchants to create discount codes for viral marketing
-- =====================================================

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Code details
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0,

  -- Validity
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_code_per_user UNIQUE(user_id, code),
  CONSTRAINT valid_discount CHECK (
    (discount_type = 'percentage' AND discount_value <= 100) OR
    (discount_type = 'fixed')
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_promo_codes_user ON public.promo_codes(user_id);
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active) WHERE is_active = true;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create promo_code_usage table to track individual uses
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,

  -- Usage details
  order_total INTEGER NOT NULL, -- Total before discount (in kobo)
  discount_amount INTEGER NOT NULL, -- Discount applied (in kobo)
  final_total INTEGER NOT NULL, -- Total after discount (in kobo)

  -- Customer info (optional)
  customer_name TEXT,
  customer_phone TEXT,

  -- Metadata
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_promo_usage_code ON public.promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_usage_date ON public.promo_code_usage(used_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.promo_codes IS 'Discount codes that merchants can create and share';
COMMENT ON TABLE public.promo_code_usage IS 'Tracks each time a promo code is used';

-- Example queries:

-- Get all active promo codes for a user:
-- SELECT * FROM promo_codes
-- WHERE user_id = 'user-uuid'
--   AND is_active = true
--   AND (expires_at IS NULL OR expires_at > NOW())
--   AND (max_uses IS NULL OR used_count < max_uses);

-- Validate and apply a promo code:
-- SELECT * FROM promo_codes
-- WHERE code = 'FLASH50'
--   AND user_id = 'user-uuid'
--   AND is_active = true
--   AND (expires_at IS NULL OR expires_at > NOW())
--   AND (max_uses IS NULL OR used_count < max_uses);

-- Get promo code performance:
-- SELECT
--   pc.code,
--   pc.used_count,
--   COUNT(pcu.id) as total_uses,
--   SUM(pcu.discount_amount) / 100 as total_discount_ngn,
--   SUM(pcu.final_total) / 100 as total_revenue_ngn
-- FROM promo_codes pc
-- LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
-- WHERE pc.user_id = 'user-uuid'
-- GROUP BY pc.id, pc.code, pc.used_count
-- ORDER BY total_uses DESC;
