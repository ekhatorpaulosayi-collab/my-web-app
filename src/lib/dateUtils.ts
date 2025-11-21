/**
 * Timestamp-based date utilities
 * Fixes date comparison bugs by using Unix timestamps instead of string matching
 */

export interface DateRange {
  start: number;
  end: number;
}

/**
 * Get timestamp range for today (midnight to midnight)
 */
export function getTodayRange(): DateRange {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
  ).getTime();
  const end = start + (24 * 60 * 60 * 1000);

  return { start, end };
}

/**
 * Get timestamp range for any period
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'all'): DateRange {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
  ).getTime();

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayStart + (24 * 60 * 60 * 1000) };
    case 'week':
      return { start: todayStart - (7 * 24 * 60 * 60 * 1000), end: Date.now() };
    case 'month':
      return { start: todayStart - (30 * 24 * 60 * 60 * 1000), end: Date.now() };
    case 'all':
      return { start: 0, end: Date.now() };
  }
}

/**
 * Filter sales by timestamp range
 */
export function filterSalesByTimestamp<T extends { createdAt?: number; timestamp?: number }>(
  sales: T[],
  range: DateRange
): T[] {
  return sales.filter(sale => {
    const timestamp = sale.createdAt || sale.timestamp || 0;
    return timestamp >= range.start && timestamp < range.end;
  });
}

/**
 * Get day key for backward compatibility
 */
export function getDayKey(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
