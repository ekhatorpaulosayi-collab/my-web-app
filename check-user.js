import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const email = 'ekhatorpaulosayi@gmail.com';
  
  console.log('\n🔍 Checking user:', email, '\n');
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .eq('email', email)
    .single();

  if (error) {
    console.log('❌ User not found:', error.message);
    return;
  }

  console.log('✅ User found:');
  console.log('   User ID:', profile.user_id);
  console.log('   Name:', profile.display_name || 'Not set');
  console.log('   Email:', profile.email);

  // Check subscription
  const { data: sub, error: subError } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      subscription_tiers (name)
    `)
    .eq('user_id', profile.user_id)
    .single();

  if (subError) {
    console.log('\n⚠️  No subscription found (will be created on first payment)');
  } else {
    console.log('\n📊 Current Subscription:');
    console.log('   Tier:', sub.subscription_tiers?.name || 'Unknown');
    console.log('   Status:', sub.status);
    console.log('   Billing:', sub.billing_cycle);
  }
}

checkUser().catch(console.error);
