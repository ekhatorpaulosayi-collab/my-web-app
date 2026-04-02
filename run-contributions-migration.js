#!/usr/bin/env node

/**
 * Script to run the contributions migration in Supabase
 * This creates the required tables for the contribution/money book feature
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required to run migrations');
  console.error('Please set it in your .env file or as an environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting contribution tables migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260331_contributions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Read migration file:', migrationPath);

    // Split the SQL into individual statements (basic split, may need refinement)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Extract a description from the statement
      let description = statement.substring(0, 50).replace(/\n/g, ' ');
      if (statement.length > 50) description += '...';

      console.log(`[${i + 1}/${statements.length}] Executing: ${description}`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();

      if (error) {
        // Check if it's a "already exists" error which we can ignore
        if (error.message?.includes('already exists') || error.code === '42P07') {
          console.log(`   ⚠️  Already exists (skipping)`);
          successCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          console.error(`      Code: ${error.code}`);
          console.error(`      Details: ${error.details}`);
          errorCount++;
        }
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Migration completed:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 All migration statements executed successfully!');
    } else {
      console.log('\n⚠️  Some statements failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Alternative: Direct execution without RPC
async function runMigrationDirect() {
  console.log('🚀 Running contribution tables migration (direct mode)...\n');

  try {
    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('contribution_groups')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Tables already exist! Migration was previously run.');
      return;
    }

    if (checkError.code !== '42P01') { // 42P01 = table does not exist
      console.error('❌ Unexpected error checking tables:', checkError);
      return;
    }

    console.log('📊 Tables do not exist. Creating them now...\n');

    // Since we can't directly execute DDL through Supabase client,
    // we'll provide instructions for the user
    console.log('⚠️  IMPORTANT: The tables need to be created in Supabase Dashboard\n');
    console.log('Please follow these steps:');
    console.log('1. Go to https://app.supabase.com/project/yzlniqwzqlsftxrtapdl/sql/new');
    console.log('2. Copy the contents of: supabase/migrations/20260331_contributions.sql');
    console.log('3. Paste it into the SQL editor');
    console.log('4. Click "Run" to execute the migration');
    console.log('\nAlternatively, if you have the Supabase CLI installed:');
    console.log('   supabase db push');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Run the migration
console.log('SmartStock Contribution Tables Migration');
console.log('=' + '='.repeat(59) + '\n');

runMigrationDirect();