/**
 * Delivery fee and minimum order are whole naira. The column is an integer.
 * Blank is null. "5k" and "₦50,000" are amounts. "1,500.50" rounds to the
 * nearest naira. Anything else is refused so the form can say what to type.
 */
export const AMOUNT_HINT = 'Enter an amount like 1500 or 5k, or leave it blank.';

function wholeNaira(amount) {
  const rounded = Math.round(amount);
  return Number.isFinite(rounded) ? rounded : null;
}

export function parseAmountField(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { value: null, error: AMOUNT_HINT };
    return { value: wholeNaira(value), error: null };
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
  const naira = wholeNaira(match[3] ? amount * 1000 : amount);
  if (naira == null) return { value: null, error: AMOUNT_HINT };
  return { value: naira, error: null };
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
