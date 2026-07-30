import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ============================================================
    // AUTH CHECK — added 2026-05-01 to close H7 in security audit.
    // Without this, anyone who knew a conversation UUID could inject
    // arbitrary "agent" messages by spoofing agentId.
    // ============================================================
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.warn('[SendAgentMessage] Invalid token:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, message, agentId } = await req.json();

    console.log('[SendAgentMessage] Starting - conversationId:', conversationId, 'authUser:', user.id);
    console.log('[SendAgentMessage] Message to send:', message);

    // ============================================================
    // OWNERSHIP CHECK — verify the authenticated caller owns the
    // store that owns this conversation. stores.user_id is TEXT,
    // so coerce user.id with String() to match RLS predicate
    // (user_id = auth.uid()::text). agentId in the request body
    // is treated as untrusted; we use user.id as the truth.
    // ============================================================
    const { data: conv, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('id, store_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convError || !conv) {
      console.warn('[SendAgentMessage] Conversation not found:', convError?.message);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('id', conv.store_id)
      .maybeSingle();

    if (storeError || !store) {
      console.warn('[SendAgentMessage] Store not found for conversation:', storeError?.message);
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (String(store.user_id) !== String(user.id)) {
      console.warn('[SendAgentMessage] User does not own store', {
        authUser: user.id,
        storeOwner: store.user_id,
      });
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Force agent_id to the verified caller — never trust the body.
    const verifiedAgentId = user.id;

    // Get last customer message language - look for ALL customer messages
    console.log('[SendAgentMessage] Querying for customer language...');
    const { data: customerMessages, error: queryError } = await supabase
      .from('ai_chat_messages')
      .select('detected_language, content, role')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('[SendAgentMessage] Customer messages query result:', {
      error: queryError,
      messagesFound: customerMessages?.length || 0,
      messages: customerMessages?.map(m => ({
        role: m.role,
        detected_language: m.detected_language,
        contentPreview: m.content?.substring(0, 30)
      }))
    });

    // Find the first message with a detected language
    const lastCustomerMsg = customerMessages?.find(msg => msg.detected_language && msg.detected_language !== null);

    console.log('[SendAgentMessage] Found customer message with language:', lastCustomerMsg);

    let translatedText = null;
    const customerLanguage = lastCustomerMsg?.detected_language;

    console.log('[SendAgentMessage] Customer language detected:', customerLanguage);

    if (customerLanguage && customerLanguage.toLowerCase() !== 'english' && customerLanguage.toLowerCase() !== 'en') {
      // Translate owner's message to customer's language
      console.log('[SendAgentMessage] Attempting translation to:', customerLanguage);
      try {
        const reverseTranslation = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Translate this message to ${customerLanguage}. Respond with ONLY the translated text, nothing else. Keep it natural and conversational.`
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 200,
            temperature: 0
          })
        });

        const reverseData = await reverseTranslation.json();
        translatedText = reverseData.choices[0].message.content.trim();
        console.log('[SendAgentMessage] Translation successful:', translatedText);
      } catch (e) {
        console.error('[SendAgentMessage] Error translating owner message:', e);
      }
    } else {
      console.log('[SendAgentMessage] No translation needed - customer language is English or not detected');
    }

    // Save owner message with translation
    const { data: savedMessage, error: insertError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: message,
        is_agent_message: true,
        agent_id: verifiedAgentId,
        sender_type: 'agent',
        detected_language: 'english',
        translated_text: translatedText
      })
      .select()
      .single();

    if (insertError) {
      console.error('[SendAgentMessage] Error inserting message:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: savedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[SendAgentMessage] Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});