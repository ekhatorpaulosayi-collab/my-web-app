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
  position?: number;
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
  cycle_start_date?: string;
  created_at?: string;
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
  onSettingsVisibilityChange?: (isVisible: boolean) => void;
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
  onUpdate,
  onSettingsVisibilityChange
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
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [recipientOrder, setRecipientOrder] = useState<string[]>([]);
  const [cyclePayments, setCyclePayments] = useState<any[]>([]);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showPayoutSchedule, setShowPayoutSchedule] = useState(false);
  const [isSelectingRecipient, setIsSelectingRecipient] = useState(false);

  // Load payments for current cycle on mount
  React.useEffect(() => {
    loadCyclePayments();
  }, [group.id, group.cycleNumber]);

  const loadCyclePayments = async () => {
    try {
      const { data, error } = await supabase
        .from('contribution_payments')
        .select('*')
        .eq('group_id', group.id)
        .eq('cycle_number', group.cycleNumber);

      if (!error && data) {
        setCyclePayments(data);
      }
    } catch (error) {
      console.error('Failed to load cycle payments:', error);
    }
  };

  // Notify parent when Settings visibility changes
  React.useEffect(() => {
    onSettingsVisibilityChange?.(showSettings);
  }, [showSettings, onSettingsVisibilityChange]);

  // Settings form state
  const [editedName, setEditedName] = useState(group.name);
  const [editedAmount, setEditedAmount] = useState(group.amount.toString());
  const [editedFrequency, setEditedFrequency] = useState(group.frequency);
  const [editedCollectionDay, setEditedCollectionDay] = useState(group.collectionDay || '');
  const [editedCycleStartDate, setEditedCycleStartDate] = useState(
    group.cycle_start_date || group.created_at || new Date().toISOString().split('T')[0]
  );
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Initialize recipient order from members
  React.useEffect(() => {
    if (group.members && recipientOrder.length === 0) {
      setRecipientOrder(group.members.map(m => m.id));
    }
  }, [group.members]);

  // Calculate recipient using rotation logic
  const sortedMembers = [...group.members].sort((a, b) => {
    // Sort by position first, fallback to created_at if positions are equal
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  const recipientIndex = (group.cycleNumber - 1) % sortedMembers.length;
  const currentRecipient = sortedMembers[recipientIndex];
  const nextRecipientIndex = group.cycleNumber % sortedMembers.length;
  const nextRecipient = sortedMembers[nextRecipientIndex];

  // Calculate paid/unpaid members based on database payments
  const getMemberPaidStatus = (memberId: string) => {
    return cyclePayments.some(payment => payment.member_id === memberId);
  };

  const paidMembers = group.members.filter(m => getMemberPaidStatus(m.id));
  const unpaidMembers = group.members.filter(m => !getMemberPaidStatus(m.id));
  const totalMembers = group.members.length;
  const totalCollected = paidMembers.length * group.amount;
  const totalExpected = totalMembers * group.amount;
  const allPaid = unpaidMembers.length === 0;

  // Calculate days overdue based on cycle start date
  const getPaymentStatus = (collectionDay?: string) => {
    if (!collectionDay) return { status: 'pending', text: 'Pending payment', daysOverdue: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the cycle start date
    const cycleStartDate = new Date(group.cycle_start_date || group.created_at || today.toISOString());
    cycleStartDate.setHours(0, 0, 0, 0);

    // Find the day of week indices
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const collectionDayIndex = dayNames.indexOf(collectionDay);

    if (collectionDayIndex === -1) return { status: 'pending', text: 'Pending payment', daysOverdue: 0 };

    // Find the first collection day after cycle start
    let firstCollectionDate = new Date(cycleStartDate);
    while (firstCollectionDate.getDay() !== collectionDayIndex) {
      firstCollectionDate.setDate(firstCollectionDate.getDate() + 1);
    }

    // If cycle start is already on collection day, use it
    if (cycleStartDate.getDay() === collectionDayIndex) {
      firstCollectionDate = new Date(cycleStartDate);
    }

    // Calculate difference
    const diffTime = today.getTime() - firstCollectionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Before first collection date
      const daysUntil = Math.abs(diffDays);
      const collectionDateStr = `${firstCollectionDate.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][firstCollectionDate.getMonth()]}`;
      return {
        status: 'upcoming',
        text: `Due ${collectionDay} (${collectionDateStr})`,
        daysOverdue: 0
      };
    } else if (diffDays === 0) {
      // Today is collection day
      return { status: 'due_today', text: 'Due today', daysOverdue: 0 };
    } else {
      // Past collection date
      return {
        status: 'late',
        text: `${diffDays} day${diffDays !== 1 ? 's' : ''} overdue`,
        daysOverdue: diffDays
      };
    }
  };

  // Load payment history when settings or member detail opens
  useEffect(() => {
    if (showSettings || showMemberDetail) {
      loadPaymentHistory();
    }
  }, [showSettings, showMemberDetail]);

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

  const handleMarkPaidClick = (memberId: string) => {
    setSelectedMemberForPayment(memberId);
    setPaymentNote('');
    setShowPaymentMethodModal(true);
  };

  const handleConfirmPayment = async (method: 'cash' | 'transfer' | 'other') => {
    if (!selectedMemberForPayment) return;

    // Save payment to database
    await contributionService.markPaid(
      group.id,
      selectedMemberForPayment,
      group.cycleNumber,
      {
        amount: group.amount,
        paymentMethod: method,
        note: paymentNote || `Cycle ${group.cycleNumber} payment`
      }
    );

    // Reload payments from database to update UI
    await loadCyclePayments();

    // Call the parent handler
    onMarkPaid(selectedMemberForPayment);

    // Close modal and reset
    setShowPaymentMethodModal(false);
    setSelectedMemberForPayment(null);
    setPaymentNote('');
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
  const moveRecipientUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...recipientOrder];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    setRecipientOrder(newOrder);
  };

  const moveRecipientDown = (index: number) => {
    if (index === recipientOrder.length - 1) return;
    const newOrder = [...recipientOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setRecipientOrder(newOrder);
  };

  const saveRecipientOrder = async () => {
    try {
      // Update the position field for each member
      const updates = recipientOrder.map((memberId, index) =>
        supabase
          .from('contribution_members')
          .update({ position: index })
          .eq('id', memberId)
          .eq('group_id', group.id)
      );

      await Promise.all(updates);
      alert('Recipient order saved!');
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order. Please try again.');
    }
  };

  const handleSaveGroupDetails = async () => {
    try {
      const { error } = await supabase
        .from('contribution_groups')
        .update({
          name: editedName,
          amount: parseFloat(editedAmount),
          frequency: editedFrequency,
          collection_day: editedCollectionDay,
          cycle_start_date: editedCycleStartDate
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
          collectionDay: editedCollectionDay,
          cycle_start_date: editedCycleStartDate
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
            <div
              onClick={() => setShowPayoutSchedule(true)}
              style={{
                marginTop: '10px',
                display: 'inline-flex',
                padding: '6px 16px',
                borderRadius: '20px',
                background: '#FAEEDA',
                fontSize: '13px',
                color: '#854F0B',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5E1BC'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FAEEDA'}
            >
              Collects this cycle → {currentRecipient.name}
            </div>
          )}
        </div>

        {/* Collection Day Banner */}
        {(() => {
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const isCollectionDay = group.collectionDay && today.toLowerCase() === group.collectionDay.toLowerCase();
          const paidToday = paidMembers.length;
          const totalToday = group.members.length;

          if (isCollectionDay) {
            const allPaidToday = paidToday === totalToday;
            return (
              <div style={{
                background: allPaidToday ? '#d1fae5' : '#fed7aa',
                border: `1px solid ${allPaidToday ? '#86efac' : '#fdba74'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: allPaidToday ? '#065f46' : '#92400e'
                }}>
                  {allPaidToday
                    ? '✅ All paid! Ready for payout'
                    : `📅 Today is collection day — ${paidToday}/${totalToday} paid`
                  }
                </span>
              </div>
            );
          } else if (group.collectionDay) {
            // Calculate days until next collection day
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const todayIndex = new Date().getDay();
            const targetIndex = daysOfWeek.indexOf(group.collectionDay.toLowerCase());

            let daysUntil = targetIndex - todayIndex;
            if (daysUntil <= 0) daysUntil += 7;

            return (
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                Next collection: {group.collectionDay} ({daysUntil} day{daysUntil !== 1 ? 's' : ''})
              </div>
            );
          }
          return null;
        })()}

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
            const isPaid = getMemberPaidStatus(member.id);
            const paymentStatus = !isPaid ? getPaymentStatus(group.collectionDay) : null;
            const isLate = paymentStatus?.status === 'late';
            const memberPayment = cyclePayments.find(p => p.member_id === member.id);

            return (
              <div
                key={member.id}
                onClick={(e) => {
                  // Don't open detail if clicking on Mark Paid button
                  if (!(e.target as HTMLElement).closest('button')) {
                    setSelectedMember(member);
                    setShowMemberDetail(true);
                  }
                }}
                style={{
                  cursor: 'pointer',
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
                        ? `Paid ${memberPayment?.created_at ? formatDate(memberPayment.created_at) : 'today'}`
                        : paymentStatus?.text || 'Pending payment'}
                    </div>
                  </div>
                </div>

                {/* Right side: Mark Paid button or checkmark */}
                {!isPaid ? (
                  <button
                    onClick={() => handleMarkPaidClick(member.id)}
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

              <div style={{ marginBottom: '12px' }}>
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#6b7280' }}>
                  Cycle Start Date
                </label>
                <input
                  type="date"
                  value={editedCycleStartDate}
                  onChange={(e) => setEditedCycleStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  First collection is on the first {editedCollectionDay || 'collection day'} after this date
                </div>
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
                {recipientOrder.map((memberId, index) => {
                  const member = group.members.find(m => m.id === memberId);
                  if (!member) return null;
                  const isCurrent = index === recipientIndex;

                  return (
                    <div
                      key={member.id}
                      style={{
                        padding: '8px',
                        background: isCurrent ? '#fef3c7' : '#f9fafb',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '500' }}>{index + 1}.</span>
                        <span>{member.name}</span>
                        {isCurrent && <span style={{ fontSize: '12px', color: '#92400e' }}>(current)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {index > 0 && (
                          <button
                            onClick={() => moveRecipientUp(index)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px'
                            }}
                          >
                            ↑
                          </button>
                        )}
                        {index < recipientOrder.length - 1 && (
                          <button
                            onClick={() => moveRecipientDown(index)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px'
                            }}
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={saveRecipientOrder}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Save Order
              </button>
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

      {/* Payment Method Modal */}
      {showPaymentMethodModal && selectedMemberForPayment && (
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
          onClick={() => setShowPaymentMethodModal(false)}
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
              How did they pay?
            </h3>

            {/* Payment method pills */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              {(['cash', 'transfer', 'other'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => handleConfirmPayment(method)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#10b981';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {method === 'cash' ? 'Cash' : method === 'transfer' ? 'Transfer' : 'Other'}
                </button>
              ))}
            </div>

            {/* Optional note */}
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            />

            <button
              onClick={() => setShowPaymentMethodModal(false)}
              style={{
                width: '100%',
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

      {/* Member Detail Modal */}
      {showMemberDetail && selectedMember && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1003
          }}
          onClick={() => setShowMemberDetail(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Member Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: getMemberPaidStatus(selectedMember.id)
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#6b7280',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    {selectedMember.name}
                  </h3>
                  {selectedMember.phone ? (
                    <a
                      href={`tel:${selectedMember.phone}`}
                      style={{
                        fontSize: '14px',
                        color: '#14b8a6',
                        margin: '2px 0 0 0',
                        display: 'block',
                        textDecoration: 'none'
                      }}
                    >
                      {selectedMember.phone} (tap to call)
                    </a>
                  ) : (
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: '2px 0 0 0'
                    }}>
                      No phone saved
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowMemberDetail(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* Member Details */}
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Rotation Position
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                  Position {sortedMembers.findIndex(m => m.id === selectedMember.id) + 1} of {sortedMembers.length}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Payment Status (Cycle {group.cycleNumber})
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: getMemberPaidStatus(selectedMember.id) ? '#059669' : '#dc2626' }}>
                  {(() => {
                    const isPaid = getMemberPaidStatus(selectedMember.id);
                    const payment = cyclePayments.find(p => p.member_id === selectedMember.id);
                    const paymentStatus = !isPaid ? getPaymentStatus(group.collectionDay) : null;

                    if (isPaid && payment) {
                      return `Paid ${formatDate(payment.created_at)} (${payment.payment_method || 'cash'})`;
                    } else {
                      return paymentStatus?.text || 'Pending payment';
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              {sortedMembers.findIndex(m => m.id === selectedMember.id) > 0 && (
                <button
                  onClick={() => {
                    const index = recipientOrder.findIndex(id => id === selectedMember.id);
                    if (index > 0) {
                      moveRecipientUp(index);
                      saveRecipientOrder();
                    }
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
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  ↑ Move Up
                </button>
              )}
              {sortedMembers.findIndex(m => m.id === selectedMember.id) < sortedMembers.length - 1 && (
                <button
                  onClick={() => {
                    const index = recipientOrder.findIndex(id => id === selectedMember.id);
                    if (index < recipientOrder.length - 1) {
                      moveRecipientDown(index);
                      saveRecipientOrder();
                    }
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
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  ↓ Move Down
                </button>
              )}
            </div>

            {/* Payment History */}
            <div>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Payment History
              </h4>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {paymentHistory
                  .filter(p => p.member_id === selectedMember.id)
                  .map((payment, index) => (
                    <div
                      key={payment.id}
                      style={{
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>Cycle {payment.cycle_number}</span>
                        <span style={{ color: '#059669' }}>{formatNaira(payment.amount_paid)}</span>
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        {formatDate(payment.created_at)} • {payment.payment_method || 'cash'}
                      </div>
                    </div>
                  ))}
                {paymentHistory.filter(p => p.member_id === selectedMember.id).length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '13px'
                  }}>
                    No payment history yet
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {!getMemberPaidStatus(selectedMember.id) && (
              <button
                onClick={() => {
                  setShowMemberDetail(false);
                  handleMarkPaidClick(selectedMember.id);
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#14b8a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '16px'
                }}
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payout Schedule Modal */}
      {showPayoutSchedule && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1004
          }}
          onClick={() => {
            setShowPayoutSchedule(false);
            setIsSelectingRecipient(false);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Payout Schedule
              </h3>
              <button
                onClick={() => {
                  setShowPayoutSchedule(false);
                  setIsSelectingRecipient(false);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* Payout Order List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '20px'
            }}>
              {sortedMembers.map((member, index) => {
                const isCurrent = index === recipientIndex;
                const cycleNum = index + 1;

                return (
                  <div
                    key={member.id}
                    onClick={async () => {
                      console.log('MEMBER TAPPED:', { memberName: member.name, isSelectingRecipient, isCurrent });
                      if (isSelectingRecipient && !isCurrent) {
                        // Confirm recipient change
                        if (confirm(`Make ${member.name} this cycle's recipient?`)) {
                          // Swap positions to change recipient
                          const currentRecipientPos = sortedMembers[recipientIndex].position ?? recipientIndex;
                          const newRecipientPos = member.position ?? index;

                          // DIAGNOSTIC: Log before swap
                          console.log('SWAP BEFORE:', {
                            currentRecipient: sortedMembers[recipientIndex].name,
                            currentPos: currentRecipientPos,
                            newRecipient: member.name,
                            newPos: newRecipientPos
                          });

                          // Swap positions in database
                          const { error: error1 } = await supabase
                            .from('contribution_members')
                            .update({ position: newRecipientPos })
                            .eq('id', sortedMembers[recipientIndex].id);

                          const { error: error2 } = await supabase
                            .from('contribution_members')
                            .update({ position: currentRecipientPos })
                            .eq('id', member.id);

                          // DIAGNOSTIC: Log swap results
                          console.log('SWAP RESULT:', { error1, error2 });

                          if (error1 || error2) {
                            alert('Failed to update recipient. Please try again.');
                            console.error('Position swap error:', error1 || error2);
                          } else {
                            // Update local state with swapped positions
                            const updatedMembers = group.members.map(m => {
                              if (m.id === sortedMembers[recipientIndex].id) {
                                return { ...m, position: newRecipientPos };
                              } else if (m.id === member.id) {
                                return { ...m, position: currentRecipientPos };
                              }
                              return m;
                            });

                            // Notify parent to refresh
                            if (onUpdate) {
                              onUpdate({ ...group, members: updatedMembers });
                            }

                            setIsSelectingRecipient(false);
                            setShowPayoutSchedule(false);
                          }
                        }
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      background: isCurrent ? '#D1FAE5' : isSelectingRecipient ? '#F9FAFB' : 'white',
                      border: isCurrent ? '2px solid #10B981' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isSelectingRecipient ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (isSelectingRecipient && !isCurrent) {
                        e.currentTarget.style.background = '#F3F4F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isSelectingRecipient && !isCurrent) {
                        e.currentTarget.style.background = '#F9FAFB';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#6B7280'
                      }}>
                        {cycleNum}.
                      </span>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: isCurrent ? '600' : '500',
                        color: isCurrent ? '#059669' : '#1F2937'
                      }}>
                        {member.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '13px',
                        color: '#6B7280'
                      }}>
                        ← Cycle {cycleNum}
                      </span>
                      {isCurrent && (
                        <span style={{
                          padding: '2px 8px',
                          background: '#10B981',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          current ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Change Recipient Button */}
            {!isSelectingRecipient ? (
              <button
                onClick={() => {
                  console.log('CHANGE RECIPIENT CLICKED, isSelectingRecipient:', isSelectingRecipient);
                  setIsSelectingRecipient(true);
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Change Recipient
              </button>
            ) : (
              <div style={{
                padding: '12px',
                background: '#FEF3C7',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#92400E',
                textAlign: 'center'
              }}>
                Tap any member to make them this cycle's recipient
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionGroupDetail;