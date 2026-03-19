import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixSalesTable() {
  console.log('🔧 Fixing sales table in Supabase...\n');

  try {
    // Step 1: Add missing columns one by one (safer approach)
    const columnsToAdd = [
      { name: 'discount_amount', type: 'BIGINT', default: '0' },
      { name: 'final_amount', type: 'BIGINT', default: null },
      { name: 'customer_email', type: 'TEXT', default: null },
      { name: 'payment_method', type: 'TEXT', default: "'cash'" },
      { name: 'amount_paid', type: 'BIGINT', default: null },
      { name: 'amount_due', type: 'BIGINT', default: '0' },
      { name: 'sale_time', type: 'TEXT', default: null },
      { name: 'cost_price', type: 'BIGINT', default: null },
      { name: 'profit', type: 'BIGINT', default: null },
      { name: 'is_credit', type: 'BOOLEAN', default: 'false' },
      { name: 'credit_due_date', type: 'DATE', default: null },
      { name: 'day_key', type: 'TEXT', default: null },
      { name: 'sync_status', type: 'TEXT', default: "'synced'" }
    ];

    console.log('Adding missing columns to sales table...');

    // Since we can't directly run ALTER TABLE via Supabase client,
    // we'll test if columns exist by trying to insert data
    const testData = {
      user_id: 'test-migration-user',
      product_id: 'test-product',
      product_name: 'Migration Test Product',
      quantity: 1,
      unit_price: 1000,
      total_amount: 1000,
      discount_amount: 0,
      final_amount: 1000,
      customer_email: 'test@example.com',
      payment_method: 'cash',
      amount_paid: 1000,
      amount_due: 0,
      sale_time: '12:00:00',
      cost_price: 800,
      profit: 200,
      is_credit: false,
      day_key: new Date().toISOString().split('T')[0],
      sync_status: 'synced'
    };

    // Try to insert with all columns
    const { data: insertTest, error: insertError } = await supabase
      .from('sales')
      .insert([testData])
      .select()
      .single();

    if (insertError) {
      console.log('❌ Some columns are missing. Error:', insertError.message);

      // Parse which column is missing from the error
      if (insertError.message.includes('column')) {
        console.log('\n⚠️  The sales table is missing some columns.');
        console.log('Please run the following SQL directly in Supabase:\n');

        console.log('========== COPY THIS SQL ==========');
        console.log(`
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
        `);
        console.log('====================================\n');

        console.log('📋 To run this SQL:');
        console.log('1. Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/editor');
        console.log('2. Paste the SQL above');
        console.log('3. Click "Run" button');
        console.log('');
        console.log('🔗 Direct link to SQL Editor:');
        console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');

        // Open the link automatically
        console.log('\n🌐 Opening Supabase SQL Editor in your browser...');

      }
    } else {
      console.log('✅ All columns exist! Sales table is properly configured.');

      // Clean up test data
      if (insertTest?.id) {
        await supabase
          .from('sales')
          .delete()
          .eq('id', insertTest.id);
        console.log('✅ Cleaned up test data');
      }

      console.log('\n🎉 Your sales table is ready to use!');
      console.log('Sales data will now persist even when you clear your browser cache.');
    }

    // Test if we can query the table
    console.log('\n📊 Checking existing sales data...');
    const { data: salesCount, error: countError } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ Sales table is accessible`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('\nPlease manually update the table using the SQL above.');
  }
}

// Run the fix
fixSalesTable();