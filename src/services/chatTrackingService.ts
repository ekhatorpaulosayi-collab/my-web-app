// Service to track storefront chat conversations
import { supabase } from '../lib/supabase';

export interface ChatTrackingData {
  storeSlug: string;
  sessionId: string;
  message: string;
  response: string;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export async function trackStorefrontChat(data: ChatTrackingData) {
  try {
    console.log('[ChatTracking] Starting to track conversation...');

    // Step 1: Get store ID from slug
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_slug', data.storeSlug)
      .single();

    if (storeError || !store) {
      console.error('[ChatTracking] Store not found:', data.storeSlug);
      return false;
    }

    console.log('[ChatTracking] Found store:', store.id);

    // Step 2: Create or update conversation
    const conversationData = {
      session_id: data.sessionId,
      store_id: store.id,
      context_type: 'storefront',
      is_storefront: true,
      source_page: `/store/${data.storeSlug}`,
      visitor_name: data.visitorInfo?.name,
      visitor_email: data.visitorInfo?.email,
      visitor_phone: data.visitorInfo?.phone,
      updated_at: new Date().toISOString(),
    };

    const { data: conversation, error: convError } = await supabase
      .from('ai_chat_conversations')
      .upsert(conversationData, {
        onConflict: 'session_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (convError || !conversation) {
      console.error('[ChatTracking] Failed to create conversation:', convError);
      return false;
    }

    console.log('[ChatTracking] Conversation saved:', conversation.id);

    // Step 3: Save both messages (user and assistant)
    const messages = [
      {
        conversation_id: conversation.id,
        store_id: store.id,
        role: 'user' as const,
        content: data.message,
      },
      {
        conversation_id: conversation.id,
        store_id: store.id,
        role: 'assistant' as const,
        content: data.response,
      },
    ];

    const { error: msgError } = await supabase
      .from('ai_chat_messages')
      .insert(messages);

    if (msgError) {
      console.error('[ChatTracking] Failed to save messages:', msgError);
      return false;
    }

    console.log('[ChatTracking] Messages saved successfully!');
    return true;

  } catch (error) {
    console.error('[ChatTracking] Unexpected error:', error);
    return false;
  }
}