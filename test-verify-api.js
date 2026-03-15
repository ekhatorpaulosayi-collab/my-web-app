import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(url, anonKey);

console.log('\n🧪 Testing verify-subscription API...\n');

// First, sign in to get a session
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'ijeek69@gmail.com',
  password: 'password123' // You'll need to provide the actual password
});

if (authError) {
  console.log('❌ Auth error:', authError.message);
  console.log('Please provide the correct password for ijeek69@gmail.com');
  process.exit(1);
}

console.log('✅ Authenticated as:', authData.user.email);
console.log('Access token:', authData.session.access_token.substring(0, 20) + '...\n');

// Now call the verify-subscription API
console.log('Calling verify-subscription API...\n');

const response = await fetch(`${url}/functions/v1/verify-subscription`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authData.session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerEmail: 'ijeek69@gmail.com',
    planCode: 'PLN_v79xzrcn8pzussc' // Pro Monthly
  })
});

const result = await response.json();

console.log('Response status:', response.status);
console.log('Response:', JSON.stringify(result, null, 2));

if (result.success) {
  console.log('\n✅ SUCCESS! Subscription synced.');
} else {
  console.log('\n❌ FAILED:', result.error);
}
