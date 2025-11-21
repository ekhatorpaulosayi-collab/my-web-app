import { useEffect, useState, useCallback } from 'react';

export default function TaxRateSelector({ value = 2, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [mode, setMode] = useState<'1' | '2' | '5' | 'custom'>(
    value === 1 ? '1' : value === 2 ? '2' : value === 5 ? '5' : 'custom'
  );
  const [custom, setCustom] = useState(value && ![1, 2, 5].includes(value) ? String(value) : '');

  const handleChange = useCallback(() => {
    if (mode === 'custom') {
      const v = Math.max(0, Math.min(100, Number(custom || 0)));
      onChange(isNaN(v) ? 0 : v);
    } else {
      onChange(Number(mode));
    }
  }, [mode, custom, onChange]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {(['1', '2', '5', 'custom'] as const).map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="taxRate"
              value={opt}
              checked={mode === opt}
              onChange={() => setMode(opt)}
              style={{ cursor: 'pointer' }}
            />
            <span>{opt === 'custom' ? 'Custom' : `${opt}%`}</span>
          </label>
        ))}
      </div>
      {mode === 'custom' && (
        <input
          type="number"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Enter %"
          min="0"
          max="100"
          style={{ width: '100px', padding: '0.5rem', fontSize: '16px', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
        />
      )}
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
        💡 Common rates: 1-2% for small businesses, 5% for conservative estimates.
      </p>
    </div>
  );
}
