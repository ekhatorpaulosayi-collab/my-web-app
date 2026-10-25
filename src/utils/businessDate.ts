/**
 * Business calendar dates for Storehouse.
 * Lagos (WAT, UTC+1) is the business day, not the device zone and not UTC.
 * A sale at 00:30 in Lagos is still "today" even though UTC is still yesterday.
 */

const LAGOS = 'Africa/Lagos';

export function businessDayKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LAGOS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  if (!year || !month || !day) {
    throw new Error('Could not format a Lagos business date');
  }
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD kept as a calendar date. Instants are converted to the Lagos day. */
export function calendarDateKey(value: string | Date | null | undefined, fallback: Date = new Date()): string {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : fallback;
  return businessDayKey(date);
}

export function addCalendarDays(dateKey: string, days: number): string {
  const match = calendarDateKey(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return businessDayKey();
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addCalendarMonths(dateKey: string, months: number): string {
  const match = calendarDateKey(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return businessDayKey();
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const target = new Date(Date.UTC(year, monthIndex + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)));
  const y = clamped.getUTCFullYear();
  const m = String(clamped.getUTCMonth() + 1).padStart(2, '0');
  const d = String(clamped.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today in Lagos, plus a number of calendar days (negative allowed). */
export function lagosTodayPlus(days: number, now: Date = new Date()): string {
  return addCalendarDays(businessDayKey(now), days);
}

export function lagosMonthRange(now: Date = new Date()): { start: string; end: string } {
  const key = businessDayKey(now);
  const start = `${key.slice(0, 7)}-01`;
  const end = addCalendarDays(addCalendarMonths(start, 1), -1);
  return { start, end };
}

/** Monday of the Lagos week that contains `now`. */
export function lagosWeekStart(now: Date = new Date()): string {
  const key = businessDayKey(now);
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return key;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  return addCalendarDays(key, -delta);
}
