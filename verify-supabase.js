/**
 * SUPABASE VERIFICATION SCRIPT
 * Verifies that Supabase is properly configured and data is accessible
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase with anon key (same as client would use)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Verifying Supabase Configuration...\n');

// Check environment variables
console.log('📝 Environment Variables:');
console.log(`   VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log('');

async function verifyConnection() {
  try {
    // Test basic connection
    console.log('🔌 Testing Connection...');
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Connection successful!\n');
    return true;
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
}

async function verifyData() {
  try {
    console.log('📊 Verifying Migrated Data...\n');

    // Check users
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (usersError) {
      console.log('❌ Users query failed:', usersError.message);
    } else {
      console.log(`✅ Users: ${usersCount} record(s)`);
      if (users && users.length > 0) {
        console.log(`   Sample user: ${users[0].firebase_uid || users[0].id}`);
      }
    }

    // Check stores
    const { data: stores, error: storesError, count: storesCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact' });

    if (storesError) {
      console.log('❌ Stores query failed:', storesError.message);
    } else {
      console.log(`✅ Stores: ${storesCount} record(s)`);
      if (stores && stores.length > 0) {
        console.log(`   Sample store: ${stores[0].business_name}`);
      }
    }

    // Check products
    const { data: products, error: productsError, count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (productsError) {
      console.log('❌ Products query failed:', productsError.message);
    } else {
      console.log(`✅ Products: ${productsCount} record(s)`);
    }

    // Check sales
    const { data: sales, error: salesError, count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact' });

    if (salesError) {
      console.log('❌ Sales query failed:', salesError.message);
    } else {
      console.log(`✅ Sales: ${salesCount} record(s)`);
    }

    // Check expenses
    const { data: expenses, error: expensesError, count: expensesCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact' });

    if (expensesError) {
      console.log('❌ Expenses query failed:', expensesError.message);
    } else {
      console.log(`✅ Expenses: ${expensesCount} record(s)`);
    }

    console.log('\n📈 Summary:');
    console.log(`   Total records: ${(usersCount || 0) + (storesCount || 0) + (productsCount || 0) + (salesCount || 0) + (expensesCount || 0)}`);

  } catch (error) {
    console.log('❌ Data verification error:', error.message);
  }
}

async function verifyRLS() {
  try {
    console.log('\n🔒 Verifying Row Level Security...\n');

    // Try to access data without authentication (should be restricted)
    const { data: usersWithoutAuth, error } = await supabase
      .from('users')
      .select('*');

    if (error && error.code === 'PGRST301') {
      console.log('✅ RLS is working - unauthenticated access blocked');
    } else if (!usersWithoutAuth || usersWithoutAuth.length === 0) {
      console.log('✅ RLS is working - no data returned without auth');
    } else {
      console.log('⚠️  RLS may not be properly configured - got data without auth');
    }

    // Check public stores access (should work)
    const { data: publicStores, error: publicError } = await supabase
      .from('stores')
      .select('*')
      .eq('is_public', true);

    if (publicError) {
      console.log('⚠️  Public stores access failed:', publicError.message);
    } else {
      console.log(`✅ Public stores accessible: ${publicStores?.length || 0} store(s)`);
    }

  } catch (error) {
    console.log('❌ RLS verification error:', error.message);
  }
}

async function verifyFunctions() {
  try {
    console.log('\n⚡ Verifying Database Functions...\n');

    // This would require authentication, so we'll skip for now
    console.log('ℹ️  Database functions require authentication to test');
    console.log('   Functions available:');
    console.log('   - get_low_stock_products(user_id)');
    console.log('   - get_sales_summary(user_id, start_date, end_date)');
    console.log('   - refresh_daily_sales_summary()');

  } catch (error) {
    console.log('❌ Functions verification error:', error.message);
  }
}

async function main() {
  const connected = await verifyConnection();

  if (!connected) {
    console.log('\n❌ Cannot proceed - connection failed');
    process.exit(1);
  }

  await verifyData();
  await verifyRLS();
  await verifyFunctions();

  console.log('\n✅ Supabase verification complete!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Set up ImageKit account at https://imagekit.io/registration');
  console.log('   2. Update components to use Supabase hooks');
  console.log('   3. Test the application end-to-end');
  console.log('   4. Deploy to production\n');
}

main().catch(console.error);
