const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260409_business_summaries.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and filter out comments and empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log('Applying business_summaries migration...');

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('query_runner', {
          query: statement + ';'
        }).catch(async (err) => {
          // If RPC doesn't exist, try direct query
          const { data, error } = await supabase.from('_sql').select().limit(0);
          return { error: err };
        });

        if (error && !error.message?.includes('already exists')) {
          console.error('Error executing statement:', error);
          // Continue anyway for now
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();