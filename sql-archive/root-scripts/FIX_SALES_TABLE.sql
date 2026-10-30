-- COPY AND PASTE THIS ENTIRE SQL INTO SUPABASE SQL EDITOR
-- Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- Add missing columns to sales table
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

-- Grant permissions
GRANT ALL ON sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sales TO anon;

-- Success message
SELECT 'Sales table fixed successfully!' AS message;