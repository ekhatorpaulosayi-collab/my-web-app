export type SaleRow = { id: string; total: number; date: string };

// Full sale structure from localStorage
type FullSaleRow = {
  id: string;
  date: string;
  itemId?: string;
  qty: number;
  amount: number; // naira
  unitPrice: number; // naira
  cogsKobo?: number; // Cost of Goods Sold in kobo
};

export function loadSales(): SaleRow[] {
  try {
    const raw = localStorage.getItem('sales');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Convert sales to SaleRow format with total in kobo
    return parsed.map((s: any) => ({
      id: s.id,
      total: (s.amount || 0) * 100, // Convert naira to kobo
      date: s.date
    }));
  } catch {
    return [];
  }
}

// Load full sales data (includes itemId and qty for COGS calculation)
export function loadFullSales(): FullSaleRow[] {
  try {
    const raw = localStorage.getItem('sales');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function sumSalesKoboInRange(rows: SaleRow[], startISO: string, endISO: string) {
  return rows.reduce((acc, r) => {
    // Normalize date to YYYY-MM-DD format (handles both ISO timestamps and YYYY-MM-DD)
    const normalizedDate = r.date ? r.date.split('T')[0] : '';
    return (normalizedDate >= startISO && normalizedDate <= endISO) ? acc + (r.total || 0) : acc;
  }, 0);
}

/**
 * Calculate Cost of Goods Sold (COGS) for a date range
 * COGS = sum of cogsKobo field from all sales in the period
 * Returns value in kobo
 */
export function calculateCOGSKobo(startISO: string, endISO: string): number {
  try {
    const sales = loadFullSales();

    // Filter sales in the date range and sum their COGS
    const totalCOGS = sales
      .filter(s => {
        const normalizedDate = s.date ? s.date.split('T')[0] : '';
        return normalizedDate >= startISO && normalizedDate <= endISO;
      })
      .reduce((sum, s) => sum + (s.cogsKobo || 0), 0);

    return totalCOGS;
  } catch (error) {
    console.error('[calculateCOGSKobo] Error:', error);
    return 0; // Return 0 on error to avoid breaking the UI
  }
}
