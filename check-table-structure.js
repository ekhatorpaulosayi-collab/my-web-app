import { createClient } from '@supabase/supabase-js';

const url = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const key = 'public-anon-placeholder';

const supabase = createClient(url, key);

// Try to get any record
const { data, error } = await supabase
  .from('user_subscriptions')
  .select('*')
  .limit(1);

console.log('Error:', error);
console.log('Data:', data);
