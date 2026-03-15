/**
 * Migration Runner - Add store_type column to users table
 * Run this once: node run-migration.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting migration: Add store_type column to users table...\n');

  try {
    // Step 1: Add store_type column
    console.log('Step 1: Adding store_type column...');
    const { data: addColumnData, error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS store_type TEXT
        CHECK (store_type IN ('fashion', 'electronics', 'food', 'pharmacy', 'general'));
      `
    });

    if (addColumnError) {
      // Try alternative method using direct SQL
      console.log('Trying alternative method...');

      const { error: directError } = await supabase.from('users').select('store_type').limit(1);

      if (directError && directError.message.includes('column "store_type" does not exist')) {
        console.error('❌ Column does not exist and cannot be created via API');
        console.log('\n📝 Please run this SQL manually in Supabase Dashboard:');
        console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new\n');
        console.log('```sql');
        console.log('ALTER TABLE public.users');
        console.log('ADD COLUMN IF NOT EXISTS store_type TEXT');
        console.log("  CHECK (store_type IN ('fashion', 'electronics', 'food', 'pharmacy', 'general'));");
        console.log('');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_store_type ON public.users(store_type);');
        console.log('```\n');
        return;
      } else {
        console.log('✅ Column already exists or was created successfully!');
      }
    } else {
      console.log('✅ Column added successfully!');
    }

    // Step 2: Verify column exists
    console.log('\nStep 2: Verifying column exists...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('id, email, store_type')
      .limit(1);

    if (verifyError) {
      console.error('❌ Error verifying column:', verifyError.message);
      console.log('\n📝 Please run the SQL manually in Supabase Dashboard (link above)');
      return;
    }

    console.log('✅ Column verified successfully!');

    // Step 3: Show current stats
    console.log('\nStep 3: Checking migration status...');
    const { data: statsData, count } = await supabase
      .from('users')
      .select('store_type', { count: 'exact' })
      .not('store_type', 'is', null);

    console.log(`📊 Users with store_type set: ${count || 0}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🔄 Next steps:');
    console.log('1. Log out of your app');
    console.log('2. Log back in');
    console.log('3. Your business type will auto-migrate from localStorage to database');
    console.log('4. You should NOT see the modal anymore!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new\n');
    console.log('```sql');
    console.log('ALTER TABLE public.users');
    console.log('ADD COLUMN IF NOT EXISTS store_type TEXT');
    console.log("  CHECK (store_type IN ('fashion', 'electronics', 'food', 'pharmacy', 'general'));");
    console.log('');
    console.log('CREATE INDEX IF NOT EXISTS idx_users_store_type ON public.users(store_type);');
    console.log('```');
  }

  process.exit(0);
}

runMigration();
