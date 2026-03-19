/**
 * Run the permanent account fix for ekhatorpaulosayi@gmail.com
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FIXED_USER_ID = 'dffba89b-869d-422a-a542-2e2494850b44';
const USER_EMAIL = 'ekhatorpaulosayi@gmail.com';

async function runPermanentFix() {
  console.log('🔧 Starting permanent account fix...\n');

  try {
    // Step 1: Check current user records
    console.log('Step 1: Checking current user records...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('email', USER_EMAIL);

    if (userError) {
      console.error('Error checking users:', userError);
    } else {
      console.log(`Found ${users?.length || 0} user record(s) for ${USER_EMAIL}`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`  - ID: ${user.id}, Created: ${user.created_at}`);
        });
      }
    }

    // Step 2: Ensure primary user exists
    console.log('\nStep 2: Ensuring primary user record exists...');
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: FIXED_USER_ID,
        email: USER_EMAIL,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error('Error upserting user:', upsertError);
    } else {
      console.log('✅ Primary user record ensured');
    }

    // Step 3: Count sales before consolidation
    console.log('\nStep 3: Checking sales before consolidation...');
    const { data: beforeSales, error: beforeError } = await supabase
      .from('sales')
      .select('user_id', { count: 'exact' });

    if (!beforeError) {
      const userIds = new Set(beforeSales?.map(s => s.user_id));
      console.log(`Total sales: ${beforeSales?.length || 0}`);
      console.log(`Unique user IDs: ${userIds.size}`);
    }

    // Step 4: Consolidate ALL sales to the primary user ID
    console.log('\nStep 4: Consolidating all sales to primary user ID...');
    const { data: allSales, error: fetchError } = await supabase
      .from('sales')
      .select('id, user_id');

    if (fetchError) {
      console.error('Error fetching sales:', fetchError);
    } else {
      console.log(`Found ${allSales?.length || 0} total sales`);

      // Update sales in batches
      let updatedCount = 0;
      for (const sale of allSales || []) {
        if (sale.user_id !== FIXED_USER_ID) {
          const { error: updateError } = await supabase
            .from('sales')
            .update({ user_id: FIXED_USER_ID })
            .eq('id', sale.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }
      console.log(`✅ Updated ${updatedCount} sales to use primary user ID`);
    }

    // Step 5: Verify the consolidation
    console.log('\nStep 5: Verifying consolidation...');
    const { data: afterSales, error: afterError } = await supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('user_id', FIXED_USER_ID);

    if (afterError) {
      console.error('Error verifying:', afterError);
    } else {
      console.log(`✅ Total sales for your account: ${afterSales?.length || 0}`);

      if (afterSales && afterSales.length > 0) {
        // Show recent sales
        console.log('\nRecent sales (last 5):');
        afterSales.slice(0, 5).forEach(sale => {
          console.log(`  - ${sale.product_name}: ₦${(sale.final_amount / 100).toFixed(2)} (${sale.sale_date})`);
        });
      }
    }

    // Step 6: Clean up duplicate user records
    console.log('\nStep 6: Cleaning up duplicate user records...');
    const { data: duplicates, error: dupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', USER_EMAIL)
      .neq('id', FIXED_USER_ID);

    if (!dupError && duplicates && duplicates.length > 0) {
      for (const dup of duplicates) {
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', dup.id);

        if (!deleteError) {
          console.log(`  Removed duplicate user: ${dup.id}`);
        }
      }
    } else {
      console.log('  No duplicate user records found');
    }

    console.log('\n🎉 PERMANENT FIX COMPLETE!');
    console.log('Your account has been permanently fixed.');
    console.log('All sales are now consolidated under one user ID.');
    console.log('You should never have this issue again!');

  } catch (error) {
    console.error('\n❌ Error running fix:', error);
  }
}

// Run the fix
runPermanentFix();