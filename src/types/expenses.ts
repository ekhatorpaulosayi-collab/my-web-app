// Expense Tracking Types

export interface Expense {
  id: string;
  userId: string;
  amountKobo: number;        // Store in kobo for precision
  category: ExpenseCategory;
  description?: string;
  date: string;              // YYYY-MM-DD format
  createdAt: string;         // ISO timestamp
  updatedAt: string;
  deletedAt?: string;        // Soft delete (optional)
}

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'STOCK'
  | 'SALARIES'
  | 'TRANSPORT'
  | 'AIRTIME_DATA'
  | 'REPAIRS'
  | 'OTHER';

export const EXPENSE_CATEGORIES = {
  RENT: { label: 'Rent', icon: '🏠' },
  UTILITIES: { label: 'Utilities', icon: '⚡' },
  STOCK: { label: 'Stock Purchase', icon: '📦' },
  SALARIES: { label: 'Salaries', icon: '👥' },
  TRANSPORT: { label: 'Transport', icon: '🚗' },
  AIRTIME_DATA: { label: 'Airtime & Data', icon: '📱' },
  REPAIRS: { label: 'Repairs', icon: '🔧' },
  OTHER: { label: 'Other', icon: '📄' },
} as const;
