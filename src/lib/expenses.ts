import { Expense, ExpenseCategory } from '../types/expenses';

const STORAGE_KEY = 'storehouse:expenses:v1';

// Helper: Get user ID from current user
function getUserId(): string {
  // Adjust this based on your auth system
  const userStr = localStorage.getItem('storehouse:user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.id || 'default-user';
  }
  return 'default-user';
}

// Helper: Dispatch dashboard refresh event (with retries for reliability)
function dispatchRefresh() {
  const ev = new CustomEvent('storehouse:refresh-dashboard', { detail: { source: 'expenses' } });
  window.dispatchEvent(ev);
  setTimeout(() => window.dispatchEvent(ev), 500);
  setTimeout(() => window.dispatchEvent(ev), 1500);
}

// Load all expenses for current user
export function loadExpenses(): Expense[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const allExpenses: Expense[] = JSON.parse(data);
    const userId = getUserId();

    // Filter by user and exclude soft-deleted
    const userExpenses = allExpenses.filter(
      exp => exp.userId === userId && !exp.deletedAt
    );

    // Sort by date (newest first)
    userExpenses.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.debug('[Expenses] loaded', { count: userExpenses.length });
    return userExpenses;

  } catch (error) {
    console.error('[Expenses] error loading', error);
    return [];
  }
}

// Save new expense
export function saveExpense(data: {
  amountKobo: number;
  category: ExpenseCategory;
  description: string;
  date: string;
}): Expense {
  try {
    const userId = getUserId();
    const now = new Date().toISOString();

    const expense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amountKobo: data.amountKobo,
      category: data.category,
      description: data.description,
      date: data.date,
      createdAt: now,
      updatedAt: now,
    };

    // Load existing expenses
    const existing = localStorage.getItem(STORAGE_KEY);
    const allExpenses: Expense[] = existing ? JSON.parse(existing) : [];

    // Add new expense
    allExpenses.push(expense);

    // Save back
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allExpenses));

    console.debug('[Expenses] saved', {
      id: expense.id,
      amount: expense.amountKobo / 100,
      category: expense.category
    });

    // Dispatch event for dashboard refresh
    window.dispatchEvent(new CustomEvent('storehouse:expense-updated', {
      detail: { expenseId: expense.id }
    }));

    console.debug('[Expenses] dispatched storehouse:expense-updated', {
      expenseId: expense.id
    });

    // Also dispatch refresh-dashboard event for TaxPanel
    dispatchRefresh();

    return expense;

  } catch (error) {
    console.error('[Expenses] error', error);
    throw new Error('Failed to save expense');
  }
}

// Delete expense (soft delete)
export function deleteExpense(expenseId: string): boolean {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return false;

    const allExpenses: Expense[] = JSON.parse(data);
    const expense = allExpenses.find(exp => exp.id === expenseId);

    if (!expense) return false;

    // Soft delete
    expense.deletedAt = new Date().toISOString();
    expense.updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allExpenses));

    console.debug('[Expenses] deleted', { id: expenseId });

    // Dispatch event for dashboard refresh
    window.dispatchEvent(new CustomEvent('storehouse:expense-updated', {
      detail: { expenseId, deleted: true }
    }));

    // Also dispatch refresh-dashboard event for TaxPanel
    dispatchRefresh();

    return true;

  } catch (error) {
    console.error('[Expenses] error deleting', error);
    return false;
  }
}

// Get expenses for date range
export function getExpensesByDateRange(
  startDate: string,
  endDate: string
): Expense[] {
  const allExpenses = loadExpenses();

  return allExpenses.filter(exp => {
    return exp.date >= startDate && exp.date <= endDate;
  });
}

// Get current month expenses
export function getCurrentMonthExpenses(): Expense[] {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split('T')[0];

  return getExpensesByDateRange(firstDay, lastDay);
}

// Calculate total expenses in naira
export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amountKobo, 0) / 100;
}

// Sum expenses in kobo (for tax calculations)
export function sumExpensesKobo(list: Expense[]): number {
  return list.reduce((sum, e) => sum + (e.amountKobo || 0), 0);
}

// Note: calculateInputVat removed - no longer needed for income tax calculation
