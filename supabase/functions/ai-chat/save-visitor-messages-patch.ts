/**
 * ENHANCED CHAT MESSAGE SAVING - INCLUDES VISITOR/CUSTOMER MESSAGES
 * This patch fixes the critical issue where visitor chats are not saved
 * Apply this to the ai-chat Edge Function
 */

/**
 * Enhanced saveChatMessage function that saves ALL messages including visitors
 * REPLACE the existing saveChatMessage function with this one
 */
async function saveChatMessage(
  supabase: any,
  userId: string | null,
  storeId: string | null,
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokensUsed: number = 0,
  contextType: string,
  metadata: any = {},
  visitorInfo?: {
    ip?: string;
    storeSlug?: string;
    name?: string;
    email?: string;
    phone?: string;
  }
): Promise<void> {
  try {
    // CRITICAL FIX: Save messages for BOTH authenticated users AND visitors
    const messageData: any = {
      user_id: userId || null,  // Allow null for visitors
      store_id: storeId,
      session_id: sessionId,
      role,
      content: content.substring(0, 10000),
      tokens_used: tokensUsed,
      context_type: contextType,
      metadata,
      is_visitor: !userId,  // Mark as visitor if no userId
      created_at: new Date().toISOString()
    };

    // Add visitor info if available
    if (visitorInfo) {
      messageData.visitor_ip = visitorInfo.ip;
      messageData.store_slug = visitorInfo.storeSlug;
      messageData.visitor_name = visitorInfo.name;
      messageData.visitor_email = visitorInfo.email;
      messageData.visitor_phone = visitorInfo.phone;
    }

    // Save the message
    const { error } = await supabase.from('ai_chat_messages').insert(messageData);

    if (error) {
      console.error('[saveChatMessage] Database error:', error);
    } else {
      console.log('[saveChatMessage] Saved message for:', {
        userId: userId || 'visitor',
        sessionId,
        role,
        contextType,
        storeSlug: visitorInfo?.storeSlug
      });
    }
  } catch (error) {
    console.error('[saveChatMessage] Error:', error);
  }
}

/**
 * Function to extract visitor information from the message
 * This captures contact info if the visitor provides it
 */
function extractVisitorInfo(message: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  const info: any = {};

  // Extract email
  const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    info.email = emailMatch[0];
  }

  // Extract phone (Nigeria format)
  const phoneMatch = message.match(/\b(?:\+234|234|0)?[789][01]\d{8}\b/);
  if (phoneMatch) {
    info.phone = phoneMatch[0];
  }

  // Extract name (if they say "I am" or "My name is")
  const nameMatch = message.match(/(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) {
    info.name = nameMatch[1];
  }

  return info;
}

/**
 * INTEGRATION INSTRUCTIONS:
 *
 * 1. In the main serve() function, REPLACE the call to saveChatMessage with:
 *
 * // For user messages (around line 650-700 where user message is processed)
 * await saveChatMessage(
 *   supabase,
 *   userId,
 *   storeId,
 *   sessionId,
 *   'user',
 *   message,
 *   0,
 *   contextType,
 *   { language: detectedLanguage },
 *   {
 *     ip: ipAddress,
 *     storeSlug: storeSlug,
 *     ...extractVisitorInfo(message)  // Capture contact info if provided
 *   }
 * );
 *
 * // For assistant messages (around line 800-850 after generating response)
 * await saveChatMessage(
 *   supabase,
 *   userId,
 *   storeId,
 *   sessionId,
 *   'assistant',
 *   aiResponse,
 *   tokensUsed,
 *   contextType,
 *   {
 *     cached: cacheHit,
 *     responseTime: responseTimeMs
 *   },
 *   {
 *     ip: ipAddress,
 *     storeSlug: storeSlug
 *   }
 * );
 *
 * 2. For storefront chats specifically, ensure you pass the storeSlug:
 *
 * if (contextType === 'storefront' || contextType === 'storefront_visitor') {
 *   // Get store information from the request
 *   const storeSlug = requestData.storeSlug || requestData.store_slug;
 *
 *   // Pass it to saveChatMessage
 *   await saveChatMessage(
 *     supabase,
 *     userId,
 *     storeId,
 *     sessionId,
 *     role,
 *     content,
 *     tokensUsed,
 *     'storefront_visitor',  // Use specific context for visitors
 *     metadata,
 *     {
 *       ip: ipAddress,
 *       storeSlug: storeSlug,
 *       ...extractVisitorInfo(message)
 *     }
 *   );
 * }
 *
 * 3. IMPORTANT: Make sure the storeId is correctly retrieved for storefront chats:
 *
 * // For storefront context, get store ID from slug
 * if ((contextType === 'storefront' || contextType === 'storefront_visitor') && storeSlug) {
 *   const { data: storeData } = await supabase
 *     .from('stores')
 *     .select('id')
 *     .eq('slug', storeSlug)
 *     .single();
 *
 *   if (storeData) {
 *     storeId = storeData.id;
 *   }
 * }
 */

export { saveChatMessage, extractVisitorInfo };