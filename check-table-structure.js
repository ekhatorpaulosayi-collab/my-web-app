function requireAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    console.error("Set SUPABASE_ANON_KEY to your project's anon key from the dashboard.");
    process.exit(1);
  }
  return key;
}

import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const key = requireAnonKey();

const supabase = createClient(url, key);

// Try to get any record
const { data, error } = await supabase
  .from('user_subscriptions')
  .select('*')
  .limit(1);

console.log('Error:', error);
console.log('Data:', data);
