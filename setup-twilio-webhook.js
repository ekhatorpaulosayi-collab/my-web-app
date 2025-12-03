/**
 * Automatically configure Twilio WhatsApp Sandbox Webhook
 */

const TWILIO_ACCOUNT_SID = 'AC6d6d2f304af0fa4c7aa8e1fa9145dcd1'
const TWILIO_AUTH_TOKEN = '3250edfee92b81c02e1cf3c67126336c'
const WEBHOOK_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/whatsapp-webhook'

async function configureSandboxWebhook() {
  console.log('🔧 Configuring Twilio WhatsApp Sandbox webhook...\n')

  // Twilio's sandbox configuration endpoint
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Sandbox/WhatsApp.json`

  const params = new URLSearchParams({
    SmsUrl: WEBHOOK_URL,
    SmsMethod: 'POST',
    StatusCallback: WEBHOOK_URL + '/status'
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
      const errorText = await response.text()
      console.error('❌ Twilio API Error:', errorText)

      console.log('\n📝 Manual Configuration Required:')
      console.log('1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox')
      console.log('2. Scroll to "Sandbox Configuration"')
      console.log('3. Find "WHEN A MESSAGE COMES IN"')
      console.log('4. Paste this URL:')
      console.log('   👉 ' + WEBHOOK_URL)
      console.log('5. Make sure "HTTP POST" is selected')
      console.log('6. Click "Save"')
      console.log('\n✅ That\'s it!')
      return
    }

    const result = await response.json()

    console.log('✅ SUCCESS! Webhook configured!\n')
    console.log('📋 Configuration:')
    console.log('   Webhook URL:', WEBHOOK_URL)
    console.log('   Method: POST')
    console.log('   Phone Number:', result.phone_number || '+1 415 523 8886')
    console.log('\n🎉 Your WhatsApp bot is now live!')
    console.log('\n📱 Test it now:')
    console.log('   1. Open WhatsApp on your phone')
    console.log('   2. Send a message to: +1 415 523 8886')
    console.log('   3. Try: "Hi" or "Price of rice" or "What products do you have?"')
    console.log('\n⏰ The bot will respond automatically!')

  } catch (error) {
    console.error('❌ Error:', error.message)

    console.log('\n📝 Manual Configuration:')
    console.log('Since automatic config failed, please do it manually:')
    console.log('1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox')
    console.log('2. Find "WHEN A MESSAGE COMES IN"')
    console.log('3. Paste: ' + WEBHOOK_URL)
    console.log('4. Select: HTTP POST')
    console.log('5. Click Save')
  }
}

configureSandboxWebhook()
