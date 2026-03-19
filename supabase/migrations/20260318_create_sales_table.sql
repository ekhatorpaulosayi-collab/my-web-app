-- Create sales table for storing product sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price BIGINT NOT NULL,
  total_amount BIGINT NOT NULL,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  payment_status TEXT DEFAULT 'paid',
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  cost_price BIGINT,
  profit BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_credit BOOLEAN DEFAULT false,
  credit_due_date DATE,
  day_key TEXT,
  sync_status TEXT DEFAULT 'synced'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_day_key ON sales(day_key);
CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_is_credit ON sales(is_credit);

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sales" ON sales
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own sales" ON sales
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own sales" ON sales
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own sales" ON sales
  FOR DELETE USING (user_id = auth.uid()::text);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();