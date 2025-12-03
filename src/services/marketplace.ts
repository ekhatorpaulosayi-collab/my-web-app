/**
 * MARKETPLACE SERVICE
 *
 * This service layer prepares Storehouse for future marketplace integration.
 * All functions are safe to call NOW - they gracefully handle marketplace being disabled.
 *
 * When marketplace launches, just flip MARKETPLACE_ENABLED = true
 */

import { supabase } from '../lib/supabase';
import type {
  MarketplaceProduct,
  PublicStore,
  StoreProfile,
  MarketplaceSearchFilters,
  MarketplaceSearchResult,
  AnalyticsEventType,
  StoreAnalytics,
  SubscriptionTier
} from '../types/marketplace';

// ============================================================================
// FEATURE FLAGS
// ============================================================================

const MARKETPLACE_ENABLED = false; // TODO: Set to true when launching marketplace
const PUBLIC_STORES_ENABLED = false;
const PREMIUM_TIERS_ENABLED = false;

/**
 * Check if marketplace features are enabled
 */
export function isMarketplaceEnabled(): boolean {
  return MARKETPLACE_ENABLED;
}

export function arePublicStoresEnabled(): boolean {
  return PUBLIC_STORES_ENABLED;
}

export function arePremiumTiersEnabled(): boolean {
  return PREMIUM_TIERS_ENABLED;
}

// ============================================================================
// STORE MANAGEMENT
// ============================================================================

/**
 * Generate a unique store slug from business name
 * Example: "Fashion Hub Lagos" → "fashion-hub-lagos"
 */
