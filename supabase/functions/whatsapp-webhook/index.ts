// WhatsApp Webhook Handler - Receives and responds to WhatsApp messages
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;

// Per isolate. A second instance does not share this count.
const recentHits = new Map<string, number[]>();

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function signatureMatches(raw: string, header: string | null) {
  const secret = Deno.env.get('WHATSAPP_APP_SECRET') || '';
  if (!secret || !header) return false;
  const provided = header.trim().replace(/^sha256=/i, '').toLowerCase();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const expected = Array.from(new Uint8Array(signed)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, provided);
}

function allowSender(phone: string) {
  const now = Date.now();
  const recent = (recentHits.get(phone) || []).filter((at) => now - at < 60_000);
  if (recent.length >= 8) {
    recentHits.set(phone, recent);
    return false;
  }
  recent.push(now);
  recentHits.set(phone, recent);
  return true;
}

function safeKeywords(message: string) {
  return extractProductKeywords(message).filter((word) => /^[a-z0-9]+$/.test(word));
}

serve(async (req) => {
  if (Deno.env.get('WHATSAPP_WEBHOOK_DISABLED') === 'true') {
    return json({ status: 'disabled' }, 404);
  }

  try {
    const raw = await req.text();
    if (!(await signatureMatches(raw, req.headers.get('x-hub-signature-256')))) {
      return json({ status: 'unauthorized' }, 401);
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ status: 'bad_request' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle 360dialog format
    if (body.messages && body.messages.length > 0) {
      const message = body.messages[0];
      const customerPhone = digitsOnly(message.from);
      const customerMessage = message.text?.body || '';
      const shopDigits = digitsOnly(body.contacts?.[0]?.wa_id);

      // If no message text, ignore (could be image, voice, etc.)
      if (!customerMessage) {
        return new Response(JSON.stringify({ status: 'ignored', reason: 'no_text' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      if (!customerPhone || !allowSender(customerPhone)) {
        return json({ status: 'rate_limited' }, 429);
      }

      const shopSelect = 'user_id, business_phone, greeting_message, out_of_stock_message, is_enabled, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number';
      let settingsResult = shopDigits
        ? await supabase.from('whatsapp_settings').select(shopSelect).eq('business_phone', shopDigits).eq('is_enabled', true).maybeSingle()
        : { data: null, error: null };
      if (!settingsResult.data && shopDigits) {
        settingsResult = await supabase.from('whatsapp_settings').select(shopSelect).eq('business_phone', `+${shopDigits}`).eq('is_enabled', true).maybeSingle();
      }
      if (!settingsResult.data && shopDigits) {
        settingsResult = await supabase.from('whatsapp_settings').select(shopSelect).eq('twilio_whatsapp_number', `whatsapp:+${shopDigits}`).eq('is_enabled', true).maybeSingle();
      }
      const settings = settingsResult.data;
      const settingsError = settingsResult.error;

      if (settingsError || !settings) {
        console.error('Shop not found for number ending', shopDigits.slice(-4));
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
          shopDigits,
          customerPhone,
          "⚠️ This business has reached their monthly chat limit. Please contact them directly at their shop.",
          settings
        );
        return new Response(JSON.stringify({ status: 'quota_exceeded' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const productNames = safeKeywords(customerMessage);
      let products: any[] = [];
      if (productNames.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, quantity, category')
          .eq('user_id', userId)
          .or(productNames.map((name) => `name.ilike.%${name}%`).join(','))
          .limit(5);
        products = data || [];
      }

      console.log('Found products:', products.length);

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
      await sendWhatsAppMessage(shopDigits, customerPhone, aiResponse, settings);

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
    console.error('Webhook error', error instanceof Error ? error.name : 'Error');
    return new Response(JSON.stringify({ status: 'error' }), {
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
