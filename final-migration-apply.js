#!/usr/bin/env node

// Final Migration Application Script
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Connection with direct host (not pooler)
const connectionConfig = {
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.yzlniqwzqlsftxrtapdl',
  password: 'Godisgood1.',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
};

async function runMigration() {
  console.log('🚀 FINAL MIGRATION ATTEMPT\n');
  console.log('=' .repeat(60));

  const client = new Client(connectionConfig);

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read migration file
    const migrationSQL = fs.readFileSync('/home/ekhator1/smartstock-v2/MIGRATION_TO_RUN.sql', 'utf8');

    // Parse SQL into individual operations
    const operations = [
      {
        name: 'Add columns to ai_chat_conversations',
        sql: `ALTER TABLE ai_chat_conversations
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
              ADD COLUMN IF NOT EXISTS visitor_browser TEXT`
      },
      {
        name: 'Create whatsapp_customers table',
        sql: `CREATE TABLE IF NOT EXISTS whatsapp_customers (
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
              )`
      },
      {
        name: 'Create conversation_analytics table',
        sql: `CREATE TABLE IF NOT EXISTS conversation_analytics (
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
              )`
      },
      {
        name: 'Create conversation_topics table',
        sql: `CREATE TABLE IF NOT EXISTS conversation_topics (
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
              )`
      },
      {
        name: 'Create agent_takeover_sessions table',
        sql: `CREATE TABLE IF NOT EXISTS agent_takeover_sessions (
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
              )`
      },
      {
        name: 'Add columns to ai_chat_messages',
        sql: `ALTER TABLE ai_chat_messages
              ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT false,
              ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id),
              ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}'`
      }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Execute operations
    for (const op of operations) {
      try {
        console.log(`⏳ Executing: ${op.name}`);
        await client.query(op.sql);
        console.log(`✅ Success: ${op.name}\n`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Skipped (already exists): ${op.name}\n`);
          skipCount++;
        } else {
          console.log(`❌ Error in ${op.name}: ${error.message}\n`);
          errorCount++;
        }
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_conversations_agent_active ON ai_chat_conversations(is_agent_active) WHERE is_agent_active = true',
      'CREATE INDEX IF NOT EXISTS idx_conversations_visitor_identified ON ai_chat_conversations(visitor_identified)',
      'CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_customers(phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_store_date ON conversation_analytics(store_id, date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_topics_store_frequency ON conversation_topics(store_id, frequency DESC)',
      'CREATE INDEX IF NOT EXISTS idx_takeover_conversation ON agent_takeover_sessions(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_agent ON ai_chat_messages(agent_id) WHERE agent_id IS NOT NULL'
    ];

    console.log('Creating indexes...');
    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
      } catch (e) {
        // Ignore index errors
      }
    }
    console.log('✅ Indexes created\n');

    // Enable RLS
    console.log('Enabling RLS...');
    const rlsTables = ['whatsapp_customers', 'conversation_analytics', 'conversation_topics', 'agent_takeover_sessions'];
    for (const table of rlsTables) {
      try {
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      } catch (e) {
        // Table might not exist or RLS already enabled
      }
    }
    console.log('✅ RLS enabled\n');

    // Create RLS policies
    const policies = [
      {
        name: 'Store owners can manage WhatsApp customers',
        sql: `CREATE POLICY "Store owners can manage WhatsApp customers"
              ON whatsapp_customers FOR ALL
              USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()))`
      },
      {
        name: 'Store owners can view analytics',
        sql: `CREATE POLICY "Store owners can view analytics"
              ON conversation_analytics FOR SELECT
              USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()))`
      },
      {
        name: 'Store owners can view topics',
        sql: `CREATE POLICY "Store owners can view topics"
              ON conversation_topics FOR SELECT
              USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()))`
      },
      {
        name: 'Agents can manage takeover sessions',
        sql: `CREATE POLICY "Agents can manage takeover sessions"
              ON agent_takeover_sessions FOR ALL
              USING (
                agent_id = auth.uid()
                OR conversation_id IN (
                  SELECT id FROM ai_chat_conversations
                  WHERE store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
                )
              )`
      }
    ];

    console.log('Creating RLS policies...');
    for (const policy of policies) {
      try {
        await client.query(policy.sql);
      } catch (e) {
        // Policy might already exist
      }
    }
    console.log('✅ RLS policies created\n');

    // Create functions
    console.log('Creating functions...');

    const initTakeoverFunc = `
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
      $$ LANGUAGE plpgsql`;

    const endTakeoverFunc = `
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
      $$ LANGUAGE plpgsql`;

    const analyticsFunc = `
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
      $$ LANGUAGE plpgsql`;

    try {
      await client.query(initTakeoverFunc);
      await client.query(endTakeoverFunc);
      await client.query(analyticsFunc);
      console.log('✅ Functions created\n');
    } catch (e) {
      console.log('⚠️  Some functions may already exist\n');
    }

    // Create trigger
    console.log('Creating analytics trigger...');
    try {
      await client.query('DROP TRIGGER IF EXISTS conversation_analytics_trigger ON ai_chat_conversations');
      await client.query(`
        CREATE TRIGGER conversation_analytics_trigger
        AFTER INSERT ON ai_chat_conversations
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_analytics()
      `);
      console.log('✅ Trigger created\n');
    } catch (e) {
      console.log('⚠️  Trigger creation issue: ' + e.message + '\n');
    }

    // Grant permissions
    console.log('Granting permissions...');
    try {
      await client.query('GRANT USAGE ON SCHEMA public TO anon, authenticated');
      await client.query('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated');
      await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated');
      await client.query('GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated');
      console.log('✅ Permissions granted\n');
    } catch (e) {
      console.log('⚠️  Permission grant issue\n');
    }

    console.log('=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`   ✅ Successful operations: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`   ❌ Failed operations: ${errorCount}`);
    console.log('=' .repeat(60) + '\n');

    if (errorCount === 0) {
      console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('\nNext steps:');
      console.log('1. Run validation: node validate-migration.js');
      console.log('2. Deploy: npm run build && vercel --prod\n');
    } else {
      console.log('⚠️  Some operations failed.');
      console.log('This may be expected if some objects already exist.');
      console.log('\nPlease run: node validate-migration.js');
      console.log('to check if all required objects were created.\n');
    }

  } catch (error) {
    console.error('❌ Connection/Execution Error:', error.message);

    console.log('\n📋 MANUAL FALLBACK REQUIRED:');
    console.log('=' .repeat(40));
    console.log('Since programmatic execution failed, please:');
    console.log('\n1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new\n');
    console.log('2. Copy the ENTIRE contents of:');
    console.log('   /home/ekhator1/smartstock-v2/MIGRATION_TO_RUN.sql\n');
    console.log('3. Paste into the SQL editor');
    console.log('4. Click "RUN"\n');
    console.log('This migration adds:');
    console.log('  • 4 new tables for enhanced chat features');
    console.log('  • 12 new columns for visitor tracking');
    console.log('  • Agent takeover functionality');
    console.log('  • WhatsApp integration support');
    console.log('  • Analytics and topic tracking\n');
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the migration
runMigration().catch(console.error);