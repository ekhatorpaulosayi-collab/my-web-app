#!/usr/bin/env node

/**
 * Script to check if contribution tables exist and run migration if needed
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  console.log('🔍 Checking if contribution tables exist...\n');

  try {
    // Try to query the contribution_groups table
    const { data, error } = await supabase
      .from('contribution_groups')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ SUCCESS: contribution_groups table exists!');

      // Check contribution_members table
      const { error: membersError } = await supabase
        .from('contribution_members')
        .select('id')
        .limit(1);

      if (!membersError) {
        console.log('✅ SUCCESS: contribution_members table exists!');
      } else if (membersError.code === '42P01') {
        console.log('❌ MISSING: contribution_members table does not exist');
      } else {
        console.log('⚠️  Error checking contribution_members:', membersError.message);
      }

      // Check contribution_payments table
      const { error: paymentsError } = await supabase
        .from('contribution_payments')
        .select('id')
        .limit(1);

      if (!paymentsError) {
        console.log('✅ SUCCESS: contribution_payments table exists!');
      } else if (paymentsError.code === '42P01') {
        console.log('❌ MISSING: contribution_payments table does not exist');
      } else {
        console.log('⚠️  Error checking contribution_payments:', paymentsError.message);
      }

      // Check contribution_payouts table
      const { error: payoutsError } = await supabase
        .from('contribution_payouts')
        .select('id')
        .limit(1);

      if (!payoutsError) {
        console.log('✅ SUCCESS: contribution_payouts table exists!');
      } else if (payoutsError.code === '42P01') {
        console.log('❌ MISSING: contribution_payouts table does not exist');
      } else {
        console.log('⚠️  Error checking contribution_payouts:', payoutsError.message);
      }

      console.log('\n✅ All tables appear to be set up correctly!');
      return true;
    }

    if (error.code === '42P01') { // Table does not exist
      console.log('❌ TABLES DO NOT EXIST!\n');
      console.log('The contribution tables have not been created in your Supabase database.\n');
      console.log('🔧 TO FIX THIS ISSUE:\n');
      console.log('Option 1: Use Supabase Dashboard (Recommended)');
      console.log('----------------------------------------');
      console.log('1. Go to: https://app.supabase.com/project/yzlniqwzqlsftxrtapdl/sql/new');
      console.log('2. Copy the contents of: supabase/migrations/20260331_contributions.sql');
      console.log('3. Paste it into the SQL editor');
      console.log('4. Click "Run" to execute the migration\n');

      console.log('Option 2: Use Supabase CLI');
      console.log('----------------------------------------');
      console.log('Run: npx supabase db push\n');

      return false;
    }

    // Some other error
    console.log('⚠️  Unexpected error:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
    return false;

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
    return false;
  }
}

console.log('SmartStock Contribution Tables Checker');
console.log('=' .repeat(60) + '\n');

checkTables().then(success => {
  if (success) {
    console.log('\n✅ Your database is ready for the Contributions feature!');
  } else {
    console.log('\n⚠️  Please run the migration to enable the Contributions feature.');
  }
  process.exit(success ? 0 : 1);
});