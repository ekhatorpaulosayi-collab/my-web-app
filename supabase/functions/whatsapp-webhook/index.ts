// DO NOT DEPLOY.
// This handler parses 360dialog JSON and Twilio form posts. It checks
// x-360dialog-signature (D360_PLATFORM_SECRET) for 360dialog and
// X-Twilio-Signature (the shop twilio_auth_token) for Twilio.
// Twilio's signature uses WHATSAPP_WEBHOOK_PUBLIC_URL. An unset or invalid
// value refuses the request. The forwarded host is not a source for that URL.
// A provider message id is claimed with INSERT ... ON CONFLICT DO NOTHING
// and status pending before any reply work. It becomes sent after the reply
// is sent. A failed send deletes the pending row. Pending rows older than
// 2 minutes can be claimed again. Sent rows older than 7 days are removed
// about every 50 requests, or once an hour. A message with no id is
// deduplicated by a hash that includes a 2-minute time bucket. A failed
// send does not count against the chat quota.
// This branch does not deploy the function. The live copy is turned off
// only by the delete command in DEPLOY_ORDER.md.
//
// The rate limit is per server instance. recentHits lives in this isolate.
// A second instance does not share the count, and a restart clears it.
// It is not a shared store. The same is true of memorySeen until
// whatsapp_seen_messages exists.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { messageFallbackId } from '../_shared/messageFallbackId.ts';
import {
  CLEANUP_EVERY,
  CLEANUP_INTERVAL_MS,
  MemorySeenStore,
  PENDING_TTL_MS,
  SENT_TTL_MS,
  claimDelivery,
  type SeenStore,
} from '../_shared/seenClaim.ts';
import { twilioPublicUrl } from '../_shared/twilioPublicUrl.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;

const recentHits = new Map<string, number[]>();
const memorySeen = new MemorySeenStore();
let claimsSinceCleanup = 0;
let lastCleanupAt = Date.now();
const SHOP_SELECT = 'user_id, business_phone, greeting_message, out_of_stock_message, is_enabled, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number';

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

