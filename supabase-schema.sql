-- =====================================================
-- STOREHOUSE DATABASE SCHEMA
-- World-Class Architecture for 1000+ Users
-- Optimized for Performance, Security, and Scalability
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fast text search

-- =====================================================
-- USERS TABLE
-- Stores user profiles and authentication data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE, -- For migration from Firebase
  phone_number TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  -- Metadata
  app_version TEXT,
  device_type TEXT, -- 'web', 'android', 'ios'
  is_active BOOLEAN DEFAULT true,

  -- Indexes for fast lookups
  CONSTRAINT phone_number_format CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$')
);

-- Indexes for users table
CREATE INDEX idx_users_phone ON public.users(phone_number);
CREATE INDEX idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORES TABLE
-- Online store profiles for each user
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Basic Info
  business_name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  whatsapp_number TEXT NOT NULL,
  logo_url TEXT,

  -- Payment Info
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  paystack_enabled BOOLEAN DEFAULT false,
  paystack_public_key TEXT,
  paystack_test_mode BOOLEAN DEFAULT true,

  -- Delivery Info
  delivery_areas TEXT,
  delivery_fee TEXT,
  minimum_order TEXT,
  business_hours TEXT,
  days_of_operation JSONB DEFAULT '[]',

  -- About
  about_us TEXT,
  instagram_url TEXT,
  facebook_url TEXT,

  -- Settings
  is_public BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT store_slug_format CHECK (store_slug ~ '^[a-z0-9-]{3,50}$'),
  CONSTRAINT one_store_per_user UNIQUE(user_id)
);

-- Indexes for stores table
CREATE INDEX idx_stores_user_id ON public.stores(user_id);
CREATE INDEX idx_stores_slug ON public.stores(store_slug);
CREATE INDEX idx_stores_public ON public.stores(is_public) WHERE is_public = true;
CREATE INDEX idx_stores_created_at ON public.stores(created_at DESC);

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRODUCTS TABLE
-- Inventory items with optimized storage
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Product Info
  name TEXT NOT NULL,
  sku TEXT, -- Stock Keeping Unit
  barcode TEXT,
  category TEXT,

  -- Pricing (stored as integers to avoid floating point issues)
  cost_price BIGINT DEFAULT 0, -- in kobo/cents
  selling_price BIGINT NOT NULL, -- in kobo/cents
  discount_price BIGINT, -- in kobo/cents

  -- Inventory
  quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  unit TEXT DEFAULT 'piece', -- piece, kg, litre, pack, etc.

  -- Images (optimized with ImageKit)
  image_url TEXT,
  image_thumbnail TEXT, -- 200x200 thumbnail
  image_sizes JSONB, -- {small: url, medium: url, large: url}

  -- Description
  description TEXT,
  tags TEXT[], -- For easy searching

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sold_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity >= 0),
  CONSTRAINT positive_price CHECK (selling_price > 0)
);

-- Indexes for products table (optimized for common queries)
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops); -- Fast text search
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_active ON public.products(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_products_low_stock ON public.products(user_id) WHERE quantity <= low_stock_threshold;
CREATE INDEX idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_tags ON public.products USING gin(tags);
CREATE INDEX idx_products_created_at ON public.products(created_at DESC);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SALES TABLE
-- Transaction records with daily aggregation support
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

  -- Sale Details
  product_name TEXT NOT NULL, -- Denormalized for history
  quantity INTEGER NOT NULL,
  unit_price BIGINT NOT NULL, -- Price at time of sale (in kobo)
  total_amount BIGINT NOT NULL, -- quantity * unit_price
  discount_amount BIGINT DEFAULT 0,
  final_amount BIGINT NOT NULL, -- total_amount - discount_amount

  -- Customer Info (optional)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,

  -- Payment
  payment_method TEXT DEFAULT 'cash', -- cash, card, transfer, credit
  payment_status TEXT DEFAULT 'paid', -- paid, pending, partial
  amount_paid BIGINT DEFAULT 0,
  amount_due BIGINT DEFAULT 0,

  -- Timestamps
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_time TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Day key for fast daily aggregation
  day_key TEXT GENERATED ALWAYS AS (to_char(sale_date, 'YYYY-MM-DD')) STORED,

  -- Notes
  notes TEXT,

  -- Constraints
  CONSTRAINT positive_quantity_sales CHECK (quantity > 0),
  CONSTRAINT positive_amounts CHECK (total_amount >= 0 AND final_amount >= 0)
);

