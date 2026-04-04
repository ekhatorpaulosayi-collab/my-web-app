import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGroupByShareCode } from '../../services/contributionService';

interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  paid_at?: string;
  cycleNumber: number;
}

interface ContributionGroup {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  collectionDay: string;
  members: {
    id: string;
    name: string;
    isPaid: boolean;
    paymentDate?: string;
  }[];
  currentRecipientId: string;
  cycleNumber: number;
  totalCycles: number;
  nextCollectionDate: string;
  isActive: boolean;
  paymentHistory: PaymentRecord[];
  storeName: string;
  storeSlug: string;
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

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const ContributionPublicView: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [group, setGroup] = useState<ContributionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!shareCode) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch actual data from the database
        const result = await getGroupByShareCode(shareCode);

        if (result.error || !result.data) {
          setError('Group not found or sharing is disabled');
          setLoading(false);
          return;
        }

        // Transform the data to match the component's expected format
        const groupData = result.data;
        const transformedGroup: ContributionGroup = {
          id: groupData.id,
          name: groupData.name,
          amount: groupData.amount,
          frequency: groupData.frequency,
          collectionDay: groupData.collection_day || '',
          members: groupData.members || [],
          currentRecipientId: groupData.current_recipient || '',
          cycleNumber: groupData.current_cycle || 1,
          totalCycles: groupData.total_members || 0,
          nextCollectionDate: groupData.next_collection_date || new Date().toISOString(),
          isActive: groupData.status === 'active',
          paymentHistory: groupData.payments || [],
          storeName: groupData.store_name || 'Store',
          storeSlug: groupData.store_slug || ''
        };

        setGroup(transformedGroup);
      } catch (err) {
        setError('Failed to load contribution group');
      } finally {
        setLoading(false);
      }
    };

    if (shareCode) {
      fetchGroupData();
    }
  }, [shareCode]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>❌</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Group Not Found
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            This contribution group doesn't exist or the link may have expired.
          </p>
        </div>
      </div>
    );
  }

  const currentRecipient = group.members.find(m => m.id === group.currentRecipientId);
  const paidCount = group.members.filter(m => m.isPaid).length;
  const unpaidCount = group.members.length - paidCount;
  const progressPercent = (paidCount / group.members.length) * 100;
  const totalPool = group.amount * group.members.length;

  // Group payment history by cycle, defaulting to 1 if cycle number is missing
  const paymentsByCycle = group.paymentHistory.reduce((acc, payment) => {
    const cycleNum = payment.cycleNumber || 1;
    if (!acc[cycleNum]) {
      acc[cycleNum] = [];
    }
    acc[cycleNum].push(payment);
    return acc;
  }, {} as { [key: number]: PaymentRecord[] });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {group.name}
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#6b7280'
            }}>
              Organized by {group.storeName}
            </p>
          </div>
          {group.isActive ? (
            <span style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              ● Active
            </span>
          ) : (
            <span style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              ● Paused
            </span>
          )}
        </div>
      </div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Current Status */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Current Cycle Status
          </h2>

          {/* Current Recipient */}
          {currentRecipient && (
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              padding: '16px',
              color: 'white',
              marginBottom: '16px'
            }}>
              <p style={{
                fontSize: '12px',
                opacity: 0.9,
                marginBottom: '4px'
              }}>
                This Week's Recipient
              </p>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                marginBottom: '4px'
              }}>
                {currentRecipient.name}
              </h3>
              <p style={{
                fontSize: '14px',
                opacity: 0.95
              }}>
                Expected: {formatNaira(totalPool)}
              </p>
            </div>
          )}

          {/* Progress */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#374151',
                fontWeight: 500
              }}>
                Collection Progress
              </span>
              <span style={{
                fontSize: '14px',
                color: '#10b981',
                fontWeight: 600
              }}>
                {paidCount}/{group.members.length} paid
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: progressPercent === 100 ? '#10b981' : '#fbbf24',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Group Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Amount
              </p>
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#1f2937' }}>
                {formatNaira(group.amount)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Frequency
              </p>
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#1f2937' }}>
                {group.frequency.charAt(0).toUpperCase() + group.frequency.slice(1)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Collection Day
              </p>
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#1f2937' }}>
                {group.collectionDay}s
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Next Collection
              </p>
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#1f2937' }}>
                {formatDate(group.nextCollectionDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Payout Schedule */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Payout Schedule
          </h2>

          <div style={{
            display: 'grid',
            gap: '8px'
          }}>
            {group.members.map((member, index) => {
              const cycleNum = index + 1;
              const isPast = cycleNum < group.cycleNumber;
              const isCurrent = member.id === group.currentRecipientId;

              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: isCurrent ? '#d1fae5' : isPast ? '#f9fafb' : 'white',
                    border: `1px solid ${isCurrent ? '#10b981' : '#e5e7eb'}`,
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isPast ? '#10b981' : isCurrent ? '#fbbf24' : '#e5e7eb',
                      color: isPast || isCurrent ? 'white' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {cycleNum}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: isCurrent ? 600 : 400,
                      color: '#1f2937'
                    }}>
                      {member.name}
                    </span>
                  </div>
                  {isPast && (
                    <span style={{
                      fontSize: '12px',
                      color: '#10b981',
                      fontWeight: 500
                    }}>
                      ✓ Paid out
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{
                      fontSize: '12px',
                      color: '#f59e0b',
                      fontWeight: 500
                    }}>
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Payment History
          </h2>

          {Object.keys(paymentsByCycle).length === 0 ? (
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              padding: '20px'
            }}>
              No payments recorded yet
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(paymentsByCycle)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([cycle, payments]) => (
                  <div key={cycle}>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#6b7280',
                      marginBottom: '8px'
                    }}>
                      Cycle {cycle || 1}
                    </h3>
                    <div style={{
                      display: 'grid',
                      gap: '4px'
                    }}>
                      {payments.map(payment => (
                        <div
                          key={payment.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#f9fafb',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        >
                          <span style={{ color: '#374151' }}>
                            {payment.memberName || 'Member'}
                          </span>
                          <span style={{ color: '#6b7280' }}>
                            {formatNaira(payment.amount)}{formatDate(payment.date || payment.paid_at) && ` • ${formatDate(payment.date || payment.paid_at)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Storehouse — free tools for Nigerian businesses
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '20px'
          }}>
            Track sales, manage debts, run ajo groups, and more
          </p>
          <a
            href="https://storehouse.ng"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#10b981',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            Try Storehouse Free
          </a>
          <p style={{
            marginTop: '16px',
            fontSize: '11px',
            color: '#9ca3af'
          }}>
            Powered by Storehouse
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContributionPublicView;