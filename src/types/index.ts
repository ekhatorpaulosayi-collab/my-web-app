/**
 * Storehouse Type Definitions
 */

import type { Timestamp } from 'firebase/firestore';

export type CollapsedState = Record<string, boolean>;

export interface DashboardPreferences {
  calmMode: boolean;
  collapsed: CollapsedState;
  activeWidgets?: string[];
  businessType?: string;
}

export interface StoreProfile {
  id?: string;
  user_id?: string;
  businessName: string;
  storeSlug: string;
  logoUrl?: string;
  whatsappNumber: string;
  address?: string;
  primaryColor?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string;
  isPublic: boolean;
  // Domain & Subdomain (for custom domains)
  subdomain?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  domainVerificationToken?: string;
  customDomainAddedAt?: string;
  customDomainVerifiedAt?: string;
  // Payment Details
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  acceptedPaymentMethods?: string[];
  paymentInstructions?: string;
  // Paystack Integration
  paystackEnabled?: boolean;
  paystackPublicKey?: string;
  paystackTestMode?: boolean;
  // Delivery Information
  deliveryAreas?: string[];
  deliveryFee?: string;
  deliveryTime?: string;
  minimumOrder?: string;
  // Business Hours
  businessHours?: string;
  daysOfOperation?: string[];
  // Social Media
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  twitterUrl?: string;
  // About & Policies
  aboutUs?: string;
  returnPolicy?: string;
}

export interface SlugDocument {
  ownerId: string;
  updatedAt: Timestamp;
}

/**
 * Product Interface
 * Represents a product in the inventory system
 */
export interface Product {
  // Primary Keys
  id: string;
  user_id: string;

  // Product Info
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  description?: string;
  tags?: string[];

  // Pricing (in kobo/cents for precision)
  cost_price?: number;
  selling_price: number;
  discount_price?: number;

  // Inventory
  quantity: number;
  low_stock_threshold?: number;
  unit?: string;

  // Images
  image_url?: string;
  image_thumbnail?: string;
  image_sizes?: Record<string, any>;

  // Category-Specific Attributes (JSONB)
  // Optional fields like size, color, brand, warranty, etc.
  attributes?: Record<string, any>;

  // Status Flags
  is_active?: boolean;
  is_featured?: boolean;
  is_public?: boolean;

  // Timestamps
  created_at?: string | Timestamp;
  updated_at?: string | Timestamp;
  last_sold_at?: string | Timestamp;

  // Backward Compatibility Fields (Firebase aliases)
  sellKobo?: number;
  purchaseKobo?: number;
  qty?: number;
  imageUrl?: string;
  isPublic?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  reorderLevel?: number;
}
