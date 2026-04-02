#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials
const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 Starting Contribution Tables Migration\n');
console.log('=' .repeat(60));

// Read the migration SQL file
const migrationPath = path.join(__dirname, 'supabase/migrations/20260331_contributions.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split SQL into individual statements
const statements = migrationSQL
  .split(/;[\s]*$/gm)  // Split by semicolon at end of line
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n📊 Found ${statements.length} SQL statements to execute\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

// Since Supabase client can't execute DDL directly, we'll use a workaround
// We'll create the tables by attempting operations and handling errors

async function runMigration() {
  try {
    // Test if tables already exist
    console.log('Checking if tables already exist...\n');

    const { error: checkError } = await supabase
      .from('contribution_groups')
      .select('id')
      .limit(1);

    if (!checkError || checkError.code !== 'PGRST116') {
      console.log('✅ Tables appear to already exist!');

      // Verify all tables
      const tables = [
        'contribution_groups',
        'contribution_members',
        'contribution_payments',
        'contribution_payouts'
      ];

      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === 'PGRST116') {
          console.log(`❌ Table ${table} does NOT exist`);
        } else {
          console.log(`✅ Table ${table} exists`);
        }
      }

      return;
    }

    console.log('❌ Tables do not exist. Creating them now...\n');
    console.log('Since we cannot execute DDL through the Supabase client,');
    console.log('I will create a SQL file for you to run.\n');

    // Write the SQL to a file
    const outputPath = path.join(__dirname, 'CREATE_TABLES.sql');
    fs.writeFileSync(outputPath, migrationSQL);

    console.log(`✅ Migration SQL saved to: ${outputPath}\n`);
    console.log('📋 INSTRUCTIONS TO COMPLETE MIGRATION:');
    console.log('=====================================\n');
    console.log('Option 1: Supabase Dashboard (Easiest)');
    console.log('--------------------------------------');
    console.log('1. Copy the contents of CREATE_TABLES.sql');
    console.log('2. Go to: https://app.supabase.com/project/yzlniqwzqlsftxrtapdl/sql/new');
    console.log('3. Paste the SQL and click "Run"\n');

    console.log('Option 2: Using Supabase CLI');
    console.log('----------------------------');
    console.log('Run: npx supabase db push --db-url "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"\n');

    // Also output the SQL to console for easy copying
    console.log('Option 3: Copy SQL from below');
    console.log('-----------------------------');
    console.log('Copy this SQL and run it in Supabase:\n');
    console.log('```sql');
    console.log(migrationSQL);
    console.log('```');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();