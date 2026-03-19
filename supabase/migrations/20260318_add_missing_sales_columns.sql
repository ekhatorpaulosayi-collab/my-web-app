-- Add missing columns to sales table
-- Run this in Supabase SQL Editor at: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/editor

-- Add missing columns that the application needs
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS discount_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount BIGINT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS amount_paid BIGINT,
ADD COLUMN IF NOT EXISTS amount_due BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_time TEXT,
ADD COLUMN IF NOT EXISTS cost_price BIGINT,
ADD COLUMN IF NOT EXISTS profit BIGINT,
ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_due_date DATE,
ADD COLUMN IF NOT EXISTS day_key TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_customer_email ON sales(customer_email);
CREATE INDEX IF NOT EXISTS idx_sales_final_amount ON sales(final_amount);

-- Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT ALL ON sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sales TO anon;