import React, { useEffect, useMemo, useState } from 'react';
import { getDebts, markDebtPaidNotify, recordPaymentNotify, recordInstallmentPaymentNotify, addDebtNotify, createDebtWithInstallments, getNextPendingInstallment, type Debt as LocalStorageDebt, type InstallmentFrequency } from '../state/debts';
import { openWhatsApp } from '../utils/wa';
import { RecordPaymentModal } from './RecordPaymentModal';
import { CreateDebtModal } from './CreateDebtModal';
import ContributionGroupList from './contributions/ContributionGroupList';
import CreateGroupForm from './contributions/CreateGroupForm';
import ContributionGroupDetail from './contributions/ContributionGroupDetail';
import GroupSettings from './contributions/GroupSettings';
import { getGroups, createGroup, updateGroup, deleteGroup, addMember } from '../services/contributionService';
import { useAuth } from '../contexts/AuthContext';

// Adapter type to match the component's expected format
type Debt = {
  id: string;
  name: string;
  phone?: string;
  amount: number;
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  dueDate?: string;
  createdAt: string;
  paid: boolean;
  paidAt?: string | null;
  status: string;
  installmentPlan?: LocalStorageDebt['installmentPlan'];
};

// Local money formatter fallback to avoid crashes
const formatNaira = (n: number) => {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(n).replace('NGN', '₦');
  } catch {
    return `₦${(n || 0).toLocaleString()}`;
  }
};

// Helper to calculate days until due date
function getDaysUntilDue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

type CustomerDebtDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  onToast?: (message: string) => void;
};

