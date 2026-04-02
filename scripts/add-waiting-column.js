#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Adding waiting_for_owner_since column to ai_chat_conversations table...');

  // Since we can't run direct SQL via the JS client, we need to check if the column exists first
  // Try to query the column to see if it exists
  const { data, error } = await supabase
    .from('ai_chat_conversations')
    .select('id, waiting_for_owner_since')
    .limit(1);

  if (error && error.message.includes('does not exist')) {
    console.log('Column does not exist yet. Please add it via the Supabase dashboard SQL editor:');
    console.log('\n--- Copy and run this SQL in Supabase Dashboard ---\n');
    console.log(`
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS waiting_for_owner_since TIMESTAMPTZ;

-- Add index for queries filtering by waiting status
CREATE INDEX IF NOT EXISTS idx_chat_waiting_for_owner
ON ai_chat_conversations(waiting_for_owner_since)
WHERE waiting_for_owner_since IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_chat_conversations.waiting_for_owner_since IS
  'Timestamp when customer requested to speak with store owner - used for WhatsApp fallback timer calculation';

-- Grant permissions
GRANT UPDATE (waiting_for_owner_since) ON ai_chat_conversations TO authenticated;
GRANT SELECT (waiting_for_owner_since) ON ai_chat_conversations TO anon;
    `);
    console.log('\n--- End of SQL ---\n');
    console.log('Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');
  } else if (!error) {
    console.log('Column already exists!');
  } else {
    console.error('Error checking column:', error);
  }
}

runMigration().catch(console.error);