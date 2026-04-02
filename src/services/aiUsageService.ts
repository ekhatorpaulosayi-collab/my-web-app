/**
 * AI Usage Tracking Service
 * Monitors AI chat usage and triggers upgrade prompts
 */

import { supabase } from '../lib/supabase';
import { getUserTier } from './subscriptionService';

export interface AIUsageData {
  chatsUsed: number;
  chatsRemaining: number;
  totalLimit: number;
  tierName: string;
  isApproachingLimit: boolean;
  hasExhausted: boolean;
  percentageUsed: number;
  upgradeMessage?: string;
  valueMetric?: string;
}

/**
 * Get current AI usage for the authenticated user
 */
export async function getAIUsage(userId: string): Promise<AIUsageData | null> {
  try {
    // Skip RPC call since it doesn't exist, go directly to subscription data
    const subscription = await getUserTier(userId);
    if (!subscription) return null;

    const chatsUsed = subscription.ai_chats_used || 0;
    const totalLimit = subscription.max_ai_chats_monthly || 30;
    const chatsRemaining = Math.max(0, totalLimit - chatsUsed);
    const tierName = subscription.tier_name || 'Free';
    const percentageUsed = totalLimit > 0 ? (chatsUsed / totalLimit) * 100 : 0;
    const isApproachingLimit = chatsRemaining <= 5 && chatsRemaining > 0;
    const hasExhausted = chatsRemaining === 0;

    // Generate contextual upgrade message
    let upgradeMessage: string | undefined;
    let valueMetric: string | undefined;

    if (hasExhausted) {
      upgradeMessage = "🚫 AI chats exhausted! Upgrade to Starter for 500 chats/month and unlock AI-powered insights.";
      valueMetric = "Stores with AI assistance report 3x higher sales on average";
    } else if (isApproachingLimit) {
      upgradeMessage = `⚠️ Only ${chatsRemaining} AI chats left! Upgrade now to never run out of AI assistance.`;
      valueMetric = "This AI chat could save you ₦10,000+ in inventory optimization";
    } else if (percentageUsed > 60) {
      upgradeMessage = `You've used ${chatsUsed}/${totalLimit} AI chats. Loving the AI? Upgrade for unlimited insights!`;
      valueMetric = "AI has helped similar stores increase profits by 47%";
    }

    return {
      chatsUsed,
      chatsRemaining,
      totalLimit,
      tierName: tierName,
      isApproachingLimit,
      hasExhausted,
      percentageUsed,
      upgradeMessage,
      valueMetric
    };
  } catch (error) {
    console.error('[AIUsageService] Error getting AI usage:', error);
    return null;
  }
}

/**
 * Increment AI chat usage for the user
 */
export async function incrementAIUsage(userId: string): Promise<boolean> {
  try {
    // First check if user has chats remaining
    const usage = await getAIUsage(userId);
    if (!usage || usage.hasExhausted) {
      return false; // No more chats available
    }

    // Increment the usage counter
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        ai_chats_used: usage.chatsUsed + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[AIUsageService] Error incrementing usage:', error);
      return false;
    }

    // Log the usage for analytics
    await supabase
      .from('ai_chat_logs')
      .insert({
        user_id: userId,
        tier_name: usage.tierName,
        timestamp: new Date().toISOString()
      });

    return true;
  } catch (error) {
    console.error('[AIUsageService] Error incrementing AI usage:', error);
    return false;
  }
}

/**
 * Get upgrade benefits for the user's current tier
 */
export function getUpgradeBenefits(currentTier: string): string[] {
  const benefits: Record<string, string[]> = {
    'Free': [
      '🚀 500 AI chats per month (vs 30 now)',
      '📦 200 products (vs 30 now)',
      '👥 3 staff accounts (vs 1 now)',
      '📊 Advanced sales analytics',
      '💰 Save 10+ hours per week'
    ],
    'Starter': [
      '🚀 1,500 AI chats per month (3x more)',
      '📦 Unlimited products',
      '👥 5 staff accounts',
      '📈 AI demand forecasting',
      '🎯 Customer insights dashboard'
    ],
    'Pro': [
      '🚀 10,000 AI chats per month',
      '👥 10 staff accounts',
      '🏪 Multi-store management',
      '🤖 AI auto-reorder suggestions',
      '📊 Competitive pricing analysis'
    ]
  };

  return benefits[currentTier] || benefits['Free'];
}

/**
 * Calculate potential ROI from upgrading
 */
export function calculateUpgradeROI(currentTier: string, averageMonthlySales: number): {
  estimatedIncrease: number;
  timeSaved: number;
  roiMultiple: number;
} {
  const roiData: Record<string, { salesIncrease: number; timeSaved: number }> = {
    'Free': { salesIncrease: 0.3, timeSaved: 10 }, // 30% sales increase, 10 hours saved
    'Starter': { salesIncrease: 0.2, timeSaved: 5 }, // 20% more increase, 5 more hours
    'Pro': { salesIncrease: 0.15, timeSaved: 3 } // 15% more increase, 3 more hours
  };

  const data = roiData[currentTier] || roiData['Free'];
  const estimatedIncrease = averageMonthlySales * data.salesIncrease;
  const timeSaved = data.timeSaved;

  // Calculate ROI multiple (increase divided by cost)
  const tierCosts = { 'Free': 5000, 'Starter': 10000, 'Pro': 15000 };
  const cost = tierCosts[currentTier as keyof typeof tierCosts] || 5000;
  const roiMultiple = estimatedIncrease / cost;

  return {
    estimatedIncrease,
    timeSaved,
    roiMultiple
  };
}