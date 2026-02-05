/**
 * Affiliate Dashboard
 * View earnings, sales, and manage affiliate account
 *
 * Features:
 * - Real-time earnings stats
 * - Affiliate link sharing
 * - Sales history with statuses
 * - Payout history
 * - Bank account management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  DollarSign,
  Users,
  TrendingUp,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Share2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAffiliateByUserId,
  getAffiliateDashboardStats,
  updateAffiliateBankDetails,
  type Affiliate,
  type AffiliateSale
} from '../services/affiliateService';
import { formatNaira } from '../utils/money';

export default function AffiliateDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [bankDetails, setBankDetails] = useState({
    bankAccountNumber: '',
    bankName: '',
    accountName: '',
  });

  // Load affiliate data
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    async function loadData() {
      try {
        const affiliateData = await getAffiliateByUserId(currentUser.uid);

        if (!affiliateData) {
          // Not an affiliate yet, redirect to signup
          navigate('/affiliate/signup');
          return;
        }

        setAffiliate(affiliateData);
        setBankDetails({
          bankAccountNumber: affiliateData.bankAccountNumber,
          bankName: affiliateData.bankName,
          accountName: affiliateData.accountName,
        });

        // Load dashboard stats
        const statsData = await getAffiliateDashboardStats(affiliateData.id);
        setStats(statsData);
      } catch (error) {
        console.error('[AffiliateDashboard] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUser, navigate]);

  // Copy affiliate link
  const handleCopyLink = async () => {
    if (!affiliate) return;

    const affiliateLink = `${window.location.origin}/signup?ref=${affiliate.affiliateCode}`;

    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy link');
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!affiliate) return;

    const message = `🎉 Join Storehouse and get ₦500 credit!\n\nStorehouse is Nigeria's #1 inventory management app for small businesses.\n\n✅ Track stock\n✅ Record sales\n✅ Manage customers\n✅ Accept payments\n\nSign up with my code: ${affiliate.affiliateCode}\n\n👉 ${window.location.origin}/signup?ref=${affiliate.affiliateCode}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Save bank details
  const handleSaveBankDetails = async () => {
    if (!affiliate) return;

    setSavingBank(true);
    try {
      await updateAffiliateBankDetails(affiliate.id, bankDetails);
      setAffiliate({
        ...affiliate,
        ...bankDetails,
      });
      setEditingBank(false);
      alert('Bank details updated successfully!');
    } catch (error) {
      console.error('[AffiliateDashboard] Error updating bank details:', error);
      alert('Failed to update bank details. Please try again.');
    } finally {
      setSavingBank(false);
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
          <p style={{ color: '#6b7280', margin: 0 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!affiliate || !stats) {
    return null;
  }

  const affiliateLink = `${window.location.origin}/signup?ref=${affiliate.affiliateCode}`;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px',
          paddingTop: '20px'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '16px',
              padding: '8px 0'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            margin: '0 0 8px 0',
            color: '#111827'
          }}>
            Affiliate Dashboard
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
            Track your earnings and manage your affiliate account
          </p>
        </div>

        {/* Affiliate Link Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          color: 'white',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                Your Affiliate Code
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '3px'
              }}>
                {affiliate.affiliateCode}
              </div>
            </div>
            {!affiliate.isActive && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '8px 16px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                ⚠️ Inactive
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            wordBreak: 'break-all',
            fontFamily: 'monospace'
          }}>
            {affiliateLink}
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleCopyLink}
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '8px',
                color: '#667eea',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'}
            >
              <Share2 size={18} />
              Share on WhatsApp
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Total Earnings */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#667eea'
            }}>
              <DollarSign size={22} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Total Earnings</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {formatNaira(affiliate.totalEarningsKobo / 100)}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              From {stats.totalConversions} conversions
            </div>
          </div>

          {/* Pending */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#f59e0b'
            }}>
              <Clock size={22} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Pending</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {formatNaira(affiliate.pendingEarningsKobo / 100)}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {stats.pendingSalesCount} sales confirming
            </div>
          </div>

          {/* Paid Out */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#10b981'
            }}>
              <CheckCircle size={22} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Paid Out</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {formatNaira(affiliate.paidOutKobo / 100)}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {stats.paidSalesCount} payments received
            </div>
          </div>

          {/* Performance */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#8b5cf6'
            }}>
              <TrendingUp size={22} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Performance</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {stats.totalClicks || 0}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {stats.totalSignups || 0} signups · {stats.conversionRate}% conv.
            </div>
          </div>
        </div>

        {/* Payout Status Alert */}
        {!affiliate.payoutsUnlocked && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}>
            <AlertCircle size={24} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
                Payouts Locked
              </div>
              <p style={{ fontSize: '14px', color: '#92400e', margin: '0 0 8px 0', lineHeight: 1.6 }}>
                You need {stats.conversionsNeeded} more paid {stats.conversionsNeeded === 1 ? 'conversion' : 'conversions'} to unlock weekly payouts.
              </p>
              <p style={{ fontSize: '13px', color: '#b45309', margin: 0 }}>
                Share your affiliate link to start earning! Your commissions are tracked and will be paid once unlocked.
              </p>
            </div>
          </div>
        )}

        {affiliate.payoutsUnlocked && affiliate.pendingEarningsKobo >= 500000 && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}>
            <CheckCircle size={24} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                Ready for Payout!
              </div>
              <p style={{ fontSize: '14px', color: '#065f46', margin: 0, lineHeight: 1.6 }}>
                You have {formatNaira((affiliate.pendingEarningsKobo - affiliate.pendingEarningsKobo % 100) / 100)} ready to be paid.
                Payouts are processed every Monday.
              </p>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {/* Recent Sales */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              margin: '0 0 20px 0',
              color: '#111827'
            }}>
              Recent Sales
            </h2>

            {stats.recentSales.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#9ca3af'
              }}>
                <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No sales yet. Start sharing your link!
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {stats.recentSales.map((sale: AffiliateSale) => (
                  <div
                    key={sale.id}
                    style={{
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#111827',
                          marginBottom: '4px'
                        }}>
                          {sale.customerName || sale.customerEmail || 'Anonymous'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {sale.planName} · {new Date(sale.saleDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#10b981'
                        }}>
                          {formatNaira(sale.commissionAmountKobo / 100)}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          marginTop: '4px',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          display: 'inline-block',
                          ...(sale.status === 'confirmed' && {
                            background: '#d1fae5',
                            color: '#065f46'
                          }),
                          ...(sale.status === 'pending' && {
                            background: '#fef3c7',
                            color: '#92400e'
                          }),
                          ...(sale.status === 'paid' && {
                            background: '#dbeafe',
                            color: '#1e40af'
                          })
                        }}>
                          {sale.status === 'confirmed' && '✓ Confirmed'}
                          {sale.status === 'pending' && '⏳ Pending'}
                          {sale.status === 'paid' && '💰 Paid'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                margin: 0,
                color: '#111827'
              }}>
                Payout Details
              </h2>
              {!editingBank && (
                <button
                  onClick={() => setEditingBank(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <Edit size={16} />
                  Edit
                </button>
              )}
            </div>

            {!editingBank ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>
                    Bank Name
                  </div>
                  <div style={{ fontSize: '15px', color: '#111827', fontWeight: 500 }}>
                    {affiliate.bankName}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>
                    Account Number
                  </div>
                  <div style={{ fontSize: '15px', color: '#111827', fontWeight: 500 }}>
                    {affiliate.bankAccountNumber}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}>
                    Account Name
                  </div>
                  <div style={{ fontSize: '15px', color: '#111827', fontWeight: 500 }}>
                    {affiliate.accountName}
                  </div>
                </div>

                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#6b7280',
                  lineHeight: 1.6
                }}>
                  💰 Payouts are processed every Monday to this account.
                  Minimum payout amount is ₦5,000.
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Bank Name
                    </label>
                    <select
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="Access Bank">Access Bank</option>
                      <option value="GTBank">GTBank</option>
                      <option value="First Bank">First Bank</option>
                      <option value="UBA">UBA</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Kuda Bank">Kuda Bank</option>
                      <option value="Opay">Opay</option>
                      <option value="PalmPay">PalmPay</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.bankAccountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setBankDetails({ ...bankDetails, bankAccountNumber: value });
                      }}
                      maxLength={10}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveBankDetails}
                    disabled={savingBank}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: savingBank ? 'not-allowed' : 'pointer',
                      opacity: savingBank ? 0.6 : 1
                    }}
                  >
                    {savingBank ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingBank(false);
                      setBankDetails({
                        bankAccountNumber: affiliate.bankAccountNumber,
                        bankName: affiliate.bankName,
                        accountName: affiliate.accountName,
                      });
                    }}
                    disabled={savingBank}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: savingBank ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
