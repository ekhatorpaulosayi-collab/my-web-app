// TRACKING ADDITIONS FOR AI CHAT
// This file contains ONLY the new tracking functions to add
// Apply these changes WITHOUT modifying existing RAG, language, or validation logic

import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

//=============================================================================
// ADD THESE NEW FUNCTIONS (don't replace existing ones)
//=============================================================================

/**
 * Check monthly usage limit for authenticated users
 * ADD THIS FUNCTION - DON'T MODIFY EXISTING checkAndIncrementRateLimit
 */
async function checkMonthlyUsageLimit(
  supabase: any,
  userId: string
): Promise<{ allowed: boolean; remaining: number; tierLimit: number; tierName: string }> {
  try {
    // Get user's subscription tier
    const { data: userStore } = await supabase
      .from('user_stores')
      .select('stores(subscription_tier)')
      .eq('user_id', userId)
      .single();

    const tierName = userStore?.stores?.subscription_tier || 'Free';

    // Get tier limits
    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('max_ai_chats_monthly')
      .eq('name', tierName)
      .single();

    const tierLimit = tier?.max_ai_chats_monthly || 10;

    // Get current month usage
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data: usage } = await supabase
      .from('ai_chat_usage')
      .select('chat_count')
      .eq('user_id', userId)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    const currentCount = usage?.chat_count || 0;
    const remaining = Math.max(0, tierLimit - currentCount);

    return {
      allowed: currentCount < tierLimit,
      remaining,
      tierLimit,
      tierName
    };
  } catch (error) {
    console.error('[checkMonthlyUsageLimit] Error:', error);
    return { allowed: true, remaining: 10, tierLimit: 10, tierName: 'Free' };
  }
}

/**
 * Increment monthly usage for authenticated users
 * ADD THIS FUNCTION
 */
async function incrementMonthlyUsage(
  supabase: any,
  userId: string,
  storeId: string | null,
  tierName: string,
  tierLimit: number
): Promise<void> {
  try {
    await supabase.rpc('increment_ai_chat_usage', {
      p_user_id: userId,
      p_store_id: storeId,
      p_tier_name: tierName,
      p_tier_limit: tierLimit
    });
  } catch (error) {
    console.error('[incrementMonthlyUsage] Error:', error);
  }
}

/**
 * Save chat message to history
 * ADD THIS FUNCTION
 */
async function saveChatMessage(
  supabase: any,
  userId: string | null,
  storeId: string | null,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  tokensUsed: number = 0,
  contextType: string,
  metadata: any = {}
): Promise<void> {
  try {
    // IMPORTANT: Save ALL messages, including visitor messages
    // No longer checking for userId - we want to save visitor messages too!

    await supabase.from('ai_chat_messages').insert({
      user_id: userId,
      store_id: storeId,
      session_id: sessionId,
      role,
      content: content.substring(0, 10000),
      tokens_used: tokensUsed,
      context_type: contextType,
      metadata
    });
  } catch (error) {
    console.error('[saveChatMessage] Error:', error);
  }
}

/**
 * Enhanced analytics tracking
 * ADD THIS FUNCTION - ENHANCES EXISTING trackChatEvent
 */
async function trackEnhancedAnalytics(
  supabase: any,
  eventType: string,
  userId: string | null,
  storeId: string | null,
  sessionId: string,
  visitorIp: string | null,
  contextType: string,
  responseTimeMs: number = 0,
  tokensUsed: number = 0,
  cacheHit: boolean = false,
  metadata: any = {}
): Promise<void> {
  try {
    await supabase.from('ai_chat_analytics').insert({
      event_type: eventType,
      user_id: userId,
      store_id: storeId,
      session_id: sessionId,
      visitor_ip: visitorIp,
      context_type: contextType,
      response_time_ms: responseTimeMs,
      tokens_used: tokensUsed,
      cache_hit: cacheHit,
      metadata
    });
  } catch (error) {
    console.error('[trackEnhancedAnalytics] Error:', error);
  }
}

/**
 * Simple response caching
 * ADD THIS FUNCTION
 */
