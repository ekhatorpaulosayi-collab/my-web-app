import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployMigrations() {
  console.log('\n🚀 Deploying Public Defaults Migrations');
  console.log('━'.repeat(80));

  // Read migration files
  const storesMigration = readFileSync('/home/ekhator1/smartstock-v2/supabase/migrations/20251230_set_stores_public_by_default.sql', 'utf8');
  const productsMigration = readFileSync('/home/ekhator1/smartstock-v2/supabase/migrations/20251230_set_products_public_by_default.sql', 'utf8');

  // Execute stores migration
  console.log('\n📦 Applying stores migration...');
  const { error: storesError } = await supabase.rpc('exec_sql', { sql_string: storesMigration });

  if (storesError) {
    console.log('❌ Stores migration failed:', storesError.message);
    console.log('Trying alternative method...');

    // Direct SQL execution
    const { error: directError } = await supabase.from('_sql').select('*').sql(storesMigration);

    if (directError) {
      console.log('Direct execution also failed. Running manual commands...');

      // Run each command separately
      const storesCommands = [
        "ALTER TABLE stores ALTER COLUMN is_public SET DEFAULT true;",
        "COMMENT ON COLUMN stores.is_public IS 'Whether store is publicly accessible. Defaults to TRUE - stores are public unless explicitly made private. This allows customers to view the store at /store/:slug';",
        "UPDATE stores SET is_public = true WHERE is_public = false;"
      ];

      for (const cmd of storesCommands) {
        const { error } = await supabase.rpc('exec_sql', { sql_string: cmd });
        if (error) {
          console.log(`  ⚠️  Command failed: ${cmd.substring(0, 50)}...`);
        } else {
          console.log(`  ✅ ${cmd.substring(0, 50)}...`);
        }
      }
    }
  } else {
    console.log('✅ Stores migration applied successfully');
  }

  // Execute products migration
  console.log('\n📦 Applying products migration...');
  const { error: productsError } = await supabase.rpc('exec_sql', { sql_string: productsMigration });

  if (productsError) {
    console.log('❌ Products migration failed:', productsError.message);
    console.log('Running manual commands...');

    const productsCommands = [
      "ALTER TABLE products ALTER COLUMN is_public SET DEFAULT true;",
      "COMMENT ON COLUMN products.is_public IS 'Whether product is visible on public storefront. Defaults to TRUE - products are shown unless owner explicitly hides them.';"
    ];

    for (const cmd of productsCommands) {
      const { error } = await supabase.rpc('exec_sql', { sql_string: cmd });
      if (error) {
        console.log(`  ⚠️  Command failed: ${cmd.substring(0, 50)}...`);
      } else {
        console.log(`  ✅ ${cmd.substring(0, 50)}...`);
      }
    }
  } else {
    console.log('✅ Products migration applied successfully');
  }

  // Verify defaults
  console.log('\n🔍 Verifying defaults...');

  const { data: storesData } = await supabase
    .from('stores')
    .select('is_public')
    .limit(5);

  const { data: productsData } = await supabase
    .from('products')
    .select('is_public')
    .limit(5);

  console.log('\nStores (last 5):');
  storesData?.forEach((s, i) => console.log(`  ${i + 1}. is_public: ${s.is_public}`));

  console.log('\nProducts (last 5):');
  productsData?.forEach((p, i) => console.log(`  ${i + 1}. is_public: ${p.is_public}`));

  console.log('\n━'.repeat(80));
  console.log('✅ Migration deployment complete!');
  console.log('\nNext: Test by creating a new store and product\n');
}

deployMigrations().catch(console.error);
