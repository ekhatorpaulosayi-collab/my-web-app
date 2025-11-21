/**
 * Referral Dashboard Page
 * Full referral management interface with progress, rewards, and invite tools
 */

import React, { useState, useEffect } from 'react';
import { Copy, Check, Gift, TrendingUp, Users, Award, Sparkles } from 'lucide-react';
import {
  getOrCreateReferralCode,
  getUserMilestone,
  getActiveRewards,
  getUserReferrals,
  MILESTONE_REWARDS,
  type ReferralMilestone,
  type ReferralReward,
  type Referral
} from '../services/referralService';
import { ReferralInviteButton } from '../components/ReferralInviteButton';
import { formatNaira } from '../utils/money';
import { useAuth } from '../contexts/AuthContext';

export default function ReferralDashboard() {
  const { currentUser } = useAuth();
  const user = currentUser;
  const [referralCode, setReferralCode] = useState<string>('');
  const [milestone, setMilestone] = useState<ReferralMilestone | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Load business name from settings
  const [businessName, setBusinessName] = useState('Storehouse');

  useEffect(() => {
    const saved = localStorage.getItem('storehouse-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setBusinessName(settings.businessName || 'Storehouse');
      } catch (e) {
        console.error('Error loading business settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadReferralData() {
      try {
        const [code, milestoneData, rewardsData, referralsData] = await Promise.all([
          getOrCreateReferralCode(user!.uid, user!.email),
          getUserMilestone(user!.uid),
          getActiveRewards(user!.uid),
          getUserReferrals(user!.uid)
        ]);

        setReferralCode(code);
        setMilestone(milestoneData);
        setRewards(rewardsData);
        setReferrals(referralsData);
      } catch (error) {
        console.error('[ReferralDashboard] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReferralData();
  }, [user]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy code');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
        <p style={{ color: '#6b7280' }}>Loading your referral dashboard...</p>
      </div>
    );
  }

  const conversions = milestone?.successfulConversions || 0;

  // Calculate next milestone
  let nextMilestone = 3;
  let nextMilestoneReward = '7-day Pro trial';
  let progress = conversions / nextMilestone;

  if (conversions >= 3 && conversions < 5) {
    nextMilestone = 5;
    nextMilestoneReward = '1 FREE MONTH';
    progress = conversions / nextMilestone;
  } else if (conversions >= 5 && conversions < 10) {
    nextMilestone = 10;
    nextMilestoneReward = '3 MORE months (total: 4)';
    progress = conversions / nextMilestone;
  } else if (conversions >= 10 && conversions < 25) {
    nextMilestone = 25;
    nextMilestoneReward = '8 MORE months (total: 12)';
    progress = conversions / nextMilestone;
  } else if (conversions >= 25 && conversions < 50) {
    nextMilestone = 50;
    nextMilestoneReward = 'LIFETIME ACCESS';
    progress = conversions / nextMilestone;
  } else if (conversions >= 50) {
    progress = 1;
  }

  // Get badge
  let badge = '';
  let badgeColor = '#3b82f6';
  if (milestone?.isLegend) {
    badge = '⭐ Legend';
    badgeColor = '#fbbf24';
  } else if (milestone?.isAmbassador) {
    badge = '💎 Diamond';
    badgeColor = '#a78bfa';
  } else if (milestone?.milestone10Achieved) {
    badge = '👑 Champion';
    badgeColor = '#f59e0b';
  } else if (milestone?.milestone5Achieved) {
    badge = '🔥 Fire Referrer';
    badgeColor = '#ef4444';
  }

  // Calculate total active rewards
  const totalCreditKobo = rewards
    .filter(r => r.rewardType === 'account_credit')
    .reduce((sum, r) => sum + (r.creditRemainingKobo || 0), 0);

  const totalFreeMonths = rewards
    .filter(r => r.rewardType === 'free_month')
    .reduce((sum, r) => sum + (r.freeMonths || 0), 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>
          Referral Program
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          Invite friends and earn amazing rewards!
        </p>
      </div>

      {/* Referral Code Card */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Your Referral Code</div>
            <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '2px' }}>{referralCode}</div>
          </div>
          {badge && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '8px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {badge}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={handleCopyCode}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          <div style={{ flex: 1 }}>
            <ReferralInviteButton
              referralCode={referralCode}
              businessName={businessName}
              variant="secondary"
              fullWidth
            />
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          lineHeight: 1.5
        }}>
          Share your code with friends. When they sign up and upgrade to paid, you both earn rewards!
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Referrals */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#3b82f6' }}>
            <Users size={20} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Total Referrals</div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
            {milestone?.totalReferrals || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {conversions} converted to paid
          </div>
        </div>

        {/* Account Credit */}
        {totalCreditKobo > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#10b981' }}>
              <Gift size={20} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Account Credit</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
              {formatNaira(totalCreditKobo / 100)}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Use toward subscription
            </div>
          </div>
        )}

        {/* Free Months */}
        {totalFreeMonths > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#8b5cf6' }}>
              <Award size={20} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Free Access</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
              {totalFreeMonths} {totalFreeMonths === 1 ? 'Month' : 'Months'}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Stacked rewards
            </div>
          </div>
        )}
      </div>

      {/* Progress to Next Milestone */}
      {conversions < 50 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Next Milestone</div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {nextMilestone - conversions} more {nextMilestone - conversions === 1 ? 'referral' : 'referrals'} to unlock {nextMilestoneReward}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
                {conversions}/{nextMilestone}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            background: '#f3f4f6',
            borderRadius: '12px',
            height: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              height: '100%',
              width: `${Math.min(progress * 100, 100)}%`,
              borderRadius: '12px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Milestone Rewards */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0', color: '#111827' }}>
          Milestone Rewards
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { count: 3, reward: '7-day Pro trial', achieved: milestone?.milestone3Achieved },
            { count: 5, reward: '+1 FREE MONTH', achieved: milestone?.milestone5Achieved },
            { count: 10, reward: '+3 MORE months (total: 4)', achieved: milestone?.milestone10Achieved },
            { count: 25, reward: '+8 MORE months (total: 12)', achieved: milestone?.milestone25Achieved },
            { count: 50, reward: 'LIFETIME ACCESS + revenue share', achieved: milestone?.milestone50Achieved },
          ].map(({ count, reward, achieved }) => (
            <div
              key={count}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: achieved ? '#f0fdf4' : '#f9fafb',
                borderRadius: '8px',
                border: achieved ? '2px solid #10b981' : '1px solid #e5e7eb',
                opacity: achieved ? 1 : conversions >= count ? 0.9 : 0.6
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: achieved ? '#10b981' : conversions >= count ? '#667eea' : '#d1d5db',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {achieved ? '✓' : count}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                  {count} Referrals
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>
                  {reward}
                </div>
              </div>
              {achieved && (
                <div style={{
                  padding: '4px 12px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Unlocked
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#92400e',
          lineHeight: 1.5
        }}>
          <strong>💡 Pro Tip:</strong> Rewards are ADDITIVE! At 25 referrals, you'll have a full year free (1+3+8 months).
        </div>
      </div>

      {/* Your Referrals List */}
      {referrals.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0', color: '#111827' }}>
            Your Referrals ({referrals.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {referrals.map((ref) => (
              <div
                key={ref.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>
                    {ref.refereeName || ref.refereeEmail || 'Anonymous'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  ...(ref.status === 'converted' && {
                    background: '#d1fae5',
                    color: '#065f46'
                  }),
                  ...(ref.status === 'signed_up' && {
                    background: '#dbeafe',
                    color: '#1e40af'
                  }),
                  ...(ref.status === 'pending' && {
                    background: '#f3f4f6',
                    color: '#6b7280'
                  })
                }}>
                  {ref.status === 'converted' ? '✓ Paid' : ref.status === 'signed_up' ? 'Signed Up' : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
