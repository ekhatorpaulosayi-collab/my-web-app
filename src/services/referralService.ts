/**
 * Referral Service
 * Manages referral codes, tracking, and additive rewards
 */

import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Referral {
  id: string;
  referrerUid: string;
  referralCode: string;
  refereeUid?: string;
  refereeEmail?: string;
  refereeName?: string;
  status: 'pending' | 'clicked' | 'signed_up' | 'converted' | 'rewarded';
  clickedAt?: string;
  signedUpAt?: string;
  convertedAt?: string;
  rewardedAt?: string;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  userUid: string;
  referralId?: string;
  rewardType: 'account_credit' | 'airtime' | 'free_month' | 'feature_unlock' | 'lifetime_access';
  rewardValue?: number;
  creditAmountKobo?: number;
  creditRemainingKobo?: number;
  freeMonths?: number;
  freeUntilDate?: string;
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
  issuedAt: string;
  expiresAt?: string;
}

export interface ReferralMilestone {
  userUid: string;
  totalReferrals: number;
  successfulConversions: number;
  milestone3Achieved: boolean;
  milestone5Achieved: boolean;
  milestone10Achieved: boolean;
  milestone25Achieved: boolean;
  milestone50Achieved: boolean;
  totalCreditEarnedKobo: number;
  totalFreeMonthsEarned: number;
  isAmbassador: boolean;
  isLegend: boolean;
  hasLifetimeAccess: boolean;
}

// ============================================
// MILESTONE REWARDS (Additive Structure)
// ============================================

export const MILESTONE_REWARDS = {
  perReferral: {
    creditKobo: 50000, // ₦500
    airtimeKobo: 30000, // ₦300
  },

  milestones: {
    3: {
      bonus: 'feature_trial',
      days: 7,
      message: '🎉 Unlocked 7-day Pro trial!',
    },
    5: {
      freeMonths: 1,
      additive: 0, // First milestone, nothing to add to
      totalMonths: 1,
      message: '🎊 You earned 1 FREE MONTH!',
      badge: '🔥 Fire Referrer',
    },
    10: {
      freeMonths: 3, // Additional months
      additive: 1, // Add to previous milestone
      totalMonths: 4, // 1 + 3
      message: '🚀 3 MORE months! Total: 4 months free!',
      badge: '👑 Champion',
    },
    25: {
      freeMonths: 8, // Additional months
      additive: 4, // Add to previous total
      totalMonths: 12, // 4 + 8 = 1 year!
      message: '🏆 8 MORE months! You earned a FULL YEAR!',
      badge: '💎 Diamond',
    },
    50: {
      freeMonths: Infinity,
      message: '🙏 LIFETIME ACCESS! You\'re a legend!',
      badge: '⭐ Legend',
      revenueShare: 0.01, // 1% of referrals' payments
    },
  },
};

// ============================================
// REFERRAL CODE GENERATION
// ============================================

/**
 * Generate unique referral code
 * Format: FIRSTNAME + random 4 digits (e.g., JOHN2024)
 */
export async function generateReferralCode(userId: string, userName?: string): Promise<string> {
  // Extract first name if provided
  const firstName = userName?.split(' ')[0]?.toUpperCase() || 'USER';
  const cleanName = firstName.replace(/[^A-Z]/g, '').slice(0, 8);

  // Generate random suffix
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const code = `${cleanName}${randomSuffix}`;

  // Check if code already exists
  const { data: existing } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('referral_code', code)
    .single();

  // If exists, try again with different random
  if (existing) {
    return generateReferralCode(userId, userName);
  }

  return code;
}

/**
 * Create or get user's referral code
 */
export async function getOrCreateReferralCode(userId: string, userName?: string): Promise<string> {
  // Check if user already has a referral code
  const { data: existing } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('referrer_uid', userId)
    .limit(1)
    .single();

  if (existing) {
    return existing.referral_code;
  }

  // Generate new code
  const code = await generateReferralCode(userId, userName);

  // Create initial referral record
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_uid: userId,
      referral_code: code,
      status: 'pending',
    });

  if (error) {
    console.error('[ReferralService] Error creating referral:', error);
    throw new Error('Failed to create referral code');
  }

  return code;
}

// ============================================
// REFERRAL TRACKING
// ============================================

/**
 * Validate referral code
 */
export async function validateReferralCode(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('referral_code', code.toUpperCase())
    .single();

  return !!data && !error;
}

/**
 * Claim referral code (when new user signs up)
 */
export async function claimReferralCode(
  code: string,
  refereeUid: string,
  refereeEmail?: string,
  refereeName?: string
): Promise<void> {
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_uid: 'placeholder', // Will be updated by trigger
      referral_code: code.toUpperCase(),
      referee_uid: refereeUid,
      referee_email: refereeEmail,
      referee_name: refereeName,
      status: 'signed_up',
      signed_up_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[ReferralService] Error claiming referral:', error);
  }
}

/**
 * Track referral conversion (when referee upgrades to paid)
 */
export async function trackReferralConversion(refereeUid: string): Promise<void> {
  // Find referral record
  const { data: referral, error: findError } = await supabase
    .from('referrals')
    .select('*')
    .eq('referee_uid', refereeUid)
    .single();

  if (findError || !referral) {
    console.log('[ReferralService] No referral found for user:', refereeUid);
    return;
  }

  // Mark as converted
  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
    })
    .eq('id', referral.id);

  if (updateError) {
    console.error('[ReferralService] Error updating referral:', updateError);
    return;
  }

  // Issue rewards to referrer
  await issueReferralRewards(referral.referrer_uid);

  // Update milestones
  await updateMilestones(referral.referrer_uid);
}

// ============================================
// REWARD ISSUANCE (Additive Logic)
// ============================================

