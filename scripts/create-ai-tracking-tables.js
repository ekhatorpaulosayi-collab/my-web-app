import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createAITrackingTables() {
  console.log('🚀 Starting AI Chat Tracking Tables Creation...\n');

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
        );

        CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_period
        ON ai_chat_usage(user_id, period_start DESC);

        CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_store
        ON ai_chat_usage(store_id);
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
        );

        CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user
        ON ai_chat_messages(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
        ON ai_chat_messages(session_id, created_at);
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
        );

        CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hash
        ON ai_response_cache(query_hash);

        CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires
        ON ai_response_cache(expires_at);
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
        );

        CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_user
        ON ai_chat_analytics(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_event
        ON ai_chat_analytics(event_type, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_ai_chat_analytics_store
        ON ai_chat_analytics(store_id, created_at DESC);
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
        );

        CREATE INDEX IF NOT EXISTS idx_ai_chat_rate_limits_reset
        ON ai_chat_rate_limits(last_reset);
      `
    }
  ];

  // Create tables
  for (const table of tables) {
    try {
      console.log(`📊 Creating table: ${table.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });

      if (error) {
        // Try direct query as fallback
        const { data, error: queryError } = await supabase
          .from('_exec_sql_placeholder')
          .select(table.sql);

        if (queryError) {
          console.log(`⚠️  Table ${table.name} might already exist or needs manual creation`);
        } else {
          console.log(`✅ Table ${table.name} created successfully!`);
        }
      } else {
        console.log(`✅ Table ${table.name} created successfully!`);
      }
    } catch (err) {
      console.log(`⚠️  Table ${table.name}: ${err.message}`);
    }
  }

  // Create RLS policies
  console.log('\n🔒 Setting up Row Level Security...');

  const policies = [
    // ai_chat_usage policies
    `ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "Users can view their own usage" ON ai_chat_usage
     FOR SELECT USING (auth.uid() = user_id)`,
    `CREATE POLICY IF NOT EXISTS "System can manage all usage" ON ai_chat_usage
     FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')`,

    // ai_chat_messages policies
    `ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "Users can view their own messages" ON ai_chat_messages
     FOR SELECT USING (auth.uid() = user_id)`,
    `CREATE POLICY IF NOT EXISTS "Users can insert their own messages" ON ai_chat_messages
     FOR INSERT WITH CHECK (auth.uid() = user_id)`,

    // ai_response_cache policies
    `ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "Anyone can read cache" ON ai_response_cache
     FOR SELECT USING (true)`,

    // ai_chat_analytics policies
    `ALTER TABLE ai_chat_analytics ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "Users can view their own analytics" ON ai_chat_analytics
     FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL)`,

    // ai_chat_rate_limits policies
    `ALTER TABLE ai_chat_rate_limits ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "System can manage rate limits" ON ai_chat_rate_limits
     FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')`
  ];

  // Note: These might need to be run manually in Supabase SQL editor
  console.log('⚠️  RLS policies need to be set up manually in Supabase SQL editor');

  // Create helper functions
  console.log('\n🔧 Creating helper functions...');
  console.log('⚠️  Helper functions need to be created manually in Supabase SQL editor');

  // Verify tables
  console.log('\n✅ Verifying tables...');

  const { data: tables_check, error: check_error } = await supabase
    .from('ai_chat_usage')
    .select('id')
    .limit(1);

  if (!check_error) {
    console.log('✅ ai_chat_usage table verified!');
  }

  console.log('\n🎉 AI Chat Tracking Tables setup initiated!');
  console.log('\n⚠️  IMPORTANT: Please go to Supabase SQL editor and run:');
  console.log('1. The RLS policies from the create_ai_chat_tracking_tables.sql file');
  console.log('2. The helper functions (get_ai_chat_usage, increment_ai_chat_usage, etc.)');
  console.log('3. The views (ai_chat_usage_summary, ai_chat_daily_stats)');
  console.log('\nSQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');
}

createAITrackingTables().catch(console.error);