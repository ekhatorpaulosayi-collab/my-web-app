/**
 * Stock Warning Settings Utilities
 *
 * Manages configurable stock thresholds for inventory warnings
 */

export interface StockThresholds {
  good: number;      // Stock above this is considered good
  low: number;       // Stock between low and good is considered low
  veryLow: number;   // Stock below this is considered very low
}

const STORAGE_KEY = 'storehouse-stock-thresholds';

const DEFAULT_THRESHOLDS: StockThresholds = {
  good: 20,
  low: 10,
  veryLow: 5
};

/**
 * Get stock thresholds from localStorage or return defaults
 */
export function getStockThresholds(): StockThresholds {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the thresholds
      if (
        typeof parsed.good === 'number' &&
        typeof parsed.low === 'number' &&
        typeof parsed.veryLow === 'number' &&
        parsed.good > parsed.low &&
        parsed.low > parsed.veryLow &&
        parsed.veryLow >= 0
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[Stock Settings] Error loading thresholds:', error);
  }
  return DEFAULT_THRESHOLDS;
}

/**
 * Save stock thresholds to localStorage
 */
export function saveStockThresholds(thresholds: StockThresholds): boolean {
  try {
    // Validate before saving
    if (
      typeof thresholds.good !== 'number' ||
      typeof thresholds.low !== 'number' ||
      typeof thresholds.veryLow !== 'number' ||
      thresholds.good <= thresholds.low ||
      thresholds.low <= thresholds.veryLow ||
      thresholds.veryLow < 0
    ) {
      console.error('[Stock Settings] Invalid thresholds:', thresholds);
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
    return true;
  } catch (error) {
    console.error('[Stock Settings] Error saving thresholds:', error);
    return false;
  }
}

/**
 * Reset stock thresholds to defaults
 */
export function resetStockThresholds(): StockThresholds {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_THRESHOLDS;
}

export type StockStatus = 'good' | 'low' | 'veryLow';

/**
 * Get stock status based on current quantity and thresholds
 */
export function getStockStatus(quantity: number, thresholds?: StockThresholds): StockStatus {
  const t = thresholds || getStockThresholds();

  if (quantity >= t.good) {
    return 'good';
  } else if (quantity >= t.low) {
    return 'low';
  } else {
    return 'veryLow';
  }
}

/**
 * Get emoji indicator for stock status
 */
export function getStockEmoji(status: StockStatus): string {
  switch (status) {
    case 'good':
      return '🟢';
    case 'low':
      return '🟡';
    case 'veryLow':
      return '🔴';
    default:
      return '';
  }
}

/**
 * Get stock indicator (emoji + status) for a quantity
 */
export function getStockIndicator(quantity: number, thresholds?: StockThresholds): {
  emoji: string;
  status: StockStatus;
  color: string;
} {
  const status = getStockStatus(quantity, thresholds);
  const emoji = getStockEmoji(status);

  const colorMap = {
    good: '#10b981',      // green
    low: '#f59e0b',       // amber
    veryLow: '#ef4444'    // red
  };

  return {
    emoji,
    status,
    color: colorMap[status]
  };
}
