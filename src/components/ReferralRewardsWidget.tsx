/**
 * Referral Rewards Widget
 * Compact dashboard widget showing referral progress and rewards
 */

import React, { useState, useEffect } from 'react';
import { Gift, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { getUserMilestone, getActiveRewards, type ReferralMilestone, type ReferralReward } from '../services/referralService';
import { formatNaira } from '../utils/money';

interface ReferralRewardsWidgetProps {
  userId?: string;
  onOpenFullDashboard?: () => void;
}

export function ReferralRewardsWidget({ userId, onOpenFullDashboard }: ReferralRewardsWidgetProps) {
  const [milestone, setMilestone] = useState<ReferralMilestone | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function loadData() {
      try {
        const [milestoneData, rewardsData] = await Promise.all([
          getUserMilestone(userId!),
          getActiveRewards(userId!)
        ]);

        setMilestone(milestoneData);
        setRewards(rewardsData);
      } catch (error) {
        console.error('[ReferralWidget] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  // Don't show widget if no referrals yet
  if (!loading && (!milestone || milestone.totalReferrals === 0)) {
    return null;
  }

  if (loading) {
    return null; // Or show skeleton
  }

  // Calculate next milestone
  const conversions = milestone?.successfulConversions || 0;
  let nextMilestone = 3;
  let nextMilestoneReward = '7-day Pro trial';

  if (conversions >= 3 && conversions < 5) {
    nextMilestone = 5;
    nextMilestoneReward = '1 FREE MONTH';
  } else if (conversions >= 5 && conversions < 10) {
    nextMilestone = 10;
    nextMilestoneReward = '3 MORE months';
  } else if (conversions >= 10 && conversions < 25) {
    nextMilestone = 25;
    nextMilestoneReward = '8 MORE months';
  } else if (conversions >= 25 && conversions < 50) {
    nextMilestone = 50;
    nextMilestoneReward = 'LIFETIME ACCESS';
  }

  // Calculate total active rewards
  const totalCreditKobo = rewards
    .filter(r => r.rewardType === 'account_credit')
    .reduce((sum, r) => sum + (r.creditRemainingKobo || 0), 0);

  const totalFreeMonths = rewards
    .filter(r => r.rewardType === 'free_month')
    .reduce((sum, r) => sum + (r.freeMonths || 0), 0);

  // Get badge
  let badge = '';
  if (milestone?.isLegend) badge = '⭐ Legend';
  else if (milestone?.isAmbassador) badge = '💎 Diamond';
  else if (milestone?.milestone10Achieved) badge = '👑 Champion';
  else if (milestone?.milestone5Achieved) badge = '🔥 Fire Referrer';

  return (
    <div
      onClick={onOpenFullDashboard}
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '16px',
        margin: '16px 0',
        cursor: onOpenFullDashboard ? 'pointer' : 'default',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        if (onOpenFullDashboard) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onOpenFullDashboard) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gift size={20} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Referral Rewards</h3>
        </div>
        {badge && (
          <span style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {badge}
          </span>
        )}
      </div>

      {/* Rewards Summary */}
      {(totalCreditKobo > 0 || totalFreeMonths > 0) && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '6px', opacity: 0.9 }}>Your Active Rewards:</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {totalCreditKobo > 0 && (
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatNaira(totalCreditKobo / 100)}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Account Credit</div>
              </div>
            )}
            {totalFreeMonths > 0 && (
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{totalFreeMonths} {totalFreeMonths === 1 ? 'Month' : 'Months'}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Free Access</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress to Next Milestone */}
      {conversions < 50 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} />
              <span>{conversions}/{nextMilestone} referrals</span>
            </div>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              {nextMilestone - conversions} more for {nextMilestoneReward}
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              height: '100%',
              width: `${Math.min((conversions / nextMilestone) * 100, 100)}%`,
              borderRadius: '8px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Lifetime Access Badge */}
      {milestone?.hasLifetimeAccess && (
        <div style={{
          background: 'rgba(255, 215, 0, 0.2)',
          border: '2px solid rgba(255, 215, 0, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 600
        }}>
          🎉 You have LIFETIME ACCESS! 🎉
        </div>
      )}

      {/* Click to View More */}
      {onOpenFullDashboard && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4px',
          marginTop: '12px',
          fontSize: '13px',
          opacity: 0.9
        }}>
          <span>View full referral dashboard</span>
          <ChevronRight size={14} />
        </div>
      )}
    </div>
  );
}
