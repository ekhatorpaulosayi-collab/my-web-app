/**
 * Configure Twilio WhatsApp Sandbox Webhook
 */

const TWILIO_ACCOUNT_SID = 'AC6d6d2f304af0fa4c7aa8e1fa9145dcd1'
const TWILIO_AUTH_TOKEN = '3250edfee92b81c02e1cf3c67126336c'
const WEBHOOK_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/whatsapp-webhook'

async function configureWebhook() {
  console.log('🔧 Configuring Twilio webhook...\n')
  console.log('Webhook URL:', WEBHOOK_URL, '\n')

  // Update sandbox settings
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  try {
    console.log('📝 Instructions:')
    console.log('1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox')
    console.log('2. Paste this webhook URL in "WHEN A MESSAGE COMES IN":')
    console.log('   ' + WEBHOOK_URL)
    console.log('3. Set method to: POST')
    console.log('4. Click Save')
    console.log('\n✅ Then test by sending a message to the bot!')
    console.log('   Send: "Hi" or "Price of rice" to +1 415 523 8886')
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

configureWebhook()
