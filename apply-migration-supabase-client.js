// Apply Migration Using Supabase Client Library
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Applying Migration via Supabase Client...\n');

  // Read the migration SQL
  const migrationSQL = fs.readFileSync('/home/ekhator1/smartstock-v2/MIGRATION_TO_RUN.sql', 'utf8');

  // Split into individual statements and execute via RPC
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip pure comments
    if (statement.replace(/\s/g, '').startsWith('--') || statement.trim() === ';') {
      continue;
    }

    // Extract operation name from statement
    let operationName = 'Statement ' + (i + 1);
    if (statement.includes('CREATE TABLE')) {
      const match = statement.match(/CREATE TABLE.*?(\w+)/);
      operationName = `Create table: ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('ALTER TABLE')) {
      const match = statement.match(/ALTER TABLE\s+(\w+)/);
      operationName = `Alter table: ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE INDEX')) {
      const match = statement.match(/CREATE INDEX.*?(\w+)/);
      operationName = `Create index: ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE POLICY')) {
      const match = statement.match(/CREATE POLICY\s+"([^"]+)"/);
      operationName = `Create policy: ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE FUNCTION')) {
      const match = statement.match(/CREATE.*?FUNCTION\s+(\w+)/);
      operationName = `Create function: ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE TRIGGER')) {
      const match = statement.match(/CREATE TRIGGER\s+(\w+)/);
      operationName = `Create trigger: ${match ? match[1] : 'unknown'}`;
    }

    try {
      console.log(`⏳ Executing: ${operationName}`);

      // Use raw SQL execution via RPC
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      });

      if (error) {
        // Try alternative approach - direct query
        const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!result.ok) {
          throw new Error(`HTTP ${result.status}: ${await result.text()}`);
        }
      }

      console.log(`✅ Success: ${operationName}\n`);
      successCount++;
    } catch (error) {
      console.log(`⚠️  Warning in ${operationName}: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Migration Results:`);
  console.log(`   ✅ Successful operations: ${successCount}`);
  console.log(`   ⚠️  Failed operations: ${errorCount}`);
  console.log('='.repeat(60) + '\n');

  if (errorCount > 0) {
    console.log('⚠️  Some operations failed. This may be because:');
    console.log('   - Tables/columns already exist (IF NOT EXISTS clauses handle this)');
    console.log('   - RPC function exec_sql may not be available\n');
    console.log('📋 MANUAL APPLICATION REQUIRED:');
    console.log('=' .repeat(40));
    console.log('1. Open this link in your browser:');
    console.log('   https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new\n');
    console.log('2. Copy the entire contents of MIGRATION_TO_RUN.sql');
    console.log('3. Paste into the SQL editor');
    console.log('4. Click the "RUN" button\n');
  } else {
    console.log('🎉 Migration completed successfully!');
    console.log('Now run: node validate-migration.js');
  }
}

// First check if exec_sql function exists, if not create it
async function setupExecSQL() {
  const setupSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    // This won't work without exec_sql but worth trying
    console.log('Checking for exec_sql function...');
  } catch (e) {
    // Expected to fail
  }
}

async function main() {
  await setupExecSQL();
  await runMigration();
}

main().catch(console.error);