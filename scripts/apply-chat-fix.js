import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials
const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Applying chat visibility fix...\n');

  const sqlCommands = [
    // Drop existing policies
    `DROP POLICY IF EXISTS "Users can view their own messages" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Enable read access for all users" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Enable update for users based on user_id" ON ai_chat_messages`,

    // Create new comprehensive policies
    `CREATE POLICY "Anyone can view messages in public conversations" ON ai_chat_messages FOR SELECT USING (true)`,
    `CREATE POLICY "Authenticated users can insert messages" ON ai_chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)`,
    `CREATE POLICY "Agents can update messages" ON ai_chat_messages FOR UPDATE USING (agent_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'))`,

    // Drop and recreate conversation policies
    `DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_chat_conversations`,
    `DROP POLICY IF EXISTS "Enable read access for all users" ON ai_chat_conversations`,
    `CREATE POLICY "Anyone can view conversations" ON ai_chat_conversations FOR SELECT USING (true)`,
    `CREATE POLICY "Anyone can create conversations" ON ai_chat_conversations FOR INSERT WITH CHECK (true)`,
    `CREATE POLICY "Agents can update conversations" ON ai_chat_conversations FOR UPDATE USING (agent_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'))`,

    // Add missing columns
    `ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT false`,
    `ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id)`,
    `ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'customer'`,
    `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS takeover_status TEXT DEFAULT 'ai'`,
    `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS is_agent_active BOOLEAN DEFAULT false`,
    `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id)`,

    // Enable RLS
    `ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai_chat_messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON ai_chat_messages(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_is_agent ON ai_chat_messages(is_agent_message)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON ai_chat_conversations(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_takeover_status ON ai_chat_conversations(takeover_status)`,

    // Grant permissions
    `GRANT USAGE ON SCHEMA public TO anon, authenticated`,
    `GRANT ALL ON ai_chat_messages TO anon, authenticated`,
    `GRANT ALL ON ai_chat_conversations TO anon, authenticated`
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const sql of sqlCommands) {
    try {
      console.log(`Executing: ${sql.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec', { sql });

      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_sql').insert({ query: sql });

        if (directError) {
          console.error(`  ❌ Error: ${directError.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }
      } else {
        console.log(`  ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      errorCount++;
    }
  }

  // Create or replace the send_agent_message function
  const functionSql = `
CREATE OR REPLACE FUNCTION send_agent_message(
  p_conversation_id UUID,
  p_message TEXT,
  p_agent_id UUID DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_message_id UUID;
  v_agent_id UUID;
BEGIN
  v_agent_id := COALESCE(p_agent_id, auth.uid());

  INSERT INTO ai_chat_messages (
    conversation_id,
    role,
    content,
    is_agent_message,
    agent_id,
    sender_type,
    created_at
  ) VALUES (
    p_conversation_id,
    'assistant',
    p_message,
    true,
    v_agent_id,
    'agent',
    NOW()
  ) RETURNING id INTO v_message_id;

  UPDATE ai_chat_conversations
  SET
    takeover_status = 'agent',
    is_agent_active = true,
    agent_id = v_agent_id,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id,
    'conversation_id', p_conversation_id,
    'agent_id', v_agent_id,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`;

  try {
    console.log(`\nCreating send_agent_message function...`);
    const { error } = await supabase.rpc('exec', { sql: functionSql });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Success`);
      successCount++;
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    errorCount++;
  }

  // Grant execute permission on function
  try {
    console.log(`Granting permissions on send_agent_message...`);
    const { error } = await supabase.rpc('exec', {
      sql: `GRANT EXECUTE ON FUNCTION send_agent_message TO anon, authenticated`
    });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Success`);
      successCount++;
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    errorCount++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successful operations: ${successCount}`);
  console.log(`  ❌ Failed operations: ${errorCount}`);

  if (errorCount === 0) {
    console.log(`\n🎉 Chat visibility fix applied successfully!`);
    console.log(`Customers should now be able to see agent messages.`);
  } else {
    console.log(`\n⚠️ Some operations failed. Please check the errors above.`);
    console.log(`You may need to apply the remaining fixes manually in Supabase dashboard.`);
  }
}

// Run the fix
applyFix().catch(console.error);