/**
 * Test AI Chat Widget with actual API call
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function testAIChatLive() {
  console.log('🧪 Testing AI Chat Widget with Live API Call...\n')

  // Test store: paulglobal22 (has delivery_areas set)
  const storeSlug = 'paulglobal22'
  const businessName = 'james'

  console.log(`📦 Testing Store: ${businessName}`)
  console.log(`🔗 Store Slug: ${storeSlug}`)
  console.log(`🌐 Storefront: https://www.storehouse.ng/store/${storeSlug}\n`)

  // Simulate the AI chat widget request
  const storeInfo = {
    businessName: 'james',
    aboutUs: null, // Not set in database
    address: null,
    whatsappNumber: '08181742003',
    deliveryAreas: 'Gbagada', // Set in database!
    deliveryTime: null,
    businessHours: null,
    returnPolicy: null
  }

  const testQuestions = [
    {
      question: 'Do you deliver to Gbagada?',
      expectedBehavior: 'Should recognize Gbagada is in delivery_areas and say YES'
    },
    {
      question: 'What areas do you deliver to?',
      expectedBehavior: 'Should mention "Gbagada"'
    },
    {
      question: 'How can I contact you?',
      expectedBehavior: 'Should provide WhatsApp number: 08181742003'
    }
  ]

  console.log('🎯 TEST SCENARIOS:\n')

  for (const test of testQuestions) {
    console.log(`\n❓ Question: "${test.question}"`)
    console.log(`📋 Expected: ${test.expectedBehavior}`)
    console.log(`\n🔄 Calling AI Edge Function...`)

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          message: test.question,
          contextType: 'storefront',
          storeSlug: storeSlug,
          storeInfo: storeInfo,
          userType: 'shopper'
        })
      })

      if (!response.ok) {
        console.log(`❌ API Error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.log(`Error details: ${errorText}`)
        continue
      }

      const data = await response.json()
      console.log(`\n✅ AI Response:\n`)
      console.log(`   "${data.response}"\n`)
      console.log(`   Confidence: ${data.confidence || 'N/A'}`)
      console.log(`   Tokens Used: ${data.tokensUsed || 'N/A'}`)

      // Check if response mentions the expected data
      if (test.question.includes('Gbagada') && data.response.toLowerCase().includes('gbagada')) {
        console.log(`   ✅ PASS: Response mentions Gbagada!`)
      } else if (test.question.includes('areas') && data.response.toLowerCase().includes('gbagada')) {
        console.log(`   ✅ PASS: Response includes delivery area!`)
      } else if (test.question.includes('contact') && data.response.includes('08181742003')) {
        console.log(`   ✅ PASS: Response includes WhatsApp number!`)
      } else {
        console.log(`   ⚠️  Check: Does this response use store-specific data?`)
      }

    } catch (error) {
      console.log(`❌ Request Error: ${error.message}`)
    }

    console.log('\n' + '─'.repeat(80))
  }

  console.log('\n\n💡 MANUAL TEST INSTRUCTIONS:')
  console.log('   1. Visit: https://www.storehouse.ng/store/paulglobal22')
  console.log('   2. Open browser DevTools (F12) → Console tab')
  console.log('   3. Click chat widget (bottom right)')
  console.log('   4. Look for logs:')
  console.log('      "[AIChatWidget] Fetching store info for: paulglobal22"')
  console.log('      "[AIChatWidget] Store info fetched successfully"')
  console.log('   5. Ask: "Do you deliver to Gbagada?"')
  console.log('   6. AI should say YES and mention Gbagada!')
  console.log('\n✅ If you see store-specific responses, the fix is working!')
}

testAIChatLive().catch(console.error)
