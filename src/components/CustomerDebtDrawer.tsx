import React, { useEffect, useMemo, useState } from 'react';
import { getDebts, markDebtPaidNotify, type Debt as LocalStorageDebt } from '../state/debts';
import { openWhatsApp } from '../utils/wa';

// Adapter type to match the component's expected format
type Debt = {
  id: string;
  name: string;
  phone?: string;
  amount: number;
  dueDate?: string;
  createdAt: string;
  paid: boolean;
  paidAt?: string | null;
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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [tab, setTab] = useState<'all' | 'overdue' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<Debt | null>(null);

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
      amount: d.amount,
      dueDate: d.dueDate,
      createdAt: d.createdAt,
      paid: d.status === 'paid', // Map status to paid boolean
      paidAt: d.status === 'paid' ? d.createdAt : null // Use createdAt as fallback for paidAt
    }));

    setDebts(convertedDebts);
  }, [isOpen]);

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

    const msg = `Hello ${debt.name}, you have an outstanding balance of ${formatNaira(debt.amount)} due ${dueDateStr}. Please make payment at your earliest convenience. Thank you! — ${businessName}`;

    openWhatsApp(debt.phone, msg);
    onToast?.('WhatsApp reminder opened');
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="credits-drawer debt-drawer-premium">
        {/* Header */}
        <div className="debt-drawer-header">
          <button className="drawer-back" onClick={onClose} aria-label="Close">
            ←
          </button>
          <div className="debt-header-content">
            <h2 className="debt-drawer-title">Customer Debt</h2>
            <p className="debt-drawer-subtitle">
              Total: {formatNaira(total)} ({count} {count === 1 ? 'person' : 'people'})
            </p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Tabs */}
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

        {/* Debt List */}
        <div className="drawer-content debt-drawer-content">
          {filteredDebts.length === 0 ? (
            <div className="debt-empty-state">
              <div className="debt-empty-icon">📱</div>
              <p className="debt-empty-text">
                No {tab.toLowerCase()} debts{searchQuery.trim() ? ' found' : ''}
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
                      <div className="debt-card-amount">{formatNaira(debt.amount)}</div>
                    </div>

                    {dueDateText && (
                      <div
                        className={`debt-card-due ${isOverdue ? 'debt-due-overdue' : ''}`}
                      >
                        {dueDateText}
                      </div>
                    )}

                    {debt.phone && (
                      <a
                        href={`tel:${digitsOnly(debt.phone)}`}
                        className="debt-card-phone"
                      >
                        {debt.phone}
                      </a>
                    )}

                    {debt.paid && debt.paidAt && (
                      <div className="debt-paid-info">
                        Paid on {new Date(debt.paidAt).toLocaleDateString('en-NG')}
                      </div>
                    )}

                    {!debt.paid && (
                      <div className="debt-card-actions">
                        <button
                          className="debt-btn-remind"
                          onClick={() => handleSendReminder(debt)}
                          disabled={!hasPhone}
                          title={hasPhone ? 'Send WhatsApp reminder' : 'No phone number'}
                          aria-label={`Send WhatsApp reminder to ${debt.name}`}
                        >
                          📱 Remind
                        </button>
                        <button
                          className="debt-btn-mark-paid"
                          onClick={() => setConfirmMarkPaid(debt)}
                          title="Mark as paid"
                          aria-label={`Mark ${debt.name} as paid`}
                        >
                          ✓ Mark Paid
                        </button>
                        {hasPhone && (
                          <a
                            href={`tel:${digitsOnly(debt.phone)}`}
                            className="debt-btn-call"
                            aria-label={`Call ${debt.name}`}
                            title="Call"
                          >
                            ☎
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
    </>
  );
}
