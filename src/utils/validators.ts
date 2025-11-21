/**
 * Pure validation helpers for sales recording
 */

export interface ValidationResult {
  ok: boolean;
  msg?: string;
}

export const ensureQty = (q: number, stock: number): ValidationResult => {
  if (!Number.isFinite(q) || q < 1) {
    return { ok: false, msg: 'Quantity must be at least 1' };
  }
  if (q > stock) {
    return { ok: false, msg: `Only ${stock} in stock` };
  }
  return { ok: true };
};

export const ensurePrice = (p: number): ValidationResult => {
  if (!Number.isFinite(p) || p < 0) {
    return { ok: false, msg: 'Enter a valid price' };
  }
  if (p === 0) {
    return { ok: false, msg: 'Price must be greater than 0' };
  }
  return { ok: true };
};
