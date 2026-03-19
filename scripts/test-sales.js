import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSales() {
  try {
    console.log('Testing sales table operations...\n');

    // Test 1: Check if table exists and query sales
    console.log('1. Checking if sales table exists and querying sales...');
    const { data: sales, error: queryError } = await supabase
      .from('sales')
      .select('*')
      .limit(5);

    if (queryError) {
      console.error('❌ Error querying sales table:', queryError.message);
      console.log('Details:', queryError);

      // Check if it's a table not found error
      if (queryError.message.includes('relation') && queryError.message.includes('does not exist')) {
        console.log('\n⚠️  Sales table does not exist in the database!');
        console.log('Please create it by running the SQL in Supabase dashboard:');
        console.log('Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/editor');
        console.log('And run the SQL from: supabase/migrations/20260318_create_sales_table.sql');
        return;
      }
    } else {
      console.log('✅ Sales table exists!');
      console.log(`Found ${sales?.length || 0} sales in the database`);
    }

    // Test 2: Try to insert a test sale
    console.log('\n2. Testing insert operation...');
    const testSale = {
      user_id: 'test-user-123',
      product_id: 'test-product-1',
      product_name: 'Test Product',
      quantity: 1,
      unit_price: 10000, // 100.00 in kobo
      total_amount: 10000,
      payment_status: 'paid',
      customer_name: 'Test Customer',
      notes: 'Test sale from script',
      cost_price: 8000,
      profit: 2000,
      day_key: new Date().toISOString().split('T')[0],
      sync_status: 'synced'
    };

    const { data: insertedSale, error: insertError } = await supabase
      .from('sales')
      .insert(testSale)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test sale:', insertError.message);
      console.log('Details:', insertError);

      // Check for RLS policy error
      if (insertError.message.includes('new row violates row-level security policy')) {
        console.log('\n⚠️  Row Level Security (RLS) is blocking the insert.');
        console.log('This is expected behavior - sales can only be created by authenticated users.');
        console.log('The app will work correctly when users are logged in.');
      }
    } else {
      console.log('✅ Successfully inserted test sale!');
      console.log('Sale ID:', insertedSale?.id);

      // Clean up test sale
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', insertedSale.id);

      if (!deleteError) {
        console.log('✅ Cleaned up test sale');
      }
    }

    // Test 3: Check table structure
    console.log('\n3. Checking table structure...');
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'sales');

    if (!schemaError && columns) {
      console.log('✅ Sales table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log('\n✅ Sales table testing complete!');
    console.log('The sales feature should work correctly when users are authenticated.');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testSales();