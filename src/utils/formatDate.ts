/**
 * Date formatting utilities using Intl.DateTimeFormat
 * Respects user's locale and timezone
 */

export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * Format date to "Tuesday, October 28, 2025" format
 * Uses Intl.DateTimeFormat for internationalization
 */
export function formatLongDate(
  date: Date = new Date(),
  options: DateFormatOptions = {}
): string {
  const locale = options.locale ?? 'en-US';
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone
    });

    return formatter.format(date);
  } catch (error) {
    console.error('[formatDate] Error formatting date:', error);
    // Fallback to basic format
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Get ISO date string (YYYY-MM-DD) for datetime attribute
 */
export function getISODateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate milliseconds until next midnight in local timezone
 * Used for scheduling date updates
 */
export function msUntilMidnight(now: Date = new Date()): number {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0); // Next midnight
  return tomorrow.getTime() - now.getTime();
}
