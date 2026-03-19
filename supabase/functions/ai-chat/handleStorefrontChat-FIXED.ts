// FIXED handleStorefrontChat - Now saves all conversations for store owner visibility
import { SupabaseClient } from '@supabase/supabase-js';

async function handleStorefrontChatFixed(
  supabase: SupabaseClient,
  message: string,
  storeSlug: string,
  storeInfo: any,
  sessionId: string = 'default',
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    sourcePage?: string;
  }
) {
  console.log('[StorefrontChat-FIXED] Processing with visibility tracking:', {
    storeSlug,
    sessionId,
    messageLength: message.length
  });

  try {
    // 1. Get store information
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id, business_name, whatsapp_number, store_slug')
      .eq('store_slug', storeSlug)
      .single();

    if (storeError || !store) {
      console.error('[StorefrontChat-FIXED] Store not found:', storeSlug);
      return {
        error: 'Store not found',
        response: 'Sorry, this store is not available right now.'
      };
    }

    // 2. Create or get conversation (CRITICAL FIX - Now we always create one!)
    let conversation;
    const { data: existingConv } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('store_id', store.id)
      .single();

    if (existingConv) {
      conversation = existingConv;

      // Update last activity
      await supabase
        .from('ai_chat_conversations')
        .update({
          updated_at: new Date().toISOString(),
          visitor_name: visitorInfo?.name || existingConv.visitor_name,
          visitor_email: visitorInfo?.email || existingConv.visitor_email,
          visitor_phone: visitorInfo?.phone || existingConv.visitor_phone,
        })
        .eq('id', existingConv.id);
    } else {
      // Create new conversation for this storefront visitor
      const { data: newConv, error: convError } = await supabase
        .from('ai_chat_conversations')
        .insert({
          session_id: sessionId,
          store_id: store.id,
          context_type: 'storefront',
          user_type: 'visitor',
          is_storefront: true,
          visitor_name: visitorInfo?.name,
          visitor_email: visitorInfo?.email,
          visitor_phone: visitorInfo?.phone,
          source_page: visitorInfo?.sourcePage || 'storefront',
        })
        .select()
        .single();

      if (convError) {
        console.error('[StorefrontChat-FIXED] Failed to create conversation:', convError);
        // Continue without saving, but log the error
      } else {
        conversation = newConv;

        // 3. Create notification for store owner (new chat alert!)
        if (store.user_id) {
          await supabase
            .from('chat_notifications')
            .insert({
              store_id: store.id,
              conversation_id: newConv.id,
              user_id: store.user_id,
              type: 'new_chat',
              title: '💬 New Customer Chat',
              message: `Someone started chatting on your store: "${message.substring(0, 50)}..."`,
            });
        }
      }
    }

    // 4. Save the visitor's message (CRITICAL - this was missing!)
    if (conversation) {
      const { error: msgError } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: conversation.id,
          store_id: store.id,
          role: 'user',
          content: message,
        });

      if (msgError) {
        console.error('[StorefrontChat-FIXED] Failed to save message:', msgError);
      }
    }

    // 5. Get conversation history for context
    let history = [];
    if (conversation) {
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(10); // Last 10 messages for context

      history = messages || [];
    }

    // 6. Process the message and generate response
    // (Keep existing logic for spam detection, rate limiting, etc.)

    // For now, use the existing response generation logic
    // This would be your existing handleStorefrontChat logic
    let aiResponse = await generateStorefrontResponse(
      message,
      store,
      storeInfo,
      history
    );

    // 7. Save the AI's response (CRITICAL - store owner needs to see this!)
    if (conversation) {
      const { error: respError } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: conversation.id,
          store_id: store.id,
          role: 'assistant',
          content: aiResponse,
        });

      if (respError) {
        console.error('[StorefrontChat-FIXED] Failed to save AI response:', respError);
      }

      // 8. Check if this is a high-intent message and notify owner
      if (isHighIntentMessage(message)) {
        await supabase
          .from('chat_notifications')
          .insert({
            store_id: store.id,
            conversation_id: conversation.id,
            user_id: store.user_id,
            type: 'high_intent',
            title: '🔥 High-Intent Customer!',
            message: `Customer asking about: "${message.substring(0, 100)}..."`,
          });
      }
    }

    // 9. Return response to visitor
    return {
      response: aiResponse,
      conversation_id: conversation?.id,
      store_id: store.id,
      saved: !!conversation,
    };

  } catch (error) {
    console.error('[StorefrontChat-FIXED] Unexpected error:', error);
    return {
      error: 'An error occurred',
      response: 'Sorry, I encountered an issue. Please try again.',
    };
  }
}

// Helper function to detect high-intent messages
function isHighIntentMessage(message: string): boolean {
  const highIntentPatterns = [
    /\bbuy\b/i,
    /\bpurchase\b/i,
    /\border\b/i,
    /\bbulk\b/i,
    /\bwholesale\b/i,
    /\bprice\b.*\bfor\b.*\d+/i, // "price for 10 units"
    /\bhow\s+much\s+for\b/i,
    /\bdelivery\b.*\btoday\b/i,
    /\burgent\b/i,
    /\bneed\b.*\bimmediately\b/i,
    /\bcustom/i,
    /\b\d+\s+(pieces?|units?|items?)\b/i, // "50 pieces"
  ];

  return highIntentPatterns.some(pattern => pattern.test(message));
}

// Placeholder for existing response generation logic
async function generateStorefrontResponse(
  message: string,
  store: any,
  storeInfo: any,
  history: any[]
): Promise<string> {
  // This would contain your existing logic for:
  // - FAQ matching
  // - Product search
  // - AI response generation
  // Just return a placeholder for now
  return `Thank you for your message. Our team will assist you shortly. For immediate help, you can WhatsApp us at ${store.whatsapp_number}`;
}

export { handleStorefrontChatFixed };