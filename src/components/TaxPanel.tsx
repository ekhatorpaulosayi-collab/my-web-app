import { useMemo, useState, useEffect } from 'react';
import { formatNaira, displayDate, monthWindow } from '../lib/utils';
import { computeProfitKobo, computeEstimatedTaxKobo } from '../lib/tax';
import { loadSales, sumSalesKoboInRange, calculateCOGSKobo } from '../lib/salesAgg';
import { loadExpenses } from '../lib/expenses';
import { getSettings } from '../utils/settings';
import { isUnlocked } from '../lib/pinService';

export default function TaxPanel() {
  const [open, setOpen] = useState(false);
  const [sales, setSales] = useState(loadSales());
  const [expenses, setExpenses] = useState(loadExpenses());
  const [settings, setSettings] = useState(getSettings());
  const [pinUnlocked, setPinUnlocked] = useState(isUnlocked());

  const { startISO, endISO } = monthWindow();

  useEffect(() => {
    const handleRefresh = () => {
      setSales(loadSales());
      setExpenses(loadExpenses());
    };
    const handleSettingsUpdate = () => {
      setSettings(getSettings());
    };
    const handlePinUnlock = () => {
      setPinUnlocked(true);
    };
    const handlePinLock = () => {
      setPinUnlocked(false);
    };

    window.addEventListener('storehouse:refresh-dashboard', handleRefresh as any);
    window.addEventListener('storehouse:expense-updated', handleRefresh as any);
    window.addEventListener('settings:updated', handleSettingsUpdate);
    window.addEventListener('settings:saved', handleSettingsUpdate);
    window.addEventListener('pin:unlocked', handlePinUnlock);
    window.addEventListener('pin:locked', handlePinLock);

    return () => {
      window.removeEventListener('storehouse:refresh-dashboard', handleRefresh as any);
      window.removeEventListener('storehouse:expense-updated', handleRefresh as any);
      window.removeEventListener('settings:updated', handleSettingsUpdate);
      window.removeEventListener('settings:saved', handleSettingsUpdate);
      window.removeEventListener('pin:unlocked', handlePinUnlock);
      window.removeEventListener('pin:locked', handlePinLock);
    };
  }, []);

  // Hide if tax estimator is disabled or PIN is locked
  if (!settings.enableTaxEstimator || !pinUnlocked) return null;

  const salesKobo = useMemo(() => sumSalesKoboInRange(sales, startISO, endISO), [sales, startISO, endISO]);
  const cogsKobo = useMemo(() => calculateCOGSKobo(startISO, endISO), [startISO, endISO, sales]);
  const expensesKobo = useMemo(() =>
    expenses.filter(e => {
      // Normalize date to YYYY-MM-DD format (handles both ISO timestamps and YYYY-MM-DD)
      const normalizedDate = e.date ? e.date.split('T')[0] : '';
      return normalizedDate >= startISO && normalizedDate <= endISO && !e.deletedAt;
    })
      .reduce((sum, e) => sum + (e.amountKobo || 0), 0),
    [expenses, startISO, endISO]
  );

  // Calculate profit: Sales - COGS - Operating Expenses
  const profitKobo = computeProfitKobo(salesKobo, cogsKobo, expensesKobo);
  const estimatedTaxKobo = computeEstimatedTaxKobo(profitKobo, settings.taxRatePct ?? 2);

  return (
    <>
      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Profit This Month</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {formatNaira(profitKobo)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Est. Tax @ {settings.taxRatePct ?? 2}%: <strong>{formatNaira(estimatedTaxKobo)}</strong>
            </div>
          </div>
          <button
            className="btn-outline"
            onClick={() => setOpen(true)}
            style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap', minHeight: '44px', cursor: 'pointer' }}
          >
            View breakdown
          </button>
        </div>
      </div>

      {open && (
        <div
          className="modal"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="modal-body"
            style={{
              backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem',
              maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              Profit & Tax — {displayDate(startISO)}–{displayDate(endISO)}
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: '#6b7280' }}>Total Sales Revenue</span>
                <strong>{formatNaira(salesKobo)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', paddingLeft: '1rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>− Cost of Goods Sold</span>
                <span style={{ color: '#9ca3af' }}>({formatNaira(cogsKobo)})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', paddingLeft: '1rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>− Operating Expenses</span>
                <span style={{ color: '#9ca3af' }}>({formatNaira(expensesKobo)})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid #e5e7eb', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: '600' }}>Net Profit</span>
                <strong style={{ fontSize: '1.125rem' }}>{formatNaira(profitKobo)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.25rem' }}>
                <span style={{ color: '#6b7280' }}>Estimated Tax @ {settings.taxRatePct ?? 2}%</span>
                <strong style={{ color: '#3b82f6' }}>{formatNaira(estimatedTaxKobo)}</strong>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem', lineHeight: '1.5' }}>
              💡 This is an estimate only. Actual tax may vary based on your business structure and deductions. Consult a tax professional for filing.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => setOpen(false)}
                style={{ padding: '0.5rem 1rem', minHeight: '44px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
