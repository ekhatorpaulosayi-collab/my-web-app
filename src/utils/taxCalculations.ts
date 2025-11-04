// Tax Calculation Utilities (Phase 3)

export type Expense = {
  amount: number;
  hasVat?: boolean;
};

export type TaxSettings = {
  vatRate?: number;
  taxMode?: 'PER_PRODUCT' | 'EOD';
  priceMode?: 'VAT_INCLUSIVE' | 'VAT_EXCLUSIVE';
  claimInputVatFromPurchases?: boolean;
  claimInputVatFromExpenses?: boolean;
};

export type TaxCalculationInput = {
  settings?: TaxSettings;
  totals?: { taxable: number; zeroOrExempt: number };
  purchasesVat?: number;
  expenses?: Expense[];
  salesTotal: number;
  expensesTotal: number;
};

export type TaxCalculationResult = {
  success: boolean;
  vatPayable: number;
  profit: number;
  salesTotal: number;
  expensesTotal: number;
  breakdown: {
    outputVat: number;
    inputVat: number;
    fromPurchases: number;
    fromExpenses: number;
  };
  notes: string[];
  error?: string;
};

// Helper: round to 2 decimal places
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate VAT and profit for a given period
 * @param input - Sales, expenses, and settings data
 * @returns Tax calculation results
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  try {
    // Extract data with safe defaults
    const {
      settings = {},
      totals = { taxable: 0, zeroOrExempt: 0 },
      purchasesVat = 0,
      expenses = [],
      salesTotal = 0,
      expensesTotal = 0,
    } = input;

    // Get settings with defaults
    const VAT = settings.vatRate ?? 0.075; // 7.5%
    const priceMode = settings.priceMode ?? 'VAT_INCLUSIVE';
    const claimPurch = settings.claimInputVatFromPurchases ?? true;
    const claimExp = settings.claimInputVatFromExpenses ?? false;

    // SAFETY: Handle zero/negative sales
    if (salesTotal < 0) {
      return {
        success: false,
        error: 'Sales cannot be negative',
        vatPayable: 0,
        profit: 0,
        salesTotal: 0,
        expensesTotal: 0,
        breakdown: {
          outputVat: 0,
          inputVat: 0,
          fromPurchases: 0,
          fromExpenses: 0,
        },
        notes: [],
      };
    }

    // Calculate OUTPUT VAT (collected from customers)
    function calculateOutputVat(): number {
      if (priceMode === 'VAT_EXCLUSIVE') {
        // VAT added on top: 7.5% of sales
        return totals.taxable * VAT;
      } else {
        // VAT-inclusive: back out VAT
        // Formula: VAT = Total - (Total / 1.075)
        const base = totals.taxable / (1 + VAT);
        return totals.taxable - base;
      }
    }

    const outputVat = round2(calculateOutputVat());

    // Calculate INPUT VAT (paid on purchases/expenses)
    const inputFromPurchases = claimPurch ? purchasesVat : 0;
    const inputFromExpenses = claimExp
      ? expenses
          .filter(e => e.hasVat)
          .reduce((sum, e) => sum + (e.amount * VAT), 0)
      : 0;

    const inputVat = round2(inputFromPurchases + inputFromExpenses);

    // NET VAT PAYABLE (can't be negative)
    const vatPayable = Math.max(0, round2(outputVat - inputVat));

    // PROFIT (simple: sales - expenses)
    const profit = round2(salesTotal - expensesTotal);

    // Add helpful notes
    const notes: string[] = [];
    if (priceMode === 'VAT_INCLUSIVE') {
      notes.push('Prices are VAT-inclusive; VAT backed out automatically');
    }
    if (salesTotal === 0) {
      notes.push('No sales recorded this month');
    }
    if (profit < 0) {
      notes.push('Expenses exceed sales (negative profit)');
    }

    return {
      success: true,
      vatPayable,
      profit,
      salesTotal,
      expensesTotal,
      breakdown: {
        outputVat: round2(outputVat),
        inputVat: round2(inputVat),
        fromPurchases: round2(inputFromPurchases),
        fromExpenses: round2(inputFromExpenses),
      },
      notes,
    };

  } catch (error) {
    console.error('❌ Tax calculation error:', error);
    return {
      success: false,
      error: 'Tax calculation failed. Please try again.',
      vatPayable: 0,
      profit: 0,
      salesTotal: 0,
      expensesTotal: 0,
      breakdown: {
        outputVat: 0,
        inputVat: 0,
        fromPurchases: 0,
        fromExpenses: 0,
      },
      notes: [],
    };
  }
}

/**
 * Get current month name (e.g., "November 2025")
 */
export function getCurrentMonth(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Download tax summary as text file
 */
export function downloadTaxSummary(taxData: TaxCalculationResult, businessName: string): void {
  if (!taxData || !taxData.success) return;

  const content = `
TAX SUMMARY - ${getCurrentMonth()}
${businessName || 'Your Business'}

═══════════════════════════════════════
Total Sales:     ₦${(taxData.salesTotal || 0).toLocaleString()}
Total Expenses:  ₦${(taxData.expensesTotal || 0).toLocaleString()}
───────────────────────────────────────
Gross Profit:    ₦${(taxData.profit || 0).toLocaleString()}
═══════════════════════════════════════

VAT BREAKDOWN:
VAT Collected:   ₦${(taxData.breakdown?.outputVat || 0).toLocaleString()}
VAT Paid:        ₦${(taxData.breakdown?.inputVat || 0).toLocaleString()}
───────────────────────────────────────
NET VAT OWED:    ₦${(taxData.vatPayable || 0).toLocaleString()}
═══════════════════════════════════════

Note: Simple estimate. Consult tax professional for filing.
Generated: ${new Date().toLocaleString()}
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tax-summary-${getCurrentMonth().replace(' ', '-')}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Share tax summary via WhatsApp
 */
export function shareViaWhatsApp(taxData: TaxCalculationResult, businessName: string): void {
  if (!taxData || !taxData.success) return;

  const message = `
📊 TAX SUMMARY - ${getCurrentMonth()}

Sales: ₦${(taxData.salesTotal || 0).toLocaleString()}
Expenses: ₦${(taxData.expensesTotal || 0).toLocaleString()}
Profit: ₦${(taxData.profit || 0).toLocaleString()}
VAT to remit: ₦${(taxData.vatPayable || 0).toLocaleString()}

From ${businessName || 'My Business'}
  `.trim();

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
