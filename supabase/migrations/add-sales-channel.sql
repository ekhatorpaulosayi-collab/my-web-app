-- =====================================================
-- SALES CHANNEL TRACKING
-- Add multi-channel attribution to sales table
-- Supports: Instagram, WhatsApp, Facebook, TikTok, etc.
-- =====================================================

-- Add sales_channel column to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS sales_channel TEXT DEFAULT 'in-store';

-- Add comment for documentation
COMMENT ON COLUMN public.sales.sales_channel IS 'Sales attribution channel: in-store, whatsapp, instagram, facebook, website, tiktok, referral, other';

-- Create index for fast channel-based queries
CREATE INDEX IF NOT EXISTS idx_sales_channel
ON public.sales(user_id, sales_channel, sale_date DESC);

-- Create composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sales_channel_analytics
ON public.sales(user_id, sales_channel, created_at DESC)
WHERE sales_channel IS NOT NULL;

-- Update existing sales to 'in-store' (default)
UPDATE public.sales
SET sales_channel = 'in-store'
WHERE sales_channel IS NULL;

-- Add constraint to ensure valid channel values
ALTER TABLE public.sales
ADD CONSTRAINT sales_channel_valid
CHECK (sales_channel IN (
  'in-store',
  'whatsapp',
  'instagram',
  'facebook',
  'website',
  'tiktok',
  'referral',
  'other'
));

-- =====================================================
-- ANALYTICS FUNCTION: Get sales by channel
-- =====================================================
CREATE OR REPLACE FUNCTION get_sales_by_channel(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  channel TEXT,
  total_sales BIGINT,
  total_revenue BIGINT,
  total_items BIGINT,
  avg_transaction NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.sales_channel as channel,
    COUNT(*)::BIGINT as total_sales,
    COALESCE(SUM(s.final_amount), 0)::BIGINT as total_revenue,
    COALESCE(SUM(s.quantity), 0)::BIGINT as total_items,
    COALESCE(AVG(s.final_amount), 0) as avg_transaction
  FROM public.sales s
  WHERE s.user_id = p_user_id
    AND s.sale_date BETWEEN p_start_date AND p_end_date
  GROUP BY s.sales_channel
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sales_by_channel(UUID, DATE, DATE)
TO postgres, service_role, authenticated;

-- =====================================================
-- COMPLETION LOG
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Sales channel tracking added successfully!';
  RAISE NOTICE 'Channels: in-store, whatsapp, instagram, facebook, website, tiktok, referral, other';
  RAISE NOTICE 'Indexes created for fast analytics queries';
  RAISE NOTICE 'Function: get_sales_by_channel() available';
END $$;