export async function generateStoreSlug(businessName: string): Promise<string> {
  if (!businessName?.trim()) {
    throw new Error('Business name is required');
  }

  const { data, error } = await supabase.rpc('generate_store_slug', {
    business_name: businessName
  });

  if (error) {
    console.error('[Marketplace] Error generating slug:', error);
    // Fallback: simple slug generation
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  return data || businessName.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Update store marketplace settings
 * Safe to call now - columns exist but marketplace is disabled
 */
export async function updateStoreSettings(
  userId: string,
  settings: {
    storeVisible?: boolean;
    storeDescription?: string;
    storeBannerUrl?: string;
    storeSlug?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!MARKETPLACE_ENABLED && settings.storeVisible) {
    return {
      success: false,
      error: 'Marketplace is not yet available. Coming soon!'
    };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        store_visible: settings.storeVisible,
        store_description: settings.storeDescription,
        store_banner_url: settings.storeBannerUrl,
        store_slug: settings.storeSlug
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[Marketplace] Error updating store settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public store profile by slug
 * Returns null if marketplace is disabled or store not found
 */
export async function getPublicStore(slug: string): Promise<PublicStore | null> {
  if (!MARKETPLACE_ENABLED) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, business_name, store_description, store_banner_url, location, subscription_tier, verified, whatsapp_number, instagram_handle, created_at')
      .eq('store_slug', slug)
      .eq('store_visible', true)
      .single();

    if (error || !data) return null;

    // Count public products
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', data.id)
      .eq('public_visible', true);

    return {
      id: data.id,
      slug,
      businessName: data.business_name || '',
      description: data.store_description,
      bannerUrl: data.store_banner_url,
      location: data.location,
      subscriptionTier: data.subscription_tier || 'free',
      verified: data.verified || false,
      whatsappNumber: data.whatsapp_number || '',
      instagramHandle: data.instagram_handle || '',
      productCount: count || 0,
      joinedAt: data.created_at
    };
  } catch (error) {
    console.error('[Marketplace] Error fetching public store:', error);
    return null;
  }
}

// ============================================================================
// PRODUCT VISIBILITY
// ============================================================================

/**
 * Make products visible in marketplace
 * Safe to call now - just updates DB column, marketplace display is gated by feature flag
 */
export async function setProductsPublicVisible(
  userId: string,
  productIds: string[],
  visible: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!MARKETPLACE_ENABLED && visible) {
    return {
      success: false,
      error: 'Marketplace is not yet available. Coming soon!'
    };
  }

  try {
    const { error } = await supabase
      .from('products')
      .update({ public_visible: visible })
      .eq('user_id', userId)
      .in('id', productIds);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[Marketplace] Error updating product visibility:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk set all products to public/private
 */
export async function setAllProductsVisible(
  userId: string,
  visible: boolean
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!MARKETPLACE_ENABLED && visible) {
    return {
      success: false,
      error: 'Marketplace is not yet available. Coming soon!'
    };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ public_visible: visible })
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;

    return { success: true, count: data?.length || 0 };
  } catch (error: any) {
    console.error('[Marketplace] Error bulk updating visibility:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search marketplace products
 * Returns empty results if marketplace is disabled
 */
export async function searchMarketplace(
  filters: MarketplaceSearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<MarketplaceSearchResult> {
  if (!MARKETPLACE_ENABLED) {
    return {
      products: [],
      totalCount: 0,
      page,
      pageSize,
      hasMore: false
    };
  }

  try {
    // Use the SQL function we created in migration
    const { data, error } = await supabase.rpc('search_marketplace_products', {
      search_query: filters.query || null,
      filter_category: filters.category || null,
      filter_location: filters.location || null,
      min_price: filters.minPrice || null,
      max_price: filters.maxPrice || null,
      result_limit: pageSize
    });

    if (error) throw error;

    const products: MarketplaceProduct[] = (data || []).map((row: any) => ({
      id: row.product_id,
      name: row.product_name,
      price: row.product_price,
      thumbnailUrl: row.thumbnail_url,
      store: {
        name: row.store_name,
        slug: row.store_slug
      }
    }));

    return {
      products,
      totalCount: products.length,
      page,
      pageSize,
      hasMore: products.length === pageSize
    };
  } catch (error) {
    console.error('[Marketplace] Error searching marketplace:', error);
    return {
      products: [],
      totalCount: 0,
      page,
      pageSize,
      hasMore: false
    };
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Track marketplace event (view, click, inquiry)
 * Safe to call now - data is collected even if marketplace is disabled
 * This gives you historical data when you launch!
 */
export async function trackMarketplaceEvent(
  eventType: AnalyticsEventType,
  data: {
    storeId?: string;
    productId?: string;
    referrer?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    // Always track events, even if marketplace disabled
    // This builds historical data for launch day
    await supabase.from('marketplace_analytics').insert({
      event_type: eventType,
      store_id: data.storeId || null,
      product_id: data.productId || null,
      referrer: data.referrer || null,
      user_ip: null, // Privacy: don't track IPs for now
      user_agent: navigator.userAgent,
      metadata: data.metadata || null
    });
  } catch (error) {
    // Fail silently - analytics should never break the app
    console.warn('[Marketplace] Failed to track event:', error);
  }
}

/**
 * Get store analytics
 * Returns null if marketplace is disabled
 */
export async function getStoreAnalytics(
  storeId: string,
  period: 'today' | 'week' | 'month' | 'all' = 'month'
): Promise<StoreAnalytics | null> {
  if (!MARKETPLACE_ENABLED) {
    return null;
  }

  try {
    const startDate = getStartDateForPeriod(period);

    // Get event counts
    const { data: events } = await supabase
      .from('marketplace_analytics')
      .select('event_type, product_id, created_at')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString());

    if (!events) {
      return null;
    }

    const storeViews = events.filter(e => e.event_type === 'store_view').length;
    const productViews = events.filter(e => e.event_type === 'product_view').length;
    const productClicks = events.filter(e => e.event_type === 'product_click').length;
    const inquiries = events.filter(e => e.event_type === 'inquiry').length;

    // Calculate rates
    const clickThroughRate = productViews > 0 ? (productClicks / productViews) * 100 : 0;
    const conversionRate = productViews > 0 ? (inquiries / productViews) * 100 : 0;

    // Get top products
    const productViewCounts: Record<string, number> = {};
    const productInquiryCounts: Record<string, number> = {};

    events.forEach(event => {
      if (!event.product_id) return;

      if (event.event_type === 'product_view') {
        productViewCounts[event.product_id] = (productViewCounts[event.product_id] || 0) + 1;
      }
      if (event.event_type === 'inquiry') {
        productInquiryCounts[event.product_id] = (productInquiryCounts[event.product_id] || 0) + 1;
      }
    });

    return {
      storeId,
      period,
      storeViews,
      productViews,
      uniqueVisitors: 0, // TODO: Implement unique visitor tracking
      totalInquiries: inquiries,
      clickThroughRate,
      conversionRate,
      topProducts: [], // TODO: Fetch product names
      referrers: []
    };
  } catch (error) {
    console.error('[Marketplace] Error fetching analytics:', error);
    return null;
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get subscription tiers and pricing
 */
export function getSubscriptionPlans() {
  return [
    {
      tier: 'free' as SubscriptionTier,
      name: 'Free',
      priceKobo: 0,
      priceDisplay: '₦0/month',
      features: [
        'Up to 50 products in marketplace',
        'Basic store page',
        'Standard search placement',
        'Community support'
      ],
      boostScore: 0,
      maxProducts: 50
    },
    {
      tier: 'basic' as SubscriptionTier,
      name: 'Basic',
      priceKobo: 500000, // ₦5,000
      priceDisplay: '₦5,000/month',
      features: [
        'Up to 200 products in marketplace',
        'Custom store banner',
        'Higher search placement',
        'Basic analytics',
        'Priority support'
      ],
      boostScore: 50,
      maxProducts: 200
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: 'Pro',
      priceKobo: 1500000, // ₦15,000
      priceDisplay: '₦15,000/month',
      features: [
        'Unlimited products',
        'Premium store customization',
        'Top search placement',
        'Advanced analytics',
        'Verified badge',
        'Priority support',
        'Featured in marketplace'
      ],
      boostScore: 100,
      maxProducts: null
    }
  ];
}

/**
 * Check if user can add more products to marketplace
 */
export async function canAddMoreProducts(userId: string): Promise<boolean> {
  if (!MARKETPLACE_ENABLED) {
    return false;
  }

  try {
    // Get user's subscription tier
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (!user) return false;

    const tier = user.subscription_tier || 'free';
    const plan = getSubscriptionPlans().find(p => p.tier === tier);

    if (!plan || plan.maxProducts === null) {
      return true; // Unlimited
    }

    // Count current public products
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('public_visible', true);

    return (count || 0) < plan.maxProducts;
  } catch (error) {
    console.error('[Marketplace] Error checking product limit:', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStartDateForPeriod(period: 'today' | 'week' | 'month' | 'all'): Date {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return new Date(0); // Unix epoch
  }
}
