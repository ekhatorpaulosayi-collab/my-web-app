// WhatsApp Webhook Handler - Receives and responds to WhatsApp messages
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse incoming WhatsApp webhook
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    // Handle 360dialog format
    if (body.messages && body.messages.length > 0) {
      const message = body.messages[0];
      const customerPhone = message.from; // Customer's WhatsApp number
      const customerMessage = message.text?.body || '';
      const shopWhatsAppNumber = body.contacts?.[0]?.wa_id; // Shop's WhatsApp number

      // If no message text, ignore (could be image, voice, etc.)
      if (!customerMessage) {
        return new Response(JSON.stringify({ status: 'ignored', reason: 'no_text' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Find which shop owner has this WhatsApp number
      const { data: settings, error: settingsError } = await supabase
        .from('whatsapp_settings')
        .select('user_id, business_phone, greeting_message, out_of_stock_message, is_enabled')
        .or(`business_phone.eq.${shopWhatsAppNumber},twilio_whatsapp_number.eq.whatsapp:+${shopWhatsAppNumber}`)
        .eq('is_enabled', true)
        .single();

      if (settingsError || !settings) {
        console.error('Shop not found for number:', shopWhatsAppNumber);
        return new Response(JSON.stringify({ status: 'error', message: 'Shop not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      const userId = settings.user_id;

      // Check if shop has quota remaining
      const { data: canChat } = await supabase.rpc('increment_chat_usage', {
        p_user_id: userId,
      });

      if (!canChat) {
        // Send quota exceeded message
        await sendWhatsAppMessage(
          shopWhatsAppNumber,
          customerPhone,
          "⚠️ This business has reached their monthly chat limit. Please contact them directly at their shop.",
          settings
        );
        return new Response(JSON.stringify({ status: 'quota_exceeded' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Search shop's products based on customer message
      const productNames = extractProductKeywords(customerMessage);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, quantity, category')
        .eq('user_id', userId)
        .or(productNames.map(name => `name.ilike.%${name}%`).join(','))
        .limit(5);

      console.log('Found products:', products?.length || 0);

      // Generate AI response using Claude
      const startTime = Date.now();
      const aiResponse = await generateAIResponse(
        customerMessage,
        products || [],
        settings.greeting_message,
        settings.out_of_stock_message
      );
      const responseTime = Date.now() - startTime;

      // Send response via WhatsApp
      await sendWhatsAppMessage(shopWhatsAppNumber, customerPhone, aiResponse, settings);

      // Log the chat
      await supabase.from('whatsapp_chats').insert({
        user_id: userId,
        customer_phone: customerPhone,
        customer_message: customerMessage,
        bot_response: aiResponse,
        products_mentioned: products?.map(p => p.id) || [],
        response_time_ms: responseTime,
      });

      return new Response(JSON.stringify({ status: 'success', response_time_ms: responseTime }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If webhook format not recognized, return 200 to avoid retries
    return new Response(JSON.stringify({ status: 'ignored', reason: 'unknown_format' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Extract product keywords from customer message
function extractProductKeywords(message: string): string[] {
  const normalized = message.toLowerCase();

  // Common product-related words to extract
  const words = normalized
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2) // At least 3 characters
    .filter(word => !['how', 'much', 'the', 'what', 'price', 'cost', 'does', 'you', 'have', 'any', 'can', 'get', 'want', 'need', 'looking', 'for'].includes(word));

  return words.slice(0, 5); // Max 5 keywords
}

// Generate AI response using Claude
async function generateAIResponse(
  customerMessage: string,
  products: any[],
  greetingMessage: string,
  outOfStockMessage: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "Sorry, AI is currently unavailable. Please contact the shop directly.";
  }

  const prompt = `You are a helpful WhatsApp chatbot for a retail shop in Nigeria. A customer just sent this message:

"${customerMessage}"

Available products in the shop:
${products.length > 0 ? products.map(p =>
  `- ${p.name}: ₦${p.price.toLocaleString()} (${p.quantity > 0 ? `${p.quantity} in stock` : 'OUT OF STOCK'})`
).join('\n') : 'No matching products found in inventory.'}

Instructions:
1. If products are found, list them with prices and stock status
2. Be friendly and concise (max 3-4 lines)
3. Use Nigerian Naira (₦) for prices
4. If customer asks about a product not in stock or not found, politely say it's unavailable
5. End with "Reply with the product name to get more details!" if products are found
6. Use emojis sparingly (1-2 max)

Generate a helpful response:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    const data = await response.json();

    if (data.content && data.content[0]?.text) {
      return data.content[0].text.trim();
    } else {
      throw new Error('Invalid response from Claude API');
    }
  } catch (error) {
    console.error('Claude API error:', error);

    // Fallback response if AI fails
    if (products.length > 0) {
      return `📱 Found these products:\n\n${products.map(p =>
        `${p.name}: ₦${p.price.toLocaleString()} ${p.quantity > 0 ? `(${p.quantity} available)` : '(Out of stock)'}`
      ).join('\n')}\n\nReply with product name for more details!`;
    } else {
      return "Sorry, I couldn't find that product. Please contact the shop for assistance.";
    }
  }
}

// Send WhatsApp message via 360dialog or Twilio
async function sendWhatsAppMessage(
  from: string,
  to: string,
  message: string,
  settings: any
): Promise<void> {
  // Determine if using 360dialog or Twilio based on settings
  const use360Dialog = settings.business_phone && settings.business_phone.startsWith('+');

  if (use360Dialog) {
    // Use 360dialog API (white-label model)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get platform API key (your master 360dialog key)
    const { data: platformConfig } = await supabase
      .from('platform_config')
      .select('api_key')
      .single();

    if (!platformConfig?.api_key) {
      console.error('No platform API key found');
      return;
    }

    await fetch('https://waba.360dialog.io/v1/messages', {
      method: 'POST',
      headers: {
        'D360-API-KEY': platformConfig.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to,
        type: 'text',
        text: { body: message },
      }),
    });
  } else {
    // Use Twilio API (customer self-setup model)
    const twilioSid = settings.twilio_account_sid;
    const twilioToken = settings.twilio_auth_token;
    const twilioNumber = settings.twilio_whatsapp_number;

    if (!twilioSid || !twilioToken || !twilioNumber) {
      console.error('Twilio credentials not found');
      return;
    }

    const auth = btoa(`${twilioSid}:${twilioToken}`);

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioNumber,
        To: `whatsapp:${to}`,
        Body: message,
      }),
    });
  }
}
