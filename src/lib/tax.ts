export const computeProfitKobo = (salesKobo: number, cogsKobo: number, expensesKobo: number) =>
  Math.max(0, (salesKobo || 0) - (cogsKobo || 0) - (expensesKobo || 0));

export const computeEstimatedTaxKobo = (profitKobo: number, taxRatePct = 2) =>
  Math.round((profitKobo * taxRatePct) / 100);
