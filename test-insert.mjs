#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Use ANON key to test RLS policies
const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 Testing Contribution Tables Insert Capability\n');
console.log('=' .repeat(60));

async function testInsert() {
  try {
    // Test with a fake user ID
    const testUserId = 'a0000000-0000-0000-0000-000000000000';

    console.log('\nAttempting to insert a test group...\n');

    const { data, error } = await supabase
      .from('contribution_groups')
      .insert({
        user_id: testUserId,
        name: 'Test Group ' + Date.now(),
        amount: 1000,
        frequency: 'weekly',
        collection_day: 'Monday',
        total_members: 0,
        current_cycle: 1,
        share_enabled: false,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.log('❌ INSERT FAILED with error:\n');
      console.log('Error Code:', error.code);
      console.log('Error Message:', error.message);
      console.log('Error Details:', error.details);
      console.log('Error Hint:', error.hint);

      if (error.code === '42501') {
        console.log('\n🔒 This is an RLS (Row Level Security) issue!');
        console.log('The table exists but the RLS policies are blocking inserts.');
        console.log('\nThe likely issue: The RLS policy requires auth.uid() to match user_id');
        console.log('But when not logged in, auth.uid() is NULL, so the insert is blocked.\n');
      }

      if (error.message?.includes('violates foreign key constraint')) {
        console.log('\n🔗 This is a foreign key issue!');
        console.log('The user_id must reference a real user in auth.users table.');
      }
    } else {
      console.log('✅ INSERT SUCCESSFUL!');
      console.log('Created group:', data);

      // Clean up test data
      if (data?.id) {
        await supabase
          .from('contribution_groups')
          .delete()
          .eq('id', data.id);
        console.log('🧹 Test data cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testInsert();