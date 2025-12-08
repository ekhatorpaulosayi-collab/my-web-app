/**
 * Subscription Service
 * Handles tier limits, quota checks, and upgrade flows
 */

import { supabase } from '../lib/supabase';

export interface SubscriptionTier {
  id: 'free' | 'starter' | 'pro' | 'business';
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  max_products: number | null; // null = unlimited
  max_images_per_product: number;
  max_users: number;
  max_ai_chats_monthly: number;
  has_product_variants: boolean;
  has_debt_tracking: boolean;
  has_invoicing: boolean;
  has_recurring_invoices: boolean;
  has_profit_analytics: boolean;
  has_advanced_analytics: boolean;
  has_whatsapp_ai: boolean;
  has_export_data: boolean;
  has_priority_support: boolean;
  has_dedicated_manager: boolean;
  has_custom_training: boolean;
  has_store_customization: boolean;
}

export interface UserSubscription {
  tier_id: string;
  tier_name: string;
  billing_cycle: 'monthly' | 'annual';
  max_products: number | null;
  max_images_per_product: number;
  max_users: number;
  max_ai_chats_monthly: number;
  ai_chats_used: number;
  ai_chats_remaining: number;
  has_product_variants: boolean;
  has_debt_tracking: boolean;
  has_invoicing: boolean;
  has_recurring_invoices: boolean;
  has_profit_analytics: boolean;
  has_whatsapp_ai: boolean;
  has_export_data: boolean;
  has_priority_support: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number | null;
  tierName?: string;
  suggestedTier?: string;
  isUnlimited?: boolean;
}

/**
 * Get all available subscription tiers
 */
export async function getAvailableTiers(): Promise<SubscriptionTier[]> {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching tiers:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's current tier and limits
 */
export async function getUserTier(userId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_tier', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching user tier:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in getUserTier:', error);
    return null;
  }
}

/**
 * Check if user can add a product
 */
export async function canAddProduct(userId: string): Promise<LimitCheckResult> {
  try {
    const { data, error } = await supabase.rpc('can_add_product', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking product limit:', error);
      return { allowed: false, reason: 'Unable to check limit' };
    }

    const result = data as LimitCheckResult;

    // Add suggested upgrade tier
    if (!result.allowed) {
      result.suggestedTier = result.limit && result.limit < 200 ? 'Starter' : 'Pro';
    }

    return result;
  } catch (error) {
    console.error('Error in canAddProduct:', error);
    return { allowed: false, reason: 'Unable to check limit' };
  }
}

/**
 * Check if user can add an image to a product
 */
export async function canAddProductImage(userId: string, productId: string): Promise<LimitCheckResult> {
  try {
    const { data, error } = await supabase.rpc('can_add_product_image', {
      p_user_id: userId,
      p_product_id: productId
    });

    if (error) {
      console.error('Error checking image limit:', error);
      return { allowed: false, reason: 'Unable to check limit' };
    }

    const result = data as LimitCheckResult;

    // Add suggested upgrade tier
    if (!result.allowed) {
      if (result.limit === 1) result.suggestedTier = 'Starter';
      else if (result.limit === 3) result.suggestedTier = 'Pro';
      else result.suggestedTier = 'Business';
    }

    return result;
  } catch (error) {
    console.error('Error in canAddProductImage:', error);
    return { allowed: false, reason: 'Unable to check limit' };
  }
}

/**
 * Check if user can add a staff member
 */
export async function canAddUser(userId: string): Promise<LimitCheckResult> {
  try {
    // Get user's tier
    const tier = await getUserTier(userId);
    if (!tier) {
      return { allowed: false, reason: 'Unable to check limit' };
    }

    // Count current staff members
    const { count, error } = await supabase
      .from('staff_members')
      .select('*', { count: 'exact', head: true })
      .eq('store_owner_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error counting staff:', error);
      return { allowed: false, reason: 'Unable to check limit' };
    }

    const currentCount = (count || 0) + 1; // +1 for the owner
    const limit = tier.max_users;

    if (currentCount >= limit) {
      let suggestedTier = 'Starter';
      if (limit === 3) suggestedTier = 'Pro';
      else if (limit === 5) suggestedTier = 'Business';

      return {
        allowed: false,
        reason: `Your ${tier.tier_name} tier allows ${limit} users`,
        currentCount,
        limit,
        tierName: tier.tier_name,
        suggestedTier
      };
    }

    return { allowed: true, currentCount, limit };
  } catch (error) {
    console.error('Error in canAddUser:', error);
    return { allowed: false, reason: 'Unable to check limit' };
  }
}

/**
 * Check if user can use AI chat
 */
export async function canUseAIChat(userId: string): Promise<LimitCheckResult> {
  try {
    const tier = await getUserTier(userId);
    if (!tier) {
      return { allowed: false, reason: 'Unable to check limit' };
    }

    const limit = tier.max_ai_chats_monthly;
    const used = tier.ai_chats_used || 0;
    const remaining = tier.ai_chats_remaining || 0;

    if (remaining <= 0) {
      let suggestedTier = 'Starter';
      if (limit === 500) suggestedTier = 'Pro';
      else if (limit === 2000) suggestedTier = 'Business';

      return {
        allowed: false,
        reason: `You've used all ${limit} AI chats this month`,
        currentCount: used,
        limit,
        tierName: tier.tier_name,
        suggestedTier
      };
    }

    return {
      allowed: true,
      currentCount: used,
      limit,
      tierName: tier.tier_name
    };
  } catch (error) {
    console.error('Error in canUseAIChat:', error);
    return { allowed: false, reason: 'Unable to check limit' };
  }
}

/**
 * Increment AI chat usage
 */
export async function incrementAIChatUsage(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        ai_chats_used_this_month: supabase.raw('ai_chats_used_this_month + 1')
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error incrementing AI chat usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementAIChatUsage:', error);
    return false;
  }
}

/**
 * Check if user has a specific feature
 */
export async function hasFeature(userId: string, feature: keyof UserSubscription): Promise<boolean> {
  try {
    const tier = await getUserTier(userId);
    if (!tier) return false;

    return tier[feature] === true;
  } catch (error) {
    console.error('Error checking feature:', error);
    return false;
  }
}

/**
 * Get tier pricing with monthly/annual toggle
 */
export function getTierPricing(tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') {
  if (billingCycle === 'annual') {
    const monthlyEquivalent = Math.floor(tier.price_annual / 12);
    const savings = (tier.price_monthly * 12) - tier.price_annual;
    return {
      price: tier.price_annual,
      monthlyEquivalent,
      savings,
      billedAs: `₦${tier.price_annual.toLocaleString()}/year`
    };
  }

  return {
    price: tier.price_monthly,
    monthlyEquivalent: tier.price_monthly,
    savings: 0,
    billedAs: `₦${tier.price_monthly.toLocaleString()}/month`
  };
}

/**
 * Format currency in Naira
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

/**
 * Calculate percentage saved with annual billing
 */
export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const yearlyMonthly = monthlyPrice * 12;
  return yearlyMonthly - annualPrice;
}
