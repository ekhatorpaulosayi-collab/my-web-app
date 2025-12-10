/**
 * Payment Methods Manager
 * Allows businesses to add multiple payment methods (OPay, Moniepoint, PalmPay, Kuda, Bank, etc.)
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Copy, Check, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Payment method types
export interface PaymentMethod {
  id: string;
  type: 'opay' | 'moniepoint' | 'palmpay' | 'kuda' | 'bank' | 'other';
  enabled: boolean;
  account_number: string;
  account_name: string;
  bank_name?: string;
  qr_code_url?: string;
  instructions?: string;
  label?: string; // For "other" type
}

// Payment provider configurations
const PAYMENT_PROVIDERS = [
  {
    type: 'opay',
    name: 'OPay',
    icon: '🟢',
    color: '#00C087',
    requiresBankName: false,
    placeholder: '70XXXXXXXX',
    description: 'OPay wallet/bank account'
  },
  {
    type: 'moniepoint',
    name: 'Moniepoint',
    icon: '🔵',
    color: '#0066FF',
    requiresBankName: false,
    placeholder: '60XXXXXXXX',
    description: 'Moniepoint (formerly TeamApt)'
  },
  {
    type: 'palmpay',
    name: 'PalmPay',
    icon: '🟣',
    color: '#8B5CF6',
    requiresBankName: false,
    placeholder: '80XXXXXXXX',
    description: 'PalmPay wallet/account'
  },
  {
    type: 'kuda',
    name: 'Kuda Bank',
    icon: '🟣',
    color: '#8B5CF6',
    requiresBankName: false,
    placeholder: '20XXXXXXXX',
    description: 'Kuda digital bank account'
  },
  {
    type: 'bank',
    name: 'Bank Account',
    icon: '🏦',
    color: '#3B82F6',
    requiresBankName: true,
    placeholder: '0XXXXXXXXX',
    description: 'Traditional bank account'
  },
  {
    type: 'other',
    name: 'Other',
    icon: '💳',
    color: '#6B7280',
    requiresBankName: false,
    placeholder: 'Account number',
    description: 'Any other payment method'
  }
] as const;

interface PaymentMethodsManagerProps {
  onToast?: (message: string) => void;
}

export default function PaymentMethodsManager({ onToast }: PaymentMethodsManagerProps) {
  const { currentUser } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load payment methods from database
  useEffect(() => {
    loadPaymentMethods();
  }, [currentUser]);

  const loadPaymentMethods = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('payment_methods')
        .eq('user_id', currentUser.id)
        .single();

      if (error) throw error;

      setPaymentMethods(data?.payment_methods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      onToast?.('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const savePaymentMethods = async (methods: PaymentMethod[]) => {
    if (!currentUser) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ payment_methods: methods })
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setPaymentMethods(methods);
      onToast?.('✓ Payment methods saved');
      return true;
    } catch (error) {
      console.error('Error saving payment methods:', error);
      onToast?.('Failed to save payment methods');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addPaymentMethod = (method: Omit<PaymentMethod, 'id'>) => {
    const newMethod: PaymentMethod = {
      ...method,
      id: `${method.type}_${Date.now()}`
    };
    const updated = [...paymentMethods, newMethod];
    savePaymentMethods(updated);
    setShowAddModal(false);
  };

  const toggleMethod = async (id: string) => {
    const updated = paymentMethods.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    await savePaymentMethods(updated);
  };

  const deleteMethod = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      const updated = paymentMethods.filter(m => m.id !== id);
      await savePaymentMethods(updated);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading payment methods...</div>;
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CreditCard size={24} />
            Payment Methods
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#64748b',
            margin: 0
          }}>
            Add multiple payment options for your customers (OPay, Moniepoint, Bank, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          <Plus size={18} />
          Add Payment Method
        </button>
      </div>

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #e5e7eb'
        }}>
          <CreditCard size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
            No Payment Methods Yet
          </h4>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Add OPay, Moniepoint, Bank or other payment methods for customers to pay you
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            Add Your First Payment Method
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {paymentMethods.map(method => {
            const provider = PAYMENT_PROVIDERS.find(p => p.type === method.type);
            return (
              <div
                key={method.id}
                style={{
                  padding: '1.5rem',
                  background: 'white',
                  border: method.enabled ? `2px solid ${provider?.color || '#e5e7eb'}` : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  opacity: method.enabled ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{provider?.icon}</span>
                      <div>
                        <h4 style={{
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          marginBottom: '0.25rem'
                        }}>
                          {method.label || provider?.name || method.type}
                        </h4>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: method.enabled ? '#dcfce7' : '#f3f4f6',
                          color: method.enabled ? '#166534' : '#6b7280'
                        }}>
                          {method.enabled ? '✓ Active' : '⊗ Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div style={{
                      display: 'grid',
                      gap: '0.75rem',
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      {method.bank_name && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            Bank Name
                          </div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1f2937' }}>
                            {method.bank_name}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Account Number
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            letterSpacing: '1px',
                            color: '#1f2937'
                          }}>
                            {method.account_number}
                          </span>
                          <button
                            onClick={() => copyToClipboard(method.account_number, method.id)}
                            style={{
                              padding: '6px',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                            title="Copy account number"
                          >
                            {copiedId === method.id ? (
                              <Check size={14} color="#10b981" />
                            ) : (
                              <Copy size={14} color="#6b7280" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Account Name
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1f2937' }}>
                          {method.account_name}
                        </div>
                      </div>
                      {method.instructions && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            Instructions
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {method.instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1rem' }}>
                    <button
                      onClick={() => toggleMethod(method.id)}
                      style={{
                        padding: '0.5rem',
                        background: method.enabled ? '#dcfce7' : '#f3f4f6',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={method.enabled ? 'Disable' : 'Enable'}
                    >
                      {method.enabled ? <Eye size={18} color="#166534" /> : <EyeOff size={18} color="#6b7280" />}
                    </button>
                    <button
                      onClick={() => deleteMethod(method.id)}
                      style={{
                        padding: '0.5rem',
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={18} color="#dc2626" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <AddPaymentMethodModal
          onAdd={addPaymentMethod}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// Add Payment Method Modal
interface AddPaymentMethodModalProps {
  onAdd: (method: Omit<PaymentMethod, 'id'>) => void;
  onClose: () => void;
}

function AddPaymentMethodModal({ onAdd, onClose }: AddPaymentMethodModalProps) {
  const [selectedType, setSelectedType] = useState<PaymentMethod['type']>('opay');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [label, setLabel] = useState('');

  const selectedProvider = PAYMENT_PROVIDERS.find(p => p.type === selectedType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountNumber || !accountName) {
      alert('Please fill in account number and account name');
      return;
    }

    if (selectedProvider?.requiresBankName && !bankName) {
      alert('Please enter bank name');
      return;
    }

    onAdd({
      type: selectedType,
      enabled: true,
      account_number: accountNumber.trim(),
      account_name: accountName.trim(),
      bank_name: bankName.trim() || undefined,
      instructions: instructions.trim() || undefined,
      label: selectedType === 'other' && label ? label.trim() : undefined
    });

    // Reset form
    setAccountNumber('');
    setAccountName('');
    setBankName('');
    setInstructions('');
    setLabel('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0
            }}>
              Add Payment Method
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#64748b',
              margin: '0.5rem 0 0'
            }}>
              Add OPay, Moniepoint, Bank or any payment account
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: '1.5rem' }}>
            {/* Payment Type Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.75rem'
              }}>
                Payment Type
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem'
              }}>
                {PAYMENT_PROVIDERS.map(provider => (
                  <button
                    key={provider.type}
                    type="button"
                    onClick={() => setSelectedType(provider.type)}
                    style={{
                      padding: '1rem',
                      background: selectedType === provider.type ? provider.color : 'white',
                      color: selectedType === provider.type ? 'white' : '#1f2937',
                      border: `2px solid ${selectedType === provider.type ? provider.color : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{provider.icon}</span>
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Label for "Other" type */}
            {selectedType === 'other' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Payment Method Name
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Chipper Cash, Payoneer"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}

            {/* Bank Name (for bank type) */}
            {selectedProvider?.requiresBankName && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., GTBank, Access Bank"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}

            {/* Account Number */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={selectedProvider?.placeholder}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
              />
            </div>

            {/* Account Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="As shown on your account"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Payment Instructions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Payment Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., After payment, send screenshot to WhatsApp"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Add Payment Method
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