/**
 * Issue rewards after successful referral
 */
async function issueReferralRewards(referrerUid: string): Promise<void> {
  // Get current milestone status
  const milestone = await getUserMilestone(referrerUid);
  const conversions = milestone?.successfulConversions || 0;
  const newConversions = conversions + 1;

  // Issue per-referral credit
  await issueAccountCredit(referrerUid, MILESTONE_REWARDS.perReferral.creditKobo);

  // Check for milestone rewards (additive)
  if (newConversions === 3 && !milestone?.milestone3Achieved) {
    await issueFeatureTrial(referrerUid, 7);
  }

  if (newConversions === 5 && !milestone?.milestone5Achieved) {
    await issueFreeMonths(referrerUid, 1); // First month
  }

  if (newConversions === 10 && !milestone?.milestone10Achieved) {
    await issueFreeMonths(referrerUid, 3); // 3 MORE months (total: 4)
  }

  if (newConversions === 25 && !milestone?.milestone25Achieved) {
    await issueFreeMonths(referrerUid, 8); // 8 MORE months (total: 12)
  }

  if (newConversions === 50 && !milestone?.milestone50Achieved) {
    await issueLifetimeAccess(referrerUid);
  }
}

/**
 * Issue account credit reward
 */
async function issueAccountCredit(userUid: string, amountKobo: number): Promise<void> {
  const { error } = await supabase
    .from('referral_rewards')
    .insert({
      user_uid: userUid,
      reward_type: 'account_credit',
      credit_amount_kobo: amountKobo,
      credit_remaining_kobo: amountKobo,
      status: 'active',
      issued_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[ReferralService] Error issuing credit:', error);
  }
}

/**
 * Issue free months (additive)
 */
async function issueFreeMonths(userUid: string, months: number): Promise<void> {
  const { error } = await supabase
    .from('referral_rewards')
    .insert({
      user_uid: userUid,
      reward_type: 'free_month',
      free_months: months,
      status: 'active',
      issued_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[ReferralService] Error issuing free months:', error);
  }

  // Update milestone totals
  await supabase.rpc('update_referral_milestones', { p_user_uid: userUid });
}

/**
 * Issue feature trial
 */
async function issueFeatureTrial(userUid: string, days: number): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const { error } = await supabase
    .from('referral_rewards')
    .insert({
      user_uid: userUid,
      reward_type: 'feature_unlock',
      features_unlocked: ['profit_tracking', 'credit_sales', 'whatsapp_integration'],
      features_until_date: expiresAt.toISOString().split('T')[0],
      status: 'active',
      issued_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('[ReferralService] Error issuing trial:', error);
  }
}

/**
 * Issue lifetime access
 */
async function issueLifetimeAccess(userUid: string): Promise<void> {
  const { error } = await supabase
    .from('referral_rewards')
    .insert({
      user_uid: userUid,
      reward_type: 'lifetime_access',
      status: 'active',
      issued_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[ReferralService] Error issuing lifetime access:', error);
  }
}

// ============================================
// MILESTONE MANAGEMENT
// ============================================

/**
 * Update user's milestone progress
 */
async function updateMilestones(userUid: string): Promise<void> {
  await supabase.rpc('update_referral_milestones', { p_user_uid: userUid });
}

/**
 * Get user's milestone status
 */
export async function getUserMilestone(userUid: string): Promise<ReferralMilestone | null> {
  const { data, error } = await supabase
    .from('referral_milestones')
    .select('*')
    .eq('user_uid', userUid)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userUid: data.user_uid,
    totalReferrals: data.total_referrals,
    successfulConversions: data.successful_conversions,
    milestone3Achieved: data.milestone_3_achieved,
    milestone5Achieved: data.milestone_5_achieved,
    milestone10Achieved: data.milestone_10_achieved,
    milestone25Achieved: data.milestone_25_achieved,
    milestone50Achieved: data.milestone_50_achieved,
    totalCreditEarnedKobo: data.total_credit_earned_kobo,
    totalFreeMonthsEarned: data.total_free_months_earned,
    isAmbassador: data.is_ambassador,
    isLegend: data.is_legend,
    hasLifetimeAccess: data.has_lifetime_access,
  };
}

/**
 * Get user's active rewards
 */
export async function getActiveRewards(userUid: string): Promise<ReferralReward[]> {
  const { data, error } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('user_uid', userUid)
    .eq('status', 'active')
    .order('issued_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapRewardFromDb);
}

/**
 * Get user's referral history
 */
export async function getUserReferrals(userUid: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_uid', userUid)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapReferralFromDb);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapReferralFromDb(dbRow: any): Referral {
  return {
    id: dbRow.id,
    referrerUid: dbRow.referrer_uid,
    referralCode: dbRow.referral_code,
    refereeUid: dbRow.referee_uid,
    refereeEmail: dbRow.referee_email,
    refereeName: dbRow.referee_name,
    status: dbRow.status,
    clickedAt: dbRow.clicked_at,
    signedUpAt: dbRow.signed_up_at,
    convertedAt: dbRow.converted_at,
    rewardedAt: dbRow.rewarded_at,
    createdAt: dbRow.created_at,
  };
}

function mapRewardFromDb(dbRow: any): ReferralReward {
  return {
    id: dbRow.id,
    userUid: dbRow.user_uid,
    referralId: dbRow.referral_id,
    rewardType: dbRow.reward_type,
    rewardValue: dbRow.reward_value,
    creditAmountKobo: dbRow.credit_amount_kobo,
    creditRemainingKobo: dbRow.credit_remaining_kobo,
    freeMonths: dbRow.free_months,
    freeUntilDate: dbRow.free_until_date,
    status: dbRow.status,
    issuedAt: dbRow.issued_at,
    expiresAt: dbRow.expires_at,
  };
}
