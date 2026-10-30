function requireAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    console.error("Set SUPABASE_ANON_KEY to your project's anon key from the dashboard.");
    process.exit(1);
  }
  return key;
}

/**
 * Check stores table schema
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  requireAnonKey()
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('store_slug', 'paul-pahhggygggffffg')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('\n📋 Store columns:');
  console.log(JSON.stringify(Object.keys(data), null, 2));
  console.log('\n📦 Store data:');
  console.log(JSON.stringify(data, null, 2));
}

checkSchema();
