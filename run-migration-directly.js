// Direct SQL Migration Execution
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

async function runMigration() {
  console.log('🚀 Running Migration Directly...\n');

  // PostgreSQL connection
  const pgClient = new Client({
    connectionString: 'postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await pgClient.connect();
    console.log('✅ Connected to database\n');

    // Execute migration in parts
    const migrations = [
      {
        name: 'Add columns to conversations',
        sql: `
          ALTER TABLE ai_chat_conversations
          ADD COLUMN IF NOT EXISTS is_agent_active BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id),
          ADD COLUMN IF NOT EXISTS agent_joined_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS agent_left_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS takeover_reason TEXT,
          ADD COLUMN IF NOT EXISTS visitor_identified BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS visitor_whatsapp TEXT,
          ADD COLUMN IF NOT EXISTS visitor_telegram TEXT,
          ADD COLUMN IF NOT EXISTS visitor_ip TEXT,
          ADD COLUMN IF NOT EXISTS visitor_country TEXT,
          ADD COLUMN IF NOT EXISTS visitor_device TEXT,
          ADD COLUMN IF NOT EXISTS visitor_browser TEXT;
        `
      },
      {
        name: 'Create WhatsApp customers table',
        sql: `
          CREATE TABLE IF NOT EXISTS whatsapp_customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
            phone_number TEXT NOT NULL,
            customer_name TEXT,
            customer_email TEXT,
            customer_id UUID REFERENCES customers(id),
            conversation_ids UUID[] DEFAULT '{}',
            first_contact TIMESTAMPTZ DEFAULT now(),
            last_contact TIMESTAMPTZ DEFAULT now(),
            total_messages INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(store_id, phone_number)
          );
        `
      },
      {
        name: 'Create analytics table',
        sql: `
          CREATE TABLE IF NOT EXISTS conversation_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            total_conversations INTEGER DEFAULT 0,
            total_messages INTEGER DEFAULT 0,
            avg_messages_per_conversation DECIMAL(10,2) DEFAULT 0,
            avg_response_time_seconds INTEGER DEFAULT 0,
            total_ai_responses INTEGER DEFAULT 0,
            total_human_responses INTEGER DEFAULT 0,
            unique_visitors INTEGER DEFAULT 0,
            identified_visitors INTEGER DEFAULT 0,
            anonymous_visitors INTEGER DEFAULT 0,
            storefront_conversations INTEGER DEFAULT 0,
            dashboard_conversations INTEGER DEFAULT 0,
            whatsapp_conversations INTEGER DEFAULT 0,
            takeover_count INTEGER DEFAULT 0,
            avg_takeover_duration_seconds INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(store_id, date)
          );
        `
      },
      {
        name: 'Create topics table',
        sql: `
          CREATE TABLE IF NOT EXISTS conversation_topics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            category TEXT,
            frequency INTEGER DEFAULT 1,
            sample_questions TEXT[],
            last_asked TIMESTAMPTZ DEFAULT now(),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(store_id, topic)
          );
        `
      },
      {
        name: 'Create takeover sessions table',
        sql: `
          CREATE TABLE IF NOT EXISTS agent_takeover_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
            agent_id UUID REFERENCES auth.users(id),
            started_at TIMESTAMPTZ DEFAULT now(),
            ended_at TIMESTAMPTZ,
            reason TEXT,
            notes TEXT,
            messages_sent INTEGER DEFAULT 0,
            customer_satisfied BOOLEAN,
            created_at TIMESTAMPTZ DEFAULT now()
          );
        `
      },
      {
        name: 'Add message columns',
        sql: `
          ALTER TABLE ai_chat_messages
          ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id),
          ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}';
        `
      },
      {
        name: 'Create indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_conversations_agent_active ON ai_chat_conversations(is_agent_active) WHERE is_agent_active = true;
          CREATE INDEX IF NOT EXISTS idx_conversations_visitor_identified ON ai_chat_conversations(visitor_identified);
          CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_customers(phone_number);
          CREATE INDEX IF NOT EXISTS idx_analytics_store_date ON conversation_analytics(store_id, date DESC);
          CREATE INDEX IF NOT EXISTS idx_topics_store_frequency ON conversation_topics(store_id, frequency DESC);
          CREATE INDEX IF NOT EXISTS idx_takeover_conversation ON agent_takeover_sessions(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_messages_agent ON ai_chat_messages(agent_id) WHERE agent_id IS NOT NULL;
        `
      },
      {
        name: 'Enable RLS',
        sql: `
          ALTER TABLE whatsapp_customers ENABLE ROW LEVEL SECURITY;
          ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
          ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;
          ALTER TABLE agent_takeover_sessions ENABLE ROW LEVEL SECURITY;
        `
      },
      {
        name: 'Create RLS policies',
        sql: `
          CREATE POLICY IF NOT EXISTS "Store owners can manage WhatsApp customers"
            ON whatsapp_customers
            FOR ALL
            USING (
              store_id IN (
                SELECT id FROM stores WHERE user_id = auth.uid()
              )
            );

          CREATE POLICY IF NOT EXISTS "Store owners can view analytics"
            ON conversation_analytics
            FOR SELECT
            USING (
              store_id IN (
                SELECT id FROM stores WHERE user_id = auth.uid()
              )
            );

          CREATE POLICY IF NOT EXISTS "Store owners can view topics"
            ON conversation_topics
            FOR SELECT
            USING (
              store_id IN (
                SELECT id FROM stores WHERE user_id = auth.uid()
              )
            );

          CREATE POLICY IF NOT EXISTS "Agents can manage takeover sessions"
            ON agent_takeover_sessions
            FOR ALL
            USING (
              agent_id = auth.uid()
              OR
              conversation_id IN (
                SELECT id FROM ai_chat_conversations
                WHERE store_id IN (
                  SELECT id FROM stores WHERE user_id = auth.uid()
                )
              )
            );
        `
      },
      {
        name: 'Create takeover functions',
        sql: `
          CREATE OR REPLACE FUNCTION initiate_agent_takeover(
            p_conversation_id UUID,
            p_agent_id UUID,
            p_reason TEXT DEFAULT NULL
          )
          RETURNS UUID AS $$
          DECLARE
            v_session_id UUID;
          BEGIN
            UPDATE ai_chat_conversations
            SET
              is_agent_active = true,
              agent_id = p_agent_id,
              agent_joined_at = now(),
              takeover_reason = p_reason
            WHERE id = p_conversation_id;

            INSERT INTO agent_takeover_sessions (
              conversation_id,
              agent_id,
              reason
            )
            VALUES (
              p_conversation_id,
              p_agent_id,
              p_reason
            )
            RETURNING id INTO v_session_id;

            RETURN v_session_id;
          END;
          $$ LANGUAGE plpgsql;

          CREATE OR REPLACE FUNCTION end_agent_takeover(
            p_conversation_id UUID,
            p_session_id UUID
          )
          RETURNS BOOLEAN AS $$
          BEGIN
            UPDATE ai_chat_conversations
            SET
              is_agent_active = false,
              agent_left_at = now()
            WHERE id = p_conversation_id;

            UPDATE agent_takeover_sessions
            SET ended_at = now()
            WHERE id = p_session_id;

            RETURN true;
          END;
          $$ LANGUAGE plpgsql;
        `
      },
      {
        name: 'Create analytics trigger',
        sql: `
          CREATE OR REPLACE FUNCTION update_conversation_analytics()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO conversation_analytics (
              store_id,
              date,
              total_conversations,
              storefront_conversations,
              dashboard_conversations
            )
            VALUES (
              NEW.store_id,
              CURRENT_DATE,
              1,
              CASE WHEN NEW.context_type = 'storefront' THEN 1 ELSE 0 END,
              CASE WHEN NEW.context_type = 'help' THEN 1 ELSE 0 END
            )
            ON CONFLICT (store_id, date) DO UPDATE SET
              total_conversations = conversation_analytics.total_conversations + 1,
              storefront_conversations = conversation_analytics.storefront_conversations +
                CASE WHEN NEW.context_type = 'storefront' THEN 1 ELSE 0 END,
              dashboard_conversations = conversation_analytics.dashboard_conversations +
                CASE WHEN NEW.context_type = 'help' THEN 1 ELSE 0 END,
              updated_at = now();

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS conversation_analytics_trigger ON ai_chat_conversations;
          CREATE TRIGGER conversation_analytics_trigger
            AFTER INSERT ON ai_chat_conversations
            FOR EACH ROW
            EXECUTE FUNCTION update_conversation_analytics();
        `
      },
      {
        name: 'Grant permissions',
        sql: `
          GRANT USAGE ON SCHEMA public TO anon, authenticated;
          GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
          GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
          GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
        `
      }
    ];

    // Execute each migration
    for (const migration of migrations) {
      try {
        console.log(`⏳ Running: ${migration.name}`);
        await pgClient.query(migration.sql);
        console.log(`✅ Success: ${migration.name}\n`);
      } catch (error) {
        console.log(`⚠️  Warning in ${migration.name}: ${error.message}\n`);
      }
    }

    console.log('🎉 MIGRATION COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pgClient.end();
    console.log('Connection closed.\n');
    console.log('Now run: node validate-migration.js');
  }
}

runMigration();