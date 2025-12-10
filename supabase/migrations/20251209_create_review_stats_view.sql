-- Create materialized view for product review statistics
-- This improves performance by pre-calculating review stats

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS product_review_stats;

-- Create the materialized view
CREATE MATERIALIZED VIEW product_review_stats AS
SELECT 
  product_id,
  COUNT(*) as total_reviews,
  AVG(rating)::numeric(3,2) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
  COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
  COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
  COUNT(*) FILTER (WHERE rating = 1) as one_star_count
FROM product_reviews
WHERE status = 'approved'
GROUP BY product_id;

-- Create index for fast lookups
CREATE UNIQUE INDEX idx_product_review_stats_product_id 
  ON product_review_stats(product_id);

-- Enable RLS
ALTER MATERIALIZED VIEW product_review_stats OWNER TO postgres;

-- Grant access to anonymous users (public storefront)
GRANT SELECT ON product_review_stats TO anon;
GRANT SELECT ON product_review_stats TO authenticated;

-- Create function to refresh the view
CREATE OR REPLACE FUNCTION refresh_product_review_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_review_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh the view initially
REFRESH MATERIALIZED VIEW product_review_stats;
