/**
 * Subscription Payment Testing Script
 *
 * This script helps you test the complete Paystack subscription flow:
 * 1. Check database configuration
 * 2. Verify environment variables
 * 3. Test subscription tiers
 * 4. Guide manual testing in browser
 * 5. Verify payment transactions
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function header(text) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

function section(text) {
  console.log(`\n${colors.bright}${colors.blue}▶ ${text}${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(80)}${colors.reset}`);
}

async function checkEnvironmentVariables() {
  section('STEP 1: Checking Environment Variables');

  const fs = await import('fs');
  let envContent = '';

  try {
    envContent = fs.readFileSync('.env.local', 'utf8');
  } catch (error) {
    log(colors.red, '❌', '.env.local file not found!');
    return false;
  }

  const hasPaystackPublicKey = envContent.includes('VITE_PAYSTACK_PUBLIC_KEY');
  const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL');
  const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY');

  if (!hasPaystackPublicKey) {
    log(colors.red, '❌', 'VITE_PAYSTACK_PUBLIC_KEY is missing!');
    console.log('\n   Add this to .env.local:');
    console.log(colors.yellow + '   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_here' + colors.reset);
    console.log('\n   Get your test key from: https://dashboard.paystack.com/#/settings/developer');
    return false;
  } else {
    log(colors.green, '✅', 'VITE_PAYSTACK_PUBLIC_KEY configured');
  }

  if (hasSupabaseUrl && hasSupabaseKey) {
    log(colors.green, '✅', 'Supabase environment variables configured');
  }

  return true;
}

async function checkSubscriptionTiers() {
  section('STEP 2: Checking Subscription Tiers');

  const { data: tiers, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('display_order');

  if (error) {
    log(colors.red, '❌', `Error fetching tiers: ${error.message}`);
    return null;
  }

  log(colors.green, '✅', `Found ${tiers.length} subscription tiers\n`);

  let allConfigured = true;

  tiers.forEach((tier, index) => {
    console.log(`${colors.bright}${index + 1}. ${tier.name}${colors.reset}`);
    console.log(`   Price (Monthly): ${colors.green}₦${(tier.price_monthly / 100).toLocaleString()}${colors.reset}`);
    console.log(`   Price (Annual):  ${colors.green}₦${(tier.price_annual / 100).toLocaleString()}${colors.reset}`);

    if (tier.name !== 'Free') {
      const hasMonthly = tier.paystack_plan_code_monthly;
      const hasAnnual = tier.paystack_plan_code_annual;

      if (hasMonthly) {
        log(colors.green, '   ✓', `Monthly Plan: ${tier.paystack_plan_code_monthly}`);
      } else {
        log(colors.red, '   ✗', 'Monthly plan code NOT configured');
        allConfigured = false;
      }

      if (hasAnnual) {
        log(colors.green, '   ✓', `Annual Plan:  ${tier.paystack_plan_code_annual}`);
      } else {
        log(colors.red, '   ✗', 'Annual plan code NOT configured');
        allConfigured = false;
      }
    }
    console.log('');
  });

  if (!allConfigured) {
    console.log(colors.yellow + '⚠️  Some plan codes are missing. You need to:' + colors.reset);
    console.log('   1. Create plans in Paystack dashboard: https://dashboard.paystack.com/plans');
    console.log('   2. Update the subscription_tiers table with plan codes');
  }

  return tiers;
}

async function checkPaymentTransactions() {
  section('STEP 3: Checking Payment Transactions Table');

  const { data, error, count } = await supabase
    .from('payment_transactions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    log(colors.red, '❌', `Error: ${error.message}`);
    return false;
  }

  log(colors.green, '✅', 'payment_transactions table exists');
  log(colors.cyan, 'ℹ️', `Total transactions: ${count || 0}`);

  return true;
}

async function checkWebhookFunction() {
  section('STEP 4: Checking Webhook Function');

  const fs = await import('fs');
  const webhookPath = 'supabase/functions/paystack-webhook/index.ts';

  if (fs.existsSync(webhookPath)) {
    log(colors.green, '✅', 'Webhook function file exists');

    // Check if deployed
    console.log('\n   To check if deployed to Supabase:');
    console.log(colors.yellow + '   supabase functions list' + colors.reset);

    console.log('\n   To deploy webhook:');
    console.log(colors.yellow + '   supabase functions deploy paystack-webhook' + colors.reset);

    return true;
  } else {
    log(colors.red, '❌', 'Webhook function file NOT found');
    return false;
  }
}

async function showTestingGuide() {
  header('TESTING GUIDE: Subscription Payment Flow');

  console.log(`${colors.bright}🧪 Manual Testing Steps:${colors.reset}\n`);

  console.log(`${colors.bright}${colors.cyan}STEP 1: Start Development Server${colors.reset}`);
  console.log('   Run: ' + colors.yellow + 'npm run dev' + colors.reset);
  console.log('   Open: http://localhost:5173\n');

  console.log(`${colors.bright}${colors.cyan}STEP 2: Access Subscription Upgrade${colors.reset}`);
  console.log('   Option A: Add to your navigation/settings');
  console.log('   Option B: Go directly to component location');
  console.log('   Option C: Use browser console:\n');
  console.log(colors.yellow + '      import("/src/components/SubscriptionUpgrade.tsx")' + colors.reset);
  console.log('');

  console.log(`${colors.bright}${colors.cyan}STEP 3: Test with Paystack Test Cards${colors.reset}`);
  console.log(`   ${colors.green}✓ Success Card:${colors.reset} 4084 0840 8408 4081`);
  console.log(`   ${colors.red}✗ Decline Card:${colors.reset} 5060 6666 6666 6666 666`);
  console.log('   CVV: Any 3 digits (e.g., 123)');
  console.log('   Expiry: Any future date (e.g., 12/25)');
  console.log('   PIN: 1234');
  console.log('   OTP: 123456\n');

  console.log(`${colors.bright}${colors.cyan}STEP 4: Complete Payment Flow${colors.reset}`);
  console.log('   1. Select a subscription tier (Starter/Pro/Business)');
  console.log('   2. Choose billing cycle (Monthly/Annual)');
  console.log('   3. Click "Upgrade Now"');
  console.log('   4. Paystack popup opens');
  console.log('   5. Enter test card details');
  console.log('   6. Complete authentication (PIN + OTP)');
  console.log('   7. Payment success!\n');

  console.log(`${colors.bright}${colors.cyan}STEP 5: Verify Results${colors.reset}`);
  console.log('   After successful payment, verify:');
  console.log('   • User sees success message');
  console.log('   • Page reloads with new tier');
  console.log('   • Database updated (run verification below)\n');

  console.log(`${colors.bright}${colors.magenta}📋 Ready to test? Follow the steps above!${colors.reset}\n`);
}

async function verifyPaymentForUser(email) {
  section('STEP 5: Verifying Payment Data');

  console.log(`Searching for user: ${colors.cyan}${email}${colors.reset}\n`);

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    log(colors.red, '❌', 'User not found');
    return;
  }

  log(colors.green, '✅', `Found user: ${profile.display_name || 'Unknown'} (${profile.user_id})`);

  // Get user subscription
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      subscription_tiers (name, price_monthly, price_annual)
    `)
    .eq('user_id', profile.user_id)
    .single();

  if (subError) {
    log(colors.yellow, '⚠️', `Subscription error: ${subError.message}`);
  } else {
    console.log(`\n${colors.bright}Current Subscription:${colors.reset}`);
    console.log(`   Tier: ${colors.green}${subscription.subscription_tiers.name}${colors.reset}`);
    console.log(`   Status: ${subscription.status === 'active' ? colors.green : colors.yellow}${subscription.status}${colors.reset}`);
    console.log(`   Billing: ${subscription.billing_cycle}`);
    console.log(`   Provider: ${subscription.payment_provider || 'N/A'}`);
    console.log(`   Reference: ${subscription.payment_reference || 'N/A'}`);
  }

  // Get payment transactions
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    log(colors.yellow, '⚠️', `Transactions error: ${txError.message}`);
  } else if (transactions && transactions.length > 0) {
    console.log(`\n${colors.bright}Recent Transactions:${colors.reset}`);
    transactions.forEach((tx, index) => {
      const statusColor = tx.status === 'success' ? colors.green : tx.status === 'failed' ? colors.red : colors.yellow;
      console.log(`\n   ${index + 1}. ${statusColor}${tx.status.toUpperCase()}${colors.reset}`);
      console.log(`      Amount: ₦${(tx.amount / 100).toLocaleString()}`);
      console.log(`      Reference: ${tx.payment_reference}`);
      console.log(`      Date: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`      Provider: ${tx.payment_provider}`);
    });
  } else {
    log(colors.yellow, '⚠️', 'No transactions found');
  }
}

async function main() {
  header('🧪 PAYSTACK SUBSCRIPTION PAYMENT TESTER');

  // Step 1: Check environment
  const envOk = await checkEnvironmentVariables();
  if (!envOk) {
    console.log(`\n${colors.red}${colors.bright}⚠️  Fix environment variables before continuing!${colors.reset}\n`);
    process.exit(1);
  }

  // Step 2: Check tiers
  const tiers = await checkSubscriptionTiers();
  if (!tiers) {
    process.exit(1);
  }

  // Step 3: Check payment transactions
  await checkPaymentTransactions();

  // Step 4: Check webhook
  await checkWebhookFunction();

  // Show testing guide
  await showTestingGuide();

  // Ask if user wants to verify a payment
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n${colors.bright}Do you want to verify payment for a specific user? (y/n): ${colors.reset}`, async (answer) => {
    if (answer.toLowerCase() === 'y') {
      rl.question(`${colors.cyan}Enter user email: ${colors.reset}`, async (email) => {
        await verifyPaymentForUser(email.trim());
        rl.close();
      });
    } else {
      rl.close();
    }
  });
}

main().catch(console.error);
