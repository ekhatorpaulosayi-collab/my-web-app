import React, { useState } from 'react';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '../types/expenses';
import { todayISO, parseNairaToKobo } from '../lib/utils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amountKobo: number;
    category: ExpenseCategory;
    description: string;
    date: string;
  }) => void;
}

export default function ExpenseModal({ isOpen, onClose, onSubmit }: ExpenseModalProps) {
  const [amount, setAmount] = useState(''); // string for mobile decimal
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category) {
      alert('Please fill in required fields');
      return;
    }

    const amountKobo = parseNairaToKobo(amount);

    if (!isFinite(amountKobo) || amountKobo <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    onSubmit({
      amountKobo,
      category: category as ExpenseCategory,
      description: description.trim(),
      date,
    });

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(todayISO());
  };

  return (
    <div className="expense-modal-overlay" onClick={onClose}>
      <div className="expense-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="expense-modal-header">
          <h3>💰 Add Expense</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="expense-form">

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount" className="form-label">
              Amount <span className="required">*</span>
            </label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">₦</span>
              <input
                id="amount"
                inputMode="decimal"
                type="text"
                className="form-input amount-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/^0+/, '') || '')}
                required
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              required
              style={{ fontSize: 16 }}
            >
              <option value="">Select category...</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon }]) => (
                <option key={key} value={key}>
                  {icon} {label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date" className="form-label">
              Date <span className="required">*</span>
            </label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
              required
              style={{ fontSize: 16 }}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="form-textarea"
              placeholder="Add a note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              style={{ fontSize: 16 }}
            />
            <span className="char-count">{description.length}/200</span>
          </div>

          {/* Footer */}
          <div className="expense-modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-expense"
              disabled={!amount || !category}
            >
              Save Expense
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
