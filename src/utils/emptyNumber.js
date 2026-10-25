/**
 * Money fields on stores are numeric. Blank is null.
 * "5k", "1,500.50", and "₦50,000" are amounts.
 * Anything else is refused so the form can say what to type.
 */
export const AMOUNT_HINT = 'Enter an amount like 1500 or 5k, or leave it blank.';

export function parseAmountField(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { value, error: null }
      : { value: null, error: AMOUNT_HINT };
  }
  if (value == null) return { value: null, error: null };
  const text = String(value).trim();
  if (!text) return { value: null, error: null };
  const normalized = text.replace(/₦/g, '').replace(/,/g, '').replace(/\s+/g, '');
  if (!normalized) return { value: null, error: null };
  const match = /^(\d+)(\.\d+)?([kK])?$/.exec(normalized);
  if (!match) return { value: null, error: AMOUNT_HINT };
  const amount = Number(`${match[1]}${match[2] || ''}`);
  if (!Number.isFinite(amount)) return { value: null, error: AMOUNT_HINT };
  return { value: match[3] ? amount * 1000 : amount, error: null };
}

export function emptyNumberAsNull(value) {
  const parsed = parseAmountField(value);
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.name = 'InvalidAmount';
    throw error;
  }
  return parsed.value;
}
