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
    const { conversationId, message, agentId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get last customer message language
    const { data: lastCustomerMsg } = await supabase
      .from('ai_chat_messages')
      .select('detected_language')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .not('detected_language', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let translatedText = null;
    const customerLanguage = lastCustomerMsg?.detected_language;

    if (customerLanguage && customerLanguage.toLowerCase() !== 'english') {
      // Translate owner's message to customer's language
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
      } catch (e) {
        console.error('[Translation] Error translating owner message:', e);
      }
    }

    // Save owner message with translation
    const { data: savedMessage, error: insertError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: message,
        is_agent_message: true,
        agent_id: agentId,
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