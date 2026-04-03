import React, { useState, useEffect } from 'react';
import * as contributionService from '../../services/contributionService';

interface Member {
  id: string;
  name: string;
  phone?: string;
  isPaid?: boolean;
  hasPaid?: boolean;
  paymentAmount?: number;
  paymentDate?: string;
  status?: 'active' | 'late' | 'defaulted' | 'frozen';
  paidAt?: string;
  created_at?: string;
}

interface ContributionGroup {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  collectionDay?: string;
  share_code?: string;
  share_enabled?: boolean;
  status?: 'active' | 'paused' | 'completed';
  members: Member[];
  currentRecipientId: string;
  cycleNumber: number;
  totalCycles: number;
  nextCollectionDate?: string;
}

interface ContributionGroupDetailProps {
  group: ContributionGroup;
  onBack: () => void;
  onMarkPaid: (memberId: string) => void;
  onRemindUnpaid: (memberIds: string[]) => void;
  onRecordPayout: (recipientId: string, amount: number) => void;
  onSettings: () => void;
  onAddMember?: (member: { name: string; phone?: string }) => Promise<void> | void;
  onUpdate?: (group: ContributionGroup) => void;
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

const formatDate = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'yesterday';
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
};

const frequencyLabels = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly'
};

export const ContributionGroupDetail: React.FC<ContributionGroupDetailProps> = ({
  group,
  onBack,
  onMarkPaid,
  onRemindUnpaid,
  onRecordPayout,
  onSettings,
  onAddMember
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Calculate recipient using rotation logic
  const sortedMembers = [...group.members].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  const recipientIndex = (group.cycleNumber - 1) % sortedMembers.length;
  const currentRecipient = sortedMembers[recipientIndex];

  // Calculate paid/unpaid members
  const paidMembers = group.members.filter(m => m.isPaid || m.hasPaid);
  const unpaidMembers = group.members.filter(m => !m.isPaid && !m.hasPaid);
  const totalMembers = group.members.length;
  const totalCollected = paidMembers.length * group.amount;
  const totalExpected = totalMembers * group.amount;
  const allPaid = unpaidMembers.length === 0;

  // Calculate days overdue
  const getDaysOverdue = (collectionDay?: string) => {
    if (!collectionDay) return 0;
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const collectionDayIndex = dayNames.indexOf(collectionDay);

    if (collectionDayIndex === -1) return 0;

    const todayIndex = today.getDay();
    let daysOverdue = todayIndex - collectionDayIndex;

    if (daysOverdue < 0) daysOverdue = 0;

    return daysOverdue;
  };

  const handleMarkPaid = async (memberId: string) => {
    // Save payment to database
    await contributionService.markPaid(
      group.id,
      memberId,
      group.cycleNumber,
      {
        amount: group.amount,
        paymentMethod: 'cash',
        note: `Cycle ${group.cycleNumber} payment`
      }
    );

    // Call the parent handler
    onMarkPaid(memberId);
  };

  const handleRecordPayout = () => {
    if (currentRecipient && allPaid) {
      onRecordPayout(currentRecipient.id, totalCollected);
      setShowPayoutModal(false);
    }
  };

  const handleRemindAll = () => {
    const unpaidIds = unpaidMembers.map(m => m.id);
    if (unpaidIds.length > 0) {
      onRemindUnpaid(unpaidIds);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;

    setIsAddingMember(true);
    try {
      if (onAddMember) {
        await onAddMember({
          name: newMemberName.trim(),
          phone: newMemberPhone.trim() || undefined
        });
      }
      setNewMemberName('');
      setNewMemberPhone('');
      setShowAddMemberForm(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const shareUrl = group.share_code ? `storehouse.ng/a/${group.share_code}` : null;

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(`https://${shareUrl}`);
    }
  };

  return (
    <div style={{
      background: '#f8f9fa',
      minHeight: '100vh',
      paddingBottom: '120px'
    }}>
      {/* Group header (sticky) */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #eee',
        padding: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onBack}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ←
            </button>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              {group.name}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {shareUrl && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                📤
              </button>
            )}
            <button
              onClick={onSettings}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⚙️
            </button>
          </div>
        </div>
        <div style={{
          fontSize: '13px',
          color: '#6b7280',
          marginLeft: '48px'
        }}>
          {formatNaira(group.amount)} · {frequencyLabels[group.frequency]}
          {group.collectionDay && ` · ${group.collectionDay}s`}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Simple summary card replacing progress ring */}
        <div style={{
          background: '#f8f8f6',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '8px'
          }}>
            <span style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#0F6E56'
            }}>
              {formatNaira(totalCollected)}
            </span>
            <span style={{
              fontSize: '14px',
              color: '#888'
            }}>
              of {formatNaira(totalExpected)}
            </span>
          </div>
          {currentRecipient && (
            <div style={{
              marginTop: '10px',
              display: 'inline-flex',
              padding: '6px 16px',
              borderRadius: '20px',
              background: '#FAEEDA',
              fontSize: '13px',
              color: '#854F0B'
            }}>
              Collects this cycle → {currentRecipient.name}
            </div>
          )}
        </div>

        {/* Members section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#374151',
            margin: 0
          }}>
            Members
          </h3>
          <span style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {paidMembers.length}/{totalMembers} paid
          </span>
        </div>

        {/* Simplified member list */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {group.members.map((member) => {
            const isPaid = member.isPaid || member.hasPaid;
            const daysOverdue = !isPaid && group.collectionDay ? getDaysOverdue(group.collectionDay) : 0;
            const isLate = daysOverdue > 0;

            return (
              <div
                key={member.id}
                style={{
                  padding: '12px',
                  background: isPaid
                    ? 'linear-gradient(to right, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.04))'
                    : isLate
                    ? 'linear-gradient(to right, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.04))'
                    : 'white',
                  border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.2)' : isLate ? 'rgba(245, 158, 11, 0.2)' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Coloured avatar circle */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isPaid
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : (() => {
                          const colors = [
                            'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                            'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                            'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
                          ];
                          const index = member.name.charCodeAt(0) % colors.length;
                          return colors[index];
                        })(),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {member.name}
                      </span>
                      {/* ONE status badge only - either Late or nothing */}
                      {isLate && !isPaid && (
                        <span style={{
                          padding: '2px 8px',
                          background: '#fed7aa',
                          color: '#ea580c',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          Late
                        </span>
                      )}
                    </div>
                    {/* Detail text */}
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '2px'
                    }}>
                      {isPaid
                        ? `Paid ${member.paidAt ? formatDate(member.paidAt) : 'today'}`
                        : daysOverdue > 0
                        ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`
                        : group.collectionDay
                        ? `Due ${group.collectionDay}`
                        : 'Pending payment'}
                    </div>
                  </div>
                </div>

                {/* Right side: Mark Paid button or checkmark */}
                {!isPaid ? (
                  <button
                    onClick={() => handleMarkPaid(member.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#14b8a6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '90px'
                    }}
                  >
                    Mark Paid
                  </button>
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Member section */}
        {onAddMember && (
          <>
            {showAddMemberForm ? (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'white',
                border: '1.5px dashed #14b8a6',
                borderRadius: '12px'
              }}>
                <input
                  type="text"
                  placeholder="Member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleAddMember}
                    disabled={!newMemberName.trim() || isAddingMember}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: newMemberName.trim() && !isAddingMember ? '#14b8a6' : '#e5e7eb',
                      color: newMemberName.trim() && !isAddingMember ? 'white' : '#9ca3af',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: newMemberName.trim() && !isAddingMember ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isAddingMember ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMemberForm(false);
                      setNewMemberName('');
                      setNewMemberPhone('');
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMemberForm(true)}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '14px',
                  border: '1.5px dashed #14b8a6',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#14b8a6',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                + Add Member
              </button>
            )}
          </>
        )}

        {/* Two action buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px'
        }}>
          <button
            onClick={handleRemindAll}
            disabled={unpaidMembers.length === 0}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: '1.5px solid #ddd',
              background: 'transparent',
              color: unpaidMembers.length > 0 ? '#666' : '#ccc',
              fontSize: '14px',
              fontWeight: '500',
              cursor: unpaidMembers.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            Remind all
          </button>
          <button
            onClick={() => allPaid && setShowPayoutModal(true)}
            disabled={!allPaid}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: allPaid ? '#14b8a6' : '#e5e7eb',
              color: allPaid ? 'white' : '#9ca3af',
              fontSize: '14px',
              fontWeight: '500',
              cursor: allPaid ? 'pointer' : 'not-allowed',
              opacity: allPaid ? 1 : 0.4
            }}
          >
            Record payout
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && shareUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              Share Group Link
            </h3>
            <div style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '13px',
              wordBreak: 'break-all',
              color: '#4b5563'
            }}>
              https://{shareUrl}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const message = encodeURIComponent(
                    `Hi! You're part of the "${group.name}" contribution group.\n\n` +
                    `Amount: ${formatNaira(group.amount)} ${group.frequency}\n` +
                    `Collection Day: ${group.collectionDay || 'TBD'}\n\n` +
                    `Join here: https://${shareUrl}`
                  );
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                  setShowShareModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#25d366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                WhatsApp
              </button>
              <button
                onClick={() => {
                  copyShareLink();
                  setShowShareModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Confirmation Modal */}
      {showPayoutModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowPayoutModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              Confirm Payout
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              Record payout of <strong>{formatNaira(totalCollected)}</strong> to{' '}
              <strong>{currentRecipient?.name}</strong> for cycle {group.cycleNumber}?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayout}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#14b8a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionGroupDetail;