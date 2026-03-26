#!/usr/bin/env node

/**
 * Script to fix the initiate_agent_takeover function overloading issue
 * Run with: node apply-takeover-fix.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Fixing initiate_agent_takeover function overloading issue...\n');

  try {
    // Read the SQL file
    const sqlContent = readFileSync('./fix-takeover-function.sql', 'utf8');

    // Split by semicolons and filter out empty statements
    const statements = sqlContent
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip pure comment lines
      if (statement.trim().startsWith('--')) continue;

      // Get first line for logging
      const firstLine = statement.split('\n')[0].substring(0, 50);
      console.log(`Executing: ${firstLine}...`);

      // Execute using raw SQL
      const { error } = await supabase.rpc('query', { sql: statement });

      if (error) {
        // Try direct execution as alternative
        console.log('⚠️  Standard execution failed, trying alternative method...');

        // For DROP and CREATE statements, we need to handle them differently
        if (statement.includes('DROP FUNCTION') || statement.includes('CREATE FUNCTION')) {
          console.log('⚠️  Function DDL statements need to be run directly in Supabase dashboard');
          console.log('   Copy the SQL from fix-takeover-function.sql and run in SQL Editor');
        } else {
          throw error;
        }
      } else {
        console.log('✅ Success\n');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 FIX APPLICATION SUMMARY');
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT: Some statements may need manual execution\n');
    console.log('If the function fixes didn\'t apply automatically:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy the contents of fix-takeover-function.sql');
    console.log('3. Paste and run the SQL\n');
    console.log('The fallback code in ConversationsPageFixed.tsx will handle');
    console.log('the error gracefully until the database function is fixed.\n');

  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    console.log('\n💡 Manual Fix Instructions:');
    console.log('1. Copy the SQL from fix-takeover-function.sql');
    console.log('2. Go to your Supabase dashboard');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Paste and execute the SQL');
  }
}

// Alternative: Direct connection method (if you have connection string)
async function applyFixDirectly() {
  console.log('\n📝 Alternative Method: Direct Database Fix\n');
  console.log('Run this SQL directly in Supabase SQL Editor:\n');

  const sql = readFileSync('./fix-takeover-function.sql', 'utf8');
  console.log('```sql');
  console.log(sql);
  console.log('```');
}

// Run the fix
console.log('🚀 Starting Takeover Function Fix\n');
console.log('This will resolve the function overloading error');
console.log('that prevents agent takeover from working.\n');

applyFix().then(() => {
  console.log('\n✅ Process completed!');
  console.log('\nNext steps:');
  console.log('1. Test the takeover functionality');
  console.log('2. Check that only ONE "agent joined" message appears');
  console.log('3. Verify the WhatsApp fallback timer works');

  // Also show the direct method
  applyFixDirectly();
});