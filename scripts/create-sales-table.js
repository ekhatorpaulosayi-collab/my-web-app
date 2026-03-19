import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSalesTable() {
  try {
    console.log('Creating sales table in Supabase...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (error) {
      // If exec_sql doesn't exist, try a different approach
      console.log('exec_sql not available, trying direct query...');

      // Check if table exists first
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'sales');

      if (!tables || tables.length === 0) {
        console.log('Sales table does not exist. Please create it manually in Supabase dashboard.');
        console.log('Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/editor');
        console.log('And run the SQL from: supabase/migrations/20260318_create_sales_table.sql');
      } else {
        console.log('Sales table already exists!');
      }
    } else {
      console.log('Sales table created successfully!');
    }

    // Test the table
    const { data: testData, error: testError } = await supabase
      .from('sales')
      .select('count');

    if (testError) {
      console.error('Error accessing sales table:', testError);
    } else {
      console.log('Sales table is accessible!');
    }

  } catch (err) {
    console.error('Error:', err);
    console.log('\nPlease manually create the sales table in Supabase:');
    console.log('1. Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/editor');
    console.log('2. Run the SQL from: supabase/migrations/20260318_create_sales_table.sql');
  }
}

createSalesTable();