-- Indexes for sales table (optimized for reports)
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_product_id ON public.sales(product_id);
CREATE INDEX idx_sales_date ON public.sales(user_id, sale_date DESC);
CREATE INDEX idx_sales_day_key ON public.sales(user_id, day_key);
CREATE INDEX idx_sales_payment_status ON public.sales(user_id, payment_status) WHERE payment_status != 'paid';
CREATE INDEX idx_sales_customer_phone ON public.sales(customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX idx_sales_created_at ON public.sales(created_at DESC);

-- =====================================================
-- EXPENSES TABLE
-- Business expenses tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Expense Details
  category TEXT NOT NULL,
  description TEXT,
  amount BIGINT NOT NULL, -- in kobo

  -- Date
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_key TEXT GENERATED ALWAYS AS (to_char(expense_date, 'YYYY-MM-DD')) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_expense CHECK (amount > 0)
);

-- Indexes for expenses table
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(user_id, expense_date DESC);
CREATE INDEX idx_expenses_day_key ON public.expenses(user_id, day_key);
CREATE INDEX idx_expenses_category ON public.expenses(user_id, category);

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MATERIALIZED VIEW FOR DAILY SALES SUMMARY
-- Pre-computed for lightning-fast dashboard loading
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_sales_summary AS
SELECT
  user_id,
  sale_date,
  day_key,
  COUNT(*) as total_transactions,
  SUM(quantity) as total_items_sold,
  SUM(final_amount) as total_revenue,
  SUM(discount_amount) as total_discounts,
  SUM(amount_due) as total_pending
FROM public.sales
GROUP BY user_id, sale_date, day_key;

-- Index on materialized view
CREATE UNIQUE INDEX idx_daily_summary_user_date ON public.daily_sales_summary(user_id, sale_date DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_daily_sales_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_sales_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Each user can only see their own data
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own profile
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid()::text = id::text OR auth.uid()::text = firebase_uid);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text OR auth.uid()::text = firebase_uid);

-- Stores: Users can manage their own store, anyone can view public stores
CREATE POLICY stores_select_own_or_public ON public.stores
  FOR SELECT USING (user_id::text = auth.uid()::text OR is_public = true);

CREATE POLICY stores_insert_own ON public.stores
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY stores_update_own ON public.stores
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY stores_delete_own ON public.stores
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- Products: Users can only manage their own products
CREATE POLICY products_select_own ON public.products
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY products_insert_own ON public.products
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY products_update_own ON public.products
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY products_delete_own ON public.products
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- Sales: Users can only manage their own sales
CREATE POLICY sales_select_own ON public.sales
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY sales_insert_own ON public.sales
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY sales_update_own ON public.sales
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY sales_delete_own ON public.sales
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- Expenses: Users can only manage their own expenses
CREATE POLICY expenses_select_own ON public.expenses
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY expenses_insert_own ON public.expenses
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY expenses_update_own ON public.expenses
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY expenses_delete_own ON public.expenses
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  quantity INTEGER,
  low_stock_threshold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.quantity, p.low_stock_threshold
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND p.is_active = true
    AND p.quantity <= p.low_stock_threshold
  ORDER BY p.quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sales summary for a date range
CREATE OR REPLACE FUNCTION get_sales_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_revenue BIGINT,
  total_transactions BIGINT,
  total_items_sold BIGINT,
  average_transaction_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.final_amount), 0)::BIGINT as total_revenue,
    COUNT(*)::BIGINT as total_transactions,
    COALESCE(SUM(s.quantity), 0)::BIGINT as total_items_sold,
    COALESCE(AVG(s.final_amount), 0) as average_transaction_value
  FROM public.sales s
  WHERE s.user_id = p_user_id
    AND s.sale_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL DATA / DEMO SETUP
-- =====================================================

-- This will be handled by the migration script from Firebase

-- =====================================================
-- GRANTS (Security)
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.stores TO anon; -- Allow anonymous users to view public stores

-- Grant access to sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated;

-- Grant access to functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated;

-- =====================================================
-- COMPLETION
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Storehouse database schema created successfully!';
  RAISE NOTICE 'Tables: users, stores, products, sales, expenses';
  RAISE NOTICE 'Row Level Security: ENABLED on all tables';
  RAISE NOTICE 'Indexes: Optimized for fast queries';
  RAISE NOTICE 'Ready for world-class performance!';
END $$;
