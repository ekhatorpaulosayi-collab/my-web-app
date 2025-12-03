-- ============================================================================
-- MARKETPLACE-READY SCHEMA
-- Adds optional columns to prepare for future marketplace launch
-- All columns are NULLABLE so existing functionality is not affected
-- ============================================================================

-- ============================================================================
-- 1. USER/STORE EXTENSIONS
-- ============================================================================

-- Add marketplace visibility controls
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS store_slug TEXT,
  ADD COLUMN IF NOT EXISTS store_visible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_description TEXT,
  ADD COLUMN IF NOT EXISTS store_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro')),
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Ensure store slugs are unique (for future public URLs like storehouse.app/@mystore)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_store_slug
  ON public.users(store_slug)
  WHERE store_slug IS NOT NULL;

-- Index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_users_marketplace
  ON public.users(store_visible, subscription_tier)
  WHERE store_visible = TRUE;

-- ============================================================================
-- 2. PRODUCT EXTENSIONS
-- ============================================================================

-- Add marketplace visibility and metadata
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS public_visible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array for searchable tags
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_score INTEGER DEFAULT 0, -- For premium placement
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_for_marketplace BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'auto_approved' CHECK (approval_status IN ('pending', 'auto_approved', 'manual_approved', 'rejected'));

-- Full-text search index (for marketplace search)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Index for marketplace product queries
CREATE INDEX IF NOT EXISTS idx_products_marketplace
  ON public.products(user_id, public_visible, category, created_at DESC)
  WHERE public_visible = TRUE AND approved_for_marketplace = TRUE;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_search
  ON public.products USING GIN(search_vector)
  WHERE public_visible = TRUE;

-- Function to auto-update search vector when product changes
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name,'')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description,'')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '),'')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search vector updated
DROP TRIGGER IF EXISTS trigger_update_product_search ON public.products;
CREATE TRIGGER trigger_update_product_search
  BEFORE INSERT OR UPDATE OF name, description, tags
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_vector();

-- ============================================================================
-- 3. ANALYTICS TABLE (for marketplace insights)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.marketplace_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('store_view', 'product_view', 'product_click', 'inquiry', 'share')),
  referrer TEXT,
  user_ip TEXT,
  user_agent TEXT,
  metadata JSONB, -- Flexible field for future data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_store
  ON public.marketplace_analytics(store_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_product
  ON public.marketplace_analytics(product_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_created
  ON public.marketplace_analytics(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.marketplace_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own analytics
DROP POLICY IF EXISTS marketplace_analytics_select_own ON public.marketplace_analytics;
CREATE POLICY marketplace_analytics_select_own
  ON public.marketplace_analytics
  FOR SELECT
  USING (store_id::text = auth.uid()::text);

-- Policy: Anyone can insert analytics (for tracking public views)
DROP POLICY IF EXISTS marketplace_analytics_insert_all ON public.marketplace_analytics;
CREATE POLICY marketplace_analytics_insert_all
  ON public.marketplace_analytics
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 4. SUBSCRIPTIONS TABLE (for premium tiers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro')),
  price_kobo INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paystack_subscription_code TEXT,
  paystack_customer_code TEXT,
  paystack_authorization_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON public.subscriptions(user_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack
  ON public.subscriptions(paystack_subscription_code)
  WHERE paystack_subscription_code IS NOT NULL;

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own
  ON public.subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own subscriptions
DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
CREATE POLICY subscriptions_insert_own
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. MODERATION QUEUE (for marketplace safety)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('spam', 'inappropriate', 'fake', 'prohibited', 'copyright', 'other')),
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'removed')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin dashboard
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status
  ON public.moderation_queue(status, created_at DESC);

-- Enable RLS
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can report (insert)
DROP POLICY IF EXISTS moderation_queue_insert_all ON public.moderation_queue;
CREATE POLICY moderation_queue_insert_all
  ON public.moderation_queue
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view (you'll need to add is_admin column to users later)
-- For now, restrict to authenticated users
DROP POLICY IF EXISTS moderation_queue_select_auth ON public.moderation_queue;
CREATE POLICY moderation_queue_select_auth
  ON public.moderation_queue
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique store slug from business name
CREATE OR REPLACE FUNCTION generate_store_slug(business_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- Limit length
  base_slug := substring(base_slug from 1 for 50);

  final_slug := base_slug;

  -- Check uniqueness, append number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE store_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to update product boost score based on subscription tier
CREATE OR REPLACE FUNCTION update_product_boost_scores()
RETURNS void AS $$
BEGIN
  -- Pro tier: boost_score = 100
  UPDATE public.products p
  SET boost_score = 100
  FROM public.users u
  WHERE p.user_id = u.id
    AND u.subscription_tier = 'pro'
    AND p.public_visible = TRUE;

  -- Basic tier: boost_score = 50
  UPDATE public.products p
  SET boost_score = 50
  FROM public.users u
  WHERE p.user_id = u.id
    AND u.subscription_tier = 'basic'
    AND p.public_visible = TRUE;

  -- Free tier: boost_score = 0
  UPDATE public.products p
  SET boost_score = 0
  FROM public.users u
  WHERE p.user_id = u.id
    AND u.subscription_tier = 'free'
    AND p.public_visible = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get marketplace search results (ready for future use)
CREATE OR REPLACE FUNCTION search_marketplace_products(
  search_query TEXT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  min_price INTEGER DEFAULT NULL,
  max_price INTEGER DEFAULT NULL,
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_price INTEGER,
  store_name TEXT,
  store_slug TEXT,
  thumbnail_url TEXT,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.price AS product_price,
    u.business_name AS store_name,
    u.store_slug,
    p.thumbnail_url,
    -- Scoring algorithm: search relevance + boost score + freshness
    (
      CASE
        WHEN search_query IS NOT NULL THEN
          ts_rank(p.search_vector, plainto_tsquery('english', search_query)) * 10
        ELSE 0
      END
      + p.boost_score::REAL
      + GREATEST(0, 5 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400))::REAL
    ) AS relevance_score
  FROM public.products p
  JOIN public.users u ON p.user_id = u.id
  WHERE
    p.public_visible = TRUE
    AND p.approved_for_marketplace = TRUE
    AND u.store_visible = TRUE
    AND (search_query IS NULL OR p.search_vector @@ plainto_tsquery('english', search_query))
    AND (filter_category IS NULL OR p.category = filter_category)
    AND (filter_location IS NULL OR u.location = filter_location)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.users.store_slug IS 'Unique URL slug for public marketplace store (e.g., storehouse.app/@mystore)';
COMMENT ON COLUMN public.users.store_visible IS 'Whether this store is visible in the marketplace (toggle in settings)';
COMMENT ON COLUMN public.users.subscription_tier IS 'Subscription level: free, basic, pro (affects marketplace ranking)';
COMMENT ON COLUMN public.products.public_visible IS 'Whether this product is visible in the marketplace';
COMMENT ON COLUMN public.products.boost_score IS 'Calculated score for marketplace ranking (based on subscription tier)';
COMMENT ON COLUMN public.products.search_vector IS 'Full-text search vector (auto-generated from name, description, tags)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Marketplace-ready schema migration complete!';
  RAISE NOTICE 'All columns are OPTIONAL - existing functionality unaffected';
  RAISE NOTICE 'When ready to launch marketplace, just flip store_visible = TRUE';
END $$;
