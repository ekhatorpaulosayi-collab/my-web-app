/**
 * Affiliate Signup Page
 * Simple form to register as a Storehouse affiliate partner
 *
 * Features:
 * - Bank account details collection
 * - Auto-generate unique affiliate code
 * - 30% commission program explanation
 * - Clear terms and requirements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createAffiliate, getAffiliateByUserId } from '../services/affiliateService';

export default function AffiliateSignup() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAffiliate, setExistingAffiliate] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: currentUser?.email || '',
    phone: '',
    bankAccountNumber: '',
    bankName: '',
    accountName: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Check if user already has affiliate account
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    async function checkExisting() {
      try {
        const affiliate = await getAffiliateByUserId(currentUser.uid);
        if (affiliate) {
          setExistingAffiliate(true);
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/affiliate/dashboard');
          }, 2000);
        }
      } catch (err) {
        console.error('[AffiliateSignup] Error checking existing affiliate:', err);
      } finally {
        setLoading(false);
      }
    }

    checkExisting();
  }, [currentUser, navigate]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^0[789][01]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid Nigerian phone number (e.g., 08012345678)';
    }

    if (!formData.bankAccountNumber.trim()) {
      errors.bankAccountNumber = 'Bank account number is required';
    } else if (!/^\d{10}$/.test(formData.bankAccountNumber)) {
      errors.bankAccountNumber = 'Account number must be 10 digits';
    }

    if (!formData.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }

    if (!formData.accountName.trim()) {
      errors.accountName = 'Account name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to create an affiliate account');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const affiliateCode = await createAffiliate(currentUser.uid, {
        name: formData.name,
        email: formData.email,
        bankAccountNumber: formData.bankAccountNumber,
        bankName: formData.bankName,
        accountName: formData.accountName,
      });

      console.log('[AffiliateSignup] ✅ Affiliate created:', affiliateCode);

      // Redirect to dashboard
      navigate('/affiliate/dashboard');
    } catch (err: any) {
      console.error('[AffiliateSignup] Error creating affiliate:', err);
      setError(err.message || 'Failed to create affiliate account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Already an affiliate
  if (existingAffiliate) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <CheckCircle size={32} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', color: '#111827' }}>
            You're Already an Affiliate!
          </h2>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 24px 0' }}>
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingTop: '40px'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Become a Storehouse Affiliate
          </h1>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>
            Earn 30% commission by referring businesses to Storehouse
          </p>
        </div>

        {/* Benefits Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <DollarSign size={28} color="white" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#111827' }}>
              30% Commission
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Earn 30% on every paid subscription from your referrals
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Users size={28} color="white" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#111827' }}>
              Low Barrier
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Just 2 paid conversions to unlock weekly payouts
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <TrendingUp size={28} color="white" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#111827' }}>
              Weekly Payouts
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Get paid every Monday after 7-day confirmation period
            </p>
          </div>
        </div>

        {/* Signup Form */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '40px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 24px 0', color: '#111827' }}>
            Create Your Affiliate Account
          </h2>

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={20} color="#dc2626" />
              <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#374151' }}>
                Personal Information
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Full Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${formErrors.name ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => !formErrors.name && (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) => !formErrors.name && (e.target.style.borderColor = '#d1d5db')}
                  />
                  {formErrors.name && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${formErrors.email ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => !formErrors.email && (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) => !formErrors.email && (e.target.style.borderColor = '#d1d5db')}
                  />
                  {formErrors.email && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08012345678"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${formErrors.phone ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => !formErrors.phone && (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) => !formErrors.phone && (e.target.style.borderColor = '#d1d5db')}
                  />
                  {formErrors.phone && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0', color: '#374151' }}>
                Bank Details for Payouts
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0' }}>
                Your commissions will be paid directly to this bank account every Monday
              </p>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Bank Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Bank Name *
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${formErrors.bankName ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s',
                      background: 'white'
                    }}
                    onFocus={(e) => !formErrors.bankName && (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) => !formErrors.bankName && (e.target.style.borderColor = '#d1d5db')}
                  >
                    <option value="">Select your bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="Citibank">Citibank</option>
                    <option value="Ecobank">Ecobank</option>
                    <option value="Fidelity Bank">Fidelity Bank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="First City Monument Bank">First City Monument Bank (FCMB)</option>
                    <option value="Globus Bank">Globus Bank</option>
                    <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTBank)</option>
                    <option value="Heritage Bank">Heritage Bank</option>
                    <option value="Keystone Bank">Keystone Bank</option>
                    <option value="Kuda Bank">Kuda Bank</option>
                    <option value="Opay">Opay</option>
                    <option value="PalmPay">PalmPay</option>
                    <option value="Polaris Bank">Polaris Bank</option>
                    <option value="Providus Bank">Providus Bank</option>
                    <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                    <option value="Standard Chartered">Standard Chartered</option>
                    <option value="Sterling Bank">Sterling Bank</option>
                    <option value="Union Bank">Union Bank</option>
                    <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                    <option value="Unity Bank">Unity Bank</option>
                    <option value="Wema Bank">Wema Bank</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                  </select>
                  {formErrors.bankName && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                      {formErrors.bankName}
                    </p>
                  )}
                </div>

                {/* Account Number */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, bankAccountNumber: value });
                    }}
                    placeholder="0123456789"
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${formErrors.bankAccountNumber ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => !formErrors.bankAccountNumber && (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) => !formErrors.bankAccountNumber && (e.target.style.borderColor = '#d1d5db')}
                  />
                  {formErrors.bankAccountNumber && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                      {formErrors.bankAccountNumber}
                    </p>
                  )}
                </div>

                {/* Account Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${formErrors.accountName ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => !formErrors.accountName && (e.target.style.borderColor = '#667eea')}
                    onBlur={(e) => !formErrors.accountName && (e.target.style.borderColor = '#d1d5db')}
                  />
                  {formErrors.accountName && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                      {formErrors.accountName}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    Must match exactly as registered with your bank
                  </p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 8px 0', lineHeight: 1.6 }}>
                By creating an affiliate account, you agree to:
              </p>
              <ul style={{ fontSize: '13px', color: '#6b7280', margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
                <li>Promote Storehouse honestly and ethically</li>
                <li>30% commission on all referred paid subscriptions</li>
                <li>Minimum 2 conversions required to unlock payouts</li>
                <li>7-day confirmation period before payout eligibility</li>
                <li>Weekly payouts every Monday (minimum ₦5,000)</li>
                <li>Commissions may be cancelled if subscription is refunded within 7 days</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: submitting ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {submitting ? 'Creating Your Account...' : 'Create Affiliate Account'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingBottom: '40px'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Questions? Email us at{' '}
            <a href="mailto:support@storehouse.ng" style={{ color: '#667eea', textDecoration: 'none' }}>
              support@storehouse.ng
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
