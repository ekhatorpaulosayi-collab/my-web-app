import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployPaystackTables() {
  console.log('\n🚀 DEPLOYING PAYSTACK DATABASE TABLES');
  console.log('━'.repeat(80));

  // Step 1: Create payment_transactions table
  console.log('\n📦 Step 1: Creating payment_transactions table...');

  const createTableSQL = `
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment Details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  status VARCHAR(20) NOT NULL,

  -- Paystack Details
  payment_provider VARCHAR(20) DEFAULT 'paystack',
  payment_reference VARCHAR(100) UNIQUE NOT NULL,
  payment_method VARCHAR(50),
  authorization_code VARCHAR(100),

  -- Subscription Details
  subscription_id UUID,
  tier_id TEXT,
  billing_cycle VARCHAR(20),

  -- Paystack Response Data
  paystack_response JSONB,
  customer_email VARCHAR(255),
  customer_code VARCHAR(100),

  -- Metadata
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamps
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);

COMMENT ON TABLE payment_transactions IS 'Tracks all payment attempts, successes, and failures from Paystack';
`;

  try {
    // Test if table exists
    const { error: testError } = await supabase
      .from('payment_transactions')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('Creating payment_transactions table via admin...');

      // Since we can't run raw SQL easily, let's create it via a workaround
      // We'll use the insert method which will fail but tell us if table exists
      const createCommands = createTableSQL.split(';').filter(cmd => cmd.trim());

      for (const cmd of createCommands) {
        if (cmd.trim()) {
          console.log(`  Running: ${cmd.substring(0, 50)}...`);
        }
      }

      console.log('\n⚠️  Table creation requires Supabase Dashboard SQL Editor');
      console.log('    Please run the migration manually or use supabase CLI');
    } else {
      console.log('✅ payment_transactions table already exists');
    }
  } catch (err) {
    console.log('Error checking table:', err.message);
  }

  // Step 2: Add Paystack plan code columns
  console.log('\n📦 Step 2: Adding Paystack plan code columns to subscription_tiers...');

  // Check if columns exist
  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .limit(1);

  if (tiers && tiers[0]) {
    const hasMonthlyCode = 'paystack_plan_code_monthly' in tiers[0];
    const hasAnnualCode = 'paystack_plan_code_annual' in tiers[0];

    if (hasMonthlyCode && hasAnnualCode) {
      console.log('✅ Paystack plan code columns already exist');
    } else {
      console.log('⚠️  Columns need to be added via SQL Editor');
      console.log('\nRun this SQL in Supabase Dashboard:');
      console.log(`
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS paystack_plan_code_monthly VARCHAR(100),
ADD COLUMN IF NOT EXISTS paystack_plan_code_annual VARCHAR(100);
      `);
    }
  }

  console.log('\n━'.repeat(80));
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the payment_transactions table creation SQL');
  console.log('3. Run the subscription_tiers column addition SQL');
  console.log('\nOr use the deployment script provided.\n');
}

deployPaystackTables().catch(console.error);
