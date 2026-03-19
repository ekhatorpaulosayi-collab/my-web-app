/**
 * Test script to verify Supabase sales save/load functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

console.log('=== SUPABASE SALES TEST ===');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSales() {
  try {
    // Test 1: Create a test sale
    console.log('\n1. Creating test sale...');
    const testSale = {
      user_id: 'test-user-' + Date.now(),
      product_id: 'test-product-123',
      product_name: 'Test Product',
      quantity: 1,
      unit_price: 1000,
      total_amount: 1000,
      final_amount: 1000,
      payment_method: 'cash',
      sale_date: new Date().toISOString().split('T')[0],
      sale_time: new Date().toTimeString().split(' ')[0]
    };

    const { data: createdSale, error: createError } = await supabase
      .from('sales')
      .insert([testSale])
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create sale:', createError);
      console.error('Error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      });
    } else {
      console.log('✅ Sale created successfully!');
      console.log('Sale ID:', createdSale.id);
      console.log('User ID:', createdSale.user_id);
    }

    // Test 2: Read the sale back
    console.log('\n2. Reading sales back...');
    const { data: sales, error: readError } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', testSale.user_id)
      .order('created_at', { ascending: false });

    if (readError) {
      console.error('❌ Failed to read sales:', readError);
    } else {
      console.log('✅ Found', sales.length, 'sales');
      if (sales.length > 0) {
        console.log('First sale:', {
          id: sales[0].id,
          product_name: sales[0].product_name,
          user_id: sales[0].user_id
        });
      }
    }

    // Test 3: Check if RLS is enabled
    console.log('\n3. Checking RLS status...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('check_rls_status', { table_name: 'sales' })
      .single();

    if (tableError) {
      console.log('Could not check RLS status (function may not exist)');
    } else {
      console.log('RLS Status:', tableInfo);
    }

    // Test 4: Clean up test data
    if (createdSale) {
      console.log('\n4. Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', createdSale.id);

      if (deleteError) {
        console.error('❌ Failed to delete test sale:', deleteError);
      } else {
        console.log('✅ Test sale deleted');
      }
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Summary:');
    console.log('- Can create sales:', !createError ? 'YES ✅' : 'NO ❌');
    console.log('- Can read sales:', !readError ? 'YES ✅' : 'NO ❌');
    console.log('- Sales persist:', createdSale && sales && sales.length > 0 ? 'YES ✅' : 'NO ❌');

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testSales();