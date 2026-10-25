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
