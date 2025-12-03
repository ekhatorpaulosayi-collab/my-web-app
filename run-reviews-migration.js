#!/usr/bin/env node

/**
 * Run Reviews Migration
 * Creates the product reviews database schema in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running Product Reviews Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250103_create_reviews.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration file');
    console.log('📊 Executing SQL...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(async () => {
      // If exec_sql doesn't exist, try direct execution (for newer Supabase versions)
      // We'll split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch(() => ({
            error: 'Cannot execute directly, manual migration needed'
          }));

          if (stmtError) {
            console.log('⚠️  Some statements require manual execution via Supabase dashboard');
            console.log('📋 Copy the SQL from: supabase/migrations/20250103_create_reviews.sql');
            console.log('📍 Run it in: Supabase Dashboard → SQL Editor\n');
            return { manualRequired: true };
          }
        }
      }

      return { data: true, error: null };
    });

    if (error) {
      console.log('⚠️  Automatic migration not available');
      console.log('');
      console.log('📋 Please run this migration manually:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
      console.log('2. Copy the SQL from: supabase/migrations/20250103_create_reviews.sql');
      console.log('3. Paste and run it in the SQL Editor');
      console.log('');
      console.log('The migration file creates:');
      console.log('  ✓ product_reviews table');
      console.log('  ✓ review_votes table');
      console.log('  ✓ product_review_stats table');
      console.log('  ✓ Automatic stat updates via triggers');
      console.log('  ✓ Row Level Security policies');
      console.log('');
      return;
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Created tables:');
    console.log('  ✓ product_reviews');
    console.log('  ✓ review_votes');
    console.log('  ✓ product_review_stats');
    console.log('  ✓ Triggers and RLS policies\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const { data: tables, error: verifyError } = await supabase
      .from('product_reviews')
      .select('id')
      .limit(1);

    if (!verifyError) {
      console.log('✅ Tables verified and ready!\n');
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📋 Please run the migration manually via Supabase Dashboard');
    process.exit(1);
  }
}

runMigration();
