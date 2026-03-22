/**
 * AI Response Cache Helper
 * Implements caching layer to reduce OpenAI API calls by 40%
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CacheCheckResult {
  hit: boolean;
  response?: string;
}

interface CacheOptions {
  storeId?: string;
  productContext?: any;
}

/**
 * Check if a response is cached for the given query
 */
export async function checkCache(
  supabase: any,
  query: string,
  options: CacheOptions = {}
): Promise<CacheCheckResult> {
  try {
    console.log('[cache] Checking cache for query:', query.substring(0, 50) + '...');

    // Call the database function to get cached response
    const { data, error } = await supabase.rpc('get_cached_response', {
      p_query: query,
      p_store_id: options.storeId || null
    }).single();

    if (error) {
      console.error('[cache] Error checking cache:', error);
      return { hit: false };
    }

    if (data?.cache_hit && data?.response) {
      console.log('[cache] Cache HIT! Returning cached response');
      return {
        hit: true,
        response: data.response
      };
    }

    console.log('[cache] Cache MISS - will call OpenAI');
    return { hit: false };
  } catch (error) {
    console.error('[cache] Exception checking cache:', error);
    // On error, proceed without cache (fail open)
    return { hit: false };
  }
}

/**
 * Save a response to cache
 */
export async function saveToCache(
  supabase: any,
  query: string,
  response: string,
  options: CacheOptions = {}
): Promise<void> {
  try {
    console.log('[cache] Saving response to cache');

    await supabase.rpc('cache_ai_response', {
      p_query: query,
      p_response: response,
      p_store_id: options.storeId || null,
      p_product_context: options.productContext || null
    });

    console.log('[cache] Response cached successfully');
  } catch (error) {
    console.error('[cache] Error saving to cache:', error);
    // Don't fail the request if caching fails
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(supabase: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('cache_performance')
      .select('*')
      .single();

    if (error) {
      console.error('[cache] Error getting stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[cache] Exception getting stats:', error);
    return null;
  }
}

/**
 * Clean up expired cache entries (should be called periodically)
 */
export async function cleanupCache(supabase: any): Promise<void> {
  try {
    await supabase.rpc('cleanup_expired_cache');
    console.log('[cache] Cleanup completed');
  } catch (error) {
    console.error('[cache] Error during cleanup:', error);
  }
}

/**
 * Pre-populate cache with common queries
 * This should be called during initialization or maintenance
 */
export async function prepopulateCommonQueries(supabase: any, storeId?: string): Promise<void> {
  const commonQueries = [
    {
      query: "do you deliver",
      response: "Yes, we offer delivery services! Delivery is available within Lagos, Nigeria. Delivery fees and timeframes vary based on your location. You can see the exact delivery cost at checkout."
    },
    {
      query: "what payment methods do you accept",
      response: "We accept multiple payment methods:\n• Bank Transfer\n• Card Payment (Visa, Mastercard, Verve)\n• Cash on Delivery (Lagos only)\n• Mobile Money\n\nAll payments are secure and encrypted."
    },
    {
      query: "what is your return policy",
      response: "We offer a 7-day return policy. Products must be unused, in original packaging, with receipt. Some items like perishables may not be eligible for returns."
    },
    {
      query: "how long does delivery take",
      response: "Delivery times:\n• Standard: 3-5 business days\n• Express: 1-2 business days\n• Same Day: Orders before 12pm (Lagos only)"
    },
    {
      query: "do you have this in stock",
      response: "I can check our inventory! Please specify which product you're interested in, or browse our store page where stock levels are displayed for each item."
    }
  ];

  for (const { query, response } of commonQueries) {
    await saveToCache(supabase, query, response, { storeId });
  }

  console.log('[cache] Pre-populated common queries');
}

/**
 * Determine if a query should be cached
 * Some queries (like very specific or personal ones) shouldn't be cached
 */
export function shouldCache(query: string): boolean {
  // Don't cache very short queries
  if (query.length < 5) return false;

  // Don't cache queries with personal information (basic check)
  const personalPatterns = [
    /my order/i,
    /order #/i,
    /invoice/i,
    /account/i,
    /password/i,
    /email/i,
    /phone/i,
    /\d{10,}/, // Long numbers (could be phone/order numbers)
  ];

  for (const pattern of personalPatterns) {
    if (pattern.test(query)) {
      console.log('[cache] Query contains personal info, skipping cache');
      return false;
    }
  }

  return true;
}

/**
 * Wrapper function to handle OpenAI calls with caching
 */
export async function cachedOpenAICall(
  supabase: any,
  query: string,
  openAICallFn: () => Promise<string>,
  options: CacheOptions = {}
): Promise<string> {
  // Check if we should cache this query
  if (!shouldCache(query)) {
    console.log('[cache] Query not suitable for caching');
    return await openAICallFn();
  }

  // Check cache first
  const cacheResult = await checkCache(supabase, query, options);

  if (cacheResult.hit && cacheResult.response) {
    // Return cached response
    return cacheResult.response;
  }

  // Cache miss - call OpenAI
  const response = await openAICallFn();

  // Save to cache for future use
  if (response && response.length > 0) {
    await saveToCache(supabase, query, response, options);
  }

  return response;
}