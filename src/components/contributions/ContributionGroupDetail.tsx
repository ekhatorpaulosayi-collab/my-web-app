import React, { useState, useEffect, useRef } from 'react';
import * as contributionService from '../../services/contributionService';
import { supabase } from '../../lib/supabase';
import { collectionDate, formatCollectionDate, formatCollectionDateShort, hasStartDate } from '../../utils/ajoDates';
import { formatPhoneForWhatsApp } from '../../utils/whatsapp';

interface Member {
  id: string;
  name: string;
  phone?: string;
  isPaid?: boolean;
  hasPaid?: boolean;
  hasCollected?: boolean; // Stage 2: derived from contribution_payouts (has a payout row)
  payout_position: number;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [recipientOrder, setRecipientOrder] = useState<string[]>([]);
  const [cyclePayments, setCyclePayments] = useState<any[]>([]);
  // Stage 2 fix: load this group's payouts so we can derive who has collected
  // (the open-group path supplies members WITHOUT hasCollected). collectedMemberIds
  // drives the current recipient and advances it after a payout.
  const [groupPayouts, setGroupPayouts] = useState<any[]>([]);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showPayoutSchedule, setShowPayoutSchedule] = useState(false);

  // Stage 5 (reminders, Level A — owner-triggered): a non-blocking confirmation toast
  // offered AFTER mark-paid / payout. It NEVER auto-sends — the owner taps "Send on
  // WhatsApp". `waUrl` is the pre-filled wa.me link (omitted when the person has no
  // phone, so the toast just confirms without a Send button). Auto-dismisses after 8s.
  const [confirmToast, setConfirmToast] = useState<{ title: string; body: string; waUrl?: string } | null>(null);
  const confirmToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stage 5 follow-up: inline add/edit of a member's phone number (owner-detail only —
  // this component is mounted ONLY from the authenticated dashboard, never on the public
  // /a/:shareCode route, which renders ContributionPublicView instead). When
  // editingPhoneMemberId matches a row, that row shows an inline tel input + Save/Cancel.
  const [editingPhoneMemberId, setEditingPhoneMemberId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // Show the confirmation toast and auto-dismiss it after 8s (clearing any prior timer so
  // a second action doesn't dismiss the new toast early). Cleared on unmount below.
  const showConfirmToast = (toast: { title: string; body: string; waUrl?: string }) => {
    if (confirmToastTimer.current) clearTimeout(confirmToastTimer.current);
    setConfirmToast(toast);
    confirmToastTimer.current = setTimeout(() => setConfirmToast(null), 8000);
  };
  const dismissConfirmToast = () => {
    if (confirmToastTimer.current) clearTimeout(confirmToastTimer.current);
    confirmToastTimer.current = null;
    setConfirmToast(null);
  };
  useEffect(() => () => { if (confirmToastTimer.current) clearTimeout(confirmToastTimer.current); }, []);

  // Add local state for members to enable immediate UI updates
  const [localMembers, setLocalMembers] = useState<Member[]>(
    group.members || group.contribution_members || []
  );

  // Sync local members when group prop changes
  React.useEffect(() => {
    setLocalMembers(group.members || group.contribution_members || []);
  }, [group]);

  // Load payments for current cycle + payouts (collected ledger) on mount and whenever
  // the group/cycle changes.
  React.useEffect(() => {
    loadCyclePayments();
    loadGroupPayouts();
  }, [group.id, group.cycleNumber]);

  // Post-payout refresh: when a payout is recorded the collected ledger grows
  // (groupPayouts.length increases). A new rotation turn begins with everyone unpaid,
  // so re-query the current cycle's payments. This is robust even if group.cycleNumber
  // doesn't visibly change (recordPayout sets current_cycle to the payout count, which
  // can equal the prior value), so the [group.cycleNumber] effect alone may not re-fire.
  React.useEffect(() => {
    loadCyclePayments();
  }, [groupPayouts.length]);

  // Stage 2 fix: payouts = the has-collected ledger for this group.
  const loadGroupPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('contribution_payouts')
        .select('member_id, cycle_number, amount, paid_at')
        .eq('group_id', group.id);
      if (!error && data) {
        setGroupPayouts(data);
      }
    } catch (error) {
      console.error('Failed to load group payouts:', error);
    }
  };

  const loadCyclePayments = async () => {
    try {
      // The "current turn" = completed payouts + 1. This advances by exactly 1 each
      // payout, so each rotation round has its own payment key. (group.cycleNumber was
      // unreliable — in prod all rounds' payments landed under cycle_number=1 while
      // current_cycle drifted, so paid-status never reset per round.) Recording uses the
      // same turn key (handleConfirmPayment), so query and record always agree.
      const currentTurn = groupPayouts.length + 1;
      const { data, error } = await supabase
        .from('contribution_payments')
        .select('*')
        .eq('group_id', group.id)
        .eq('cycle_number', currentTurn);

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

  // Seed/refresh the recipient order in payout_position order (NOT arbitrary
  // localMembers order — that caused the erratic arrows / snap-back). Re-seed whenever
  // membership or positions change (member id set + position signature), so it never
  // goes stale after add/remove/reorder.
  React.useEffect(() => {
    const ordered = [...(localMembers || [])].sort((a, b) => {
      const ka = typeof a.payout_position === 'number' ? a.payout_position
        : (typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER);
      const kb = typeof b.payout_position === 'number' ? b.payout_position
        : (typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER);
      if (ka !== kb) return ka - kb;
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });
    setRecipientOrder(ordered.map(m => m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMembers.map(m => `${m.id}:${m.payout_position}`).join(',')]);

  // Calculate recipient using rotation logic.
  // CRITICAL: sort by payout_position — the canonical rotation order. (The old code
  // sorted by `a.position`, which is undefined on these member objects → it silently
  // fell through to created_at ordering, so the "lowest position uncollected" rule
  // actually picked the earliest-CREATED uncollected member. With out-of-order
  // collection that selects the wrong person and can leave the true last-by-position
  // member unreachable. Sort by payout_position so uncollectedMembers[0] is genuinely
  // the lowest payout_position not yet collected — order-independent for any N.)
  const memberSortKey = (m: Member) =>
    (typeof m.payout_position === 'number' ? m.payout_position
      : (typeof m.position === 'number' ? m.position : Number.MAX_SAFE_INTEGER));
  const sortedMembers = [...localMembers].sort((a, b) => {
    const ka = memberSortKey(a);
    const kb = memberSortKey(b);
    if (ka !== kb) return ka - kb;
    // Stable tiebreak only when positions are equal/missing.
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  // Stage 2 rotation: current recipient = lowest payout_position among members who have
  // NOT collected yet. "Collected" is derived from this group's payout rows
  // (groupPayouts), which works regardless of whether the caller supplied hasCollected.
  // No `payout_position === current_cycle`; no `|| sortedMembers[0]` fallback — if every
  // member has collected there is NO current recipient (rotation complete).
  const collectedMemberIds = new Set(groupPayouts.map(p => p.member_id));
  const hasMemberCollected = (m: Member) => m.hasCollected === true || collectedMemberIds.has(m.id);
  // Stage 5 (review item 1, secondary): the MOST RECENT payout row, used to show the
  // durable "Payout receipt" chip on exactly one row (its recipient) until the next payout
  // supersedes it. "Latest" = max paid_at, tie-broken by max cycle_number. null when no
  // payout has been recorded yet.
  const latestPayout = groupPayouts.reduce<any | null>((latest, p) => {
    if (!latest) return p;
    const tp = p?.paid_at ? new Date(p.paid_at).getTime() : 0;
    const tl = latest?.paid_at ? new Date(latest.paid_at).getTime() : 0;
    if (tp !== tl) return tp > tl ? p : latest;
    return (p?.cycle_number ?? 0) > (latest?.cycle_number ?? 0) ? p : latest;
  }, null);
  const uncollectedMembers = sortedMembers.filter(m => !hasMemberCollected(m));
  const currentRecipient = uncollectedMembers.length > 0 ? uncollectedMembers[0] : null;
  const nextRecipient = uncollectedMembers.length > 1 ? uncollectedMembers[1] : null;
  const rotationComplete = sortedMembers.length > 0 && uncollectedMembers.length === 0;
  // Display counter: how many have collected so far (1-based turn of current recipient).
  const currentCycle = (sortedMembers.length - uncollectedMembers.length) + (currentRecipient ? 1 : 0);

  // Stage 4: derived collection dates. Pure function of cycle_start_date + frequency +
  // payout_position — so reordering automatically reshuffles dates with people. We use
  // the live group fields (frequency falls back to payment_frequency for legacy rows).
  const dateGroup = {
    cycle_start_date: group.cycle_start_date ?? null,
    frequency: group.frequency || group.payment_frequency || 'monthly'
  };
  const groupHasStartDate = hasStartDate(dateGroup);
  const memberCollectionDate = (m: Member) => collectionDate(m, dateGroup);

  // ── Stage 5: smart, date-driven WhatsApp reminders (owner-triggered / Level A) ──
  // All dates come ONLY from ajoDates.collectionDate (via memberCollectionDate). We NEVER
  // fabricate a date — when the group has no start date the callers route the owner to the
  // Stage 4 "Set start date" prompt instead. The phrasing is plain and grandma-readable,
  // and NOTHING ever auto-sends: every builder just produces a wa.me link the owner taps.

  // The "due date" for the current round = the date the CURRENT recipient collects.
  // Everyone contributes by that date, so it's the same date for every member this cycle.
  const currentCycleCollectionDate = currentRecipient ? memberCollectionDate(currentRecipient) : null;

  // Normalize a stored phone for wa.me using the SAME canonical helper the rest of the app
  // uses (RecordSaleModal, OnlineStoreSetup, debt reminders) — formatPhoneForWhatsApp turns
  // Nigerian local "0803…" into "234803…", keeps 234…/intl numbers as-is. The old ~:329
  // Ajo reminder only did `.replace(/\D/g,'')`, which left "0803…" as a bare local number
  // wa.me can't dial; routing through this helper fixes that for every Stage 5 link.
  const waDigits = (phone?: string) => (phone ? formatPhoneForWhatsApp(phone) : '');

  // Single source of truth for a per-number deep link. The FULL message string is passed
  // through encodeURIComponent (covers ₦, names, spaces, and emoji like 🎉/🙏). Returns ''
  // when there is no usable number so callers can omit the Send affordance.
  const waLinkTo = (phone: string | undefined, message: string): string => {
    const digits = waDigits(phone);
    if (!digits) return '';
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  // Open a pre-filled WhatsApp chat for a specific number. No-op (returns false) when there
  // is no number. Used by the explicit per-row "Remind"/"Send receipt" taps (one open per
  // tap — never a loop).
  const openWhatsAppTo = (phone: string | undefined, message: string): boolean => {
    const url = waLinkTo(phone, message);
    if (!url) return false;
    window.open(url, '_blank');
    return true;
  };

  // Open WhatsApp with NO number → WhatsApp shows a chat picker so the owner drops the
  // message into their existing group chat. Used for the single whole-group reminder.
  const openWhatsAppPicker = (message: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // "who collects this round" clause — second person when the reader is the recipient.
  const recipientClause = (readerIsRecipient: boolean) =>
    readerIsRecipient
      ? 'You collect this round.'
      : `${currentRecipient?.name || 'Someone'} collects this round.`;

  // 1. CONTRIBUTION-DUE (per member): name + amount + DERIVED current-cycle date + whose turn.
  const buildDueMessage = (member: Member): string => {
    const dueDate = formatCollectionDate(currentCycleCollectionDate); // "Mon, 1 Aug 2026"
    const readerIsRecipient = !!currentRecipient && member.id === currentRecipient.id;
    return `Hi ${member.name}, your ${formatNaira(group.amount)} ajo contribution for ${group.name} is due ${dueDate}. ${recipientClause(readerIsRecipient)} Thank you!`;
  };

  // 2. WHOLE-GROUP reminder: one message for the whole chat (no member name, no number).
  const buildGroupMessage = (): string => {
    const dueDate = formatCollectionDate(currentCycleCollectionDate);
    const turn = currentRecipient ? ` ${currentRecipient.name} collects this round.` : '';
    return `Hi everyone 👋 Reminder: your ${formatNaira(group.amount)} ajo contribution for ${group.name} is due ${dueDate}.${turn} Please pay in on time so we stay on track. Thank you!`;
  };

  // 3. PAYMENT received (after mark-paid). Date is the current-cycle collection date when
  //    we have one; otherwise we simply leave it out (never invent a date).
  const buildPaymentReceivedMessage = (member: Member): string => {
    const datePart = currentCycleCollectionDate ? ` (${formatCollectionDateShort(currentCycleCollectionDate)})` : '';
    return `Hi ${member.name}, we've received your ${formatNaira(group.amount)} ajo contribution for ${group.name}${datePart}. Thank you! 🙏`;
  };

  // 4. PAYOUT confirmation (after a payout is recorded). Uses the ACTUAL recorded payout
  //    amount passed in (from contribution_payouts), not a recomputed figure.
  const buildPayoutMessage = (member: Member, potAmount: number): string =>
    `Hi ${member.name}, you've received ${formatNaira(potAmount)} from ${group.name} for this round. Enjoy! 🎉`;

  // Per-member due reminder (per-row "Remind" button). Guards: no phone → handled by the
  // disabled button state in the UI; no start date → route to the "Set start date" prompt
  // rather than sending a date-less reminder.
  const handleRemindMember = (member: Member) => {
    if (!member.phone) return; // button is disabled in this state; defensive no-op
    if (!groupHasStartDate) {
      alert('Set a start date first so the reminder can show the right collection date. Opening settings…');
      setShowSettings(true);
      return;
    }
    openWhatsAppTo(member.phone, buildDueMessage(member));
  };

  // Whole-group reminder (chat-picker form — does NOT loop per-member sends).
  const handleRemindWholeGroup = () => {
    if (!groupHasStartDate) {
      alert('Set a start date first so the reminder can show the right collection date. Opening settings…');
      setShowSettings(true);
      return;
    }
    openWhatsAppPicker(buildGroupMessage());
  };

  // Stage 5 (review item 2a): DURABLE payment confirmation. A paid member's row shows
  // "Send receipt" in the same slot the unpaid "Remind" button uses, so the confirmation
  // stays reachable after the post-mark-paid toast dismisses. Same message as the toast.
  // No start-date gate — buildPaymentReceivedMessage simply omits the date when unset.
  const handleSendReceipt = (member: Member) => {
    if (!member.phone) return; // disabled state in the UI; defensive no-op
    openWhatsAppTo(member.phone, buildPaymentReceivedMessage(member));
  };

  // The ACTUAL recorded pot for a collected member, read from this group's payout rows
  // (contribution_payouts via groupPayouts) — never a recomputed figure. null if no row.
  const memberPayoutAmount = (memberId: string): number | null => {
    const row = groupPayouts.find(p => p.member_id === memberId);
    return row && typeof row.amount === 'number' ? row.amount : null;
  };

  // Stage 5 (review item 1, secondary): DURABLE payout confirmation behind the "Payout
  // receipt" chip on the latest recipient's row, so the message stays reachable after the
  // post-payout toast dismisses. Uses that member's recorded payout amount
  // (memberPayoutAmount); falls back to the current pot only if the row lacks an amount.
  const handleSendPayoutReceipt = (member: Member) => {
    if (!member.phone) return; // disabled state in the UI; defensive no-op
    const pot = memberPayoutAmount(member.id) ?? (totalMembers * group.amount);
    openWhatsAppTo(member.phone, buildPayoutMessage(member, pot));
  };

  // Stage 5 (review item 1): the PRIMARY per-row affordance is owned by PAYMENT state only,
  // exactly one per row. paid-this-cycle → "Send receipt"; unpaid → "Remind" — and the
  // contribution-due "Remind" shows whether or not the member has already collected
  // (post-payout members are the highest default risk, so we never hide their reminder).
  // The durable payout receipt is a SECONDARY chip on the latest recipient only (below).
  // No phone → "+ Add phone" (opens the inline editor, no longer a dead end); when a phone
  // exists, a small ✎ next to the action edits/corrects it. One open per tap, never a loop.
  const renderMemberWaAction = (member: Member, isPaid: boolean) => {
    // While this row's phone editor is open, suppress the action/add affordance — the
    // editor (rendered just below) is the only control, so nothing jumps or duplicates.
    if (editingPhoneMemberId === member.id) return null;

    const spec = isPaid
      ? { label: '🟢 Send receipt', bg: '#25d366', onClick: () => handleSendReceipt(member) }
      : { label: '🟢 Remind', bg: '#25d366', onClick: () => handleRemindMember(member) };

    if (!member.phone) {
      // Add a number: turns the old disabled "no phone" chip into a real action.
      return (
        <button
          onClick={(e) => { e.stopPropagation(); openPhoneEditor(member); }}
          title={`Add a phone number for ${member.name}`}
          style={{
            marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', background: 'white', color: '#0F6E56',
            border: '1px dashed #0F6E56', borderRadius: '8px', fontSize: '13px',
            fontWeight: '500', cursor: 'pointer'
          }}
        >
          + Add phone
        </button>
      );
    }
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); spec.onClick(); }}
          title={`Open WhatsApp for ${member.name}`}
          style={{
            marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', background: spec.bg, color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
          }}
        >
          {spec.label}
        </button>
        {/* Correct a wrong number — a wrong number opens a stranger's chat, worse than none. */}
        <button
          onClick={(e) => { e.stopPropagation(); openPhoneEditor(member); }}
          title={`Edit ${member.name}'s phone number`}
          aria-label={`Edit ${member.name}'s phone number`}
          style={{
            marginTop: '8px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', width: '30px', height: '30px', background: 'white',
            color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px',
            fontSize: '13px', cursor: 'pointer'
          }}
        >
          ✎
        </button>
      </>
    );
  };

  // Stage 5 (review item 1, secondary): the durable "Payout receipt" chip. Rendered on AT
  // MOST ONE row in the whole list — the recipient of the LATEST recorded payout — and only
  // until the next payout supersedes it (latestPayout advances). Returns null for everyone
  // else, so stale receipts never pin to every collected row. Uses the latest payout row's
  // ACTUAL recorded amount; no phone → a disabled "no phone number" chip.
  const renderLatestPayoutChip = (member: Member) => {
    if (!latestPayout || member.id !== latestPayout.member_id) return null;
    if (!member.phone) {
      return (
        <span
          title="Add a phone number in member details to send the payout receipt"
          style={{
            marginTop: '8px', marginLeft: '8px', display: 'inline-flex', alignItems: 'center',
            gap: '6px', padding: '6px 10px', background: '#eef2ff', color: '#9ca3af',
            border: '1px dashed #c7d2fe', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
            cursor: 'not-allowed'
          }}
        >
          🎉 Payout receipt · no phone
        </span>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleSendPayoutReceipt(member); }}
        title={`Send ${member.name} their payout receipt`}
        style={{
          marginTop: '8px', marginLeft: '8px', display: 'inline-flex', alignItems: 'center',
          gap: '6px', padding: '6px 10px', background: 'white', color: '#0F6E56',
          border: '1px solid #0F6E56', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        🎉 Payout receipt
      </button>
    );
  };

  // ── Stage 5 follow-up: inline add/edit of a member's phone (owner-detail only) ──
  // Open the inline editor for a member, pre-filling the current value (empty for add).
  const openPhoneEditor = (member: Member) => {
    setEditingPhoneMemberId(member.id);
    setEditingPhoneValue(member.phone || '');
  };
  const closePhoneEditor = () => {
    setEditingPhoneMemberId(null);
    setEditingPhoneValue('');
  };

  // Save the phone via a DIRECT owner UPDATE — RLS permits this (live policies "Users
  // manage members in own groups" [ALL] + "Group owners can update member status"
  // [UPDATE]); no RPC needed. Stored EXACTLY like the add-member flow (.trim(), raw —
  // no validation, no normalization; normalization stays at link-build via
  // formatPhoneForWhatsApp). Empty input → NULL, which clears a wrong number back to the
  // no-phone state. On success we patch localMembers so the row flips to the live
  // Remind/Send-receipt button immediately, with no page refresh, and sync the parent.
  const handleSavePhone = async (member: Member) => {
    if (savingPhone) return;
    const next = editingPhoneValue.trim();
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('contribution_members')
        .update({ phone: next || null })
        .eq('id', member.id);
      if (error) {
        console.error('Failed to save phone:', error);
        alert('Could not save the phone number. Please try again.');
        return;
      }
      const updated = localMembers.map(m =>
        m.id === member.id ? { ...m, phone: next || undefined } : m
      );
      setLocalMembers(updated);
      if (onUpdate) {
        onUpdate({ ...group, members: updated, contribution_members: updated } as any);
      }
      closePhoneEditor();
    } catch (err) {
      console.error('Failed to save phone:', err);
      alert('Could not save the phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };

  // The inline tel editor row, shown under a member's detail text while editing. Reuses the
  // add-member input convention (type="tel", "Phone (optional)"). stopPropagation keeps the
  // row's open-detail click from firing while typing. Enter saves, Escape cancels.
  const renderPhoneEditor = (member: Member) => {
    if (editingPhoneMemberId !== member.id) return null;
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
      >
        <input
          type="tel"
          value={editingPhoneValue}
          onChange={(e) => setEditingPhoneValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSavePhone(member); }
            if (e.key === 'Escape') { e.preventDefault(); closePhoneEditor(); }
          }}
          placeholder="Phone (optional)"
          autoFocus
          style={{
            flex: '1 1 140px', minWidth: '120px', padding: '8px 10px',
            border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none'
          }}
        />
        <button
          onClick={() => handleSavePhone(member)}
          disabled={savingPhone}
          style={{
            padding: '8px 12px', background: savingPhone ? '#e5e7eb' : '#14b8a6',
            color: savingPhone ? '#9ca3af' : 'white', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: '500', cursor: savingPhone ? 'not-allowed' : 'pointer'
          }}
        >
          {savingPhone ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={closePhoneEditor}
          disabled={savingPhone}
          style={{
            padding: '8px 12px', background: '#f3f4f6', color: '#374151', border: 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: '500',
            cursor: savingPhone ? 'not-allowed' : 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    );
  };

  // Calculate paid/unpaid members based on database payments
  const getMemberPaidStatus = (memberId: string) => {
    return cyclePayments.some(payment => payment.member_id === memberId);
  };

  const paidMembers = localMembers.filter(m => getMemberPaidStatus(m.id));
  const unpaidMembers = localMembers.filter(m => !getMemberPaidStatus(m.id));
  const totalMembers = localMembers.length;
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

    // Resolve the member NOW (before we clear selection) so the Stage 5 confirmation
    // toast can address them by name and offer a pre-filled WhatsApp message.
    const paidMember = localMembers.find(m => m.id === selectedMemberForPayment) || null;

    // Record under the SAME current-turn key the paid-status query uses
    // (completed payouts + 1), so each rotation round tracks its own payments and the
    // "X/N paid" view resets correctly after each payout.
    const currentTurn = groupPayouts.length + 1;

    // Save payment to database
    await contributionService.markPaid(
      group.id,
      selectedMemberForPayment,
      currentTurn,
      {
        amount: group.amount,
        paymentMethod: method,
        note: paymentNote || `Cycle ${currentTurn} payment`
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

    // Stage 5: offer a non-blocking "payment received" confirmation. Never auto-sends —
    // the owner taps Send in the toast. When the member has no phone we still confirm the
    // record (no Send button). The mark-paid flow above has already completed.
    if (paidMember) {
      showConfirmToast({
        title: '✓ Payment recorded',
        body: paidMember.phone
          ? `Send ${paidMember.name} a payment confirmation?`
          : `${paidMember.name} marked paid. (No phone saved — no message to send.)`,
        waUrl: waLinkTo(paidMember.phone, buildPaymentReceivedMessage(paidMember)) || undefined
      });
    }
  };

  // Stage 5 (review item 1): the old per-member "Remind all" LOOP is gone. Looping
  // window.open is killed by popup blockers after the first open and, on Android, each
  // wa.me navigation tears the page down. There is now exactly ONE group-level action —
  // the single wa.me/?text= chat-picker message (handleRemindWholeGroup, defined above) —
  // wired to the "Remind all" button below. Per-member nudges remain available as the
  // explicit per-row "Remind" button (one open per deliberate tap, never a loop).

  // Fix 4: Record Payout functionality (Stage 2 execution fixes)
  const [recordingPayout, setRecordingPayout] = useState(false);
  const handleRecordPayout = async () => {
    // FEEDBACK instead of silent return — tell the user WHY it's blocked.
    if (rotationComplete) {
      alert('Everyone in this group has already collected. The rotation is complete.');
      return;
    }
    if (!currentRecipient) {
      alert('No current recipient could be determined. Please reopen the group and try again.');
      return;
    }
    if (!allPaid) {
      alert(`All members must pay in before payout. ${unpaidMembers.length} member(s) still owe for this cycle.`);
      return;
    }
    if (recordingPayout) return; // prevent double-submit

    // Capture the recipient now — after the awaits the derived recipient advances.
    const payoutRecipient = currentRecipient;

    setRecordingPayout(true);
    try {
      // Call the Stage 2 gated recordPayout with the CORRECT signature: the 4th arg
      // is an object { amount, paymentMethod }, not a bare number. The gate rejects a
      // second collect for the same member. cycle_number = the recipient's turn (their
      // payout_position) so payouts are keyed stably to the rotation turn.
      const { data: payout, error } = await contributionService.recordPayout(
        group.id,
        payoutRecipient.id,
        payoutRecipient.payout_position,
        { amount: totalCollected, paymentMethod: 'cash' }
      );

      if (error) {
        // e.g. the gate: "This member has already collected in this group."
        alert((error as any)?.message || 'Could not record payout. Please try again.');
        return;
      }

      // Stage 5: the ACTUAL recorded payout amount from contribution_payouts (the inserted
      // row), not a recomputed figure. Falls back to totalCollected only if the row is
      // somehow missing its amount.
      const recordedPot = typeof (payout as any)?.amount === 'number' ? (payout as any).amount : totalCollected;

      // Refresh local state immediately so the UI reflects the NEW cycle without a
      // manual refresh: (a) collected ledger → recipient advances; (b) current-cycle
      // payments → "X/N paid" and per-member Paid badges reset to the new (unpaid)
      // cycle. Then ask the parent to reload the group (which also bumps cycleNumber so
      // the [group.id, group.cycleNumber] effect re-queries payments for the new cycle).
      await Promise.all([loadGroupPayouts(), loadCyclePayments()]);
      onRecordPayout(payoutRecipient.id, recordedPot);

      setShowPayoutModal(false);
      alert(`₦${recordedPot.toLocaleString()} payout to ${payoutRecipient.name} recorded.`);

      // Stage 5: offer a non-blocking payout confirmation to the recipient. Never
      // auto-sends. No-phone → confirm without a Send button. Uses the recorded amount.
      showConfirmToast({
        title: '✓ Payout recorded',
        body: payoutRecipient.phone
          ? `Tell ${payoutRecipient.name} they've received the money?`
          : `${payoutRecipient.name} collected ${formatNaira(recordedPot)}. (No phone saved — no message to send.)`,
        waUrl: waLinkTo(payoutRecipient.phone, buildPayoutMessage(payoutRecipient, recordedPot)) || undefined
      });
    } catch (error) {
      console.error('Failed to record payout:', error);
      alert('Failed to record payout. Please try again.');
    } finally {
      setRecordingPayout(false);
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
    // Stage 3: save via the transactional reorder RPC. Send ONLY the not-yet-collected
    // members, in the displayed order; the RPC keeps collected members pinned at the
    // front and rewrites positions atomically (no UNIQUE collision, no half-apply).
    const baseOrder = recipientOrder.length > 0 ? recipientOrder : sortedMembers.map(m => m.id);
    const uncollectedOrder = baseOrder.filter(id => {
      const m = localMembers.find(mem => mem.id === id);
      return m && !hasMemberCollected(m);
    });

    if (uncollectedOrder.length === 0) {
      alert('There are no movable (not-yet-collected) members to reorder.');
      return;
    }

    try {
      const { error } = await contributionService.reorderMembers(group.id, uncollectedOrder);
      if (error) {
        console.error('Failed to save order:', error);
        alert((error as any)?.message || 'Could not save the order. Please reopen and try again.');
        return;
      }
      alert('Order saved!');
      if (onBack) onBack();  // Return to group list for fresh data
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order. Please try again.');
    }
  };

  // Stage 3: remove a member via the transactional RPC. Blocks collected members
  // (they still owe contributions); on success the RPC re-packs positions 1..N and
  // fixes total_members. We refresh the local list so positions/avatars update.
  const handleRemoveMember = async (member: Member) => {
    // Client-side guard for instant feedback (the RPC also enforces this server-side).
    if (hasMemberCollected(member)) {
      alert(`Can't remove ${member.name} — they've already collected and still owe contributions.`);
      return;
    }
    if (!window.confirm(`Remove ${member.name} from this group? Remaining members will be re-numbered.`)) {
      return;
    }
    try {
      const { error } = await contributionService.removeMemberSafe(member.id);
      if (error) {
        const msg = (error as any)?.message || 'Could not remove member.';
        alert(
          msg.includes('already collected')
            ? `Can't remove ${member.name} — they've already collected and still owe contributions.`
            : `Could not remove member: ${msg}`
        );
        return;
      }
      // Refresh members (re-packed positions + new total) from the backend.
      const { data: fresh } = await supabase
        .from('contribution_members')
        .select('id, name, phone, payout_position, status')
        .eq('group_id', group.id)
        .order('payout_position');
      if (fresh) {
        setLocalMembers(fresh as Member[]);
        if (onUpdate) {
          onUpdate({ ...group, members: fresh, contribution_members: fresh } as any);
        }
      }
      alert(`${member.name} removed.`);
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove member. Please try again.');
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
    <>
      {console.log('DETAIL VIEW RENDERING', { showPayoutSchedule, groupName: group?.name })}
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

          {/* Stage 4: derived collection dates. If no start date is set, prompt the
              owner — never show a wrong/guessed date. Otherwise show current + next. */}
          {!rotationComplete && (
            !groupHasStartDate ? (
              <div
                onClick={() => setShowSettings(true)}
                style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                  background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E',
                  fontSize: '13px', cursor: 'pointer', fontWeight: 500
                }}
              >
                📅 Set a start date to see collection dates → tap to open settings
              </div>
            ) : (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                {currentRecipient && (
                  <div>
                    <strong>Current:</strong> {currentRecipient.name} — collects{' '}
                    <strong>{formatCollectionDate(memberCollectionDate(currentRecipient))}</strong>
                  </div>
                )}
                {nextRecipient && (
                  <div style={{ color: '#6b7280' }}>
                    <strong>Next:</strong> {nextRecipient.name} — collects{' '}
                    {formatCollectionDate(memberCollectionDate(nextRecipient))}
                  </div>
                )}
              </div>
            )
          )}

        </div>

        {/* Collection Day Banner */}
        {(() => {
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const isCollectionDay = group.collectionDay && today.toLowerCase() === group.collectionDay.toLowerCase();
          const paidToday = paidMembers.length;
          const totalToday = localMembers.length;

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
          {localMembers.map((member) => {
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
                    {/* Stage 4: this member's derived collection date (when set). */}
                    {groupHasStartDate && (
                      <div style={{ fontSize: '12px', color: '#0F6E56', marginTop: '2px' }}>
                        Collects {formatCollectionDateShort(memberCollectionDate(member))}
                      </div>
                    )}
                    {/* Stage 5 (review item 1): PRIMARY action owned by payment state
                        (paid → "Send receipt"; unpaid → "Remind", shown even after the
                        member has collected). SECONDARY "Payout receipt" chip appears only
                        on the latest payout's recipient (at most one row). No phone → an
                        "+ Add phone" action; an existing number gets a ✎ to correct it.
                        One open per deliberate tap — never a loop, never auto-sends. */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                      {renderMemberWaAction(member, isPaid)}
                      {renderLatestPayoutChip(member)}
                    </div>
                    {/* Inline add/edit-phone editor (owner-detail only) — shown for the row
                        being edited; flips to the live button on save with no refresh. */}
                    {renderPhoneEditor(member)}
                  </div>
                </div>

                {/* Right side: Mark Paid / checkmark + remove control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  {/* Stage 3: remove member. Hidden for members who have collected (they
                      can't be removed — they still owe contributions). */}
                  {!hasMemberCollected(member) && (
                    <button
                      title={`Remove ${member.name}`}
                      aria-label={`Remove ${member.name}`}
                      onClick={(e) => { e.stopPropagation(); handleRemoveMember(member); }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'white',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: '16px',
                        lineHeight: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
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
          {/* Stage 5 (review item 1): the SINGLE group-level reminder. One tap opens
              WhatsApp's chat picker (wa.me/?text=) with the smart, date-aware message so
              the owner drops it into their existing group chat — no per-member loop.
              Available whenever the rotation is still running. */}
          <button
            onClick={handleRemindWholeGroup}
            title="Open WhatsApp to post one reminder in your group chat"
            disabled={rotationComplete || localMembers.length === 0}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: '1.5px solid #ddd',
              background: 'transparent',
              color: (!rotationComplete && localMembers.length > 0) ? '#666' : '#ccc',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (!rotationComplete && localMembers.length > 0) ? 'pointer' : 'not-allowed'
            }}
          >
            Remind all
          </button>
          <button
            // Can only record a payout when all paid AND there is a current recipient
            // (rotation not complete) — never open the modal with a blank recipient.
            onClick={() => {
              if (rotationComplete) { alert('Rotation complete — everyone has collected.'); return; }
              if (!currentRecipient) { alert('No current recipient. Please reopen the group.'); return; }
              if (!allPaid) { alert(`All members must pay in before payout. ${unpaidMembers.length} member(s) still owe.`); return; }
              setShowPayoutModal(true);
            }}
            disabled={!allPaid || !currentRecipient || rotationComplete}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: (allPaid && currentRecipient && !rotationComplete) ? '#14b8a6' : '#e5e7eb',
              color: (allPaid && currentRecipient && !rotationComplete) ? 'white' : '#9ca3af',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (allPaid && currentRecipient && !rotationComplete) ? 'pointer' : 'not-allowed',
              opacity: (allPaid && currentRecipient && !rotationComplete) ? 1 : 0.4,
              pointerEvents: (allPaid && currentRecipient && !rotationComplete) ? 'auto' : 'none'
            }}
          >
            {rotationComplete ? 'Rotation complete' : 'Record payout'}
          </button>
        </div>
      </div>

      {/* Rotation complete banner — clear end state when everyone has collected. */}
      {rotationComplete && (
        <div style={{
          margin: '12px 16px', padding: '14px 16px', borderRadius: '12px',
          background: '#d1fae5', border: '1px solid #86efac', color: '#065f46',
          fontSize: '14px', fontWeight: 600, textAlign: 'center'
        }}>
          ✅ Rotation complete — everyone has collected.
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
              <strong>{currentRecipient?.name}</strong> for cycle {currentCycle}?
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
                  value={group.cycle_start_date ? new Date(group.cycle_start_date).toISOString().split('T')[0] : ''}
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
                  Current cycle: {currentCycle}
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
                  const member = localMembers.find(m => m.id === memberId);
                  if (!member) return null;
                  const isCurrent = member.id === currentRecipient?.id;
                  const collected = hasMemberCollected(member);
                  // Arrows may only swap with an adjacent UNCOLLECTED member (collected
                  // rows are locked and pinned at the front).
                  const prevMember = index > 0 ? localMembers.find(m => m.id === recipientOrder[index - 1]) : null;
                  const nextMember = index < recipientOrder.length - 1 ? localMembers.find(m => m.id === recipientOrder[index + 1]) : null;
                  const canMoveUp = !collected && !!prevMember && !hasMemberCollected(prevMember);
                  const canMoveDown = !collected && !!nextMember && !hasMemberCollected(nextMember);

                  return (
                    <div
                      key={member.id}
                      style={{
                        padding: '8px',
                        background: collected ? '#eef2ff' : (isCurrent ? '#fef3c7' : '#f9fafb'),
                        opacity: collected ? 0.85 : 1,
                        borderRadius: '4px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '500', color: collected ? '#6366f1' : undefined }}>{index + 1}.</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: collected ? '#4b5563' : undefined }}>{member.name}</span>
                            {collected && <span style={{ fontSize: '12px', color: '#4338ca', fontWeight: 600 }}>✓ collected</span>}
                            {!collected && isCurrent && <span style={{ fontSize: '12px', color: '#92400e' }}>(current)</span>}
                          </span>
                          {/* Stage 4: derived date for this position — moves with the member on reorder. */}
                          {groupHasStartDate && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              {formatCollectionDateShort(memberCollectionDate(member))}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Collected rows are locked — no arrows. */}
                      {collected ? (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>🔒 locked</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {canMoveUp && (
                            <button
                              onClick={() => moveRecipientUp(index)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '4px',
                                background: 'white', border: '1px solid #e5e7eb', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                              }}
                            >
                              ↑
                            </button>
                          )}
                          {canMoveDown && (
                            <button
                              onClick={() => moveRecipientDown(index)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '4px',
                                background: 'white', border: '1px solid #e5e7eb', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                              }}
                            >
                              ↓
                            </button>
                          )}
                        </div>
                      )}
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
              {localMembers.map((member) => (
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
                  Payment Status (Cycle {currentCycle})
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
                const isCurrent = member.id === currentRecipient?.id;
                const cycleNum = member.payout_position || (index + 1);

                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    style={{
                      padding: '12px 16px',
                      background: isCurrent ? '#D1FAE5' : 'white',
                      border: isCurrent ? '2px solid #10B981' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
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

            {/* Member Position Picker */}
            {selectedMember && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '12px',
                margin: '4px 0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  {selectedMember.name}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Move to position:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Array.from({ length: sortedMembers.length }, (_, i) => i + 1).map(pos => (
                      <button
                        key={pos}
                        onClick={async () => {
                          try {
                            // Fetch all members from DB
                            const { data: dbMembers, error: fetchErr } = await supabase
                              .from('contribution_members')
                              .select('id, name, payout_position')
                              .eq('group_id', group.id)
                              .order('payout_position');

                            if (fetchErr || !dbMembers) {
                              console.error('Fetch error:', fetchErr);
                              return;
                            }

                            // Remove the member from current position
                            const others = dbMembers.filter(m => m.id !== selectedMember.id);
                            const movingMember = dbMembers.find(m => m.id === selectedMember.id);
                            if (!movingMember) return;

                            // Insert at target position (0-indexed for array)
                            others.splice(pos - 1, 0, movingMember);

                            // Reassign all positions 1, 2, 3, 4...
                            const updates = others.map((m, index) =>
                              supabase
                                .from('contribution_members')
                                .update({ payout_position: index + 1 })
                                .eq('id', m.id)
                            );

                            const results = await Promise.all(updates);
                            const errors = results.filter(r => r.error);

                            console.log('MOVE RESULT:', { errors: errors.length, targetPos: pos, member: selectedMember.name });

                            if (errors.length === 0) {
                              // Fetch fresh members with updated positions
                              const { data: freshMembers } = await supabase
                                .from('contribution_members')
                                .select('id, name, phone, payout_position, status, created_at')
                                .eq('group_id', group.id)
                                .order('payout_position');

                              if (freshMembers) {
                                // Update local state with fresh members
                                setLocalMembers(freshMembers);
                              }

                              // Close the member selector popup
                              setSelectedMember(null);
                            } else {
                              console.error('Move errors:', errors);
                              alert('Failed to move member. Try again.');
                            }
                          } catch (err) {
                            console.error('Move exception:', err);
                            alert('Error: ' + err.message);
                          }
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: pos === selectedMember.payout_position ? '2px solid #0F6E56' : '1px solid #ddd',
                          background: pos === selectedMember.payout_position ? '#E1F5EE' : 'white',
                          fontWeight: pos === selectedMember.payout_position ? '600' : '400',
                          cursor: 'pointer'
                        }}
                      >{pos}</button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    // Stage 2: collecting must go through the gated payout path and only
                    // for the CURRENT (derived) recipient — never by pointing current_cycle
                    // at an arbitrary/past member. Reject if this isn't the current turn.
                    if (!currentRecipient || selectedMember.id !== currentRecipient.id) {
                      alert(`It is ${currentRecipient ? currentRecipient.name : 'no one'}'s turn to collect next, not ${selectedMember.name}. The rotation advances automatically in order.`);
                      return;
                    }
                    const totalCollected = totalMembers * group.amount;
                    const { error } = await contributionService.recordPayout(
                      group.id,
                      currentRecipient.id,
                      currentRecipient.payout_position,
                      { amount: totalCollected, paymentMethod: 'cash' }
                    );
                    if (error) {
                      alert(error.message || 'Could not record payout. Please try again.');
                      return;
                    }
                    if (onRecordPayout) onRecordPayout(currentRecipient.id, totalCollected);
                    setShowPayoutSchedule(false);
                    setSelectedMember(null);
                    if (onBack) onBack(); // reload for fresh derived state
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0F6E56',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Collect this cycle
                </button>

                <button
                  onClick={() => setSelectedMember(null)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Stage 2: manual "Change Recipient" override REMOVED. The recipient is now
                derived automatically (lowest payout_position not yet collected), so an
                arbitrary cycle-pointer override could double-collect/skip. To change who
                is next, reorder members (Settings → Recipient Order); to advance, the
                current recipient collects via the gated payout flow. */}
            {currentRecipient && (
              <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Next to collect: <strong>{currentRecipient.name}</strong> (position {currentRecipient.payout_position}).
                  Rotation advances automatically in order.
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Stage 5: non-blocking confirmation toast (offered after mark-paid / payout). It
          slides in at the bottom and never blocks the page (no full-screen backdrop). The
          owner taps "Send on WhatsApp" to send the pre-filled message — it NEVER auto-sends.
          When the relevant person has no phone there's no Send button, just the confirmation
          and a dismiss. Auto-dismisses after 8s. */}
      {confirmToast && (
        <>
          <style>{`
            @keyframes ajoToastIn {
              from { transform: translate(-50%, 120%); opacity: 0; }
              to   { transform: translate(-50%, 0);    opacity: 1; }
            }
          `}</style>
          <div
            role="status"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: '24px',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)',
              maxWidth: '420px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              border: '1px solid #e5e7eb',
              padding: '14px 16px',
              zIndex: 2000,
              animation: 'ajoToastIn 0.25s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#065f46', marginBottom: '2px' }}>
                  {confirmToast.title}
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.4 }}>
                  {confirmToast.body}
                </div>
              </div>
              <button
                onClick={dismissConfirmToast}
                aria-label="Dismiss"
                style={{
                  flexShrink: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  lineHeight: 1,
                  color: '#9ca3af',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            {confirmToast.waUrl && (
              <button
                onClick={() => {
                  window.open(confirmToast.waUrl!, '_blank');
                  dismissConfirmToast();
                }}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '10px',
                  background: '#25d366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Send on WhatsApp
              </button>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
};

export default ContributionGroupDetail;