async function hmacHex(secret: string, raw: string, hash: 'SHA-1' | 'SHA-256') {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(signed)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 360dialog signs the raw body with the platform secret.
// Header: x-360dialog-signature. Algorithm: HMAC-SHA256 hex.
async function dialogSignatureMatches(raw: string, header: string | null) {
  const secret = Deno.env.get('D360_PLATFORM_SECRET') || '';
  if (!secret || !header) return false;
  const expected = await hmacHex(secret, raw, 'SHA-256');
  return timingSafeEqual(expected, header.trim().toLowerCase());
}

// Twilio signs the request URL plus the form fields, sorted by name.
// A repeated value for one field is signed once. Header: X-Twilio-Signature.
// Algorithm: HMAC-SHA1, base64.
async function twilioSignatureMatches(url: string, params: URLSearchParams, header: string | null, authToken: string) {
  if (!authToken || !header) return false;
  const keys = Array.from(new Set(Array.from(params.keys()))).sort();
  let signed = url;
  for (const key of keys) {
    const values = Array.from(new Set(params.getAll(key))).sort();
    for (const value of values) signed += key + value;
  }
  const hex = await hmacHex(authToken, signed, 'SHA-1');
  const bytes = hex.match(/../g)!.map((pair) => parseInt(pair, 16));
  const expected = btoa(String.fromCharCode(...bytes));
  return timingSafeEqual(expected, header.trim());
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

function cleanProviderMessageId(value: unknown) {
  const id = String(value || '').trim();
  if (!id || id.length > 256 || !/^[\w.:+/=-]{1,256}$/.test(id)) return '';
  return id;
}

function missingSeenStore(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

function seenStore(supabase: any): SeenStore {
  return {
    async releaseExpiredPending(id, cutoffMs) {
      const { error } = await supabase
        .from('whatsapp_seen_messages')
        .delete()
        .eq('provider_message_id', id)
        .eq('status', 'pending')
        .lte('seen_at', new Date(cutoffMs).toISOString());
      if (error) throw error;
    },
    async insertPending(id, at) {
      // INSERT ... ON CONFLICT DO NOTHING. One concurrent delivery gets the pending row.
      const { data, error } = await supabase
        .from('whatsapp_seen_messages')
        .upsert(
          { provider_message_id: id, status: 'pending', seen_at: new Date(at).toISOString() },
          { onConflict: 'provider_message_id', ignoreDuplicates: true },
        )
        .select('provider_message_id');
      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    },
    async markSent(id) {
      const { error } = await supabase
        .from('whatsapp_seen_messages')
        .update({ status: 'sent', seen_at: new Date().toISOString() })
        .eq('provider_message_id', id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    async releasePending(id) {
      const { error } = await supabase
        .from('whatsapp_seen_messages')
        .delete()
        .eq('provider_message_id', id)
        .eq('status', 'pending');
      if (error) throw error;
    },
  };
}

async function maybeCleanup(supabase: any) {
  claimsSinceCleanup += 1;
  const now = Date.now();
  if (claimsSinceCleanup < CLEANUP_EVERY && now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  claimsSinceCleanup = 0;
  lastCleanupAt = now;
  const sentCutoff = new Date(now - SENT_TTL_MS).toISOString();
  const pendingCutoff = new Date(now - PENDING_TTL_MS).toISOString();
  const sent = await supabase.from('whatsapp_seen_messages').delete().eq('status', 'sent').lt('seen_at', sentCutoff);
  if (sent.error) {
    if (!missingSeenStore(sent.error)) console.error('Seen-message cleanup error', sent.error.code || 'error');
    return;
  }
  const pending = await supabase.from('whatsapp_seen_messages').delete().eq('status', 'pending').lt('seen_at', pendingCutoff);
  if (pending.error && !missingSeenStore(pending.error)) console.error('Seen-message cleanup error', pending.error.code || 'error');
}

async function claimIncoming(supabase: any, id: string) {
  await maybeCleanup(supabase);
  try {
    return await claimDelivery(seenStore(supabase), id);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (missingSeenStore({ code })) return claimDelivery(memorySeen, id);
    console.error('Seen-message store error', code || 'error');
    throw error;
  }
}

async function markSent(supabase: any, id: string) {
  try {
    await seenStore(supabase).markSent(id);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (!missingSeenStore({ code })) {
      console.error('Seen-message store error', code || 'error');
      throw error;
    }
  }
  await memorySeen.markSent(id);
}

async function releaseClaim(supabase: any, id: string) {
  try {
    await seenStore(supabase).releasePending(id);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (!missingSeenStore({ code })) {
      console.error('Seen-message store error', code || 'error');
      throw error;
    }
  }
  await memorySeen.releasePending(id);
}

async function chatQuotaOpen(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('monthly_chat_limit, chats_used_this_month')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  if (!data) return true;
  return Number(data.chats_used_this_month) < Number(data.monthly_chat_limit);
}

function readDialogMessage(body: any) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const envelope = value && Array.isArray(value.messages) ? value : null;
  const source = envelope || body;
  if (!source?.messages || source.messages.length === 0) return null;
  const message = source.messages[0];
  return {
    customerPhone: digitsOnly(message.from),
    customerMessage: message.text?.body || '',
    shopDigits: digitsOnly(envelope?.metadata?.display_phone_number || body?.contacts?.[0]?.wa_id),
    providerMessageId: cleanProviderMessageId(message.id),
  };
}

async function findShop(supabase: any, shopDigits: string) {
  let settingsResult = shopDigits
    ? await supabase.from('whatsapp_settings').select(SHOP_SELECT).eq('business_phone', shopDigits).eq('is_enabled', true).maybeSingle()
    : { data: null, error: null };
  if (!settingsResult.data && shopDigits) {
    settingsResult = await supabase.from('whatsapp_settings').select(SHOP_SELECT).eq('business_phone', `+${shopDigits}`).eq('is_enabled', true).maybeSingle();
  }
  if (!settingsResult.data && shopDigits) {
    settingsResult = await supabase.from('whatsapp_settings').select(SHOP_SELECT).eq('twilio_whatsapp_number', `whatsapp:+${shopDigits}`).eq('is_enabled', true).maybeSingle();
  }
  return settingsResult;
}

async function handleTextMessage(supabase: any, customerPhone: string, customerMessage: string, shopDigits: string, providerMessageId: string) {
  if ((await claimIncoming(supabase, providerMessageId)) !== 'claimed') {
    return json({ status: 'ignored', reason: 'replay' }, 200);
  }

  try {
    if (!customerPhone || !allowSender(customerPhone)) {
      await releaseClaim(supabase, providerMessageId);
      return json({ status: 'rate_limited' }, 429);
    }

    const settingsResult = await findShop(supabase, shopDigits);
    const settings = settingsResult.data;
    const settingsError = settingsResult.error;

    if (settingsError || !settings) {
      console.error('Shop not found for number ending', shopDigits.slice(-4));
      await releaseClaim(supabase, providerMessageId);
      return json({ status: 'error', message: 'Shop not found' }, 404);
    }

    const userId = settings.user_id;
    if (!(await chatQuotaOpen(supabase, userId))) {
      const sent = await sendWhatsAppMessage(
        shopDigits,
        customerPhone,
        "⚠️ This business has reached their monthly chat limit. Please contact them directly at their shop.",
        settings
      );
      if (!sent) {
        await releaseClaim(supabase, providerMessageId);
        return json({ status: 'error' }, 500);
      }
      await markSent(supabase, providerMessageId);
      return json({ status: 'quota_exceeded' }, 200);
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

    const startTime = Date.now();
    const aiResponse = await generateAIResponse(
      customerMessage,
      products || [],
      settings.greeting_message,
      settings.out_of_stock_message
    );
    const responseTime = Date.now() - startTime;

    const sent = await sendWhatsAppMessage(shopDigits, customerPhone, aiResponse, settings);
    if (!sent) {
      await releaseClaim(supabase, providerMessageId);
      return json({ status: 'error' }, 500);
    }
    await markSent(supabase, providerMessageId);
    await supabase.rpc('increment_chat_usage', { p_user_id: userId });

    await supabase.from('whatsapp_chats').insert({
      user_id: userId,
      customer_phone: customerPhone,
      customer_message: customerMessage,
      bot_response: aiResponse,
      products_mentioned: products?.map(p => p.id) || [],
      response_time_ms: responseTime,
    });

    return json({ status: 'success', response_time_ms: responseTime }, 200);
  } catch (error) {
    try {
      await releaseClaim(supabase, providerMessageId);
    } catch {
      // releaseClaim already logged a store error.
    }
    throw error;
  }
}

serve(async (req) => {
  if (Deno.env.get('WHATSAPP_WEBHOOK_DISABLED') === 'true') {
    return json({ status: 'disabled' }, 404);
  }
  const signedUrl = twilioPublicUrl(Deno.env.get('WHATSAPP_WEBHOOK_PUBLIC_URL') || '');
  if (!signedUrl) return json({ status: 'unauthorized' }, 401);

  try {
    const raw = await req.text();
    const contentType = req.headers.get('content-type') || '';
    const twilioHeader = req.headers.get('x-twilio-signature');
    const isTwilio = contentType.includes('application/x-www-form-urlencoded') || Boolean(twilioHeader && !contentType.includes('json'));
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (isTwilio) {
      const params = new URLSearchParams(raw);
      const shopDigits = digitsOnly(params.get('To'));
      const settingsResult = await findShop(supabase, shopDigits);
      const authToken = settingsResult.data?.twilio_auth_token || '';
      if (!(await twilioSignatureMatches(signedUrl, params, twilioHeader, authToken))) {
        return json({ status: 'unauthorized' }, 401);
      }
      const customerMessage = params.get('Body') || '';
      if (!customerMessage) return json({ status: 'ignored', reason: 'no_text' }, 200);
      const providerMessageId = cleanProviderMessageId(params.get('MessageSid'))
        || await messageFallbackId(['twilio', shopDigits, digitsOnly(params.get('From')), customerMessage]);
      return handleTextMessage(supabase, digitsOnly(params.get('From')), customerMessage, shopDigits, providerMessageId);
    }

    if (!(await dialogSignatureMatches(raw, req.headers.get('x-360dialog-signature')))) {
      return json({ status: 'unauthorized' }, 401);
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ status: 'bad_request' }, 400);
    }

    const inbound = readDialogMessage(body);
    if (!inbound) return json({ status: 'ignored', reason: 'unknown_format' }, 200);
    if (!inbound.customerMessage) return json({ status: 'ignored', reason: 'no_text' }, 200);
    const providerMessageId = inbound.providerMessageId
      || await messageFallbackId(['360dialog', inbound.shopDigits, inbound.customerPhone, inbound.customerMessage]);
    return handleTextMessage(supabase, inbound.customerPhone, inbound.customerMessage, inbound.shopDigits, providerMessageId);
  } catch (error) {
    console.error('Webhook error', error instanceof Error ? error.name : 'Error');
    return json({ status: 'error' }, 500);
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
): Promise<boolean> {
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
      return false;
    }

    const response = await fetch('https://waba.360dialog.io/v1/messages', {
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
    if (!response.ok) {
      console.error('WhatsApp send failed', response.status);
      return false;
    }
    return true;
  } else {
    // Use Twilio API (customer self-setup model)
    const twilioSid = settings.twilio_account_sid;
    const twilioToken = settings.twilio_auth_token;
    const twilioNumber = settings.twilio_whatsapp_number;

    if (!twilioSid || !twilioToken || !twilioNumber) {
      console.error('Twilio credentials not found');
      return false;
    }

    const auth = btoa(`${twilioSid}:${twilioToken}`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
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
    if (!response.ok) {
      console.error('WhatsApp send failed', response.status);
      return false;
    }
    return true;
  }
}
