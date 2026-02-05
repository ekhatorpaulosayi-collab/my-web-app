/**
 * Check stores table schema
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkStoresSchema() {
  console.log('🔍 Checking stores table schema...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get one store to see available columns
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .limit(5)

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  if (!stores || stores.length === 0) {
    console.log('❌ No stores found')
    return
  }

  console.log(`✅ Found ${stores.length} store(s)\n`)

  // Show column names
  const columns = Object.keys(stores[0])
  console.log('📋 Available columns:')
  columns.forEach(col => console.log(`   - ${col}`))

  console.log('\n\n📦 STORE SAMPLES:\n')

  stores.forEach((store, index) => {
    console.log(`Store ${index + 1}:`)
    console.log(`   ID: ${store.id}`)
    console.log(`   User ID: ${store.user_id}`)
    console.log(`   Business Name: ${store.business_name || 'Not set'}`)
    console.log(`   Store Slug: ${store.store_slug || 'Not set'}`)
    console.log(`   Is Public: ${store.is_public ? 'Yes ✅' : 'No ❌'}`)
    console.log(`   About Us: ${store.about_us ? 'Set ✅ (' + store.about_us.length + ' chars)' : 'Not set ❌'}`)
    console.log(`   Delivery Areas: ${store.delivery_areas ? 'Set ✅' : 'Not set ❌'}`)
    console.log(`   Return Policy: ${store.return_policy ? 'Set ✅' : 'Not set ❌'}`)
    console.log(`   WhatsApp: ${store.whatsapp_number ? 'Set ✅' : 'Not set ❌'}`)
    console.log(`   Address: ${store.address || 'Not set'}`)
    console.log(`   Phone: ${store.phone || 'Not set'}`)

    if (store.is_public && store.store_slug) {
      console.log(`   \n   🌐 Storefront URL: https://www.storehouse.ng/store/${store.store_slug}`)
    }
    console.log()
  })
}

checkStoresSchema().catch(console.error)
