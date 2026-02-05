import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStoresSchema() {
  console.log('\n📋 Checking stores table schema...\n');

  // Get column info using information_schema
  const { data, error } = await supabase
    .rpc('get_table_info', { table_name: 'stores' })
    .select();

  if (error) {
    console.log('RPC not available, checking with direct query...');

    // Get all stores to see current state
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, store_slug, business_name, is_public, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (storesError) {
      console.log('❌ Error:', storesError.message);
    } else {
      console.log('📊 Recent stores:');
      console.log('━'.repeat(80));
      stores.forEach(s => {
        console.log(`Store: ${s.business_name}`);
        console.log(`  Slug: ${s.store_slug}`);
        console.log(`  Public: ${s.is_public ? '✅ YES' : '❌ NO'}`);
        console.log(`  Created: ${new Date(s.created_at).toLocaleDateString()}`);
        console.log('');
      });

      const publicCount = stores.filter(s => s.is_public).length;
      const privateCount = stores.filter(s => !s.is_public).length;

      console.log('━'.repeat(80));
      console.log(`\n📊 Summary (last 5 stores):`);
      console.log(`   Public: ${publicCount}`);
      console.log(`   Private: ${privateCount}`);
      console.log(`\n⚠️  ${privateCount > 0 ? 'ISSUE DETECTED:' : 'ALL GOOD:'} ${privateCount} stores are private by default\n`);
    }
  }
}

checkStoresSchema().catch(console.error);
