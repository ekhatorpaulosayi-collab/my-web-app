/**
 * WhatsApp sharing utilities
 */

import { computeTotals, formatNGN } from './salesTotals.js';

/**
 * Build WhatsApp-formatted sales summary
 * @param {Array} rows - Array of sale records
 * @param {string} rangeLabel - Date range label (e.g., "1/1/2025 - 1/23/2025")
 * @param {string} businessName - Business name for header
 * @returns {string} Formatted text for WhatsApp
 */
export function buildWhatsAppSummary(rows, rangeLabel, businessName = 'STOREHOUSE') {
  const totals = computeTotals(rows);

  // Calculate top 3 items by revenue
  const itemMap = new Map();
  rows.forEach(sale => {
    const itemId = sale.itemId;
    const itemName = sale.itemName || sale.item?.name || 'Unknown Item';
    const qty = sale.qty || 0;
    const kobo = qty * (sale.sellKobo || 0);

    if (itemMap.has(itemId)) {
      const existing = itemMap.get(itemId);
      existing.qty += qty;
      existing.kobo += kobo;
    } else {
      itemMap.set(itemId, { name: itemName, qty, kobo });
    }
  });

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.kobo - a.kobo)
    .slice(0, 3);

  // Build message (ASCII-safe, standard emojis only)
  const lines = [
    `${businessName} SALES REPORT`,
    '================================',
    '',
    rangeLabel,
    '',
    '================================',
    'SALES SUMMARY',
    '',
    `Total: ${formatNGN(totals.total)}`,
    `Transactions: ${totals.count}`,
    `Items Sold: ${totals.units}`,
    '',
    `Cash: ${formatNGN(totals.cash)}`,
    `Card/Transfer: ${formatNGN(totals.card)}`,
    `Credit: ${formatNGN(totals.credit)}`,
    '',
    '================================',
    'TOP SELLERS',
    ''
  ];

  topItems.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   ${formatNGN(item.kobo)} (${item.qty} units)`);
  });

  lines.push('');
  lines.push('================================');
  lines.push('Powered by Storehouse');

  return lines.join('\n');
}
