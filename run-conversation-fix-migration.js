// Run migration to fix ai_chat_conversations table
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Running migration to fix ai_chat_conversations table...\n');

  // Read the migration SQL
  const migrationSQL = fs.readFileSync('./supabase/migrations/20260322_fix_ai_chat_conversations.sql', 'utf-8');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);

      // If RPC doesn't exist, try running the SQL directly
      console.log('\n🔧 Attempting to run migration queries directly...');

      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('CREATE POLICY')) {
          console.log('\n📝 Running:', statement.substring(0, 50) + '...');
          // Note: We can't execute DDL directly through Supabase client, need to use SQL editor
        }
      }

      console.log('\n⚠️ Please run the following migration in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');
      console.log('\nCopy and paste the contents of:');
      console.log('./supabase/migrations/20260322_fix_ai_chat_conversations.sql');
    } else {
      console.log('✅ Migration completed successfully!');
    }

    // Check if table exists now
    console.log('\n🔍 Verifying table structure...');
    const { data: tableCheck, error: checkError } = await supabase
      .from('ai_chat_conversations')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('❌ Table ai_chat_conversations does not exist');
      console.log('⚠️ Please run the migration manually in SQL Editor');
    } else if (!checkError) {
      console.log('✅ Table ai_chat_conversations exists and is accessible');
    } else {
      console.log('⚠️ Table check returned:', checkError?.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the migration
runMigration().catch(console.error);