export default function CustomerDebtDrawer({
  isOpen,
  onClose,
  businessName = 'Storehouse',
  onToast
}: CustomerDebtDrawerProps) {
  const { currentUser } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [mainTab, setMainTab] = useState<'credit-sales' | 'contributions'>('credit-sales');
  const [tab, setTab] = useState<'all' | 'overdue' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<Debt | null>(null);
  const [recordPaymentDebt, setRecordPaymentDebt] = useState<LocalStorageDebt | null>(null);
  const [showCreateDebtModal, setShowCreateDebtModal] = useState(false);
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [contributionGroups, setContributionGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load debts when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage and convert format
    const localDebts = getDebts();
    const convertedDebts: Debt[] = localDebts.map(d => ({
      id: d.id,
      name: d.customerName, // Map customerName to name
      phone: d.phone,
      amount: d.totalAmount, // Use totalAmount for display
      totalAmount: d.totalAmount,
      amountPaid: d.amountPaid,
      amountRemaining: d.amountRemaining,
      dueDate: d.dueDate,
      createdAt: d.createdAt,
      paid: d.status === 'paid', // Map status to paid boolean
      paidAt: d.status === 'paid' ? d.createdAt : null, // Use createdAt as fallback for paidAt
      status: d.status,
      installmentPlan: d.installmentPlan
    }));

    setDebts(convertedDebts);
  }, [isOpen]);

  // Load contribution groups when drawer opens or tab changes
  useEffect(() => {
    if (!isOpen || mainTab !== 'contributions' || !currentUser?.uid) return;

    // ALWAYS reset to list view when switching to contributions tab
    setSelectedGroup(null);
    setShowCreateGroupForm(false);
    setShowGroupSettings(false);

    const loadContributionGroups = async () => {
      setLoadingGroups(true);
      try {
        const result = await getGroups(currentUser.uid);
        if (!result.error && result.data) {
          console.log('Loaded contribution groups:', result.data); // Debug log to see data structure
          setContributionGroups(result.data);
        } else {
          console.error('Error loading contribution groups:', result.error);
          onToast?.('Failed to load contribution groups');
        }
      } catch (error) {
        console.error('Error loading contribution groups:', error);
        onToast?.('Failed to load contribution groups');
      } finally {
        setLoadingGroups(false);
      }
    };

    loadContributionGroups();
  }, [isOpen, mainTab, currentUser?.uid]);

  // Filter and sort debts
  const filteredDebts = useMemo(() => {
    let base = debts.slice();

    // Filter by tab
    if (tab === 'paid') {
      base = base.filter(d => d.paid);
    } else if (tab === 'overdue') {
      base = base.filter(d => !d.paid && d.dueDate && d.dueDate < today);
    } else {
      // "All" shows unpaid only
      base = base.filter(d => !d.paid);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      base = base.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.phone && d.phone.includes(query))
      );
    }

    // Sort: overdue first (by days overdue DESC), then by due date ASC
    base.sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < today;
      const bOverdue = b.dueDate && b.dueDate < today;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      if (aOverdue && bOverdue && a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate); // Earlier due dates first
      }

      // Both not overdue, sort by due date
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return base;
  }, [debts, tab, searchQuery, today]);

  // Calculate totals for subtitle
  const { total, count } = useMemo(() => {
    const filtered = searchQuery.trim()
      ? filteredDebts
      : debts.filter(d => {
          if (tab === 'paid') return d.paid;
          if (tab === 'overdue') return !d.paid && d.dueDate && d.dueDate < today;
          return !d.paid;
        });

    return {
      total: filtered.reduce((sum, d) => sum + (d.paid ? 0 : d.amount), 0),
      count: filtered.length
    };
  }, [debts, tab, searchQuery, filteredDebts, today]);

  // Mark debt as paid
  function handleMarkPaid(debt: Debt) {
    try {
      setSavingId(debt.id);

      // Mark as paid in localStorage
      markDebtPaidNotify(debt.id);

      // Optimistic update - update local state
      const paidAt = new Date().toISOString();
      setDebts(prev =>
        prev.map(d =>
          d.id === debt.id
            ? { ...d, paid: true, paidAt }
            : d
        )
      );

      setConfirmMarkPaid(null);
      onToast?.(`✓ Marked ${formatNaira(debt.amount)} as paid`);
    } catch (e) {
      console.error('[Mark Paid] Error:', e);
      onToast?.('Failed to mark as paid. Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  // Send WhatsApp reminder
  function handleSendReminder(debt: Debt) {
    if (!debt.phone) {
      onToast?.('No phone number for this customer');
      return;
    }

    const dueDateStr = debt.dueDate
      ? new Date(debt.dueDate).toLocaleDateString('en-NG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : 'soon';

    const msg = `Hello ${debt.name}, you have an outstanding balance of ${formatNaira(debt.amountRemaining)} due ${dueDateStr}. Please make payment at your earliest convenience. Thank you! — ${businessName}`;

    openWhatsApp(debt.phone, msg);
    onToast?.('WhatsApp reminder opened');
  }

  // Record payment handler
  function handleRecordPayment(debtId: string, amount: number, method?: string) {
    try {
      let payment;

      // Get the debt to check for installment plan
      const localDebts = getDebts();
      const debt = localDebts.find(d => d.id === debtId);

      if (debt?.installmentPlan) {
        // Smart installment detection
        const nextInstallment = getNextPendingInstallment(debt);

        if (nextInstallment) {
          // Record as installment payment
          payment = recordInstallmentPaymentNotify(
            debtId,
            nextInstallment.number,
            amount,
            method
          );
        } else {
          // No pending installments, use regular payment
          payment = recordPaymentNotify(debtId, amount, method);
        }
      } else {
        // Regular debt without installment plan
        payment = recordPaymentNotify(debtId, amount, method);
      }

      if (!payment) {
        onToast?.('Failed to record payment. Please check the amount.');
        return;
      }

      // Reload debts to reflect changes
      const updatedDebts = getDebts();
      const convertedDebts: Debt[] = updatedDebts.map(d => ({
        id: d.id,
        name: d.customerName,
        phone: d.phone,
        amount: d.totalAmount,
        totalAmount: d.totalAmount,
        amountPaid: d.amountPaid,
        amountRemaining: d.amountRemaining,
        dueDate: d.dueDate,
        createdAt: d.createdAt,
        paid: d.status === 'paid',
        paidAt: d.status === 'paid' ? d.createdAt : null,
        status: d.status,
        installmentPlan: d.installmentPlan
      }));
      setDebts(convertedDebts);

      onToast?.(`✓ Payment of ${formatNaira(amount)} recorded • ${payment.id}`);
    } catch (error) {
      console.error('[Record Payment] Error:', error);
      onToast?.('Failed to record payment. Please try again.');
    }
  }

  // Send payment receipt via WhatsApp
  function handleSendReceipt(debt: Debt) {
    if (!debt.phone) {
      onToast?.('No phone number for this customer');
      return;
    }

    let receipt: string;

    if (debt.installmentPlan) {
      // Installment-specific receipt
      const paidInstallments = debt.installmentPlan.schedule.filter(i => i.status === 'paid').length;
      const totalInstallments = debt.installmentPlan.totalInstallments;
      const frequencyText = debt.installmentPlan.frequency === 'biweekly'
        ? 'Bi-weekly'
        : debt.installmentPlan.frequency.charAt(0).toUpperCase() + debt.installmentPlan.frequency.slice(1);

      // Get next installment info
      const localDebts = getDebts();
      const fullDebt = localDebts.find(d => d.id === debt.id);
      const nextInstallment = fullDebt ? getNextPendingInstallment(fullDebt) : null;

      receipt = `🧾 Installment Receipt - ${businessName}

Customer: ${debt.name}
📋 ${frequencyText} Payment Plan
━━━━━━━━━━━━━━━━━━
Total Amount: ${formatNaira(debt.totalAmount)}
Installments: ${paidInstallments} of ${totalInstallments} paid
Payment/Installment: ${formatNaira(debt.installmentPlan.installmentAmount)}

Progress: ${'█'.repeat(Math.floor(paidInstallments / totalInstallments * 10))}${'░'.repeat(10 - Math.floor(paidInstallments / totalInstallments * 10))} ${Math.round(paidInstallments / totalInstallments * 100)}%

━━━━━━━━━━━━━━━━━━
Amount Paid: ${formatNaira(debt.amountPaid)}
Balance Due: ${formatNaira(debt.amountRemaining)}
━━━━━━━━━━━━━━━━━━

${nextInstallment ? `⏰ Next Payment:\n   ${formatNaira(nextInstallment.amount)} due ${new Date(nextInstallment.dueDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}` : '✅ All installments paid!'}

${debt.status === 'paid' ? '✅ FULLY PAID - Thank you!' : '⏳ Keep up the good work!'}

Date: ${new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}

Thank you for your payment! 🙏`;
    } else {
      // Regular receipt
      receipt = `🧾 Payment Receipt - ${businessName}

Customer: ${debt.name}
━━━━━━━━━━━━━━━━━━
Total Debt: ${formatNaira(debt.totalAmount)}
Amount Paid: ${formatNaira(debt.amountPaid)}
Balance Due: ${formatNaira(debt.amountRemaining)}
━━━━━━━━━━━━━━━━━━

${debt.status === 'paid' ? '✅ FULLY PAID - Thank you!' : '⏳ Payment pending'}

Date: ${new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}

Thank you for your payment! 🙏`;
    }

    openWhatsApp(debt.phone, receipt);
    onToast?.('WhatsApp receipt opened');
  }

  // Create new debt handler
  function handleCreateDebt(
    customerName: string,
    phone: string,
    totalAmount: number,
    hasInstallments: boolean,
    numInstallments?: number,
    frequency?: InstallmentFrequency,
    startDate?: string
  ) {
    try {
      let newDebt: LocalStorageDebt;

      if (hasInstallments && numInstallments && frequency && startDate) {
        // Create debt with installment plan
        newDebt = createDebtWithInstallments(
          customerName,
          phone || undefined,
          totalAmount,
          numInstallments,
          frequency,
          startDate
        );
      } else {
        // Create simple debt (single payment)
        // Set due date to 30 days from now as default
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        newDebt = {
          id: `DEBT-${Date.now()}`,
          customerName,
          phone: phone || undefined,
          totalAmount,
          amountPaid: 0,
          amountRemaining: totalAmount,
          payments: [],
          dueDate: dueDate.toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          status: 'open'
        };
      }

      // Add to localStorage with notification
      addDebtNotify(newDebt);

      // Reload debts to reflect changes
      const localDebts = getDebts();
      const convertedDebts: Debt[] = localDebts.map(d => ({
        id: d.id,
        name: d.customerName,
        phone: d.phone,
        amount: d.totalAmount,
        totalAmount: d.totalAmount,
        amountPaid: d.amountPaid,
        amountRemaining: d.amountRemaining,
        dueDate: d.dueDate,
        createdAt: d.createdAt,
        paid: d.status === 'paid',
        paidAt: d.status === 'paid' ? d.createdAt : null,
        status: d.status,
        installmentPlan: d.installmentPlan
      }));
      setDebts(convertedDebts);

      const planType = hasInstallments ? 'installment plan' : 'debt';
      onToast?.(`✓ Created ${planType} for ${customerName}`);
    } catch (error) {
      console.error('[Create Debt] Error:', error);
      onToast?.('Failed to create debt. Please try again.');
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div className="credits-drawer debt-drawer-premium" style={{ pointerEvents: 'auto' }}>
        {/* Header */}
        <div className="debt-drawer-header">
          <button className="drawer-back" onClick={onClose} aria-label="Close">
            ←
          </button>
          <div className="debt-header-content">
            <h2 className="debt-drawer-title">Money Book</h2>
            {mainTab === 'credit-sales' && (
              <p className="debt-drawer-subtitle">
                Total: {formatNaira(total)} ({count} {count === 1 ? 'person' : 'people'})
              </p>
            )}
          </div>
          {mainTab === 'credit-sales' && (
            <button
              onClick={() => setShowCreateDebtModal(true)}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '8px'
              }}
              title="Create new debt"
              aria-label="Create new debt"
            >
              + Add
            </button>
          )}
          {mainTab === 'contributions' && !showCreateGroupForm && (
            <button
              onClick={() => {
                setSelectedGroup(null);
                setShowGroupSettings(false);
                setShowCreateGroupForm(true);
              }}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '8px'
              }}
              title="Create new contribution group"
              aria-label="Create new contribution group"
            >
              + New Group
            </button>
          )}
          <button
            className="drawer-close"
            onClick={() => {
              // Reset contribution states when closing
              setSelectedGroup(null);
              setShowCreateGroupForm(false);
              setShowGroupSettings(false);
              // Reset to default tab
              setMainTab('credit-sales');
              onClose();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Main Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e5e5',
          backgroundColor: '#fff'
        }}>
          <button
            onClick={() => setMainTab('credit-sales')}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: mainTab === 'credit-sales' ? '2px solid #10b981' : '2px solid transparent',
              color: mainTab === 'credit-sales' ? '#10b981' : '#666',
              fontWeight: mainTab === 'credit-sales' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Credit Sales
          </button>
          <button
            onClick={() => {
              setMainTab('contributions');
              // Reset to list view when switching to Contributions tab
              setSelectedGroup(null);
              setShowCreateGroupForm(false);
              setShowGroupSettings(false);
            }}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: mainTab === 'contributions' ? '2px solid #10b981' : '2px solid transparent',
              color: mainTab === 'contributions' ? '#10b981' : '#666',
              fontWeight: mainTab === 'contributions' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Contributions</span>
            <span style={{
              background: '#ef4444',
              color: 'white',
              fontSize: '9px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '8px',
              textTransform: 'uppercase',
              lineHeight: 1.2
            }}>
              NEW
            </span>
          </button>
        </div>

        {/* Credit Sales Tabs */}
        {mainTab === 'credit-sales' && (
          <div className="debt-chips-container">
          <div className="debt-chip-row" role="radiogroup" aria-label="Filter debts">
            <button
              className={`debt-chip ${tab === 'all' ? 'active' : ''}`}
              aria-pressed={tab === 'all'}
              onClick={() => setTab('all')}
            >
              All{' '}
              {debts.filter(d => !d.paid).length > 0 && debts.filter(d => !d.paid).length}
            </button>
            <button
              className={`debt-chip ${tab === 'overdue' ? 'active' : ''}`}
              aria-pressed={tab === 'overdue'}
              onClick={() => setTab('overdue')}
            >
              Overdue{' '}
              {debts.filter(d => !d.paid && d.dueDate && d.dueDate < today).length > 0 &&
                debts.filter(d => !d.paid && d.dueDate && d.dueDate < today).length}
            </button>
            <button
              className={`debt-chip ${tab === 'paid' ? 'active' : ''}`}
              aria-pressed={tab === 'paid'}
              onClick={() => setTab('paid')}
            >
              Paid {debts.filter(d => d.paid).length > 0 && debts.filter(d => d.paid).length}
            </button>
          </div>

          {/* Search */}
          <div className="debt-search-container">
            <input
              type="search"
              className="debt-search-input"
              placeholder="🔍 Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search customer debts"
            />
          </div>
        </div>
        )}

        {/* Credit Sales Content */}
        {mainTab === 'credit-sales' && (
        <div className="drawer-content debt-drawer-content">
          {filteredDebts.length === 0 ? (
            <div className="debt-empty-state">
              <div className="debt-empty-icon">📱</div>
              <p className="debt-empty-text">
                {tab === 'all' && !searchQuery.trim()
                  ? 'No records yet. Tap + Add to track a credit sale.'
                  : `No ${tab.toLowerCase()} debts${searchQuery.trim() ? ' found' : ''}`}
              </p>
              {searchQuery.trim() && (
                <button className="debt-clear-search" onClick={() => setSearchQuery('')}>
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredDebts.map(debt => {
              const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
              const daysUntilDue = dueDate ? getDaysUntilDue(dueDate) : null;
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
              const digitsOnly = (phone?: string) => (phone || '').replace(/\D/g, '');

              let dueDateText = '';
              if (dueDate) {
                const day = dueDate.getDate();
                const month = dueDate.toLocaleDateString('en-US', { month: 'short' });
                const year = dueDate.getFullYear();
                const formatted = `${day} ${month} ${year}`;

                if (daysUntilDue! < 0) {
                  dueDateText = `Due: ${formatted} • (${Math.abs(daysUntilDue!)} days overdue)`;
                } else if (daysUntilDue === 0) {
                  dueDateText = `Due: ${formatted} • (due today)`;
                } else {
                  dueDateText = `Due: ${formatted}`;
                }
              }

              const hasPhone = !!digitsOnly(debt.phone);

              return (
                <div
                  key={debt.id}
                  className={`debt-card ${isOverdue ? 'debt-card-overdue' : ''}`}
                >
                  <div className="debt-card-content">
                    <div className="debt-card-top">
                      <div className="debt-card-name">{debt.name}</div>
                      <div className="debt-card-amount">{formatNaira(debt.totalAmount)}</div>
                    </div>

                    {debt.phone && (
                      <a
                        href={`tel:${digitsOnly(debt.phone)}`}
                        className="debt-card-phone"
                      >
                        📞 {debt.phone}
                      </a>
                    )}

                    {/* Balance Summary */}
                    {!debt.paid && debt.amountPaid > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f0f9ff',
                        borderRadius: '6px',
                        margin: '8px 0',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: '#0369a1', fontWeight: 500 }}>
                          Paid: {formatNaira(debt.amountPaid)}
                        </span>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                          Balance: {formatNaira(debt.amountRemaining)}
                        </span>
                      </div>
                    )}

                    {/* Installment Progress */}
                    {debt.installmentPlan && (
                      <div style={{
                        padding: '12px',
                        background: '#fef3c7',
                        borderRadius: '8px',
                        margin: '8px 0',
                        fontSize: '13px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#92400e' }}>
                            📋 Installment Plan
                          </span>
                          <span style={{ color: '#78350f', fontSize: '12px' }}>
                            {debt.installmentPlan.frequency === 'biweekly' ? 'Bi-weekly' : debt.installmentPlan.frequency.charAt(0).toUpperCase() + debt.installmentPlan.frequency.slice(1)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {(() => {
                          const paidInstallments = debt.installmentPlan.schedule.filter(i => i.status === 'paid').length;
                          const totalInstallments = debt.installmentPlan.totalInstallments;
                          const progressPercent = (paidInstallments / totalInstallments) * 100;

                          return (
                            <>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#fde68a',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginBottom: '6px'
                              }}>
                                <div style={{
                                  width: `${progressPercent}%`,
                                  height: '100%',
                                  background: '#10b981',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#78350f'
                              }}>
                                <span>{paidInstallments} of {totalInstallments} paid</span>
                                <span>{formatNaira(debt.installmentPlan.installmentAmount)}/installment</span>
                              </div>

                              {/* Next installment info */}
                              {!debt.paid && (() => {
                                const localDebts = getDebts();
                                const fullDebt = localDebts.find(d => d.id === debt.id);
                                if (!fullDebt) return null;

                                const nextInstallment = getNextPendingInstallment(fullDebt);
                                if (!nextInstallment) return null;

                                const nextDate = new Date(nextInstallment.dueDate);
                                const formattedDate = nextDate.toLocaleDateString('en-NG', {
                                  day: '2-digit',
                                  month: 'short'
                                });

                                return (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '6px 8px',
                                    background: '#fffbeb',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#78350f'
                                  }}>
                                    Next: {formatNaira(nextInstallment.amount)} due {formattedDate}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {dueDateText && (
                      <div
                        className={`debt-card-due ${isOverdue ? 'debt-due-overdue' : ''}`}
                      >
                        {dueDateText}
                      </div>
                    )}

                    {debt.paid && debt.paidAt && (
                      <div className="debt-paid-info">
                        ✅ Paid on {new Date(debt.paidAt).toLocaleDateString('en-NG')}
                      </div>
                    )}

                    {!debt.paid && (
                      <div className="debt-card-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
                        <button
                          className="debt-btn-remind"
                          onClick={() => {
                            const localDebts = getDebts();
                            const fullDebt = localDebts.find(d => d.id === debt.id);
                            if (fullDebt) {
                              setRecordPaymentDebt(fullDebt);
                            }
                          }}
                          title="Record partial or full payment"
                          aria-label={`Record payment for ${debt.name}`}
                          style={{
                            padding: '10px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          💳 Record Payment
                        </button>
                        <button
                          className="debt-btn-mark-paid"
                          onClick={() => handleSendReceipt(debt)}
                          disabled={!hasPhone}
                          title={hasPhone ? 'Send receipt via WhatsApp' : 'No phone number'}
                          aria-label={`Send receipt to ${debt.name}`}
                          style={{
                            padding: '10px',
                            background: hasPhone ? '#0ea5e9' : '#d1d5db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: hasPhone ? 'pointer' : 'not-allowed'
                          }}
                        >
                          📲 Send Receipt
                        </button>
                        <button
                          className="debt-btn-remind"
                          onClick={() => handleSendReminder(debt)}
                          disabled={!hasPhone}
                          title={hasPhone ? 'Send WhatsApp reminder' : 'No phone number'}
                          aria-label={`Send WhatsApp reminder to ${debt.name}`}
                          style={{
                            padding: '10px',
                            background: hasPhone ? 'white' : '#f3f4f6',
                            color: hasPhone ? '#374151' : '#9ca3af',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: hasPhone ? 'pointer' : 'not-allowed'
                          }}
                        >
                          💬 Remind
                        </button>
                        <button
                          className="debt-btn-mark-paid"
                          onClick={() => setConfirmMarkPaid(debt)}
                          title="Mark as fully paid"
                          aria-label={`Mark ${debt.name} as paid`}
                          style={{
                            padding: '10px',
                            background: 'white',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Mark Paid
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Contributions Content */}
        {mainTab === 'contributions' && (
          <div className="drawer-content debt-drawer-content">
            {showCreateGroupForm ? (
              <CreateGroupForm
                onCancel={() => setShowCreateGroupForm(false)}
                isLoading={creatingGroup}
                onSubmit={async (groupData) => {
                  console.log('=== CREATE GROUP SUBMIT START ===');
                  console.log('Form data received:', groupData);
                  console.log('Current user ID:', currentUser?.uid);

                  if (!currentUser?.uid) {
                    console.error('No user ID found');
                    onToast?.('Please login to create a contribution group');
                    return;
                  }

                  setCreatingGroup(true);

                  try {
                    console.log('Calling createGroup service with:', {
                      userId: currentUser.uid,
                      name: groupData.name,
                      amount: groupData.amount,
                      frequency: groupData.frequency,
                      collectionDay: groupData.collectionDay,
                      membersCount: groupData.members?.length
                    });

                    // Create group in database with members
                    const result = await createGroup(currentUser.uid, {
                      name: groupData.name,
                      amount: groupData.amount,
                      frequency: groupData.frequency,
                      collectionDay: groupData.collectionDay,
                      members: groupData.members
                    });

                    console.log('createGroup result:', result);

                    if (result.error) {
                      console.error('=== SUPABASE ERROR DETAILS ===');
                      console.error('Error object:', result.error);
                      console.error('Error message:', (result.error as any)?.message);
                      console.error('Error code:', (result.error as any)?.code);
                      console.error('Error details:', (result.error as any)?.details);
                      console.error('Error hint:', (result.error as any)?.hint);

                      // Show the actual error message to help diagnose
                      const errorMessage = (result.error as any)?.message || 'Failed to create contribution group';
                      onToast?.(`Error: ${errorMessage}`);
                      setCreatingGroup(false);
                      return;
                    }

                    console.log('Group created successfully:', result.data);

                    // Reload groups to get the newly created one
                    console.log('Reloading groups...');
                    const groupsResult = await getGroups(currentUser.uid);

                    if (!groupsResult.error && groupsResult.data) {
                      console.log('Groups reloaded:', groupsResult.data.length, 'groups found');
                      setContributionGroups(groupsResult.data);

                      // Select the newly created group
                      const newGroup = groupsResult.data.find(g => g.id === result.data?.id);
                      if (newGroup) {
                        console.log('Selecting new group:', newGroup);
                        // Normalize the group data structure for the detail component
                        const normalizedGroup = {
                          ...newGroup,
                          members: newGroup.contribution_members || newGroup.members || [],
                          currentRecipientId: newGroup.currentRecipient?.id || '',
                          cycleNumber: newGroup.current_cycle || 1,
                          totalCycles: newGroup.totalMembers || newGroup.total_members || 0,
                          nextCollectionDate: new Date().toISOString(),
                          isActive: newGroup.status === 'active',
                          collectionDay: newGroup.collection_day || newGroup.collectionDay || ''
                        };
                        setSelectedGroup(normalizedGroup);
                      }
                    } else if (groupsResult.error) {
                      console.error('Error reloading groups:', groupsResult.error);
                    }

                    setShowCreateGroupForm(false);
                    onToast?.('Contribution group created successfully!');
                    console.log('=== CREATE GROUP SUBMIT SUCCESS ===');
                  } catch (error) {
                    console.error('=== UNEXPECTED ERROR ===');
                    console.error('Error type:', typeof error);
                    console.error('Error:', error);
                    console.error('Error stack:', (error as any)?.stack);

                    const errorMessage = (error as any)?.message || 'Failed to create contribution group';
                    onToast?.(`Error: ${errorMessage}`);
                  } finally {
                    setCreatingGroup(false);
                  }
                }}
              />
            ) : selectedGroup ? (
              <ContributionGroupDetail
                group={selectedGroup}
                onBack={() => setSelectedGroup(null)}
                onUpdate={(updatedGroup) => {
                  // Update the group in the list
                  setContributionGroups(contributionGroups.map(g =>
                    g.id === updatedGroup.id ? updatedGroup : g
                  ));
                  setSelectedGroup(updatedGroup);
                }}
                onSettings={() => {
                  setShowGroupSettings(true);
                }}
                onAddMember={async (memberData) => {
                  try {
                    // Calculate payout position for the new member
                    const currentMembers = selectedGroup.members || [];
                    const nextPosition = currentMembers.length + 1;

                    // Add member to Supabase
                    const result = await addMember(selectedGroup.id, {
                      name: memberData.name,
                      phone: memberData.phone,
                      payoutPosition: nextPosition
                    });

                    if (!result.error && result.data) {
                      // Update local state with the new member
                      const newMember = {
                        id: result.data.id,
                        name: result.data.name,
                        phone: result.data.phone,
                        isPaid: false,
                        hasPaid: false
                      };

                      const updatedGroup = {
                        ...selectedGroup,
                        members: [...(selectedGroup.members || []), newMember],
                        totalCycles: (selectedGroup.members?.length || 0) + 1
                      };

                      setSelectedGroup(updatedGroup);
                      setContributionGroups(contributionGroups.map(g =>
                        g.id === updatedGroup.id ? updatedGroup : g
                      ));

                      onToast?.(`${memberData.name} has been added to the group`);
                    } else {
                      throw new Error(result.error || 'Failed to add member');
                    }
                  } catch (error) {
                    console.error('Failed to add member:', error);
                    onToast?.('Failed to add member. Please try again.');
                  }
                }}
                onMarkPaid={(memberId) => {
                  console.log('Mark paid:', memberId);
                  // Update member payment status
                  const updatedGroup = {
                    ...selectedGroup,
                    members: selectedGroup.members?.map(m =>
                      m.id === memberId ? { ...m, isPaid: true, hasPaid: true, paymentDate: new Date().toISOString() } : m
                    )
                  };
                  setSelectedGroup(updatedGroup);
                  setContributionGroups(contributionGroups.map(g =>
                    g.id === updatedGroup.id ? updatedGroup : g
                  ));
                  onToast?.('Member marked as paid');
                }}
                onRecordPayment={(memberId, amount, cycle) => {
                  console.log('Payment recorded:', memberId, amount, cycle);
                  // This would typically update the group's payment records
                  onToast?.('Payment recorded successfully');
                }}
                onRecordPayout={(recipientId, amount) => {
                  console.log('Payout recorded:', recipientId, amount);
                  onToast?.('Payout recorded successfully');
                }}
                onRemindUnpaid={(memberIds) => {
                  // Show modal with list of unpaid members
                  const members = selectedGroup.members?.filter(m => memberIds.includes(m.id)) || [];

                  if (members.length === 0) {
                    onToast?.('No unpaid members to remind');
                    return;
                  }

                  // Open WhatsApp for each member
                  members.forEach((member, index) => {
                    if (member.phone) {
                      const message = encodeURIComponent(
                        `Hi ${member.name}, your contribution of ${formatNaira(selectedGroup.amount)} for "${selectedGroup.name}" is due ${
                          selectedGroup.frequency === 'weekly' ? 'this week' :
                          selectedGroup.frequency === 'biweekly' ? 'this fortnight' :
                          'this month'
                        }. Please pay before ${selectedGroup.collectionDay || 'the collection day'}. Thank you!`
                      );

                      const phoneNumber = member.phone.replace(/\D/g, '');
                      const waLink = `https://wa.me/${phoneNumber}?text=${message}`;

                      // Open with slight delay to avoid popup blocking
                      setTimeout(() => {
                        window.open(waLink, '_blank');
                      }, index * 500);
                    }
                  });

                  onToast?.(`Opening WhatsApp for ${members.length} member(s)`);
                }}
              />
            ) : loadingGroups ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '60px 20px',
                color: '#6b7280'
              }}>
                Loading groups...
              </div>
            ) : (
              <ContributionGroupList
                groups={contributionGroups}
                onGroupClick={(group) => {
                  // Normalize the group data structure for the detail component
                  const normalizedGroup = {
                    ...group,
                    members: group.contribution_members || group.members || [],
                    currentRecipientId: group.currentRecipient?.id || '',
                    cycleNumber: group.current_cycle || 1,
                    totalCycles: group.totalMembers || group.total_members || 0,
                    nextCollectionDate: new Date().toISOString(),
                    isActive: group.status === 'active',
                    collectionDay: group.collection_day || group.collectionDay || ''
                  };
                  console.log('Opening group detail with:', normalizedGroup); // Debug log
                  setSelectedGroup(normalizedGroup);
                }}
                onCreateGroup={() => {
                  setShowCreateGroupForm(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmMarkPaid && (
        <div className="modal-overlay" onClick={() => setConfirmMarkPaid(null)}>
          <div
            className="modal confirm-modal debt-confirm-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Mark as paid?</h2>
              <button className="modal-close" onClick={() => setConfirmMarkPaid(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Mark {formatNaira(confirmMarkPaid.amount)} from{' '}
                <strong>{confirmMarkPaid.name}</strong> as paid?
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmMarkPaid(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleMarkPaid(confirmMarkPaid)}
                disabled={savingId === confirmMarkPaid.id}
              >
                {savingId === confirmMarkPaid.id ? 'Saving…' : 'Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        debt={recordPaymentDebt}
        isOpen={!!recordPaymentDebt}
        onClose={() => setRecordPaymentDebt(null)}
        onRecordPayment={handleRecordPayment}
      />

      {/* Create Debt Modal */}
      <CreateDebtModal
        isOpen={showCreateDebtModal}
        onClose={() => setShowCreateDebtModal(false)}
        onCreateDebt={handleCreateDebt}
      />

      {/* Group Settings Modal */}
      {showGroupSettings && selectedGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <GroupSettings
            group={{
            ...selectedGroup,
            isShared: selectedGroup.share_enabled || false,
            shareCode: selectedGroup.share_code,
            isActive: selectedGroup.status === 'active' || selectedGroup.isActive,
            collectionDay: selectedGroup.collectionDay || selectedGroup.collection_day || ''
          }}
          onBack={() => setShowGroupSettings(false)}
          onSave={async (updates) => {
            try {
              // Map the fields correctly for database update
              const dbUpdates = {
                ...updates,
                collection_day: updates.collectionDay,
                status: updates.isActive ? 'active' : 'paused',
                share_enabled: updates.isShared
              };

              // Update the group in the database
              const result = await updateGroup(selectedGroup.id, dbUpdates);

              if (!result.error) {
                // Update local state
                const updatedGroup = { ...selectedGroup, ...updates };
                setSelectedGroup(updatedGroup);
                setContributionGroups(contributionGroups.map(g =>
                  g.id === updatedGroup.id ? updatedGroup : g
                ));
                setShowGroupSettings(false);
                onToast?.('Group settings updated successfully');
              } else {
                onToast?.('Failed to update group settings');
              }
            } catch (error) {
              console.error('Error updating group:', error);
              onToast?.('Failed to update group settings');
            }
          }}
          onDelete={async () => {
            if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
              return;
            }

            try {
              const result = await deleteGroup(selectedGroup.id);

              if (!result.error) {
                // Remove from local state
                setContributionGroups(contributionGroups.filter(g => g.id !== selectedGroup.id));
                setSelectedGroup(null);
                setShowGroupSettings(false);
                onToast?.('Group deleted successfully');
              } else {
                onToast?.('Failed to delete group');
              }
            } catch (error) {
              console.error('Error deleting group:', error);
              onToast?.('Failed to delete group');
            }
          }}
          onGenerateShareCode={() => {
            // Generate a new share code
            const code = Math.random().toString(36).substr(2, 8).toUpperCase();
            return code;
          }}
        />
        </div>
      )}
    </>
  );
}
