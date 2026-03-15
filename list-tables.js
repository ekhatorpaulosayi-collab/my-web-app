import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Try to find user in auth.users
const { data, error } = await supabase.auth.admin.listUsers();

if (error) {
  console.log('Error:', error.message);
} else {
  const user = data.users.find(u => u.email === 'ekhatorpaulosayi@gmail.com');
  if (user) {
    console.log('\n✅ User found in auth.users:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Created:', new Date(user.created_at).toLocaleString());
  } else {
    console.log('\n❌ User not found');
  }
}
