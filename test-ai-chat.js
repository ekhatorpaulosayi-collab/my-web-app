/**
 * Test AI Chat Widget - Find stores and test chat functionality
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testAIChatWidget() {
  console.log('🧪 Testing AI Chat Widget...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Find stores with complete information for testing
  const { data: stores, error } = await supabase
    .from('stores')
    .select(`
      id,
      user_id,
      business_name,
      store_slug,
      is_public,
      about_us,
      delivery_areas,
      delivery_time,
      return_policy,
      whatsapp_number,
      address
    `)
    .eq('is_public', true)
    .limit(5)

  if (error) {
    console.log('❌ Error fetching stores:', error.message)
    return
  }

  if (!stores || stores.length === 0) {
    console.log('❌ No public stores found in database')
    console.log('   Create a store first by:')
    console.log('   1. Running the app: npm run dev')
    console.log('   2. Sign up/login')
    console.log('   3. Go to Settings > Online Store')
    console.log('   4. Fill in store details and make it public')
    return
  }

  console.log(`✅ Found ${stores.length} public store(s)\n`)

  // Display stores with their data completeness
  stores.forEach((store, index) => {
    console.log(`\n📦 Store ${index + 1}: ${store.business_name || 'Unnamed Store'}`)
    console.log(`   🔗 Store Slug: ${store.store_slug}`)
    console.log(`   🌐 URL: https://www.storehouse.ng/store/${store.store_slug}`)
    console.log(`   👤 User ID: ${store.user_id}`)
    console.log(`   \n   📋 Store Information Completeness:`)
    console.log(`      About Us: ${store.about_us ? '✅ Set (' + store.about_us.length + ' chars)' : '❌ Missing'}`)
    console.log(`      Delivery Areas: ${store.delivery_areas ? '✅ Set' : '❌ Missing'}`)
    console.log(`      Delivery Time: ${store.delivery_time ? '✅ Set' : '❌ Missing'}`)
    console.log(`      Return Policy: ${store.return_policy ? '✅ Set' : '❌ Missing'}`)
    console.log(`      WhatsApp: ${store.whatsapp_number ? '✅ Set' : '❌ Missing'}`)
    console.log(`      Address: ${store.address ? '✅ Set' : '❌ Missing'}`)

    // Calculate completeness score
    const fields = ['about_us', 'delivery_areas', 'delivery_time', 'return_policy', 'whatsapp_number', 'address']
    const filledFields = fields.filter(field => store[field]).length
    const completeness = Math.round((filledFields / fields.length) * 100)
    console.log(`   \n   📊 Completeness: ${completeness}% (${filledFields}/${fields.length} fields)`)

    if (completeness === 100) {
      console.log('   ⭐ PERFECT! This store has all info for intelligent AI chat!')
    } else if (completeness >= 50) {
      console.log('   ⚠️  Some fields missing - AI chat will work but not be fully intelligent')
    } else {
      console.log('   ❌ Low completeness - AI chat will give generic responses')
    }
  })

  // Pick the best store for testing (highest completeness)
  const bestStore = stores.reduce((best, current) => {
    const fields = ['about_us', 'delivery_areas', 'delivery_time', 'return_policy', 'whatsapp_number', 'address']
    const currentScore = fields.filter(field => current[field]).length
    const bestScore = fields.filter(field => best[field]).length
    return currentScore > bestScore ? current : best
  })

  console.log('\n\n🎯 RECOMMENDED STORE FOR TESTING:')
  console.log(`   Name: ${bestStore.business_name || 'Unnamed Store'}`)
  console.log(`   Slug: ${bestStore.store_slug}`)
  console.log(`   \n   🧪 Test URLs:`)
  console.log(`      Production: https://www.storehouse.ng/store/${bestStore.store_slug}`)
  console.log(`      Local: http://localhost:5173/store/${bestStore.store_slug}`)

  console.log('\n\n📝 TEST QUESTIONS TO ASK THE AI CHAT WIDGET:')
  console.log('   1. "What is this store about?"')
  console.log('   2. "Do you deliver to Lagos?" (or any area)')
  console.log('   3. "How long does delivery take?"')
  console.log('   4. "What\'s your return policy?"')
  console.log('   5. "How can I contact you?"')

  console.log('\n\n🔍 HOW TO VERIFY THE FIX:')
  console.log('   1. Open browser DevTools (F12)')
  console.log('   2. Go to Console tab')
  console.log('   3. Visit the storefront URL above')
  console.log('   4. Open chat widget (bottom right corner)')
  console.log('   5. Look for console logs:')
  console.log('      ✅ "[AIChatWidget] Fetching store info for: {slug}"')
  console.log('      ✅ "[AIChatWidget] Store info fetched successfully"')
  console.log('   6. Ask the test questions above')
  console.log('   7. AI should respond with ACTUAL store data, not generic responses')

  console.log('\n\n💡 EXPECTED BEHAVIOR:')
  if (bestStore.delivery_areas) {
    console.log(`   "Do you deliver?" → Should mention: "${bestStore.delivery_areas}"`)
  }
  if (bestStore.return_policy) {
    console.log(`   "Return policy?" → Should explain: "${bestStore.return_policy.substring(0, 60)}..."`)
  }
  if (bestStore.whatsapp_number) {
    console.log(`   "Contact?" → Should provide: "${bestStore.whatsapp_number}"`)
  }

  console.log('\n✅ Test setup complete!')
}

testAIChatWidget().catch(console.error)
