import React, { useState, useEffect } from 'react';
import { ProgressRing } from './ProgressRing';
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
  return new Date(date).toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
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
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const [memberAnimations, setMemberAnimations] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedMemberForHistory, setSelectedMemberForHistory] = useState<Member | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [groupPaymentHistory, setGroupPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load group payment history on mount
    loadGroupPaymentHistory();
  }, []);

  const loadGroupPaymentHistory = async () => {
    const { data, error } = await contributionService.getGroupPaymentHistory(group.id);
    if (data && !error) {
      setGroupPaymentHistory(data);
    }
  };

  const currentRecipient = group.members.find(m => m.id === group.currentRecipientId);
  const paidMembers = group.members.filter(m => m.isPaid || m.hasPaid);
  const unpaidMembers = group.members.filter(m => !m.isPaid && !m.hasPaid);
  const totalMembers = group.members.length;
  const totalCollected = paidMembers.reduce((sum, m) => sum + (m.paymentAmount || group.amount), 0);
  const progressPercent = totalMembers > 0 ? (paidMembers.length / totalMembers) * 100 : 0;
  const totalAmount = group.amount * totalMembers;
  const shareUrl = group.share_code ? `storehouse.ng/a/${group.share_code}` : null;

  useEffect(() => {
    const unpaidIds = new Set(unpaidMembers.map(m => m.id));
    setAllSelected(
      unpaidIds.size > 0 &&
      Array.from(unpaidIds).every(id => selectedMembers.has(id))
    );
  }, [selectedMembers, unpaidMembers]);

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(unpaidMembers.map(m => m.id)));
    }
  };

  const handleRemindSelected = () => {
    const unpaidIds = unpaidMembers
      .filter(m => selectedMembers.has(m.id))
      .map(m => m.id);

    if (unpaidIds.length > 0) {
      onRemindUnpaid(unpaidIds);
      setSelectedMembers(new Set());
    }
  };

  const handleMarkPaid = async (memberId: string) => {
    // Trigger animation
    setMemberAnimations(new Set([memberId]));

    // Save payment to database
    const { data, error } = await contributionService.markPaid(
      group.id,
      memberId,
      group.cycleNumber,
      {
        amount: group.amount,
        paymentMethod: 'cash',
        note: `Cycle ${group.cycleNumber} payment`
      }
    );

    if (!error) {
      // Refresh payment history
      await loadGroupPaymentHistory();

      // Call the parent handler after saving
      setTimeout(() => {
        onMarkPaid(memberId);
        setMemberAnimations(new Set());
      }, 300);
    } else {
      console.error('Failed to save payment:', error);
      setMemberAnimations(new Set());
    }
  };

  const handleRecordPayout = () => {
    if (currentRecipient) {
      onRecordPayout(currentRecipient.id, totalCollected);
      setShowPayoutModal(false);
    }
  };

  const openWhatsAppForMember = (member: Member) => {
    if (!member.phone) return;
    const message = encodeURIComponent(
      `Hi ${member.name}, this is a reminder for your ${formatNaira(group.amount)} contribution to "${group.name}". Collection day: ${group.collectionDay}. Thank you!`
    );
    const phoneNumber = member.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(`https://${shareUrl}`);
    }
  };

  // Calculate member status based on payment and collection day
  const getMemberStatus = (member: Member): 'paid' | 'late' | 'defaulted' | 'frozen' | 'active' => {
    if (member.status === 'frozen') return 'frozen';
    if (member.status === 'defaulted') return 'defaulted';
    if (member.isPaid || member.hasPaid) return 'paid';

    // Check if late based on collection day
    if (group.collectionDay) {
      const today = new Date().getDay();
      const collectionDayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(group.collectionDay);

      if (collectionDayIndex !== -1 && today > collectionDayIndex) {
        return 'late';
      }
    }

    return 'active';
  };

  // Get status badge color and text
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: 'Paid' };
      case 'late':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: 'Late' };
      case 'defaulted':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: 'Defaulted' };
      case 'frozen':
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', text: 'Frozen' };
      default:
        return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', text: 'Active' };
    }
  };

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

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;

    setIsAddingMember(true);
    try {
      // Call the onAddMember prop with the new member data
      if (onAddMember) {
        await onAddMember({
          name: newMemberName.trim(),
          phone: newMemberPhone.trim() || undefined
        });
      }

      // Reset form
      setNewMemberName('');
      setNewMemberPhone('');
      setShowAddMemberForm(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  return (
    <div style={{
      background: '#fafafa',
      height: '100vh',
      overflowY: 'auto',
      paddingBottom: '140px' // Increased from 100px to prevent overlap with Need Help button
    }}>
      {/* Premium Header */}
      <div style={{
        background: 'linear-gradient(to bottom, #ffffff, #fefefe)',
        borderBottom: '1px solid rgba(229, 231, 235, 0.8)',
        padding: '20px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <button
              onClick={onBack}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#f3f4f6',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              ←
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '4px',
                letterSpacing: '-0.02em'
              }}>
                {group.name}
              </h1>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  {formatNaira(group.amount)} • {frequencyLabels[group.frequency]}
                  {group.collectionDay && ` • ${group.collectionDay}s`}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {shareUrl && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: '#f3f4f6',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                📤
              </button>
            )}
            <button
              onClick={onSettings}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#f3f4f6',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Hero Progress Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 0'
        }}>
          <ProgressRing
            progress={progressPercent}
            size={140}
            strokeWidth={10}
            amountCollected={formatNaira(totalCollected)}
            totalAmount={formatNaira(totalAmount)}
            membersPaid={paidMembers.length}
            totalMembers={totalMembers}
            isComplete={progressPercent === 100}
          />

          {/* Current Recipient Badge */}
          {currentRecipient && (
            <div style={{
              marginTop: '20px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
                opacity: 0.9
              }}>
                This Cycle's Recipient
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'white'
              }}>
                {currentRecipient.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#374151'
          }}>
            Members ({totalMembers})
          </h3>
          {unpaidMembers.length > 0 && (
            <button
              onClick={handleSelectAll}
              style={{
                fontSize: '13px',
                color: '#10b981',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {/* Member List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {group.members.map((member, index) => {
            const memberStatus = getMemberStatus(member);
            const isPaid = memberStatus === 'paid';
            const isFrozen = memberStatus === 'frozen';
            const isRecipient = member.id === group.currentRecipientId;
            const isAnimating = memberAnimations.has(member.id);
            const statusBadge = getStatusBadge(memberStatus);
            const daysOverdue = memberStatus === 'late' ? getDaysOverdue(group.collectionDay) : 0;

            return (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  background: isPaid
                    ? 'linear-gradient(to right, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02))'
                    : isFrozen
                    ? 'linear-gradient(to right, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02))'
                    : 'white',
                  borderRadius: '16px',
                  border: `1px solid ${
                    isPaid ? 'rgba(16, 185, 129, 0.2)' :
                    isFrozen ? 'rgba(59, 130, 246, 0.2)' :
                    'rgba(229, 231, 235, 0.8)'
                  }`,
                  transition: 'all 0.3s ease',
                  transform: isAnimating ? 'scale(0.98)' : 'scale(1)',
                  opacity: mounted ? 1 : 0,
                  animation: `slideIn 0.3s ease ${index * 0.05}s forwards`,
                  position: 'relative'
                }}
              >
                {/* Checkbox for unpaid and not frozen */}
                {!isPaid && !isFrozen && (
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '12px',
                      cursor: 'pointer',
                      accentColor: '#10b981'
                    }}
                  />
                )}

                {/* Avatar */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isPaid
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#f3f4f6',
                  color: isPaid ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 600,
                  marginRight: '12px'
                }}>
                  {isPaid ? '✓' : member.name.charAt(0).toUpperCase()}
                </div>

                {/* Name and badges */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#1f2937'
                    }}>
                      {member.name}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      background: statusBadge.bg,
                      color: statusBadge.color,
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {statusBadge.text}
                    </span>
                    {isRecipient && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'white',
                        textTransform: 'uppercase'
                      }}>
                        Recipient
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    {isPaid && member.paidAt
                      ? `Paid on ${formatDate(member.paidAt)}`
                      : memberStatus === 'late'
                      ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`
                      : memberStatus === 'frozen'
                      ? 'Account suspended'
                      : memberStatus === 'defaulted'
                      ? 'Missed payment - moved to last'
                      : 'Pending payment'}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isPaid && !isFrozen && (
                    <button
                      onClick={() => handleMarkPaid(member.id)}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minHeight: '36px'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Mark Paid
                    </button>
                  )}
                  {member.phone && !isPaid && (
                    <button
                      onClick={() => openWhatsAppForMember(member)}
                      style={{
                        width: '36px',
                        height: '36px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Send WhatsApp reminder"
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#e5e7eb';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#f3f4f6';
                      }}
                    >
                      💬
                    </button>
                  )}

                  {/* Three-dot menu */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMemberMenu(showMemberMenu === member.id ? null : member.id);
                      }}
                      style={{
                        width: '36px',
                        height: '36px',
                        background: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      ⋮
                    </button>

                    {/* Member action menu */}
                    {showMemberMenu === member.id && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '40px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        minWidth: '180px',
                        overflow: 'hidden'
                      }}>
                        {memberStatus !== 'frozen' && memberStatus !== 'defaulted' && !isPaid && (
                          <button
                            onClick={() => {
                              onUpdate?.({
                                ...group,
                                members: group.members.map(m =>
                                  m.id === member.id ? { ...m, status: 'defaulted' } : m
                                )
                              });
                              setShowMemberMenu(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '14px',
                              cursor: 'pointer',
                              color: '#374151',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#fef2f2';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            Mark as Defaulted
                          </button>
                        )}

                        {memberStatus !== 'frozen' ? (
                          <button
                            onClick={() => {
                              onUpdate?.({
                                ...group,
                                members: group.members.map(m =>
                                  m.id === member.id ? { ...m, status: 'frozen' } : m
                                )
                              });
                              setShowMemberMenu(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '14px',
                              cursor: 'pointer',
                              color: '#374151',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#eff6ff';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            Freeze Member
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onUpdate?.({
                                ...group,
                                members: group.members.map(m =>
                                  m.id === member.id ? { ...m, status: 'active' } : m
                                )
                              });
                              setShowMemberMenu(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '14px',
                              cursor: 'pointer',
                              color: '#374151',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#f0fdf4';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            Unfreeze Member
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            setSelectedMemberForHistory(member);
                            setShowMemberMenu(null);
                            setLoadingHistory(true);

                            // Load member's payment history
                            const { data, error } = await contributionService.getMemberPaymentHistory(member.id);
                            if (data && !error) {
                              setPaymentHistory(data);
                            }
                            setLoadingHistory(false);
                            setShowPaymentHistory(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            fontSize: '14px',
                            cursor: 'pointer',
                            color: '#374151',
                            borderTop: '1px solid #e5e7eb',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#f9fafb';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          View Payment History
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment History Section */}
        {groupPaymentHistory.length > 0 && (
          <div style={{
            marginTop: '32px',
            padding: '20px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid rgba(229, 231, 235, 0.8)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '16px'
            }}>
              Payment History
            </h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {groupPaymentHistory.map((payment: any, index: number) => (
                <div
                  key={payment.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: index < groupPaymentHistory.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#1f2937'
                    }}>
                      {payment.contribution_members?.name || 'Unknown Member'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '2px'
                    }}>
                      Cycle {payment.cycle_number} • {formatDate(payment.paid_at)}
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#10b981'
                    }}>
                      {formatNaira(payment.amount)}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      textTransform: 'capitalize'
                    }}>
                      {payment.payment_method || 'cash'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Member Section */}
        {onAddMember && (
          <>
            {showAddMemberForm ? (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'white',
                border: '2px solid #10b981',
                borderRadius: '12px'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Add New Member
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <input
                    type="text"
                    placeholder="Member name *"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#10b981'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    autoFocus
                  />
                  <input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#10b981'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={handleAddMember}
                      disabled={!newMemberName.trim() || isAddingMember}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: newMemberName.trim() && !isAddingMember
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : '#e5e7eb',
                        color: newMemberName.trim() && !isAddingMember ? 'white' : '#9ca3af',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: newMemberName.trim() && !isAddingMember ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isAddingMember ? 'Adding...' : 'Add Member'}
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
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMemberForm(true)}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '14px',
                  background: 'white',
                  color: '#10b981',
                  border: '2px dashed #10b981',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <span style={{ fontSize: '18px' }}>+</span>
                Add New Member
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      {(unpaidMembers.length > 0 || (progressPercent === 100 && currentRecipient)) && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.95))',
          borderTop: '1px solid rgba(229, 231, 235, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          gap: '12px',
          zIndex: 20
        }}>
          {unpaidMembers.length > 0 && (
            <button
              onClick={handleRemindSelected}
              disabled={selectedMembers.size === 0}
              style={{
                flex: 1,
                padding: '14px',
                background: selectedMembers.size > 0 ? 'white' : '#f9fafb',
                color: selectedMembers.size > 0 ? '#f59e0b' : '#9ca3af',
                border: selectedMembers.size > 0 ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: selectedMembers.size > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                minHeight: '48px'
              }}
            >
              💬 Remind {selectedMembers.size > 0 ? `(${selectedMembers.size})` : ''}
            </button>
          )}

          {progressPercent === 100 && currentRecipient && (
            <button
              onClick={() => setShowPayoutModal(true)}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '48px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                animation: 'pulse 2s infinite'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🎉 Record Payout • {formatNaira(totalCollected)}
            </button>
          )}
        </div>
      )}

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
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '20px',
              color: '#1f2937'
            }}>
              Share Group Link
            </h3>
            <div style={{
              background: '#f9fafb',
              padding: '14px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontFamily: 'monospace',
              fontSize: '13px',
              wordBreak: 'break-all',
              color: '#4b5563',
              border: '1px solid #e5e7eb'
            }}>
              https://{shareUrl}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  const message = encodeURIComponent(
                    `Hi! You're part of the "${group.name}" contribution group.\n\n` +
                    `Amount: ${formatNaira(group.amount)} ${group.frequency}\n` +
                    `Collection Day: ${group.collectionDay || 'TBD'}\n\n` +
                    `Join and track payments here: https://${shareUrl}`
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
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px'
                }}
              >
                💬 WhatsApp
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
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                📋 Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && selectedMemberForHistory && (
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
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowPaymentHistory(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '70vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1f2937'
              }}>
                {selectedMemberForHistory.name}'s Payment History
              </h3>
              <button
                onClick={() => setShowPaymentHistory(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '16px'
            }}>
              {loadingHistory ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280'
                }}>
                  Loading payment history...
                </div>
              ) : paymentHistory.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280'
                }}>
                  No payment history found for this member.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {paymentHistory.map((payment: any) => (
                    <div
                      key={payment.id}
                      style={{
                        padding: '16px',
                        background: '#f9fafb',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '8px'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1f2937'
                          }}>
                            Cycle {payment.cycle_number}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            {formatDate(payment.paid_at)}
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'right'
                        }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#10b981'
                          }}>
                            {formatNaira(payment.amount)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            textTransform: 'capitalize',
                            marginTop: '2px'
                          }}>
                            {payment.payment_method || 'cash'}
                          </div>
                        </div>
                      </div>
                      {payment.note && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          fontStyle: 'italic',
                          marginTop: '8px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '8px'
                        }}>
                          Note: {payment.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 0 0',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Total Payments:
                </span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937'
                }}>
                  {paymentHistory.length}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Total Amount:
                </span>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#10b981'
                }}>
                  {formatNaira(paymentHistory.reduce((sum: number, p: any) => sum + p.amount, 0))}
                </span>
              </div>
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
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowPayoutModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '20px',
              color: '#1f2937'
            }}>
              Confirm Payout
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              Record payout of <strong>{formatNaira(totalCollected)}</strong> to{' '}
              <strong>{currentRecipient?.name}</strong> for cycle {group.cycleNumber}?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayout}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            boxShadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          50% {
            boxShadow: 0 4px 20px rgba(16, 185, 129, 0.5);
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

export default ContributionGroupDetail;