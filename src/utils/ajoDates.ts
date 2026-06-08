/**
 * Ajo / Contributions — derived collection-date layer (Stage 4).
 *
 * CORE PRINCIPLE: dates are DERIVED, never stored. Each member's collection date is a
 * pure function of (group start date, frequency, the member's payout_position):
 *
 *   collectionDate(member) = addPeriods(cycle_start_date, frequency, payout_position - 1)
 *
 * Position 1 = the start date itself; position 2 = one period later; etc. Because the
 * date derives from payout_position, reordering automatically reshuffles dates with
 * people — no separate date update is ever needed.
 *
 * Computed in the merchant's LOCAL calendar (WAT). cycle_start_date is treated as a
 * local calendar date (YYYY-MM-DD), NOT a UTC instant, so there is no timezone shift.
 */

export type AjoFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

/**
 * Parse a stored date value (YYYY-MM-DD string, or an ISO/Date) into a LOCAL Date at
 * midnight — no timezone shift. For 'YYYY-MM-DD' we build the date from its parts so
 * the local calendar day is preserved (new Date('2026-06-01') would parse as UTC).
 */
export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // YYYY-MM-DD (ignore any time/zone suffix)
  if (m) {
    const y = Number(m[1]); const mo = Number(m[2]) - 1; const d = Number(m[3]);
    const dt = new Date(y, mo, d); // local midnight
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

/**
 * Add N periods of `frequency` to a local start date. Pure; returns a new local Date.
 * Monthly clamps to the last valid day of the target month (Jan 31 + 1 month → Feb 28/29).
 */
export function addPeriods(start: Date, frequency: AjoFrequency, n: number): Date {
  if (n <= 0) return new Date(start.getFullYear(), start.getMonth(), start.getDate());
  switch (frequency) {
    case 'daily':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + n);
    case 'weekly':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + n * 7);
    case 'biweekly':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + n * 14);
    case 'monthly': {
      const targetMonthIndex = start.getMonth() + n;
      const targetYear = start.getFullYear() + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
      // Clamp the day to the last day of the target month (handles Feb / 30-day months).
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const day = Math.min(start.getDate(), lastDay);
      return new Date(targetYear, targetMonth, day);
    }
    default:
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + n);
  }
}

/**
 * The collection date for a given payout_position (1-based). Returns null if there is
 * no valid start date (caller should prompt the owner to set one).
 */
export function collectionDateForPosition(
  cycleStartDate: string | Date | null | undefined,
  frequency: AjoFrequency,
  payoutPosition: number
): Date | null {
  const start = parseLocalDate(cycleStartDate);
  if (!start || !payoutPosition || payoutPosition < 1) return null;
  return addPeriods(start, frequency, payoutPosition - 1);
}

/** Convenience: derive the collection date for a member object. */
export function collectionDate(
  member: { payout_position?: number; position?: number },
  group: { cycle_start_date?: string | Date | null; frequency?: string }
): Date | null {
  const pos = typeof member.payout_position === 'number'
    ? member.payout_position
    : (typeof member.position === 'number' ? member.position : null);
  if (!pos) return null;
  return collectionDateForPosition(
    group.cycle_start_date ?? null,
    (group.frequency as AjoFrequency) || 'monthly',
    pos
  );
}

/** Friendly display, e.g. "Mon, 1 Aug 2026". null/invalid → "—". */
export function formatCollectionDate(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

/** Shorter friendly form without weekday, e.g. "1 Aug 2026". */
export function formatCollectionDateShort(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** True when the group has a usable start date for deriving the schedule. */
export function hasStartDate(group: { cycle_start_date?: string | Date | null }): boolean {
  return parseLocalDate(group?.cycle_start_date) !== null;
}
