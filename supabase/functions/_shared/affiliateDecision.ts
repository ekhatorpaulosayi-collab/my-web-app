/** 30 days. A client-supplied affiliate code is not an input. */
export const AFFILIATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type AffiliateDecision = {
  commissionKobo: number;
  record: boolean;
  reason: string;
};

export function decideAffiliateCommission(input: {
  buyerUserId: string;
  affiliateUserId: string | null;
  affiliateActive: boolean;
  paymentStatus: string;
  amountKobo: number;
  currency: string;
  reference: string;
  planCode: string | null;
  attributedAffiliateId: string | null;
  affiliateId: string | null;
  alreadyRecorded: boolean;
  attributedAtMs: number | null;
  paidAtMs: number;
}): AffiliateDecision {
  if (input.alreadyRecorded) return { commissionKobo: 0, record: false, reason: 'already_recorded' };
  if (input.paymentStatus !== 'success') return { commissionKobo: 0, record: false, reason: 'not_successful' };
  if (String(input.currency || '').toUpperCase() !== 'NGN') return { commissionKobo: 0, record: false, reason: 'wrong_currency' };
  if (input.reference.startsWith('ord_') || !input.planCode) {
    return { commissionKobo: 0, record: false, reason: 'not_subscription' };
  }
  if (!input.attributedAffiliateId || input.attributedAffiliateId !== input.affiliateId) {
    return { commissionKobo: 0, record: false, reason: 'unattributed' };
  }
  if (!input.affiliateActive) return { commissionKobo: 0, record: false, reason: 'inactive' };
  if (input.affiliateUserId && input.affiliateUserId === input.buyerUserId) {
    return { commissionKobo: 0, record: false, reason: 'self_referral' };
  }
  if (input.attributedAtMs === null || input.paidAtMs < input.attributedAtMs || input.paidAtMs - input.attributedAtMs > AFFILIATE_WINDOW_MS) {
    return { commissionKobo: 0, record: false, reason: 'outside_window' };
  }
  if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) {
    return { commissionKobo: 0, record: false, reason: 'bad_amount' };
  }
  return {
    commissionKobo: Math.floor((input.amountKobo * 30) / 100),
    record: true,
    reason: 'eligible',
  };
}
