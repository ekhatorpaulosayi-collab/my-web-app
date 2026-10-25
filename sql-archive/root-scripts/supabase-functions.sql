-- =====================================================
-- ADDITIONAL DATABASE FUNCTIONS
-- Helper functions for common operations
-- =====================================================

-- Function to decrement product quantity (for sales)
CREATE OR REPLACE FUNCTION decrement_product_quantity(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET quantity = GREATEST(0, quantity - p_quantity),
      updated_at = NOW(),
      last_sold_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment product quantity (for restocking)
CREATE OR REPLACE FUNCTION increment_product_quantity(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if store slug is available
CREATE OR REPLACE FUNCTION is_slug_available(p_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  slug_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.stores WHERE store_slug = p_slug
  ) INTO slug_exists;

  RETURN NOT slug_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get product by barcode
CREATE OR REPLACE FUNCTION get_product_by_barcode(
  p_user_id UUID,
  p_barcode TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  selling_price BIGINT,
  quantity INTEGER,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.selling_price, p.quantity, p.image_url
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND p.barcode = p_barcode
    AND p.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top selling products
CREATE OR REPLACE FUNCTION get_top_selling_products(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_name TEXT,
  total_quantity BIGINT,
  total_revenue BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.product_name,
    SUM(s.quantity)::BIGINT as total_quantity,
    SUM(s.final_amount)::BIGINT as total_revenue,
    COUNT(*)::BIGINT as transaction_count
  FROM public.sales s
  WHERE s.user_id = p_user_id
    AND s.sale_date BETWEEN p_start_date AND p_end_date
  GROUP BY s.product_name
  ORDER BY total_quantity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue by payment method
CREATE OR REPLACE FUNCTION get_revenue_by_payment_method(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  payment_method TEXT,
  total_revenue BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.payment_method,
    SUM(s.final_amount)::BIGINT as total_revenue,
    COUNT(*)::BIGINT as transaction_count
  FROM public.sales s
  WHERE s.user_id = p_user_id
    AND s.sale_date BETWEEN p_start_date AND p_end_date
  GROUP BY s.payment_method
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expenses by category
CREATE OR REPLACE FUNCTION get_expenses_by_category(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  total_amount BIGINT,
  expense_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.category,
    SUM(e.amount)::BIGINT as total_amount,
    COUNT(*)::BIGINT as expense_count
  FROM public.expenses e
  WHERE e.user_id = p_user_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
  GROUP BY e.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily revenue trend
CREATE OR REPLACE FUNCTION get_daily_revenue_trend(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  sale_date DATE,
  total_revenue BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.sale_date,
    SUM(s.final_amount)::BIGINT as total_revenue,
    COUNT(*)::BIGINT as transaction_count
  FROM public.sales s
  WHERE s.user_id = p_user_id
    AND s.sale_date BETWEEN p_start_date AND p_end_date
  GROUP BY s.sale_date
  ORDER BY s.sale_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate profit
CREATE OR REPLACE FUNCTION calculate_profit(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_revenue BIGINT,
  total_cost BIGINT,
  total_expenses BIGINT,
  gross_profit BIGINT,
  net_profit BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.final_amount), 0)::BIGINT as total_revenue,
    COALESCE(SUM(s.quantity * p.cost_price), 0)::BIGINT as total_cost,
    COALESCE((SELECT SUM(amount) FROM public.expenses WHERE user_id = p_user_id AND expense_date BETWEEN p_start_date AND p_end_date), 0)::BIGINT as total_expenses,
    COALESCE(SUM(s.final_amount - (s.quantity * p.cost_price)), 0)::BIGINT as gross_profit,
    COALESCE(SUM(s.final_amount - (s.quantity * p.cost_price)), 0)::BIGINT - COALESCE((SELECT SUM(amount) FROM public.expenses WHERE user_id = p_user_id AND expense_date BETWEEN p_start_date AND p_end_date), 0)::BIGINT as net_profit
  FROM public.sales s
  LEFT JOIN public.products p ON s.product_id = p.id
  WHERE s.user_id = p_user_id
    AND s.sale_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search products (fast text search)
CREATE OR REPLACE FUNCTION search_products(
  p_user_id UUID,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  selling_price BIGINT,
  quantity INTEGER,
  image_url TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.category,
    p.selling_price,
    p.quantity,
    p.image_url,
    similarity(p.name, p_search_term) as similarity
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND p.is_active = true
    AND (
      p.name ILIKE '%' || p_search_term || '%'
      OR p.sku ILIKE '%' || p_search_term || '%'
      OR p.barcode ILIKE '%' || p_search_term || '%'
      OR p.category ILIKE '%' || p_search_term || '%'
    )
  ORDER BY similarity DESC, p.name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Additional database functions created successfully!';
  RAISE NOTICE 'Functions: decrement_product_quantity, increment_product_quantity, is_slug_available, and more';
END $$;
