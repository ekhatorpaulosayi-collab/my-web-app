/**
 * MARKETPLACE TYPES
 * These types prepare the codebase for future marketplace integration
 * Safe to use now - marketplace features are optional/disabled
 */

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  priceKobo: number;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startedAt: string;
  expiresAt: string | null;
  paystackSubscriptionCode: string | null;
  paystackCustomerCode: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  priceKobo: number;
  priceDisplay: string;
  features: string[];
  boostScore: number;
  maxProducts: number | null; // null = unlimited
}

// ============================================================================
// STORE TYPES
// ============================================================================

export interface StoreProfile {
  // Core identity
  businessName: string;
  ownerName: string;

  // Contact
  phone: string;
  whatsappNumber: string;
  email?: string;

  // Social
  instagramHandle: string;
  facebookPage: string;
  tiktokHandle: string;
  storeUrl: string;

  // Marketplace-specific (optional)
  storeSlug?: string | null;
  storeVisible: boolean;
  storeDescription?: string | null;
  storeBannerUrl?: string | null;
  subscriptionTier: SubscriptionTier;
  verified: boolean;
  location?: string | null;
}

export interface PublicStore {
  id: string;
  slug: string;
  businessName: string;
  description: string | null;
  bannerUrl: string | null;
  location: string | null;
  subscriptionTier: SubscriptionTier;
  verified: boolean;

  // Contact (for marketplace inquiries)
  whatsappNumber: string;
  instagramHandle: string;

  // Stats
  productCount: number;
  viewCount?: number;
  joinedAt: string;
}

// ============================================================================
// PRODUCT TYPES (Extended)
// ============================================================================

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string | null;
  price: number; // In Naira
  thumbnailUrl: string | null;
  category: string | null;
  tags: string[];

  // Marketplace metadata
  publicVisible: boolean;
  viewCount: number;
  inquiryCount: number;
  boostScore: number;
  lastViewedAt: string | null;
  approvalStatus: 'pending' | 'auto_approved' | 'manual_approved' | 'rejected';

  // Store info
  store: {
    id: string;
    name: string;
    slug: string;
    verified: boolean;
    subscriptionTier: SubscriptionTier;
  };

  createdAt: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export type AnalyticsEventType = 'store_view' | 'product_view' | 'product_click' | 'inquiry' | 'share';

export interface AnalyticsEvent {
  id: string;
  userId: string | null;
  productId: string | null;
  storeId: string;
  eventType: AnalyticsEventType;
  referrer: string | null;
  userIp: string | null;
  userAgent: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface StoreAnalytics {
  storeId: string;
  period: 'today' | 'week' | 'month' | 'all';

  // Traffic
  storeViews: number;
  productViews: number;
  uniqueVisitors: number;

  // Engagement
  totalInquiries: number;
  clickThroughRate: number; // CTR = clicks / views
  conversionRate: number; // inquiries / views

  // Top performers
  topProducts: Array<{
    productId: string;
    productName: string;
    views: number;
    inquiries: number;
  }>;

  // Traffic sources
  referrers: Array<{
    source: string;
    count: number;
  }>;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface MarketplaceSearchFilters {
  query?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  tags?: string[];
}

export interface MarketplaceSearchResult {
  products: MarketplaceProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// MODERATION TYPES
// ============================================================================

export type ReportType = 'spam' | 'inappropriate' | 'fake' | 'prohibited' | 'copyright' | 'other';
export type ModerationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'removed';

export interface ModerationReport {
  id: string;
  productId: string | null;
  storeId: string;
  reportType: ReportType;
  reporterId: string | null;
  reason: string;
  status: ModerationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
}

// ============================================================================
// FEATURE FLAGS (for gradual rollout)
// ============================================================================

export interface MarketplaceFeatures {
  enabled: boolean; // Master switch
  publicStores: boolean; // Allow public store pages
  globalSearch: boolean; // Enable marketplace search
  premiumTiers: boolean; // Enable paid subscriptions
  storeAnalytics: boolean; // Show analytics to store owners
  productReports: boolean; // Allow reporting products
}
