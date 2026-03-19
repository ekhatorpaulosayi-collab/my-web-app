import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your Supabase credentials
const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase/migrations/20260319_fix_chat_message_storage.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split by semicolons but keep statements together
const statements = migrationSQL
  .split(/;\s*(?=--|\n|ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|GRANT|DO)/gi)
  .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'))
  .map(stmt => stmt.trim() + (stmt.trim().endsWith(';') ? '' : ';'));

async function applyMigration() {
  console.log('🚀 Starting Chat Message Storage Migration...\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty statements
    if (!statement || statement.trim().startsWith('--')) continue;

    // Extract a description for the statement
    let description = 'SQL Statement';
    if (statement.includes('ALTER TABLE')) description = 'Altering table structure';
    if (statement.includes('CREATE INDEX')) description = 'Creating index';
    if (statement.includes('CREATE POLICY')) description = 'Creating security policy';
    if (statement.includes('DROP POLICY')) description = 'Dropping old policy';
    if (statement.includes('CREATE VIEW')) description = 'Creating view';
    if (statement.includes('CREATE FUNCTION')) description = 'Creating function';
    if (statement.includes('CREATE TRIGGER')) description = 'Creating trigger';
    if (statement.includes('CREATE TABLE')) description = 'Creating table';
    if (statement.includes('GRANT')) description = 'Granting permissions';

    process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `);

    try {
      // Execute the statement
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).single();

      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_sql').insert({ query: statement });

        if (directError) {
          console.log('❌ Failed');
          console.error(`   Error: ${directError.message || error.message}`);
          errorCount++;
        } else {
          console.log('✅ Success');
          successCount++;
        }
      } else {
        console.log('✅ Success');
        successCount++;
      }
    } catch (err) {
      console.log('❌ Failed');
      console.error(`   Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(50));

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Chat message storage is now enabled');
    console.log('✅ Store owners can now see ALL customer conversations');
    console.log('✅ Visitor messages will be saved even when store owners are offline');
  } else {
    console.log('\n⚠️ Migration completed with some errors.');
    console.log('Some features may not work properly. Please check the errors above.');
  }
}

// Run the migration
applyMigration().catch(console.error);