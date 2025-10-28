// src/lib/stockMovements.ts
// Minimal stock movement log for tracking inventory changes

export type StockMovement = {
  itemId: string | number;
  type: 'in' | 'adjust';
  qty: number;
  unitCost: number;
  reason?: 'purchase' | 'stock_take' | 'correction';
  at: string;
};

const KEY = 'storehouse_stock_movements_v1';

/**
 * Log a stock movement to localStorage for later analysis
 */
export function logStockMovement(m: StockMovement): void {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
    arr.push(m);
    // Keep only last 1000 movements to prevent storage bloat
    if (arr.length > 1000) {
      arr.splice(0, arr.length - 1000);
    }
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch (err) {
    console.warn('[Stock Movements] Failed to log:', err);
  }
}

/**
 * Get all stock movements (for future insights/reports)
 */
export function getStockMovements(): StockMovement[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
