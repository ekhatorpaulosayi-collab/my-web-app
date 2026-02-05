/**
 * Fix Store Visibility Issue
 *
 * This script fixes stores that have enable_online_store = true but is_public = false
 * This mismatch causes the "Store not found" error for visitors.
 *
 * Run with: node fix-store-visibility.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStoreVisibility() {
  console.log('🔍 Checking for affected stores...\n');

  try {
    // Find all stores where is_public = false or null (but have a store_slug)
    const { data: affectedStores, error: fetchError} = await supabase
      .from('stores')
      .select('id, business_name, store_slug, is_public, user_id')
      .not('store_slug', 'is', null)
      .or('is_public.is.null,is_public.eq.false');

    if (fetchError) {
      console.error('❌ Error fetching stores:', fetchError);
      return;
    }

    if (!affectedStores || affectedStores.length === 0) {
      console.log('✅ No affected stores found. All stores are properly configured!');
      return;
    }

    console.log(`📋 Found ${affectedStores.length} affected store(s):\n`);

    affectedStores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.business_name || 'Unnamed Store'}`);
      console.log(`   - Slug: ${store.store_slug || 'No slug'}`);
      console.log(`   - is_public: ${store.is_public}`);
      console.log(`   - Store ID: ${store.id}`);
      console.log('');
    });

    console.log('🔧 Fixing stores...\n');

    // Update all affected stores to set is_public = true
    // Update each store individually to avoid query complexity
    const updatedStores = [];

    for (const store of affectedStores) {
      const { data, error } = await supabase
        .from('stores')
        .update({ is_public: true })
        .eq('id', store.id)
        .select();

      if (error) {
        console.error(`   ❌ Error updating ${store.business_name}:`, error.message);
      } else if (data && data.length > 0) {
        updatedStores.push(data[0]);
      }
    }

    const updateError = updatedStores.length === 0 && affectedStores.length > 0;

    if (updateError) {
      console.error('❌ Error updating stores:', updateError);
      return;
    }

    console.log(`✅ Successfully fixed ${updatedStores?.length || 0} store(s)!\n`);

    if (updatedStores && updatedStores.length > 0) {
      console.log('📊 Updated stores:');
      updatedStores.forEach((store, index) => {
        const storeUrl = `https://www.storehouse.ng/store/${store.store_slug}`;
        console.log(`${index + 1}. ${store.business_name}`);
        console.log(`   ✓ is_public now set to: ${store.is_public}`);
        console.log(`   🔗 Store URL: ${storeUrl}`);
        console.log('');
      });
    }

    console.log('✨ All done! Stores should now be visible to visitors.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixStoreVisibility();
