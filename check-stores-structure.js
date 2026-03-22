import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Checking stores table structure and data...\n');
console.log('=' .repeat(50));

async function checkStoresStructure() {
  try {
    // Step 1: Get all stores with their usernames
    console.log('\n📋 Fetching all stores with related user data...');

    const { data: stores, error } = await supabase
      .from('stores')
      .select(`
        id,
        business_name,
        user_id,
        created_at,
        store_url,
        username,
        custom_domain
      `)
      .limit(10);

    if (error) {
      console.log('Error fetching stores:', error.message);

      // Try simpler query
      console.log('\n📋 Trying simpler query...');
      const { data: simpleStores, error: simpleError } = await supabase
        .from('stores')
        .select('*')
        .limit(10);

      if (simpleError) {
        console.log('Simple query error:', simpleError.message);
      } else if (simpleStores) {
        console.log(`Found ${simpleStores.length} stores`);
        console.log('\nStore columns:', Object.keys(simpleStores[0] || {}));

        simpleStores.forEach(store => {
          console.log(`\n  Store: ${store.business_name}`);
          console.log(`    ID: ${store.id}`);
          console.log(`    User ID: ${store.user_id}`);
          console.log(`    Username: ${store.username || 'N/A'}`);
          console.log(`    Store URL: ${store.store_url || 'N/A'}`);
          console.log(`    Custom Domain: ${store.custom_domain || 'N/A'}`);
        });
      }
      return;
    }

    if (stores && stores.length > 0) {
      console.log(`\nFound ${stores.length} stores:`);

      stores.forEach(store => {
        console.log(`\n  Business: ${store.business_name}`);
        console.log(`    Store ID: ${store.id}`);
        console.log(`    User ID: ${store.user_id}`);
        console.log(`    Username: ${store.username || 'N/A'}`);
        console.log(`    Store URL: ${store.store_url || 'N/A'}`);
        console.log(`    Custom Domain: ${store.custom_domain || 'N/A'}`);
      });

      // Step 2: Look for a store that might match "paul-pahhggygggffffg"
      console.log('\n📋 Looking for stores that might match "paul-pahhggygggffffg"...');

      const possibleMatches = stores.filter(store => {
        const username = store.username?.toLowerCase() || '';
        const businessName = store.business_name?.toLowerCase() || '';
        const storeUrl = store.store_url?.toLowerCase() || '';

        return username.includes('paul') ||
               businessName.includes('paul') ||
               storeUrl.includes('paul') ||
               username.includes('pahhggygggffffg');
      });

      if (possibleMatches.length > 0) {
        console.log(`\nFound ${possibleMatches.length} possible matches:`);
        possibleMatches.forEach(store => {
          console.log(`  - ${store.business_name} (Username: ${store.username}, ID: ${store.id})`);
        });
      } else {
        console.log('\nNo stores found matching "paul" pattern');
      }

      // Step 3: Check users table for username
      console.log('\n📋 Checking users table for "paul-pahhggygggffffg"...');
      const { data: users } = await supabase
        .from('users')
        .select('id, email, username, full_name')
        .or('username.ilike.%paul%,username.eq.paul-pahhggygggffffg')
        .limit(10);

      if (users && users.length > 0) {
        console.log(`\nFound ${users.length} users with "paul" in username:`);
        users.forEach(user => {
          console.log(`  - ${user.username || user.email} (ID: ${user.id})`);
        });

        // Check if any of these users have stores
        for (const user of users) {
          const { data: userStore } = await supabase
            .from('stores')
            .select('id, business_name, username')
            .eq('user_id', user.id)
            .single();

          if (userStore) {
            console.log(`    └─> Has store: ${userStore.business_name} (Store username: ${userStore.username})`);
          }
        }
      } else {
        console.log('\nNo users found with "paul" in username');
      }

    } else {
      console.log('No stores found in database');
    }

    // Step 4: Check how the edge function resolves store slugs
    console.log('\n📋 The edge function expects a "storeSlug" parameter');
    console.log('It looks for stores by username field, not slug');
    console.log('\n❗ IMPORTANT: The URL path "paul-pahhggygggffffg" should match the store.username field');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkStoresStructure();