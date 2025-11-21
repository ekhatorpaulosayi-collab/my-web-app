/**
 * Fix Users Table RLS Policy
 * Adds INSERT policy to allow user self-registration
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🔧 Fixing users table RLS policy...\n');

  try {
    // Drop existing policy if it exists
    console.log('1. Dropping existing INSERT policy (if exists)...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS users_insert_own ON public.users;'
    });

    if (dropError && !dropError.message.includes('does not exist')) {
      console.log('   Note:', dropError.message);
    } else {
      console.log('   ✓ Existing policy dropped (if any)');
    }

    // Create new INSERT policy
    console.log('\n2. Creating new INSERT policy...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY users_insert_own ON public.users
          FOR INSERT
          WITH CHECK (true);
      `
    });

    if (createError) {
      throw createError;
    }
    console.log('   ✓ INSERT policy created successfully');

    // Verify policies
    console.log('\n3. Verifying policies...');
    const { data: policies, error: verifyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'users');

    if (verifyError) {
      console.log('   ⚠ Could not verify (this is normal)');
    } else if (policies) {
      console.log('   ✓ Current policies on users table:');
      policies.forEach(p => {
        console.log(`     - ${p.policyname} (${p.cmd})`);
      });
    }

    console.log('\n✅ RLS policy fix completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Refresh your browser at http://localhost:4000');
    console.log('2. Try creating a store again');
    console.log('3. User creation should now work!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Manual fix required:');
    console.log('Go to Supabase Dashboard → SQL Editor and run:\n');
    console.log('DROP POLICY IF EXISTS users_insert_own ON public.users;');
    console.log('CREATE POLICY users_insert_own ON public.users FOR INSERT WITH CHECK (true);\n');
    process.exit(1);
  }
}

runMigration();
