/**
 * Record Payment Modal
 * Allows recording partial or full payments on customer debts
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Debt } from '../state/debts';
import { getNextPendingInstallment } from '../state/debts';

interface RecordPaymentModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (debtId: string, amount: number, method?: string) => void;
}

// Format currency
const formatNaira = (amount: number) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

export function RecordPaymentModal({
  debt,
  isOpen,
  onClose,
  onRecordPayment
}: RecordPaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && debt) {
      setPaymentMethod('');
      setError('');

      // Smart payment detection for installments
      if (debt.installmentPlan) {
        const nextInstallment = getNextPendingInstallment(debt);
        if (nextInstallment) {
          // Pre-fill with next installment amount
          setPaymentAmount(String(nextInstallment.amount));
        } else {
          setPaymentAmount('');
        }
      } else {
        setPaymentAmount('');
      }
    }
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  // Get next installment for smart suggestions
  const nextInstallment = debt.installmentPlan ? getNextPendingInstallment(debt) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(paymentAmount);

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > debt.amountRemaining) {
      setError(`Amount cannot exceed balance of ${formatNaira(debt.amountRemaining)}`);
      return;
    }

    // Record payment
    onRecordPayment(debt.id, amount, paymentMethod || undefined);
    onClose();
  };

  const handleQuickAmount = (amount: number) => {
    setPaymentAmount(String(amount));
    setError('');
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
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
        zIndex: 10000
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '450px',
          width: '90%',
          background: 'white',
          borderRadius: '12px',
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10001
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Record Payment
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              color: '#6b7280'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px' }}>
            {/* Customer Info */}
            <div
              style={{
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                Customer
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                {debt.customerName}
              </div>
              {debt.phone && (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {debt.phone}
                </div>
              )}
            </div>

            {/* Installment Plan Info */}
            {nextInstallment && (
              <div
                style={{
                  background: '#fef3c7',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #fde68a'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>📋</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
                    Installment Plan
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#78350f' }}>
                  Next payment: {formatNaira(nextInstallment.amount)} due{' '}
                  {new Date(nextInstallment.dueDate).toLocaleDateString('en-NG', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div style={{ fontSize: '12px', color: '#a16207', marginTop: '4px' }}>
                  Installment {nextInstallment.number} of {debt.installmentPlan!.totalInstallments}
                </div>
              </div>
            )}

            {/* Debt Summary */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '14px'
                }}
              >
                <span style={{ color: '#6b7280' }}>Total Debt:</span>
                <strong>{formatNaira(debt.totalAmount)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '14px'
                }}
              >
                <span style={{ color: '#6b7280' }}>Already Paid:</span>
                <strong style={{ color: '#10b981' }}>{formatNaira(debt.amountPaid)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  fontSize: '16px',
                  borderTop: '2px solid #e5e7eb',
                  marginTop: '8px'
                }}
              >
                <span style={{ fontWeight: 600 }}>Balance Due:</span>
                <strong style={{ fontSize: '18px', color: '#ef4444' }}>
                  {formatNaira(debt.amountRemaining)}
                </strong>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            {debt.amountRemaining > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    color: '#374151'
                  }}
                >
                  Quick Amount
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    debt.amountRemaining >= 1000 && 1000,
                    debt.amountRemaining >= 5000 && 5000,
                    debt.amountRemaining >= 10000 && 10000,
                    debt.amountRemaining
                  ]
                    .filter(Boolean)
                    .filter((v, i, arr) => arr.indexOf(v) === i) // Remove duplicates
                    .slice(0, 4)
                    .map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickAmount(amount as number)}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#10b981';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                      >
                        {formatNaira(amount as number)}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Payment Amount Input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="paymentAmount"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: '#374151'
                }}
              >
                Payment Amount *
              </label>
              <input
                id="paymentAmount"
                type="number"
                min="0"
                max={debt.amountRemaining}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setError('');
                }}
                placeholder="Enter amount"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
              {parseFloat(paymentAmount) > 0 && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#10b981',
                  fontWeight: 500
                }}>
                  {formatNaira(parseFloat(paymentAmount))}
                </div>
              )}
            </div>

            {/* Payment Method (Optional) */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="paymentMethod"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: '#374151'
                }}
              >
                Payment Method (Optional)
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select method...</option>
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
                <option value="pos">POS</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              position: 'sticky',
              bottom: 0,
              zIndex: 10
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!paymentAmount}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: paymentAmount ? '#10b981' : '#d1d5db',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: paymentAmount ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (paymentAmount) e.currentTarget.style.background = '#059669';
              }}
              onMouseOut={(e) => {
                if (paymentAmount) e.currentTarget.style.background = '#10b981';
              }}
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
