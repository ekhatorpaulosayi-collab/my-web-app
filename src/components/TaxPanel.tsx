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
      <div className="card" style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
              💰 Monthly Profit & Tax
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', marginTop: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {formatNaira(profitKobo)}
            </div>
            <div style={{
              fontSize: '0.813rem',
              color: 'rgba(255,255,255,0.95)',
              marginTop: '0.75rem',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px',
              backdropFilter: 'blur(10px)'
            }}>
              Est. Tax @ {settings.taxRatePct ?? 2}%: <strong>{formatNaira(estimatedTaxKobo)}</strong>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: '12px 24px',
              whiteSpace: 'nowrap',
              minHeight: '44px',
              cursor: 'pointer',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            View Breakdown
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div style={{
          marginTop: '16px',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          borderLeft: '3px solid rgba(255,255,255,0.4)',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.95)',
            margin: 0,
            lineHeight: '1.5'
          }}>
            ⚠️ <strong>Estimate only</strong> – Not for tax filing. Consult a tax professional for accurate advice.
          </p>
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
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111827' }}>
                💰 Profit & Tax Breakdown
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
                {displayDate(startISO)} – {displayDate(endISO)}
              </p>
            </div>
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

            {/* Enhanced Disclaimer */}
            <div style={{
              marginTop: '1.5rem',
              padding: '16px',
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              borderLeft: '4px solid #F59E0B'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#92400E',
                    margin: '0 0 8px 0'
                  }}>
                    Important: Estimate Only
                  </p>
                  <p style={{
                    fontSize: '0.813rem',
                    color: '#78350F',
                    lineHeight: '1.6',
                    margin: 0
                  }}>
                    This calculation is a simplified estimate and should <strong>NOT</strong> be used for actual tax filing.
                    Actual tax liability may vary based on your business structure, allowable deductions, and Nigerian tax laws.
                    <br /><br />
                    <strong>Always consult a qualified tax professional or accountant</strong> for accurate tax advice and compliance with FIRS regulations.
                  </p>
                </div>
              </div>
            </div>
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
