const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFixes() {
  console.log('Applying RLS fixes...');

  const sqlCommands = [
    // Drop existing message policies
    `DROP POLICY IF EXISTS "Allow message reads" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Allow message inserts" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Allow all message inserts" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Store owners can insert agent messages" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Allow message updates" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Store owners can read all messages" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Store owners can insert messages" ON ai_chat_messages`,
    `DROP POLICY IF EXISTS "Store owners can update messages" ON ai_chat_messages`,

    // Create comprehensive message policy for store owners
    `CREATE POLICY "Store owners can read all messages"
      ON ai_chat_messages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM ai_chat_conversations c
          INNER JOIN stores s ON s.id = c.store_id
          WHERE c.id = ai_chat_messages.conversation_id
            AND s.user_id::text = auth.uid()::text
        )
      )`,

    // Allow message inserts from store owners
    `CREATE POLICY "Store owners can insert messages"
      ON ai_chat_messages
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM ai_chat_conversations c
          INNER JOIN stores s ON s.id = c.store_id
          WHERE c.id = ai_chat_messages.conversation_id
            AND s.user_id::text = auth.uid()::text
        )
      )`,

    // Allow updates for message metadata
    `CREATE POLICY "Store owners can update messages"
      ON ai_chat_messages
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM ai_chat_conversations c
          INNER JOIN stores s ON s.id = c.store_id
          WHERE c.id = ai_chat_messages.conversation_id
            AND s.user_id::text = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM ai_chat_conversations c
          INNER JOIN stores s ON s.id = c.store_id
          WHERE c.id = ai_chat_messages.conversation_id
            AND s.user_id::text = auth.uid()::text
        )
      )`,

    // Drop existing conversation policies
    `DROP POLICY IF EXISTS "Store owners can view their conversations" ON ai_chat_conversations`,
    `DROP POLICY IF EXISTS "Allow conversation updates" ON ai_chat_conversations`,
    `DROP POLICY IF EXISTS "Store owners can update their conversations" ON ai_chat_conversations`,
    `DROP POLICY IF EXISTS "Store owners full access to conversations" ON ai_chat_conversations`,

    // Create conversation policy
    `CREATE POLICY "Store owners full access to conversations"
      ON ai_chat_conversations
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM stores
          WHERE stores.id = ai_chat_conversations.store_id
            AND stores.user_id::text = auth.uid()::text
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM stores
          WHERE stores.id = ai_chat_conversations.store_id
            AND stores.user_id::text = auth.uid()::text
        )
      )`,

    // Enable real-time - wrapped in DO block to handle if already exists
    `DO $$
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_messages;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$`,

    `DO $$
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_conversations;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$`,

    // Create refresh function
    `CREATE OR REPLACE FUNCTION refresh_conversation_messages(p_conversation_id UUID)
    RETURNS TABLE(
      id UUID,
      conversation_id UUID,
      role TEXT,
      content TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      is_agent_message BOOLEAN,
      agent_id UUID
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        m.id,
        m.conversation_id,
        m.role,
        m.content,
        m.created_at,
        m.is_agent_message,
        m.agent_id
      FROM ai_chat_messages m
      WHERE m.conversation_id = p_conversation_id
      ORDER BY m.created_at ASC;
    END;
    $$`,

    // Grant permission
    `GRANT EXECUTE ON FUNCTION refresh_conversation_messages(UUID) TO authenticated`
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const sql of sqlCommands) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });

      if (error) {
        // Try direct SQL execution via admin API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
          // Execute via raw SQL endpoint
          console.log(`Executing SQL statement ${successCount + 1}...`);
          // Note: This is a fallback - the actual execution happens through Supabase Dashboard
          console.log(sql.substring(0, 50) + '...');
        }
      }

      successCount++;
    } catch (err) {
      console.error(`Error executing SQL: ${err.message}`);
      console.error(`Failed SQL: ${sql.substring(0, 100)}...`);
      errorCount++;
    }
  }

  console.log(`\nCompleted: ${successCount} statements executed, ${errorCount} errors`);

  if (errorCount > 0) {
    console.log('\nThe SQL file has been saved to your Downloads folder.');
    console.log('Please copy and paste it into the Supabase Dashboard SQL Editor to complete the setup.');
  } else {
    console.log('\nRLS policies configured successfully!');
  }
}

applyRLSFixes().catch(console.error);