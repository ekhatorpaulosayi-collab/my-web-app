// tier-resolver
//
// Single source of truth for resolving a user's effective billing
// tier and joining it to platform_fee_config. Used by F2
// (create-paystack-subaccount) for percentage_charge and F3
// (initiate-storefront-payment) for transaction_charge math.
//
// Treats anything not active/non_renewing/trialing (or past
// current_period_end) as 'free'. TODO(billing-dunning): add
// 'past_due' to the active set once the dunning policy is decided.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type TierId = 'free' | 'starter' | 'pro';

export interface ResolvedTier {
  tier_id: TierId;
  basis_points: number;
  cap_kobo: number;
  // The full platform_fee_config row, kept here so F3 can access
  // monthly_volume_cap_kobo / paystack_wholesale_bps /
  // large_transaction_review_threshold_kobo without an extra round
  // trip. F2 only needs basis_points + cap_kobo but the extra
  // columns are cheap.
  fee_config: {
    tier: TierId;
    basis_points: number;
    fixed_fee_kobo: number;
    cap_kobo: number;
    monthly_volume_cap_kobo: number | null;
    paystack_wholesale_bps: number;
    large_transaction_review_threshold_kobo: number;
    active: boolean;
  };
}

export class TierResolverError extends Error {
  constructor(public readonly code: 'no_fee_config_for_tier', public readonly tier: string) {
    super(`tier_resolver: ${code} (tier=${tier})`);
  }
}

export async function resolveActiveTier(
  supabase: SupabaseClient,
  user_id: string,
): Promise<ResolvedTier> {
  const { data: subRow } = await supabase
    .from('user_subscriptions')
    .select('tier_id, status, current_period_end')
    .eq('user_id', user_id)
    .in('status', ['active', 'non_renewing', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const periodOk =
    !subRow?.current_period_end ||
    new Date(subRow.current_period_end).getTime() > Date.now();

  const tier_id: TierId =
    subRow && periodOk && ['free', 'starter', 'pro'].includes(subRow.tier_id)
      ? (subRow.tier_id as TierId)
      : 'free';

  const { data: feeRow, error: feeErr } = await supabase
    .from('platform_fee_config')
    .select('*')
    .eq('tier', tier_id)
    .eq('active', true)
    .single();

  if (feeErr || !feeRow) {
    throw new TierResolverError('no_fee_config_for_tier', tier_id);
  }

  return {
    tier_id,
    basis_points: feeRow.basis_points,
    cap_kobo: Number(feeRow.cap_kobo),
    fee_config: feeRow,
  };
}
