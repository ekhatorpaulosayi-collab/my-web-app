import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkAndFixDatabase() {
  console.log('🔍 Checking Agent Takeover Database Setup...\n');

  try {
    // 1. Check if agent_takeover_sessions table exists
    console.log('1️⃣ Checking agent_takeover_sessions table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('agent_takeover_sessions')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('❌ Table agent_takeover_sessions does not exist');
      console.log('   Creating table...');

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS agent_takeover_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES ai_chat_conversations(id),
          agent_id UUID NOT NULL REFERENCES auth.users(id),
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'active',
          UNIQUE(conversation_id, agent_id, status)
        );

        CREATE INDEX IF NOT EXISTS idx_agent_takeover_sessions_conversation
          ON agent_takeover_sessions(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_agent_takeover_sessions_agent
          ON agent_takeover_sessions(agent_id);
      `;

      const { error: createError } = await supabase.rpc('exec_sql', {
        query: createTableSQL
      });

      if (createError) {
        console.log('   Failed to create table:', createError.message);
      } else {
        console.log('   ✅ Table created successfully');
      }
    } else {
      console.log('✅ Table agent_takeover_sessions exists');
    }

    // 2. Check for initiate_agent_takeover function
    console.log('\n2️⃣ Checking initiate_agent_takeover function...');
    const { data: funcCheck1, error: funcError1 } = await supabase.rpc('initiate_agent_takeover', {
      p_conversation_id: '00000000-0000-0000-0000-000000000000',
      p_agent_id: '00000000-0000-0000-0000-000000000000',
      p_agent_name: 'test'
    }).single();

    if (funcError1) {
      if (funcError1.code === '42883') {
        console.log('❌ Function initiate_agent_takeover does not exist');
        console.log('   Creating function...');

        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION initiate_agent_takeover(
            p_conversation_id UUID,
            p_agent_id UUID,
            p_agent_name TEXT
          )
          RETURNS JSONB AS $$
          DECLARE
            v_result JSONB;
          BEGIN
            -- End any existing active sessions for this conversation
            UPDATE agent_takeover_sessions
            SET ended_at = NOW(), status = 'ended'
            WHERE conversation_id = p_conversation_id AND status = 'active';

            -- Create new takeover session
            INSERT INTO agent_takeover_sessions (conversation_id, agent_id, status)
            VALUES (p_conversation_id, p_agent_id, 'active');

            -- Update conversation status
            UPDATE ai_chat_conversations
            SET takeover_status = 'agent',
                updated_at = NOW()
            WHERE id = p_conversation_id;

            v_result := jsonb_build_object(
              'success', true,
              'conversation_id', p_conversation_id,
              'agent_id', p_agent_id,
              'status', 'agent'
            );

            RETURN v_result;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        const { error: createFuncError } = await supabase.rpc('exec_sql', {
          query: createFunctionSQL
        });

        if (createFuncError) {
          console.log('   Failed to create function:', createFuncError.message);
        } else {
          console.log('   ✅ Function created successfully');
        }
      } else {
        console.log('   Function check error (may be permission issue):', funcError1.message);
      }
    } else {
      console.log('✅ Function initiate_agent_takeover exists');
    }

    // 3. Check for end_agent_takeover function
    console.log('\n3️⃣ Checking end_agent_takeover function...');
    const { data: funcCheck2, error: funcError2 } = await supabase.rpc('end_agent_takeover', {
      p_conversation_id: '00000000-0000-0000-0000-000000000000',
      p_agent_id: '00000000-0000-0000-0000-000000000000'
    }).single();

    if (funcError2) {
      if (funcError2.code === '42883') {
        console.log('❌ Function end_agent_takeover does not exist');
        console.log('   Creating function...');

        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION end_agent_takeover(
            p_conversation_id UUID,
            p_agent_id UUID
          )
          RETURNS JSONB AS $$
          DECLARE
            v_result JSONB;
          BEGIN
            -- End the active takeover session
            UPDATE agent_takeover_sessions
            SET ended_at = NOW(), status = 'ended'
            WHERE conversation_id = p_conversation_id
              AND agent_id = p_agent_id
              AND status = 'active';

            -- Update conversation status back to ai
            UPDATE ai_chat_conversations
            SET takeover_status = 'ai',
                updated_at = NOW()
            WHERE id = p_conversation_id;

            v_result := jsonb_build_object(
              'success', true,
              'conversation_id', p_conversation_id,
              'agent_id', p_agent_id,
              'status', 'ai'
            );

            RETURN v_result;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        const { error: createFuncError } = await supabase.rpc('exec_sql', {
          query: createFunctionSQL
        });

        if (createFuncError) {
          console.log('   Failed to create function:', createFuncError.message);
        } else {
          console.log('   ✅ Function created successfully');
        }
      } else {
        console.log('   Function check error (may be permission issue):', funcError2.message);
      }
    } else {
      console.log('✅ Function end_agent_takeover exists');
    }

    // 4. Apply RLS policies
    console.log('\n4️⃣ Applying RLS policies...');
    const rlsPoliciesSQL = `
      -- Fix RLS policies for agent takeover functionality

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Agents can manage takeover sessions" ON agent_takeover_sessions;
      DROP POLICY IF EXISTS "Users can create and view takeover sessions" ON agent_takeover_sessions;

      -- Create a more permissive policy for agent takeover sessions
      CREATE POLICY "Users can create and view takeover sessions"
        ON agent_takeover_sessions
        FOR ALL
        USING (
          -- User can access their own takeover sessions
          agent_id = auth.uid()
          OR
          -- User can access takeover sessions for their store's conversations
          conversation_id IN (
            SELECT id FROM ai_chat_conversations
            WHERE store_id IN (
              SELECT id FROM stores WHERE user_id = auth.uid()
            )
          )
        )
        WITH CHECK (
          -- User can create takeover sessions for their store's conversations
          conversation_id IN (
            SELECT id FROM ai_chat_conversations
            WHERE store_id IN (
              SELECT id FROM stores WHERE user_id = auth.uid()
            )
          )
        );

      -- Also ensure the ai_chat_conversations table allows updates for takeover
      DROP POLICY IF EXISTS "Store owners can update their conversations" ON ai_chat_conversations;

      CREATE POLICY "Store owners can update their conversations"
        ON ai_chat_conversations
        FOR UPDATE
        USING (
          store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
          )
        )
        WITH CHECK (
          store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
          )
        );

      -- Ensure store owners can insert messages as agents
      DROP POLICY IF EXISTS "Store owners can insert agent messages" ON ai_chat_messages;

      CREATE POLICY "Store owners can insert agent messages"
        ON ai_chat_messages
        FOR INSERT
        WITH CHECK (
          conversation_id IN (
            SELECT id FROM ai_chat_conversations
            WHERE store_id IN (
              SELECT id FROM stores WHERE user_id = auth.uid()
            )
          )
        );

      -- Grant execute permissions on the takeover functions
      GRANT EXECUTE ON FUNCTION initiate_agent_takeover(UUID, UUID, TEXT) TO authenticated;
      GRANT EXECUTE ON FUNCTION end_agent_takeover(UUID, UUID) TO authenticated;
    `;

    // Try to execute RLS policies
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: rlsPoliciesSQL
    });

    if (rlsError) {
      console.log('❌ Failed to apply RLS policies:', rlsError.message);
      console.log('   Note: You may need to apply these manually in Supabase SQL editor');
    } else {
      console.log('✅ RLS policies applied successfully');
    }

    // 5. Test conversation update permissions
    console.log('\n5️⃣ Testing conversation update permissions...');
    const { data: testConv, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('id, takeover_status')
      .limit(1)
      .single();

    if (testConv) {
      console.log('✅ Can read conversations');

      // Try to update
      const { error: updateError } = await supabase
        .from('ai_chat_conversations')
        .update({ takeover_status: testConv.takeover_status })
        .eq('id', testConv.id);

      if (updateError) {
        console.log('⚠️  Cannot update conversations:', updateError.message);
      } else {
        console.log('✅ Can update conversations');
      }
    }

    console.log('\n✨ Database check complete!');
    console.log('\n📝 Summary:');
    console.log('- Agent takeover table and functions should now be available');
    console.log('- RLS policies have been applied (if permissions allowed)');
    console.log('- The agent takeover feature should now work properly');

  } catch (error) {
    console.error('❌ Error during database check:', error.message);
  }
}

// Run the check
checkAndFixDatabase().then(() => {
  console.log('\n✅ Database verification complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});