#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSQL() {
  try {
    console.log('🔗 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Create tables one by one
    const tables = [
      {
        name: 'ai_chat_usage',
        sql: `
          CREATE TABLE IF NOT EXISTS ai_chat_usage (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            period_start date NOT NULL,
            period_end date NOT NULL,
            chat_count integer DEFAULT 0,
            tier_limit integer NOT NULL,
            tier_name text NOT NULL,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE(user_id, period_start)
          )
        `
      },
      {
        name: 'ai_chat_messages',
        sql: `
          CREATE TABLE IF NOT EXISTS ai_chat_messages (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            session_id text NOT NULL,
            role text CHECK (role IN ('user', 'assistant', 'system')),
            content text NOT NULL,
            tokens_used integer DEFAULT 0,
            context_type text,
            metadata jsonb DEFAULT '{}',
            created_at timestamptz DEFAULT now()
          )
        `
      },
      {
        name: 'ai_response_cache',
        sql: `
          CREATE TABLE IF NOT EXISTS ai_response_cache (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            query_hash text UNIQUE NOT NULL,
            query_text text NOT NULL,
            response text NOT NULL,
            context_type text,
            language text,
            hit_count integer DEFAULT 0,
            last_accessed timestamptz DEFAULT now(),
            created_at timestamptz DEFAULT now(),
            expires_at timestamptz DEFAULT (now() + interval '7 days')
          )
        `
      },
      {
        name: 'ai_chat_analytics',
        sql: `
          CREATE TABLE IF NOT EXISTS ai_chat_analytics (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            event_type text NOT NULL,
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            session_id text,
            visitor_ip text,
            context_type text,
            response_time_ms integer,
            tokens_used integer,
            cache_hit boolean DEFAULT false,
            error_message text,
            metadata jsonb DEFAULT '{}',
            created_at timestamptz DEFAULT now()
          )
        `
      },
      {
        name: 'ai_chat_rate_limits',
        sql: `
          CREATE TABLE IF NOT EXISTS ai_chat_rate_limits (
            visitor_ip text PRIMARY KEY,
            chat_count integer DEFAULT 0,
            last_reset timestamptz DEFAULT now(),
            blocked_until timestamptz,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
          )
        `
      }
    ];

    // Create each table
    for (const table of tables) {
      try {
        console.log(`📊 Creating table: ${table.name}...`);
        await client.query(table.sql);
        console.log(`✅ Table ${table.name} created successfully!`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  Table ${table.name} already exists - skipping`);
        } else {
          console.error(`❌ Error creating ${table.name}:`, err.message);
        }
      }
    }

    // Create indexes
    console.log('\n📑 Creating indexes...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_period ON ai_chat_usage(user_id, period_start DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_store ON ai_chat_usage(store_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user ON ai_chat_messages(user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hash ON ai_response_cache(query_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires ON ai_response_cache(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_user ON ai_chat_analytics(user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_event ON ai_chat_analytics(event_type, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_store ON ai_chat_analytics(store_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_chat_rate_limits_reset ON ai_chat_rate_limits(last_reset)`
    ];

    for (const index of indexes) {
      try {
        await client.query(index);
        console.log(`✅ Index created`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  Index already exists - skipping`);
        } else {
          console.error(`❌ Error creating index:`, err.message);
        }
      }
    }

    // Enable RLS
    console.log('\n🔒 Enabling Row Level Security...');
    const rlsCommands = [
      `ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE ai_chat_analytics ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE ai_chat_rate_limits ENABLE ROW LEVEL SECURITY`
    ];

    for (const rls of rlsCommands) {
      try {
        await client.query(rls);
        console.log(`✅ RLS enabled`);
      } catch (err) {
        console.log(`⚠️  RLS might already be enabled`);
      }
    }

    // Create helper functions
    console.log('\n🔧 Creating helper functions...');

    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION get_ai_chat_usage(p_user_id uuid)
        RETURNS TABLE (
          chat_count integer,
          tier_limit integer,
          remaining integer,
          percentage_used numeric
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            COALESCE(u.chat_count, 0) as chat_count,
            COALESCE(u.tier_limit, 10) as tier_limit,
            COALESCE(u.tier_limit - u.chat_count, 10) as remaining,
            CASE
              WHEN u.tier_limit > 0 THEN ROUND((u.chat_count::numeric / u.tier_limit::numeric) * 100, 2)
              ELSE 0
            END as percentage_used
          FROM ai_chat_usage u
          WHERE u.user_id = p_user_id
            AND u.period_start = date_trunc('month', CURRENT_DATE)::date
          LIMIT 1;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER
      `);
      console.log('✅ Function get_ai_chat_usage created');
    } catch (err) {
      console.log('⚠️  Function might already exist');
    }

    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION increment_ai_chat_usage(
          p_user_id uuid,
          p_store_id uuid,
          p_tier_name text,
          p_tier_limit integer
        ) RETURNS boolean AS $$
        DECLARE
          v_current_count integer;
          v_period_start date;
          v_period_end date;
        BEGIN
          v_period_start := date_trunc('month', CURRENT_DATE)::date;
          v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

          INSERT INTO ai_chat_usage (
            user_id, store_id, period_start, period_end,
            chat_count, tier_limit, tier_name
          ) VALUES (
            p_user_id, p_store_id, v_period_start, v_period_end,
            1, p_tier_limit, p_tier_name
          )
          ON CONFLICT (user_id, period_start)
          DO UPDATE SET
            chat_count = ai_chat_usage.chat_count + 1,
            updated_at = now()
          RETURNING chat_count INTO v_current_count;

          RETURN v_current_count <= p_tier_limit;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER
      `);
      console.log('✅ Function increment_ai_chat_usage created');
    } catch (err) {
      console.log('⚠️  Function might already exist');
    }

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'ai_chat%'
      ORDER BY table_name
    `);

    console.log('\n✅ Tables found:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    if (result.rows.length === 5) {
      console.log('\n🎉 SUCCESS! All 5 AI Chat Tracking tables created!');
    } else {
      console.log(`\n⚠️  Found ${result.rows.length} tables (expected 5)`);
    }

  } catch (err) {
    console.error('❌ Connection error:', err);
  } finally {
    await client.end();
    console.log('\n👋 Disconnected from database');
  }
}

runSQL();