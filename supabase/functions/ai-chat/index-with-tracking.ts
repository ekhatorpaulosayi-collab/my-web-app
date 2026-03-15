// AI Chat - Intelligent Onboarding & Help System with Usage Tracking
// Version: 3.0.0 - Full Tracking & Caching - 2026-03-15
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import {
  getStoreContext,
  searchProducts,
  detectLanguage,
  getLanguageInstruction,
  getLanguageFallback,
  isOffTopic,
  getOffTopicResponse,
  isSpam,
  checkRateLimit,
  trackOffTopicAttempt,
  getRateLimitResponse,
  type StoreContext,
} from './store-context.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface StoreInfo {
  businessName?: string;
  aboutUs?: string;
  address?: string;
  whatsappNumber?: string;
  deliveryAreas?: string;
  deliveryTime?: string;
  businessHours?: string;
  returnPolicy?: string;
}

interface ChatRequest {
  message: string;
  sessionId?: string;
  contextType?: 'onboarding' | 'help' | 'storefront' | 'business-advisory';
  storeSlug?: string;
  storeInfo?: StoreInfo;
  userType?: 'visitor' | 'shopper' | 'user';
  appContext?: any;
  relevantDocs?: any[];
  conversationHistory?: Array<{ role: string; content: string }>;
}

// Conversation state tracking (in-memory for visitors)
interface ConversationState {
  messageCount: number;
  matchedCategories: string[];
  intentScores: {
    buying: number;
    technical: number;
    skeptical: number;
  };
  averageConfidence: number;
  hasSeenCTA: boolean;
}

// In-memory storage for visitor conversation states
const visitorStates = new Map<string, ConversationState>();

//=============================================================================
// ENHANCED ANALYTICS & USAGE TRACKING
//=============================================================================

/**
 * Check if user has reached their monthly AI chat limit
 */
async function checkUsageLimit(
  supabase: any,
  userId: string | null,
  storeId: string | null
): Promise<{ allowed: boolean; remaining: number; tierLimit: number; tierName: string }> {
  try {
    // If no userId, it's a visitor - apply visitor limits
    if (!userId) {
      return {
        allowed: true, // Handled by rate limiting separately
        remaining: 7,
        tierLimit: 7,
        tierName: 'visitor'
      };
    }

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

    const tierLimit = tier?.max_ai_chats_monthly || 10; // Default to Free tier limit

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
    console.error('[checkUsageLimit] Error:', error);
    // On error, be permissive but log
    return {
      allowed: true,
      remaining: 10,
      tierLimit: 10,
      tierName: 'unknown'
    };
  }
}

/**
 * Increment usage counter for authenticated users
 */
