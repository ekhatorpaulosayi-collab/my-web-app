/**
 * Test script for WhatsApp Daily Reports
 * Run this to test sending a report to your phone
 */

// CONFIGURE THESE WITH YOUR ACTUAL VALUES:
const TWILIO_ACCOUNT_SID = 'AC6d6d2f304af0fa4c7aa8e1fa9145dcd1' // From Twilio Console
const TWILIO_AUTH_TOKEN = '3250edfee92b81c02e1cf3c67126336c'         // From Twilio Console
const TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886' // Sandbox number
const YOUR_WHATSAPP_NUMBER = 'whatsapp:+447459044300' // Your UK number (that joined sandbox)

// Test message
const testMessage = `🏪 TEST BUSINESS DAILY REPORT
📅 ${new Date().toLocaleDateString('en-NG')}

---------------------------
💰 SALES TODAY
---------------------------
Total Sales: 24 transactions
Revenue: ₦187,500
Profit: ₦58,300 (31% margin)

📊 vs Yesterday: +12% (+ ₦20,000) ↗️

💳 PAYMENT BREAKDOWN
---------------------------
Cash: ₦78,000 (42%)
Transfer: ₦89,500 (48%)
POS: ₦20,000 (11%)

⭐ TOP 3 PRODUCTS SOLD
---------------------------
1. Golden Penny Flour (50kg) x 2
   Profit: ₦10,000

2. Dangote Sugar (1kg) x 27
   Profit: ₦8,100

3. Indomie Noodles x 89
   Profit: ₦2,670

📦 STOCK ALERTS
---------------------------
⚠️ LOW STOCK (Reorder Soon):
• Indomie - 15 packs left
• Coca-Cola 50cl - 8 bottles left

---------------------------
💚 Great day!

Powered by Storehouse 🏪
storehouse.ng

This is a test message!`

async function sendTestReport() {
  console.log('📤 Sending test WhatsApp message...\n')

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const params = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: YOUR_WHATSAPP_NUMBER,
    Body: testMessage,
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twilio API error: ${error}`)
    }

    const result = await response.json()
    console.log('✅ SUCCESS! Message sent!')
    console.log('📱 Message SID:', result.sid)
    console.log('📊 Status:', result.status)
    console.log('\n💬 Check your WhatsApp now!')
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.log('\n🔍 Troubleshooting:')
    console.log('1. Check your Twilio Account SID and Auth Token')
    console.log('2. Make sure you joined the sandbox (send "join ..." to +1 415 523 8886)')
    console.log('3. Verify your WhatsApp number format (include country code)')
  }
}

sendTestReport()
