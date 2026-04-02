import React, { useEffect, useState } from 'react';
import { ProgressRing } from './ProgressRing';

interface ContributionGroup {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  collectionDay: string;
  share_code?: string;
  share_enabled?: boolean;
  status?: 'active' | 'paused' | 'completed';
  members: {
    id: string;
    name: string;
    phone: string;
    isPaid?: boolean;
    hasPaid?: boolean;
    paymentDate?: string;
  }[];
  currentRecipientId: string;
  cycleNumber: number;
  totalCycles: number;
  createdAt: string;
  isActive: boolean;
}

interface ContributionGroupListProps {
  groups: ContributionGroup[];
  onGroupClick: (group: ContributionGroup) => void;
  onCreateGroup: () => void;
}

const formatNaira = (amount: number) => {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount).replace('NGN', '₦');
  } catch {
    return `₦${(amount || 0).toLocaleString()}`;
  }
};

const frequencyLabels = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly'
};

export const ContributionGroupList: React.FC<ContributionGroupListProps> = ({
  groups,
  onGroupClick,
  onCreateGroup
}) => {
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyLink = (e: React.MouseEvent, shareCode: string, groupId: string) => {
    e.stopPropagation();
    const url = `https://storehouse.ng/a/${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(groupId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (groups.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
        }}>
          👥
        </div>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          Start Your First Contribution Group
        </h3>
        <p style={{
          fontSize: '15px',
          color: '#6b7280',
          marginBottom: '32px',
          maxWidth: '300px',
          lineHeight: '1.6'
        }}>
          Create digital ajo, adashe, isusu, or esusu groups. Track contributions and payouts easily.
        </p>
        <button
          onClick={onCreateGroup}
          style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }}
        >
          + Create Your First Group
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px 16px 100px',
      background: '#fafafa',
      minHeight: '100vh'
    }}>
      {/* Premium Cards */}
      {groups.map((group, index) => {
        const paidCount = group.members?.filter(m => m.isPaid || m.hasPaid)?.length || 0;
        const totalMembers = group.members?.length || 0;
        const progressPercent = totalMembers > 0 ? (paidCount / totalMembers) * 100 : 0;
        const totalAmount = group.amount * totalMembers;
        const collectedAmount = group.amount * paidCount;
        const currentRecipient = group.members?.find(m => m.id === group.currentRecipientId);

        return (
          <div
            key={group.id}
            onClick={() => onGroupClick(group)}
            style={{
              marginBottom: '20px',
              padding: '24px',
              background: 'linear-gradient(to bottom, #ffffff, #fefefe)',
              border: '1px solid rgba(229, 231, 235, 0.8)',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
              position: 'relative',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              animation: `fadeIn 0.4s ease ${index * 0.1}s forwards`
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.06)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.8)';
            }}
          >
            {/* Status Dot */}
            <div style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: group.status === 'paused' ? '#fbbf24' : '#10b981',
              boxShadow: group.status === 'paused'
                ? '0 0 0 4px rgba(251, 191, 36, 0.2)'
                : '0 0 0 4px rgba(16, 185, 129, 0.2)'
            }} />

            {/* Main Content */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px'
            }}>
              {/* Left Section */}
              <div style={{ flex: 1 }}>
                {/* Group Name */}
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1f2937',
                  marginBottom: '12px',
                  letterSpacing: '-0.02em'
                }}>
                  {group.name}
                </h3>

                {/* Metadata Pills */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '16px'
                }}>
                  {/* Amount Pill */}
                  <span style={{
                    padding: '6px 12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFeatureSettings: '"tnum"',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {formatNaira(group.amount)}
                  </span>

                  {/* Frequency Pill */}
                  <span style={{
                    padding: '6px 12px',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    {frequencyLabels[group.frequency]}
                  </span>

                  {/* Cycle Pill */}
                  <span style={{
                    padding: '6px 12px',
                    background: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    Cycle {group.cycleNumber || 1}/{group.totalCycles || totalMembers}
                  </span>
                </div>

                {/* Current Recipient */}
                {currentRecipient && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'white',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      This Week
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'white'
                    }}>
                      {currentRecipient.name}
                    </span>
                  </div>
                )}

                {/* Share Link */}
                {group.share_code && (
                  <button
                    onClick={(e) => handleCopyLink(e, group.share_code!, group.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <span>{copiedId === group.id ? '✓' : '📋'}</span>
                    <span>storehouse.ng/a/{group.share_code}</span>
                  </button>
                )}
              </div>

              {/* Right Section - Progress Ring */}
              <div>
                <ProgressRing
                  progress={progressPercent}
                  size={90}
                  strokeWidth={7}
                  amountCollected={formatNaira(collectedAmount)}
                  totalAmount={formatNaira(totalAmount)}
                  showLabel={false}
                  isComplete={progressPercent === 100}
                />
                <div style={{
                  textAlign: 'center',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {paidCount}/{totalMembers} paid
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Create Button */}
      <button
        onClick={onCreateGroup}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        }}
      >
        +
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001s !important;
            transition-duration: 0.001s !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ContributionGroupList;