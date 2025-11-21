/**
 * Create Debt Modal
 * Allows creating debts with optional installment plans
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { InstallmentFrequency } from '../state/debts';
import { generateInstallmentSchedule } from '../state/debts';

interface CreateDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDebt: (
    customerName: string,
    phone: string,
    totalAmount: number,
    hasInstallments: boolean,
    numInstallments?: number,
    frequency?: InstallmentFrequency,
    startDate?: string
  ) => void;
}

// Format currency
const formatNaira = (amount: number) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

export function CreateDebtModal({
  isOpen,
  onClose,
  onCreateDebt
}: CreateDebtModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'single' | 'installment'>('single');
  const [numInstallments, setNumInstallments] = useState('4');
  const [frequency, setFrequency] = useState<InstallmentFrequency>('weekly');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setPhone('');
      setTotalAmount('');
      setPaymentType('single');
      setNumInstallments('4');
      setFrequency('weekly');
      // Set start date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amount = parseFloat(totalAmount) || 0;
  const installments = parseInt(numInstallments) || 1;
  const installmentAmount = amount > 0 && installments > 0
    ? Math.ceil(amount / installments)
    : 0;

  // Generate preview schedule
  const previewSchedule = amount > 0 && installments > 1 && startDate && paymentType === 'installment'
    ? generateInstallmentSchedule(amount, installments, frequency, startDate)
    : [];

  const finalDate = previewSchedule.length > 0
    ? previewSchedule[previewSchedule.length - 1].dueDate
    : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!customerName.trim()) {
      setError('Please enter customer name');
      return;
    }

    if (amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (paymentType === 'installment') {
      if (installments < 2) {
        setError('Installments must be at least 2');
        return;
      }

      if (installments > 12) {
        setError('Maximum 12 installments allowed');
        return;
      }

      if (!startDate) {
        setError('Please select first payment date');
        return;
      }
    }

    // Create debt
    onCreateDebt(
      customerName.trim(),
      phone.trim(),
      amount,
      paymentType === 'installment',
      paymentType === 'installment' ? installments : undefined,
      paymentType === 'installment' ? frequency : undefined,
      paymentType === 'installment' ? startDate : undefined
    );

    onClose();
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
          maxWidth: '500px',
          width: '90%',
          background: 'white',
          borderRadius: '12px',
          padding: 0,
          overflow: 'hidden',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Add Debt/Credit Sale
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
            {/* Customer Name */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="customerName"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: '#374151'
                }}
              >
                Customer Name *
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., John Doe"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Phone Number */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="phone"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: '#374151'
                }}
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="080XXXXXXXX"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Total Amount */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="totalAmount"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: '#374151'
                }}
              >
                Total Amount *
              </label>
              <input
                id="totalAmount"
                type="number"
                min="1"
                step="0.01"
                value={totalAmount}
                onChange={(e) => {
                  setTotalAmount(e.target.value);
                  setError('');
                }}
                placeholder="₦0"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              {amount > 0 && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#10b981',
                  fontWeight: 500
                }}>
                  {formatNaira(amount)}
                </div>
              )}
            </div>

            {/* Payment Type */}
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
                Payment Type
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: paymentType === 'single' ? '2px solid #10b981' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: paymentType === 'single' ? '#f0fdf4' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="single"
                    checked={paymentType === 'single'}
                    onChange={() => setPaymentType('single')}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Single Payment
                  </span>
                </label>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: paymentType === 'installment' ? '2px solid #10b981' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: paymentType === 'installment' ? '#f0fdf4' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="installment"
                    checked={paymentType === 'installment'}
                    onChange={() => setPaymentType('installment')}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Installment Plan
                  </span>
                </label>
              </div>
            </div>

            {/* Installment Details */}
            {paymentType === 'installment' && (
              <div
                style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <label
                    htmlFor="numInstallments"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      marginBottom: '6px',
                      color: '#374151'
                    }}
                  >
                    Number of Installments
                  </label>
                  <input
                    id="numInstallments"
                    type="number"
                    min="2"
                    max="12"
                    value={numInstallments}
                    onChange={(e) => setNumInstallments(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: 'white'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    htmlFor="frequency"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      marginBottom: '6px',
                      color: '#374151'
                    }}
                  >
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as InstallmentFrequency)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (every 2 weeks)</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="startDate"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      marginBottom: '6px',
                      color: '#374151'
                    }}
                  >
                    First Payment Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            {paymentType === 'installment' && amount > 0 && installments > 1 && (
              <div
                style={{
                  padding: '12px',
                  background: '#eff6ff',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#1e40af'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Preview:</div>
                <div>• {installments} payments of {formatNaira(installmentAmount)} each</div>
                <div>• Every {frequency === 'biweekly' ? '2 weeks' : frequency}</div>
                {startDate && <div>• Starting {new Date(startDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                {finalDate && <div>• Final payment: {new Date(finalDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
              </div>
            )}

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
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: '#10b981',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {paymentType === 'installment' ? 'Create Plan' : 'Create Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
