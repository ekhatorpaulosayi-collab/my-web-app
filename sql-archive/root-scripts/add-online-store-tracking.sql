-- =====================================================
-- ONLINE STORE TRACKING FEATURE
-- Track sales from online store, save customer data
-- =====================================================

-- Add sale_channel field to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS sale_channel TEXT DEFAULT 'in-person';

-- Add check constraint for valid channels
ALTER TABLE public.sales
ADD CONSTRAINT valid_sale_channel
CHECK (sale_channel IN ('in-person', 'online-store', 'wholesale', 'social-media'));

-- Add index for filtering by channel
CREATE INDEX IF NOT EXISTS idx_sales_channel ON public.sales(sale_channel);

-- Create customers table to save customer contact info
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Customer details
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  -- Stats
  total_orders INTEGER DEFAULT 1,
  total_spent BIGINT DEFAULT 0, -- in kobo
  last_order_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate phone numbers per merchant
  CONSTRAINT unique_customer_phone UNIQUE(user_id, customer_phone)
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_order ON public.customers(last_order_date DESC);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_own ON public.customers
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY customers_insert_own ON public.customers
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY customers_update_own ON public.customers
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY customers_delete_own ON public.customers
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- Comments
COMMENT ON TABLE public.customers IS 'Customer contact database for repeat sales and marketing';
COMMENT ON COLUMN public.sales.sale_channel IS 'Where the sale originated: in-person, online-store, wholesale, social-media';

-- Function to upsert customer and update stats
CREATE OR REPLACE FUNCTION upsert_customer(
  p_user_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_order_amount BIGINT,
  p_order_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Insert or update customer
  INSERT INTO public.customers (
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    total_orders,
    total_spent,
    last_order_date
  ) VALUES (
    p_user_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    1,
    p_order_amount,
    p_order_date
  )
  ON CONFLICT (user_id, customer_phone) DO UPDATE SET
    customer_name = COALESCE(EXCLUDED.customer_name, customers.customer_name),
    customer_email = COALESCE(EXCLUDED.customer_email, customers.customer_email),
    total_orders = customers.total_orders + 1,
    total_spent = customers.total_spent + EXCLUDED.total_spent,
    last_order_date = GREATEST(customers.last_order_date, EXCLUDED.last_order_date),
    updated_at = NOW()
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
