/**
 * Check your online store configuration
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkMyStore() {
  console.log('🔍 Checking your online store...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get your user ID
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('❌ Not logged in')
    return
  }

  console.log('👤 Your User ID:', user.id)
  console.log('📧 Your Email:', user.email, '\n')

  // Check if you have a store
  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.log('❌ No store found for your account')
    console.log('Error:', error.message)
    console.log('\n📝 To create a store:')
    console.log('   1. Go to: http://localhost:5173/online-store')
    console.log('   2. Fill in your store details')
    console.log('   3. Click Save')
    return
  }

  console.log('✅ Store found!\n')
  console.log('Store Details:')
  console.log('  Name:', store.store_name)
  console.log('  Slug:', store.slug)
  console.log('  Subdomain:', store.subdomain || 'Not set')
  console.log('  Custom Domain:', store.custom_domain || 'Not set')
  console.log('  Is Public:', store.is_public ? 'Yes ✅' : 'No ❌')
  console.log('  Phone:', store.phone)
  console.log('  Address:', store.address)

  console.log('\n🌐 Your Store URLs:')
  console.log('  Local:', `http://localhost:5173/store/${store.slug}`)

  if (store.subdomain) {
    console.log('  Subdomain:', `https://${store.subdomain}.storehouse.app`)
  }

  if (store.custom_domain) {
    console.log('  Custom Domain:', `https://${store.custom_domain}`)
  }

  console.log('\n⚙️ Configure Store:')
  console.log('  http://localhost:5173/online-store')

  // Check how many products are public
  const { data: products } = await supabase
    .from('products')
    .select('id, name, is_public')
    .eq('user_id', user.id)

  const publicProducts = products?.filter(p => p.is_public).length || 0
  const totalProducts = products?.length || 0

  console.log('\n📦 Products:')
  console.log(`  Total: ${totalProducts}`)
  console.log(`  Public: ${publicProducts} (visible in store)`)
  console.log(`  Private: ${totalProducts - publicProducts}`)

  if (publicProducts === 0) {
    console.log('\n⚠️  No public products! Customers can\'t see anything.')
    console.log('   To make products public:')
    console.log('   1. Go to Dashboard > Products')
    console.log('   2. Click "Make Public" on products')
  }

  if (!store.is_public) {
    console.log('\n⚠️  Store is PRIVATE - customers can\'t access it!')
    console.log('   To make public: Go to /online-store and toggle "Make store public"')
  }
}

checkMyStore().catch(console.error)
