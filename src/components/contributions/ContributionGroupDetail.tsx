import React, { useState, useEffect } from 'react';
import * as contributionService from '../../services/contributionService';
import { supabase } from '../../lib/supabase';

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
  onAddMember,
  onUpdate
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Settings form state
  const [editedName, setEditedName] = useState(group.name);
  const [editedAmount, setEditedAmount] = useState(group.amount.toString());
  const [editedFrequency, setEditedFrequency] = useState(group.frequency);
  const [editedCollectionDay, setEditedCollectionDay] = useState(group.collectionDay || '');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Calculate recipient using rotation logic
  const sortedMembers = [...group.members].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  const recipientIndex = (group.cycleNumber - 1) % sortedMembers.length;
  const currentRecipient = sortedMembers[recipientIndex];
  const nextRecipientIndex = group.cycleNumber % sortedMembers.length;
  const nextRecipient = sortedMembers[nextRecipientIndex];

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

  // Load payment history when settings opens
  useEffect(() => {
    if (showSettings) {
      loadPaymentHistory();
    }
  }, [showSettings]);

  const loadPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('contribution_payments')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPaymentHistory(data);
      }
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
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

  // Fix 3: Wire up Remind All button
  const handleRemindAll = async () => {
    const unpaidWithPhone = unpaidMembers.filter(m => m.phone);

    if (unpaidWithPhone.length === 0) {
      // Show toast: "No phone numbers saved. Add phone numbers in member details."
      alert('No phone numbers saved. Add phone numbers in member details.');
      return;
    }

    if (unpaidWithPhone.length > 1) {
      setShowRemindModal(true);
    } else {
      // Single unpaid member, go straight to WhatsApp
      sendWhatsAppReminder(unpaidWithPhone[0]);
    }
  };

  const sendWhatsAppReminder = (member: Member) => {
    if (!member.phone) return;

    const shareUrl = group.share_code ? `https://storehouse.ng/a/${group.share_code}` : '';
    const message = `Hi ${member.name}, your ${formatNaira(group.amount)} contribution for ${group.name} is due. Please pay to keep the group on track. ${shareUrl ? `View status: ${shareUrl}` : ''}`;
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = member.phone.replace(/\D/g, '');

    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const sendAllReminders = () => {
    const unpaidWithPhone = unpaidMembers.filter(m => m.phone);
    unpaidWithPhone.forEach((member, index) => {
      setTimeout(() => {
        sendWhatsAppReminder(member);
      }, index * 500); // Stagger the opens slightly
    });
    setShowRemindModal(false);
    alert('Reminders sent!');
  };

  // Fix 4: Record Payout functionality
  const handleRecordPayout = async () => {
    if (!currentRecipient || !allPaid) return;

    try {
      // Save payout record
      await contributionService.recordPayout(
        group.id,
        currentRecipient.id,
        group.cycleNumber,
        totalCollected
      );

      // Call the parent handler which should:
      // - Advance cycle number
      // - Reset all members to unpaid
      // - Refresh the view
      onRecordPayout(currentRecipient.id, totalCollected);

      setShowPayoutModal(false);
      alert(`₦${totalCollected.toLocaleString()} payout to ${currentRecipient.name} recorded. Cycle ${group.cycleNumber + 1} started!`);
    } catch (error) {
      console.error('Failed to record payout:', error);
      alert('Failed to record payout. Please try again.');
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

  // Settings modal functions
  const handleSaveGroupDetails = async () => {
    try {
      const { error } = await supabase
        .from('contribution_groups')
        .update({
          name: editedName,
          amount: parseFloat(editedAmount),
          frequency: editedFrequency,
          collection_day: editedCollectionDay
        })
        .eq('id', group.id);

      if (error) throw error;

      alert('Group details updated!');
      if (onUpdate) {
        onUpdate({
          ...group,
          name: editedName,
          amount: parseFloat(editedAmount),
          frequency: editedFrequency,
          collectionDay: editedCollectionDay
        });
      }
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group details. Please try again.');
    }
  };

  const handleMemberAction = async (memberId: string, action: 'default' | 'freeze' | 'unfreeze' | 'remove') => {
    try {
      switch (action) {
        case 'default':
          await supabase
            .from('contribution_members')
            .update({ status: 'defaulted' })
            .eq('id', memberId);
          break;
        case 'freeze':
          await supabase
            .from('contribution_members')
            .update({ status: 'frozen' })
            .eq('id', memberId);
          break;
        case 'unfreeze':
          await supabase
            .from('contribution_members')
            .update({ status: 'active' })
            .eq('id', memberId);
          break;
        case 'remove':
          if (confirm('Remove this member from the group?')) {
            await supabase
              .from('contribution_members')
              .delete()
              .eq('id', memberId);
          }
          break;
      }
      alert(`Member ${action}ed successfully`);
      // Refresh the view
      window.location.reload();
    } catch (error) {
      console.error(`Failed to ${action} member:`, error);
      alert(`Failed to ${action} member. Please try again.`);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      // Delete all related data
      await supabase
        .from('contribution_payments')
        .delete()
        .eq('group_id', group.id);

      await supabase
        .from('contribution_members')
        .delete()
        .eq('group_id', group.id);

      await supabase
        .from('contribution_groups')
        .delete()
        .eq('id', group.id);

      alert('Group deleted successfully');
      onBack();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
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
      paddingBottom: '140px' // Fix 1: Increased padding
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
              onClick={() => setShowSettings(true)} // Fix 5: Wire up Settings
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

      <div style={{ padding: '16px', paddingBottom: '140px' }}>
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
                  {/* Fix 6: Dynamic avatar colors based on member name */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isPaid
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : (() => {
                          const avatarColors = ['#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#BA7517', '#378ADD'];
                          const colorIndex = member.name.charCodeAt(0) % avatarColors.length;
                          const avatarColor = avatarColors[colorIndex];
                          return avatarColor;
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
                border: '1.5px dashed #ccc', // Fix 2: Changed to light grey
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
                  border: '1.5px dashed #ccc', // Fix 5: Changed to light grey
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#0F6E56', // Text stays teal
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
            onClick={handleRemindAll} // Fix 3: Wired up
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
            onClick={() => allPaid && setShowPayoutModal(true)} // Fix 4: Proper state check
            disabled={!allPaid}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: allPaid ? '#14b8a6' : '#e5e7eb', // Fix 4: Solid teal when all paid
              color: allPaid ? 'white' : '#9ca3af',
              fontSize: '14px',
              fontWeight: '500',
              cursor: allPaid ? 'pointer' : 'not-allowed',
              opacity: allPaid ? 1 : 0.4, // Fix 4: Full opacity when all paid
              pointerEvents: allPaid ? 'auto' : 'none' // Fix 4: Enable clicks when all paid
            }}
          >
            Record payout
          </button>
        </div>
      </div>

      {/* Remind Modal */}
      {showRemindModal && (
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
          onClick={() => setShowRemindModal(false)}
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
              Send Reminders
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px'
            }}>
              Send reminder to {unpaidMembers.filter(m => m.phone).length} unpaid members?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowRemindModal(false)}
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
                onClick={sendAllReminders}
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
                Send via WhatsApp
              </button>
            </div>
          </div>
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

      {/* Fix 5: Settings Modal */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: '#ffffff',
            overflowY: 'auto',
            padding: 0,
            margin: 0
          }}
        >
          {/* Settings Header - Fix 1: Add back button and proper X button */}
          <div style={{
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            padding: '16px',
            borderBottom: '1px solid #eee',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowSettings(false)}
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
              <span style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#1f2937'
              }}>
                Settings
              </span>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ paddingBottom: '140px' }}>
            {/* Group Details Section */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#374151'
              }}>
                Group Details
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#6b7280' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#6b7280' }}>
                  Contribution Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280'
                  }}>₦</span>
                  <input
                    type="number"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 30px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#6b7280' }}>
                  Frequency
                </label>
                <select
                  value={editedFrequency}
                  onChange={(e) => setEditedFrequency(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#6b7280' }}>
                  Collection Day
                </label>
                <select
                  value={editedCollectionDay}
                  onChange={(e) => setEditedCollectionDay(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <button
                onClick={handleSaveGroupDetails}
                style={{
                  width: '100%',
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
                Save Changes
              </button>
            </div>

            {/* Recipient Order Section */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#374151'
              }}>
                Recipient Order
              </h3>
              <div style={{
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                  Current cycle: {group.cycleNumber}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                  Current recipient: {currentRecipient?.name || 'None'}
                </div>
                {nextRecipient && (
                  <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                    Next cycle recipient: {nextRecipient.name}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {sortedMembers.map((member, index) => (
                  <div
                    key={member.id}
                    style={{
                      padding: '8px',
                      background: index === recipientIndex ? '#fef3c7' : 'transparent',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                  >
                    {index + 1}. {member.name} {index === recipientIndex && '(current)'}
                  </div>
                ))}
              </div>
            </div>

            {/* Member Management Section */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#374151'
              }}>
                Member Management
              </h3>
              {group.members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Status: {member.status || 'active'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {member.status !== 'defaulted' && !member.isPaid && (
                      <button
                        onClick={() => handleMemberAction(member.id, 'default')}
                        style={{
                          padding: '4px 8px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Default
                      </button>
                    )}
                    {member.status !== 'frozen' ? (
                      <button
                        onClick={() => handleMemberAction(member.id, 'freeze')}
                        style={{
                          padding: '4px 8px',
                          background: '#dbeafe',
                          color: '#2563eb',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Freeze
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMemberAction(member.id, 'unfreeze')}
                        style={{
                          padding: '4px 8px',
                          background: '#dcfce7',
                          color: '#16a34a',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Unfreeze
                      </button>
                    )}
                    <button
                      onClick={() => handleMemberAction(member.id, 'remove')}
                      style={{
                        padding: '4px 8px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment History Section */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#374151'
              }}>
                Payment History
              </h3>
              {loadingHistory ? (
                <div style={{ color: '#6b7280', fontSize: '14px' }}>Loading...</div>
              ) : paymentHistory.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {paymentHistory.map((payment, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '14px'
                      }}
                    >
                      <div style={{ color: '#1f2937', fontWeight: '500' }}>
                        {payment.member_name || 'Unknown'} {payment.payment_type === 'payout' ? 'received' : 'paid'} {formatNaira(payment.amount)}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        Cycle {payment.cycle_number} · {formatDate(payment.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: '14px' }}>No payment history yet</div>
              )}
            </div>

            {/* Danger Zone Section */}
            <div style={{ padding: '20px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#dc2626'
              }}>
                Danger Zone
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => {
                    // Toggle pause state
                    alert('Pause/Resume feature coming soon');
                  }}
                  style={{
                    padding: '12px',
                    background: '#fef3c7',
                    color: '#854d0e',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {group.status === 'paused' ? 'Resume Group' : 'Pause Group'}
                </button>
              </div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '12px',
                  background: 'transparent',
                  color: '#dc2626',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            zIndex: 1002
          }}
          onClick={() => setShowDeleteConfirm(false)}
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
              color: '#dc2626'
            }}>
              Delete Group
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px'
            }}>
              Delete this group and all records? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
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
                onClick={handleDeleteGroup}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionGroupDetail;