/**
 * Pricing Constants
 * Centralized pricing configuration for AI chat tiers
 */

export interface PricingTier {
  name: string;
  chats: number;
  price: number; // in Naira
  priceUSD: number;
  description: string;
  popular?: boolean;
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  FREE: {
    name: 'Free',
    chats: 30,
    price: 0,
    priceUSD: 0,
    description: 'Perfect for trying out Storehouse',
  },
  STARTER: {
    name: 'Starter',
    chats: 300,
    price: 5000,
    priceUSD: 3.13,
    description: 'For small businesses getting started',
  },
  PRO: {
    name: 'Pro',
    chats: 750,
    price: 10000,
    priceUSD: 6.25,
    description: 'For growing businesses',
    popular: true,
  },
  BUSINESS: {
    name: 'Business',
    chats: 1500,
    price: 20000,
    priceUSD: 12.50,
    description: 'For established businesses',
  },
  ENTERPRISE: {
    name: 'Enterprise',
    chats: 10000,
    price: 50000,
    priceUSD: 31.25,
    description: 'For large organizations with high volume needs',
  },
};

// Helper function to get tier by chat limit
export function getTierByChats(chatLimit: number): PricingTier | null {
  return Object.values(PRICING_TIERS).find(tier => tier.chats === chatLimit) || null;
}

// Helper function to get next tier
export function getNextTier(currentChats: number): PricingTier | null {
  const tiers = Object.values(PRICING_TIERS)
    .filter(tier => tier.chats > currentChats)
    .sort((a, b) => a.chats - b.chats);

  return tiers[0] || null;
}

// Helper function to format price
export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

// Chat limits for quick reference
export const CHAT_LIMITS = {
  FREE: 30,
  STARTER: 300,
  PRO: 750,
  BUSINESS: 1500,
  ENTERPRISE: 10000,
} as const;

// Export tier names for type safety
export type TierName = keyof typeof PRICING_TIERS;