async function checkAndSaveCache(
  supabase: any,
  message: string,
  response: string,
  contextType: string,
  language: string,
  mode: 'check' | 'save'
): Promise<{ hit: boolean; cachedResponse?: string }> {
  try {
    // Generate hash
    const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');
    const key = `${contextType}:${language}:${normalized}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const queryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (mode === 'check') {
      const { data } = await supabase
        .from('ai_response_cache')
        .select('response')
        .eq('query_hash', queryHash)
        .single();

      if (data) {
        // Update hit count
        await supabase
          .from('ai_response_cache')
          .update({
            hit_count: data.hit_count + 1,
            last_accessed: new Date().toISOString()
          })
          .eq('query_hash', queryHash);

        return { hit: true, cachedResponse: data.response };
      }
      return { hit: false };
    } else {
      // Save mode - only cache good responses
      if (response.length >= 50 && response.length <= 2000) {
        await supabase.from('ai_response_cache').insert({
          query_hash: queryHash,
          query_text: message.substring(0, 500),
          response: response,
          context_type: contextType,
          language: language,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      return { hit: false };
    }
  } catch (error) {
    console.error('[checkAndSaveCache] Error:', error);
    return { hit: false };
  }
}

//=============================================================================
// INTEGRATION POINTS - Add these to the main serve function
//=============================================================================

/*
ADD THESE SNIPPETS TO THE MAIN serve() FUNCTION:

1. AFTER GETTING userId (around line 530):
--------------------------------------------
let storeId: string | null = null;
if (userId) {
  const { data: userStore } = await supabase
    .from('user_stores')
    .select('store_id')
    .eq('user_id', userId)
    .single();
  storeId = userStore?.store_id;
}

2. BEFORE RATE LIMITING FOR VISITORS (around line 550):
---------------------------------------------------------
// Check monthly limit for authenticated users
if (userId) {
  const usageCheck = await checkMonthlyUsageLimit(supabase, userId);
  if (!usageCheck.allowed) {
    await trackEnhancedAnalytics(
      supabase,
      'monthly_limit_exceeded',
      userId,
      storeId,
      sessionId,
      ipAddress,
      contextType,
      0, 0, false,
      { tier: usageCheck.tierName, limit: usageCheck.tierLimit }
    );

    return jsonResponse({
      error: 'monthly_limit_exceeded',
      message: `You've reached your monthly limit of ${usageCheck.tierLimit} AI chats. Upgrade for more!`,
      remaining: 0
    });
  }
}

3. BEFORE CALLING OPENAI (check cache):
----------------------------------------
const language = detectLanguage(message);
const cacheResult = await checkAndSaveCache(
  supabase,
  message,
  '',
  contextType,
  language,
  'check'
);

if (cacheResult.hit && cacheResult.cachedResponse) {
  // Increment usage even for cached responses
  if (userId) {
    const usageCheck = await checkMonthlyUsageLimit(supabase, userId);
    await incrementMonthlyUsage(supabase, userId, storeId, usageCheck.tierName, usageCheck.tierLimit);
  }

  await trackEnhancedAnalytics(
    supabase,
    'cache_hit',
    userId,
    storeId,
    sessionId,
    ipAddress,
    contextType,
    0, 0, true,
    { language }
  );

  return jsonResponse({
    response: cacheResult.cachedResponse,
    cached: true
  });
}

4. AFTER GETTING OPENAI RESPONSE:
----------------------------------
// Save messages to history
await saveChatMessage(supabase, userId, storeId, sessionId, 'user', message, 0, contextType, { language });
await saveChatMessage(supabase, userId, storeId, sessionId, 'assistant', content, tokensUsed, contextType, { language });

// Save to cache
await checkAndSaveCache(supabase, message, content, contextType, language, 'save');

// Increment usage
if (userId) {
  const usageCheck = await checkMonthlyUsageLimit(supabase, userId);
  await incrementMonthlyUsage(supabase, userId, storeId, usageCheck.tierName, usageCheck.tierLimit);
}

// Track completion
await trackEnhancedAnalytics(
  supabase,
  'chat_completion',
  userId,
  storeId,
  sessionId,
  ipAddress,
  contextType,
  responseTime,
  tokensUsed,
  false,
  { language }
);

5. IMPORTANT - DO NOT MODIFY:
-----------------------------
- Keep ALL existing RAG logic
- Keep ALL language detection and multi-language responses
- Keep ALL validation and sanitization
- Keep ALL storefront context logic
- Keep ALL off-topic detection
- Keep ALL spam filters
- Just ADD the tracking on top

*/