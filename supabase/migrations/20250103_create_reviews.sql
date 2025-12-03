-- Product Reviews System
-- Text-only reviews with star ratings, helpfulness voting, and moderation

-- ============================================
-- 1. PRODUCT REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_user_id UUID NOT NULL, -- The store owner's user_id for filtering

  -- Reviewer Information
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title TEXT,
  review_text TEXT NOT NULL CHECK (char_length(review_text) >= 10),

  -- Verification (future: link to actual orders)
  is_verified_purchase BOOLEAN DEFAULT false,
  order_id UUID, -- Optional: link to orders table when checkout exists

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,

  -- Store Response
  store_response TEXT,
  store_response_date TIMESTAMPTZ,

  -- Helpfulness
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_store_user_id ON product_reviews(store_user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- ============================================
-- 2. REVIEW HELPFULNESS VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  voter_identifier TEXT NOT NULL, -- IP address or session ID
  vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate votes from same identifier
  UNIQUE(review_id, voter_identifier)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);

-- ============================================
-- 3. PRODUCT REVIEW STATISTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_review_stats (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,

  -- Overall Stats
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,

  -- Rating Breakdown
  rating_5_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_1_count INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. FUNCTIONS TO UPDATE STATISTICS
-- ============================================

-- Function to update review stats when a review is approved/rejected
CREATE OR REPLACE FUNCTION update_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stats for approved reviews
  IF NEW.status = 'approved' OR OLD.status = 'approved' THEN
    -- Insert or update the stats record
    INSERT INTO product_review_stats (product_id)
    VALUES (NEW.product_id)
    ON CONFLICT (product_id) DO NOTHING;

    -- Recalculate all stats from scratch (simple and accurate)
    UPDATE product_review_stats
    SET
      total_reviews = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved'
      ),
      average_rating = (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved'
      ),
      rating_5_count = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved' AND rating = 5
      ),
      rating_4_count = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved' AND rating = 4
      ),
      rating_3_count = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved' AND rating = 3
      ),
      rating_2_count = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved' AND rating = 2
      ),
      rating_1_count = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE product_id = NEW.product_id AND status = 'approved' AND rating = 1
      ),
      updated_at = NOW()
    WHERE product_id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats on review changes
DROP TRIGGER IF EXISTS trigger_update_review_stats ON product_reviews;
CREATE TRIGGER trigger_update_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_stats();

-- Function to update helpfulness counts
CREATE OR REPLACE FUNCTION update_review_helpfulness()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment appropriate counter
    IF NEW.vote_type = 'helpful' THEN
      UPDATE product_reviews
      SET helpful_count = helpful_count + 1
      WHERE id = NEW.review_id;
    ELSE
      UPDATE product_reviews
      SET not_helpful_count = not_helpful_count + 1
      WHERE id = NEW.review_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement appropriate counter
    IF OLD.vote_type = 'helpful' THEN
      UPDATE product_reviews
      SET helpful_count = GREATEST(helpful_count - 1, 0)
      WHERE id = OLD.review_id;
    ELSE
      UPDATE product_reviews
      SET not_helpful_count = GREATEST(not_helpful_count - 1, 0)
      WHERE id = OLD.review_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update helpfulness counts
DROP TRIGGER IF EXISTS trigger_update_review_helpfulness ON review_votes;
CREATE TRIGGER trigger_update_review_helpfulness
  AFTER INSERT OR DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpfulness();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_review_stats ENABLE ROW LEVEL SECURITY;

-- Product Reviews Policies
-- Anyone can view approved reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON product_reviews;
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  USING (status = 'approved');

-- Anyone can submit a review (will be pending)
DROP POLICY IF EXISTS "Anyone can submit reviews" ON product_reviews;
CREATE POLICY "Anyone can submit reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (status = 'pending');

-- Store owners can view all reviews for their products
DROP POLICY IF EXISTS "Store owners can view their reviews" ON product_reviews;
CREATE POLICY "Store owners can view their reviews"
  ON product_reviews FOR SELECT
  USING (store_user_id = auth.uid());

-- Store owners can update their reviews (approve/reject/respond)
DROP POLICY IF EXISTS "Store owners can moderate their reviews" ON product_reviews;
CREATE POLICY "Store owners can moderate their reviews"
  ON product_reviews FOR UPDATE
  USING (store_user_id = auth.uid());

-- Review Votes Policies
-- Anyone can view votes
DROP POLICY IF EXISTS "Anyone can view review votes" ON review_votes;
CREATE POLICY "Anyone can view review votes"
  ON review_votes FOR SELECT
  USING (true);

-- Anyone can submit votes
DROP POLICY IF EXISTS "Anyone can vote on reviews" ON review_votes;
CREATE POLICY "Anyone can vote on reviews"
  ON review_votes FOR INSERT
  WITH CHECK (true);

-- Review Stats Policies
-- Anyone can view stats
DROP POLICY IF EXISTS "Anyone can view review stats" ON product_review_stats;
CREATE POLICY "Anyone can view review stats"
  ON product_review_stats FOR SELECT
  USING (true);

-- System can update stats (via triggers)
DROP POLICY IF EXISTS "System can update review stats" ON product_review_stats;
CREATE POLICY "System can update review stats"
  ON product_review_stats FOR ALL
  USING (true);

-- ============================================
-- 6. HELPER VIEWS
-- ============================================

-- View for public reviews with stats
CREATE OR REPLACE VIEW public_product_reviews AS
SELECT
  r.*,
  (r.helpful_count - r.not_helpful_count) as helpfulness_score,
  p.name as product_name,
  p.image_url as product_image
FROM product_reviews r
JOIN products p ON r.product_id = p.id
WHERE r.status = 'approved'
ORDER BY r.created_at DESC;

-- ============================================
-- COMPLETE: Review system ready!
-- ============================================
