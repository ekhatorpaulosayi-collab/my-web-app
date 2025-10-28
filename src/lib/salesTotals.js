/**
 * Single source of truth for sales totals calculation
 * Used by WhatsApp summary and Sales History to ensure consistent metrics
 */

import { formatNaira } from '../utils/money.ts';

/**
 * Compute sales totals broken down by payment method
 * @param {Array} rows - Array of sale records
 * @returns {Object} Totals object with total, cash, card, credit, units, count
 */
export function computeTotals(rows) {
  return rows.reduce((acc, sale) => {
    const qty = Number(sale?.qty || 0);
    const unitKobo = Number(sale?.sellKobo || 0);
    const lineKobo = qty * unitKobo;

    // Normalize payment method from various possible fields
    const method = String(
      sale?.paymentMethod ||
      sale?.payment ||
      (sale?.isCredit ? 'credit' : 'cash')
    ).toLowerCase();

    // Categorize by payment type
    if (sale?.isCredit || method === 'credit') {
      acc.credit += lineKobo;
    } else if (method === 'card' || method === 'transfer') {
      acc.card += lineKobo;
    } else {
      acc.cash += lineKobo;
    }

    acc.total += lineKobo;
    acc.units += qty;
    acc.count += 1;

    return acc;
  }, {
    total: 0,
    cash: 0,
    card: 0,
    credit: 0,
    units: 0,
    count: 0
  });
}

/**
 * Format kobo amount to Naira string with ₦ symbol
 * @param {number} kobo - Amount in kobo
 * @returns {string} Formatted string like "₦450,000"
 */
export function formatNGN(kobo) {
  const naira = (kobo || 0) / 100;
  return formatNaira(naira);
}
