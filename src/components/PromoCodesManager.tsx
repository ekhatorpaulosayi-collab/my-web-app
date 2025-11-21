/**
 * Promo Codes Manager
 * Allows merchants to create and manage discount codes for viral marketing
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Copy, TrendingUp } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface PromoCodesManagerProps {
  userId: string;
}

export function PromoCodesManager({ userId }: PromoCodesManagerProps) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPromoCodes();
  }, [userId]);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !discountValue) {
      alert('Please enter code and discount value');
      return;
    }

    const value = parseInt(discountValue);
    if (isNaN(value) || value <= 0) {
      alert('Please enter a valid discount value');
      return;
    }

    if (discountType === 'percentage' && value > 100) {
      alert('Percentage discount cannot exceed 100%');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('promo_codes').insert([
        {
          user_id: userId,
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: value,
          max_uses: maxUses ? parseInt(maxUses) : null,
          expires_at: expiresAt || null,
          is_active: true,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          alert('This code already exists. Please use a different code.');
        } else {
          throw error;
        }
        return;
      }

      // Reset form
      setCode('');
      setDiscountValue('');
      setMaxUses('');
      setExpiresAt('');
      setShowAddForm(false);

      // Reload codes
      await loadPromoCodes();
      alert('✅ Promo code created successfully!');
    } catch (error) {
      console.error('Error creating promo code:', error);
      alert('Failed to create promo code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return;

    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);

      if (error) throw error;

      await loadPromoCodes();
      alert('✅ Promo code deleted');
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Failed to delete promo code');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      await loadPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
      alert('Failed to update promo code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`✅ Copied: ${code}`);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxedOut = (maxUses: number | null, usedCount: number) => {
    if (maxUses === null) return false;
    return usedCount >= maxUses;
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading promo codes...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>
          💥 Promo Codes
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Create discount codes to boost sales and encourage sharing
        </p>
      </div>

      {/* Add Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <Plus size={18} />
          Create Promo Code
        </button>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCode}
          style={{
            background: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>
            Create New Promo Code
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Code */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="FLASH50"
                maxLength={20}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                }}
              />
            </div>

            {/* Discount Type */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Type *
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₦)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                {discountType === 'percentage' ? 'Percentage' : 'Amount'} *
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '20' : '5000'}
                min="1"
                max={discountType === 'percentage' ? '100' : undefined}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Max Uses */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Max Uses (optional)
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min="1"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Expires On (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Creating...' : 'Create Code'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Promo Codes List */}
      {promoCodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          <TrendingUp size={48} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500 }}>No promo codes yet</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Create your first promo code to boost sales!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {promoCodes.map((promo) => {
            const expired = isExpired(promo.expires_at);
            const maxed = isMaxedOut(promo.max_uses, promo.used_count);
            const inactive = !promo.is_active || expired || maxed;

            return (
              <div
                key={promo.id}
                style={{
                  background: 'white',
                  border: `2px solid ${inactive ? '#e5e7eb' : '#3b82f6'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  opacity: inactive ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <code
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: inactive ? '#9ca3af' : '#1f2937',
                          fontFamily: 'monospace',
                        }}
                      >
                        {promo.code}
                      </code>
                      <button
                        onClick={() => copyCode(promo.code)}
                        style={{
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Copy code"
                      >
                        <Copy size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#6b7280' }}>
                      <span>
                        <strong>
                          {promo.discount_type === 'percentage'
                            ? `${promo.discount_value}% OFF`
                            : `₦${(promo.discount_value / 100).toLocaleString()} OFF`}
                        </strong>
                      </span>
                      <span>Used: {promo.used_count}{promo.max_uses ? ` / ${promo.max_uses}` : ''}</span>
                      {promo.expires_at && (
                        <span>Expires: {new Date(promo.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>

                    {(expired || maxed) && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                        {expired ? '⏰ EXPIRED' : '🚫 MAX USES REACHED'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={promo.is_active}
                        onChange={() => handleToggleActive(promo.id, promo.is_active)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        disabled={expired || maxed}
                      />
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>Active</span>
                    </label>

                    <button
                      onClick={() => handleDelete(promo.id, promo.code)}
                      style={{
                        padding: '6px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete code"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
