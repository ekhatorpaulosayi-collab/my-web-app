/**
 * Affiliate Service
 * Manages 30% commission affiliate program
 *
 * Rules:
 * - 30% commission on all paid subscriptions
 * - 2 conversions minimum to unlock payouts
 * - 7-day confirmation period
 * - Weekly payouts every Monday
 */

import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Affiliate {
  id: string;
  userId: string;
  affiliateCode: string;
  bankAccountNumber: string;
  bankName: string;
  accountName: string;
  paystackRecipientCode?: string;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalEarningsKobo: number;
  pendingEarningsKobo: number;
  paidOutKobo: number;
  isActive: boolean;
  payoutsUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateSale {
  id: string;
  affiliateId: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  subscriptionId: string;
  planName: string;
  saleAmountKobo: number;
  commissionAmountKobo: number;
  status: 'pending' | 'confirmed' | 'paid' | 'refunded';
  saleDate: string;
  confirmationDate?: string;
  payoutDate?: string;
  payoutId?: string;
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  totalAmountKobo: number;
  salesCount: number;
  salesIds: string[];
  paystackTransferId?: string;
  paystackTransferCode?: string;
  paystackStatus?: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed';
  failureReason?: string;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
  approvedBy?: string;
  adminNotes?: string;
}

// ============================================
// AFFILIATE CODE GENERATION
// ============================================

/**
 * Generate unique affiliate code
 * Format: FIRSTNAME + random 4 digits (e.g., JOHN2024)
 */
export async function generateAffiliateCode(
  userId: string,
  userName?: string
): Promise<string> {
  // Extract first name if provided
  const firstName = userName?.split(' ')[0]?.toUpperCase() || 'USER';
  const cleanName = firstName.replace(/[^A-Z]/g, '').slice(0, 6);

  // Generate random suffix
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const code = `${cleanName}${randomSuffix}`;

  // Check if code already exists
  const { data: existing } = await supabase
    .from('affiliates')
    .select('affiliate_code')
    .eq('affiliate_code', code)
    .maybeSingle();

  // If exists, try again with different random
  if (existing) {
    return generateAffiliateCode(userId, userName);
  }

  return code;
}

// ============================================
// AFFILIATE ACCOUNT MANAGEMENT
// ============================================

/**
 * Create affiliate account
 */
export async function createAffiliate(
  userId: string,
  data: {
    name: string;
    email: string;
    bankAccountNumber: string;
    bankName: string;
    accountName: string;
  }
): Promise<string> {
  // Generate unique code
  const code = await generateAffiliateCode(userId, data.name);

  // Affiliate payout columns live on affiliates, not stores or store_bank_details.
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .insert({
      user_id: userId,
      affiliate_code: code,
      bank_account_number: data.bankAccountNumber,
      bank_name: data.bankName,
      account_name: data.accountName,
    })
    .select()
    .single();

  if (error) {
    console.error('[AffiliateService] Error creating affiliate:', error);
    throw new Error('Failed to create affiliate account');
  }

  console.log('[AffiliateService] ✅ Affiliate created:', code);
  return code;
}

/**
 * Get affiliate by user ID
 */
export async function getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[AffiliateService] Error fetching affiliate:', error);
    return null;
  }

  return data ? mapAffiliateFromDb(data) : null;
}

/**
 * Get affiliate by code
 */
export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('affiliate_code', code.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error('[AffiliateService] Error fetching affiliate:', error);
    return null;
  }

  return data ? mapAffiliateFromDb(data) : null;
}

/**
 * Update affiliate bank details
 */
