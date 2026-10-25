/**
 * Blank form text is not a number. Postgres rejects '' on a numeric column.
 * A plain amount, including "₦50,000", is sent as a number.
 * Other text is returned trimmed so a text column can still store it.
 */
export function emptyNumberAsNull(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.replace(/₦/g, '').replace(/,/g, '').trim();
  if (!normalized) return null;
  if (/^\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
  return text;
}
