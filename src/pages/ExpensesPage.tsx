import React, { useState, useEffect } from 'react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../types/expenses';
import {
  loadExpenses,
  deleteExpense,
  calculateTotalExpenses
} from '../lib/expenses';

interface ExpensesPageProps {
  onBack: () => void;
  onAddExpense: () => void;
}

export default function ExpensesPage({ onBack, onAddExpense }: ExpensesPageProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Load expenses on mount
  useEffect(() => {
    loadExpensesData();
  }, []);

  // Listen for expense updates
  useEffect(() => {
    const handleExpenseUpdate = () => {
      loadExpensesData();
    };

    window.addEventListener('storehouse:expense-updated', handleExpenseUpdate);

    return () => {
      window.removeEventListener('storehouse:expense-updated', handleExpenseUpdate);
    };
  }, []);

  const loadExpensesData = () => {
    setLoading(true);
    const data = loadExpenses();
    setExpenses(data);
    setLoading(false);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch =
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      EXPENSE_CATEGORIES[expense.category].label.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Calculate totals
  const totalAmount = calculateTotalExpenses(filteredExpenses);

  // Handle delete
  const handleDelete = (expenseId: string) => {
    if (window.confirm('Delete this expense?')) {
      const success = deleteExpense(expenseId);
      if (success) {
        loadExpensesData(); // Reload list
        alert('✅ Expense deleted');
      } else {
        alert('❌ Failed to delete expense');
      }
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="expenses-page">

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button
            className="back-btn"
            onClick={onBack}
          >
            ← Back
          </button>
          <h1>💰 Expenses</h1>
        </div>
        <button
          className="btn-primary"
          onClick={onAddExpense}
        >
          + Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="expenses-filters">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'all')}
        >
          <option value="all">All Categories</option>
          {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon }]) => (
            <option key={key} value={key}>
              {icon} {label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Card */}
      <div className="expenses-summary">
        <div className="summary-content">
          <p className="summary-label">Total Expenses</p>
          <h2 className="summary-amount">₦{totalAmount.toLocaleString()}</h2>
          <p className="summary-count">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="loading-state">
          <p>Loading expenses...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">💰</p>
          <p className="empty-title">
            {searchTerm || filterCategory !== 'all'
              ? 'No expenses found'
              : 'No expenses yet'}
          </p>
          <p className="empty-subtitle">
            {searchTerm || filterCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first expense to start tracking'}
          </p>
          {!searchTerm && filterCategory === 'all' && (
            <button
              className="btn-primary"
              onClick={onAddExpense}
            >
              Add Expense
            </button>
          )}
        </div>
      ) : (
        <div className="expenses-list">
          {filteredExpenses.map(expense => {
            const category = EXPENSE_CATEGORIES[expense.category];
            const amount = expense.amountKobo / 100;

            return (
              <div key={expense.id} className="expense-item">

                <div className="expense-icon">
                  {category.icon}
                </div>

                <div className="expense-details">
                  <p className="expense-category">{category.label}</p>
                  {expense.description && (
                    <p className="expense-description">{expense.description}</p>
                  )}
                  <p className="expense-date">{formatDate(expense.date)}</p>
                </div>

                <div className="expense-amount-section">
                  <p className="expense-amount">₦{amount.toLocaleString()}</p>
                </div>

                <button
                  className="expense-delete"
                  onClick={() => handleDelete(expense.id)}
                  aria-label="Delete expense"
                  title="Delete expense"
                >
                  🗑️
                </button>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