export async function updateAffiliateBankDetails(
  affiliateId: string,
  bankDetails: {
    bankAccountNumber: string;
    bankName: string;
    accountName: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('affiliates')
    .update({
      bank_account_number: bankDetails.bankAccountNumber,
      bank_name: bankDetails.bankName,
      account_name: bankDetails.accountName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', affiliateId);

  if (error) {
    console.error('[AffiliateService] Error updating bank details:', error);
    throw new Error('Failed to update bank details');
  }
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

/**
 * Track affiliate click
 */
export async function trackAffiliateClick(
  affiliateCode: string,
  visitorData?: {
    ip?: string;
    country?: string;
    device?: string;
    referrer?: string;
  }
): Promise<void> {
  // Get affiliate
  const affiliate = await getAffiliateByCode(affiliateCode);
  if (!affiliate) {
    console.warn('[AffiliateService] Invalid affiliate code:', affiliateCode);
    return;
  }

  // Record click
  const { error } = await supabase.from('affiliate_clicks').insert({
    affiliate_id: affiliate.id,
    affiliate_code: affiliateCode,
    visitor_ip: visitorData?.ip,
    visitor_country: visitorData?.country || 'NG',
    visitor_device: visitorData?.device,
    referrer_url: visitorData?.referrer,
  });

  if (error) {
    console.error('[AffiliateService] Error tracking click:', error);
    return;
  }

  // Increment click count
  await supabase.rpc('increment_affiliate_clicks', {
    p_affiliate_id: affiliate.id,
  });

  console.log('[AffiliateService] ✅ Click tracked:', affiliateCode);
}

/**
 * Record affiliate signup (when user completes registration)
 */
export async function recordAffiliateSignup(
  customerId: string,
  affiliateCode: string
): Promise<void> {
  const affiliate = await getAffiliateByCode(affiliateCode);
  if (!affiliate) return;

  // B1/B8: the click update and signup counter run in affiliate-ledger.
  // There is no browser fallback — section 3 of migration 04 revokes the RPC
  // and there is no UPDATE policy on affiliate_clicks.
  const { error } = await supabase.functions.invoke('affiliate-ledger', {
    body: { action: 'mark_signup', affiliate_code: affiliateCode },
  });
  if (error) {
    console.error('[AffiliateService] Signup attribution failed:', error);
    throw new Error('Could not record the referral signup');
  }

  console.log('[AffiliateService] ✅ Signup recorded:', affiliateCode);
}

/**
 * Record affiliate sale (when user subscribes to paid plan)
 */
export async function recordAffiliateSale(
  customerId: string,
  customerData: {
    email?: string;
    name?: string;
  },
  subscriptionData: {
    id: string;
    planName: string;
    amountKobo: number;
  },
  affiliateCode: string
): Promise<void> {
  // Commission is computed on the server from the verified Paystack amount.
  const { error } = await supabase.functions.invoke('affiliate-ledger', {
    body: {
      action: 'record_sale',
      reference: subscriptionData.id,
      affiliate_code: affiliateCode,
      plan_name: subscriptionData.planName,
      customer_name: customerData.name,
    },
  });

  if (error) {
    console.error('[AffiliateService] Error recording sale:', error);
    throw new Error('Could not record the affiliate sale');
  }

  console.log('[AffiliateService] ✅ Sale recorded via affiliate-ledger:', affiliateCode);
}

/**
 * Handle refund (cancel commission if within 7 days)
 */
export async function handleAffiliateRefund(subscriptionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('affiliate-ledger', {
    body: { action: 'refund', reference: subscriptionId },
  });
  if (error) {
    console.error('[AffiliateService] Refund failed:', error);
    throw new Error('Could not cancel the affiliate commission');
  }
  console.log('[AffiliateService] ⚠️ Refund sent to affiliate-ledger');
}

// ============================================
// SALES & PAYOUTS
// ============================================

/**
 * Get affiliate sales
 */
export async function getAffiliateSales(affiliateId: string): Promise<AffiliateSale[]> {
  const { data, error } = await supabase
    .from('affiliate_sales')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('sale_date', { ascending: false });

  if (error) {
    console.error('[AffiliateService] Error fetching sales:', error);
    return [];
  }

  return data.map(mapSaleFromDb);
}

/**
 * Get affiliate payouts
 */
export async function getAffiliatePayouts(affiliateId: string): Promise<AffiliatePayout[]> {
  const { data, error } = await supabase
    .from('affiliate_payouts')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[AffiliateService] Error fetching payouts:', error);
    return [];
  }

  return data.map(mapPayoutFromDb);
}

/**
 * Get affiliate dashboard stats
 */
export async function getAffiliateDashboardStats(affiliateId: string) {
  const affiliate = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', affiliateId)
    .single();

  const sales = await getAffiliateSales(affiliateId);

  const pendingSales = sales.filter(s => s.status === 'pending');
  const confirmedSales = sales.filter(s => s.status === 'confirmed');
  const paidSales = sales.filter(s => s.status === 'paid');

  return {
    affiliate: affiliate.data ? mapAffiliateFromDb(affiliate.data) : null,
    totalClicks: affiliate.data?.total_clicks || 0,
    totalSignups: affiliate.data?.total_signups || 0,
    totalConversions: affiliate.data?.total_conversions || 0,
    conversionRate: affiliate.data?.total_clicks > 0
      ? ((affiliate.data.total_conversions / affiliate.data.total_clicks) * 100).toFixed(1)
      : '0',
    pendingEarnings: affiliate.data?.pending_earnings_kobo || 0,
    totalPaidOut: affiliate.data?.paid_out_kobo || 0,
    totalEarnings: affiliate.data?.total_earnings_kobo || 0,
    payoutsUnlocked: affiliate.data?.payouts_unlocked || false,
    conversionsNeeded: Math.max(0, 2 - (affiliate.data?.total_conversions || 0)),
    pendingSalesCount: pendingSales.length,
    confirmedSalesCount: confirmedSales.length,
    paidSalesCount: paidSales.length,
    recentSales: sales.slice(0, 10),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapAffiliateFromDb(data: any): Affiliate {
  return {
    id: data.id,
    userId: data.user_id,
    affiliateCode: data.affiliate_code,
    bankAccountNumber: data.bank_account_number,
    bankName: data.bank_name,
    accountName: data.account_name,
    paystackRecipientCode: data.paystack_recipient_code,
    totalClicks: data.total_clicks,
    totalSignups: data.total_signups,
    totalConversions: data.total_conversions,
    totalEarningsKobo: data.total_earnings_kobo,
    pendingEarningsKobo: data.pending_earnings_kobo,
    paidOutKobo: data.paid_out_kobo,
    isActive: data.is_active,
    payoutsUnlocked: data.payouts_unlocked,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapSaleFromDb(data: any): AffiliateSale {
  return {
    id: data.id,
    affiliateId: data.affiliate_id,
    customerId: data.customer_id,
    customerEmail: data.customer_email,
    customerName: data.customer_name,
    subscriptionId: data.subscription_id,
    planName: data.plan_name,
    saleAmountKobo: data.sale_amount_kobo,
    commissionAmountKobo: data.commission_amount_kobo,
    status: data.status,
    saleDate: data.sale_date,
    confirmationDate: data.confirmation_date,
    payoutDate: data.payout_date,
    payoutId: data.payout_id,
  };
}

function mapPayoutFromDb(data: any): AffiliatePayout {
  return {
    id: data.id,
    affiliateId: data.affiliate_id,
    totalAmountKobo: data.total_amount_kobo,
    salesCount: data.sales_count,
    salesIds: data.sales_ids,
    paystackTransferId: data.paystack_transfer_id,
    paystackTransferCode: data.paystack_transfer_code,
    paystackStatus: data.paystack_status,
    status: data.status,
    failureReason: data.failure_reason,
    requestedAt: data.requested_at,
    approvedAt: data.approved_at,
    completedAt: data.completed_at,
    approvedBy: data.approved_by,
    adminNotes: data.admin_notes,
  };
}

// ============================================
// COOKIE HELPERS
// ============================================

export function setAffiliateCookie(affiliateCode: string): void {
  const expiryDays = 30;
  const date = new Date();
  date.setTime(date.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `storehouse_affiliate=${affiliateCode};${expires};path=/`;
}

export function getAffiliateCookie(): string | null {
  const name = 'storehouse_affiliate=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

export function deleteAffiliateCookie(): void {
  document.cookie = 'storehouse_affiliate=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
}