async function incrementUsage(
  supabase: any,
  userId: string,
  storeId: string | null,
  tierName: string,
  tierLimit: number
): Promise<boolean> {
  try {
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);

    // Use the database function for atomic increment
    const { data, error } = await supabase.rpc('increment_ai_chat_usage', {
      p_user_id: userId,
      p_store_id: storeId,
      p_tier_name: tierName,
      p_tier_limit: tierLimit
    });

    if (error) {
      console.error('[incrementUsage] Error:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('[incrementUsage] Exception:', error);
    return false;
  }
}

/**
 * Generate hash for caching
 */
function generateCacheKey(message: string, contextType: string, language: string): string {
  const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');
  const key = `${contextType}:${language}:${normalized}`;
  const hash = createHash('sha256');
  hash.update(key);
  return hash.digest('hex');
}

/**
 * Check response cache
 */
async function checkResponseCache(
  supabase: any,
  queryHash: string
): Promise<{ hit: boolean; response?: string }> {
  try {
    const { data } = await supabase
      .from('ai_response_cache')
      .select('response')
      .eq('query_hash', queryHash)
      .single();

    if (data) {
      // Update hit count and last accessed
      await supabase
        .from('ai_response_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('query_hash', queryHash);

      return { hit: true, response: data.response };
    }

    return { hit: false };
  } catch (error) {
    console.error('[checkResponseCache] Error:', error);
    return { hit: false };
  }
}

/**
 * Save response to cache
 */
async function saveToCache(
  supabase: any,
  queryHash: string,
  query: string,
  response: string,
  contextType: string,
  language: string
): Promise<void> {
  try {
    // Only cache responses that are likely to be reused
    if (response.length < 50 || response.length > 2000) return;

    await supabase
      .from('ai_response_cache')
      .insert({
        query_hash: queryHash,
        query_text: query.substring(0, 500), // Truncate for storage
        response: response,
        context_type: contextType,
        language: language,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
  } catch (error) {
    console.error('[saveToCache] Error:', error);
    // Don't fail request if caching fails
  }
}

/**
 * Track chat event with enhanced metrics
 */
async function trackChatEvent(
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
  errorMessage: string | null = null,
  metadata: any = {}
) {
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
      error_message: errorMessage,
      metadata
    });
  } catch (error) {
    console.error('[trackChatEvent] Error:', error);
    // Don't fail the request if analytics fails
  }
}

/**
 * Save chat message to history
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
) {
  try {
    // Only save for authenticated users
    if (!userId) return;

    await supabase.from('ai_chat_messages').insert({
      user_id: userId,
      store_id: storeId,
      session_id: sessionId,
      role,
      content: content.substring(0, 10000), // Truncate very long messages
      tokens_used: tokensUsed,
      context_type: contextType,
      metadata
    });
  } catch (error) {
    console.error('[saveChatMessage] Error:', error);
    // Don't fail the request if saving fails
  }
}

/**
 * Check and increment visitor rate limit
 */
async function checkVisitorRateLimit(
  supabase: any,
  visitorIp: string,
  limit: number = 7
): Promise<{ allowed: boolean; count: number; blockedUntil?: string }> {
  try {
    const { data: existing } = await supabase
      .from('ai_chat_rate_limits')
      .select('*')
      .eq('visitor_ip', visitorIp)
      .single();

    const now = new Date();

    if (existing) {
      // Check if blocked
      if (existing.blocked_until && new Date(existing.blocked_until) > now) {
        return {
          allowed: false,
          count: existing.chat_count,
          blockedUntil: existing.blocked_until
        };
      }

      const lastReset = new Date(existing.last_reset);
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      // Reset after 24 hours
      if (hoursSinceReset >= 24) {
        await supabase
          .from('ai_chat_rate_limits')
          .update({
            chat_count: 1,
            last_reset: now.toISOString(),
            blocked_until: null
          })
          .eq('visitor_ip', visitorIp);
        return { allowed: true, count: 1 };
      } else {
        const newCount = existing.chat_count + 1;
        const isAllowed = newCount <= limit;

        // If exceeded, block for remaining time in 24hr window
        const blockedUntil = !isAllowed
          ? new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null;

        await supabase
          .from('ai_chat_rate_limits')
          .update({
            chat_count: newCount,
            blocked_until: blockedUntil,
            updated_at: now.toISOString()
          })
          .eq('visitor_ip', visitorIp);

        return { allowed: isAllowed, count: newCount, blockedUntil };
      }
    } else {
      // Create new entry
      await supabase
        .from('ai_chat_rate_limits')
        .insert({
          visitor_ip: visitorIp,
          chat_count: 1,
          last_reset: now.toISOString()
        });
      return { allowed: true, count: 1 };
    }
  } catch (error) {
    console.error('[checkVisitorRateLimit] Error:', error);
    // On error, allow the request
    return { allowed: true, count: 0 };
  }
}

// [Rest of the original functions remain the same - sanitization, validation, etc.]

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;
  let storeId: string | null = null;
  let tokensUsed = 0;

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract user ID if authenticated
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;

        // Get user's store
        const { data: userStore } = await supabase
          .from('user_stores')
          .select('store_id')
          .eq('user_id', userId)
          .single();

        storeId = userStore?.store_id;
      }
    }

    const {
      message,
      sessionId = 'default',
      contextType = 'help',
      storeSlug,
      storeInfo,
      userType = userId ? 'user' : 'visitor',
      appContext,
      relevantDocs,
      conversationHistory = []
    } = await req.json() as ChatRequest;

    const visitorIp = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('cf-connecting-ip') ||
                      'unknown';

    // Track request event
    await trackChatEvent(
      supabase,
      'chat_request',
      userId,
      storeId,
      sessionId,
      visitorIp,
      contextType,
      0, 0, false, null,
      { message_preview: message.substring(0, 100) }
    );

    // Check usage limits for authenticated users
    if (userId) {
      const usageCheck = await checkUsageLimit(supabase, userId, storeId);

      if (!usageCheck.allowed) {
        await trackChatEvent(
          supabase,
          'usage_limit_exceeded',
          userId,
          storeId,
          sessionId,
          visitorIp,
          contextType,
          Date.now() - startTime,
          0, false, 'Monthly limit exceeded',
          { tier: usageCheck.tierName, limit: usageCheck.tierLimit }
        );

        return new Response(
          JSON.stringify({
            error: 'monthly_limit_exceeded',
            message: `You've reached your monthly limit of ${usageCheck.tierLimit} AI chats. Upgrade your plan for more!`,
            remaining: 0,
            tierLimit: usageCheck.tierLimit
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // Check visitor rate limits
      const rateCheck = await checkVisitorRateLimit(supabase, visitorIp);

      if (!rateCheck.allowed) {
        await trackChatEvent(
          supabase,
          'rate_limit_exceeded',
          null,
          null,
          sessionId,
          visitorIp,
          contextType,
          Date.now() - startTime,
          0, false, 'Visitor rate limit exceeded',
          { count: rateCheck.count, blockedUntil: rateCheck.blockedUntil }
        );

        return new Response(
          JSON.stringify({
            error: 'rate_limit',
            message: 'You\'ve reached the chat limit for visitors. Please sign up for unlimited access!',
            blockedUntil: rateCheck.blockedUntil
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Detect language
    const language = detectLanguage(message);

    // Generate cache key and check cache
    const cacheKey = generateCacheKey(message, contextType, language);
    const cacheResult = await checkResponseCache(supabase, cacheKey);

    if (cacheResult.hit && cacheResult.response) {
      // Track cache hit
      await trackChatEvent(
        supabase,
        'cache_hit',
        userId,
        storeId,
        sessionId,
        visitorIp,
        contextType,
        Date.now() - startTime,
        0,
        true,
        null,
        { language, cacheKey: cacheKey.substring(0, 8) }
      );

      // Still increment usage for cached responses
      if (userId) {
        const usageCheck = await checkUsageLimit(supabase, userId, storeId);
        await incrementUsage(supabase, userId, storeId, usageCheck.tierName, usageCheck.tierLimit);
      }

      return new Response(
        JSON.stringify({
          response: cacheResult.response,
          cached: true,
          language
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Save user message to history
    await saveChatMessage(
      supabase,
      userId,
      storeId,
      sessionId,
      'user',
      message,
      0,
      contextType,
      { language }
    );

    // [Continue with the rest of the original chat logic - OpenAI call, validation, etc.]
    // This would include all the original sanitization, OpenAI API call, and validation logic

    // For now, return a placeholder to show the structure
    const aiResponse = "This is where the AI response would be generated";
    tokensUsed = 500; // This would be calculated from the actual OpenAI response

    // Save AI response to history
    await saveChatMessage(
      supabase,
      userId,
      storeId,
      sessionId,
      'assistant',
      aiResponse,
      tokensUsed,
      contextType,
      { language }
    );

    // Save to cache if response is good
    await saveToCache(
      supabase,
      cacheKey,
      message,
      aiResponse,
      contextType,
      language
    );

    // Increment usage for authenticated users
    if (userId) {
      const usageCheck = await checkUsageLimit(supabase, userId, storeId);
      await incrementUsage(supabase, userId, storeId, usageCheck.tierName, usageCheck.tierLimit);
    }

    // Track successful completion
    await trackChatEvent(
      supabase,
      'chat_completion',
      userId,
      storeId,
      sessionId,
      visitorIp,
      contextType,
      Date.now() - startTime,
      tokensUsed,
      false,
      null,
      { language }
    );

    return new Response(
      JSON.stringify({
        response: aiResponse,
        cached: false,
        language,
        tokensUsed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[ai-chat] Error:', error);

    // Track error
    await trackChatEvent(
      supabase,
      'chat_error',
      userId,
      storeId,
      'error',
      'unknown',
      'unknown',
      Date.now() - startTime,
      0,
      false,
      error.message,
      { stack: error.stack }
    );

    return new Response(
      JSON.stringify({
        error: 'An error occurred processing your request',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});