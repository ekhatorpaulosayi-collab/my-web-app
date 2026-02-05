/**
 * Check stores table schema
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ'
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
