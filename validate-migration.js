// Validation Script - Run after applying migration to verify everything is set up
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n🔍 MIGRATION VALIDATION\n');
console.log('=' .repeat(50));

async function validate() {
  let success = true;

  // Check new tables
  console.log('\n📊 Checking Tables:');
  const tables = [
    'whatsapp_customers',
    'conversation_analytics',
    'conversation_topics',
    'agent_takeover_sessions'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error || error.code === 'PGRST116') {
      console.log(`  ✅ ${table} exists`);
    } else {
      console.log(`  ❌ ${table} missing`);
      success = false;
    }
  }

  // Check new columns
  console.log('\n📋 Checking Columns in ai_chat_conversations:');
  const { data: sample } = await supabase
    .from('ai_chat_conversations')
    .select('*')
    .limit(1)
    .single();

  const columns = [
    'is_agent_active',
    'agent_id',
    'visitor_identified',
    'visitor_name',
    'visitor_email',
    'visitor_phone',
    'visitor_whatsapp'
  ];

  for (const col of columns) {
    if (sample && col in sample) {
      console.log(`  ✅ ${col} exists`);
    } else {
      console.log(`  ❌ ${col} missing`);
      success = false;
    }
  }

  // Check functions
  console.log('\n🔧 Checking Functions:');
  const { data: func1, error: err1 } = await supabase.rpc('initiate_agent_takeover', {
    p_conversation_id: '00000000-0000-0000-0000-000000000000',
    p_agent_id: '00000000-0000-0000-0000-000000000000',
    p_reason: 'test'
  });

  if (!err1 || err1.message.includes('violates foreign key')) {
    console.log('  ✅ initiate_agent_takeover function exists');
  } else if (err1.message.includes('Could not find')) {
    console.log('  ❌ initiate_agent_takeover function missing');
    success = false;
  } else {
    console.log('  ✅ initiate_agent_takeover function exists');
  }

  const { data: func2, error: err2 } = await supabase.rpc('end_agent_takeover', {
    p_conversation_id: '00000000-0000-0000-0000-000000000000',
    p_session_id: '00000000-0000-0000-0000-000000000000'
  });

  if (!err2 || err2.message.includes('violates foreign key')) {
    console.log('  ✅ end_agent_takeover function exists');
  } else if (err2.message.includes('Could not find')) {
    console.log('  ❌ end_agent_takeover function missing');
    success = false;
  } else {
    console.log('  ✅ end_agent_takeover function exists');
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  if (success) {
    console.log('✅ MIGRATION SUCCESSFUL! All features are ready to use.');
    console.log('\nNext steps:');
    console.log('1. Build: npm run build');
    console.log('2. Deploy: vercel --prod --yes');
    console.log('3. Test the features in your dashboard');
  } else {
    console.log('❌ MIGRATION INCOMPLETE');
    console.log('\nPlease run the migration SQL in Supabase:');
    console.log('1. Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new');
    console.log('2. Copy contents from: /supabase/migrations/20260322_chat_enhancements.sql');
    console.log('3. Run the SQL');
    console.log('4. Run this validation again: node validate-migration.js');
  }
  console.log('=' .repeat(50));
}

validate().catch(console.error);