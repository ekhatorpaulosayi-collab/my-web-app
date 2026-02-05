/**
 * Affiliate Admin Panel
 * Manage affiliates, approve payouts, view performance
 *
 * Features:
 * - View all affiliates with stats
 * - See pending/confirmed sales
 * - Approve weekly payouts
 * - Manual payout processing (Phase 1)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatNaira } from '../utils/money';

interface AffiliateStats {
  id: string;
  affiliateCode: string;
  accountName: string;
  bankName: string;
  bankAccountNumber: string;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalEarningsKobo: number;
  pendingEarningsKobo: number;
  paidOutKobo: number;
  payoutsUnlocked: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PendingSale {
  id: string;
  affiliateCode: string;
  affiliateName: string;
  customerEmail: string;
  planName: string;
  commissionAmountKobo: number;
  saleDate: string;
  daysUntilConfirmation: number;
}

export default function AffiliateAdmin() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateStats[]>([]);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'affiliates' | 'sales' | 'payouts'>('overview');

  // Load data
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all affiliates with stats
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates')
        .select('*')
        .order('total_earnings_kobo', { ascending: false });

      if (affiliatesError) throw affiliatesError;

      setAffiliates((affiliatesData || []).map(mapAffiliateFromDb));

      // Load pending sales
      const { data: salesData, error: salesError } = await supabase
        .from('affiliate_sales')
        .select(`
          id,
          commission_amount_kobo,
          sale_date,
          customer_email,
          plan_name,
          affiliates!inner(affiliate_code, account_name)
        `)
        .eq('status', 'pending')
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      const formattedSales = (salesData || []).map((sale: any) => {
        const saleDate = new Date(sale.sale_date);
        const confirmationDate = new Date(saleDate);
        confirmationDate.setDate(confirmationDate.getDate() + 7);
        const now = new Date();
        const daysLeft = Math.ceil((confirmationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: sale.id,
          affiliateCode: sale.affiliates.affiliate_code,
          affiliateName: sale.affiliates.account_name,
          customerEmail: sale.customer_email,
          planName: sale.plan_name,
          commissionAmountKobo: sale.commission_amount_kobo,
          saleDate: sale.sale_date,
          daysUntilConfirmation: Math.max(0, daysLeft)
        };
      });

      setPendingSales(formattedSales);

    } catch (error) {
      console.error('[AffiliateAdmin] Error loading data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mapAffiliateFromDb = (data: any): AffiliateStats => ({
    id: data.id,
    affiliateCode: data.affiliate_code,
    accountName: data.account_name,
    bankName: data.bank_name,
    bankAccountNumber: data.bank_account_number,
    totalClicks: data.total_clicks || 0,
    totalSignups: data.total_signups || 0,
    totalConversions: data.total_conversions || 0,
    totalEarningsKobo: data.total_earnings_kobo || 0,
    pendingEarningsKobo: data.pending_earnings_kobo || 0,
    paidOutKobo: data.paid_out_kobo || 0,
    payoutsUnlocked: data.payouts_unlocked || false,
    isActive: data.is_active !== false,
    createdAt: data.created_at
  });

  // Calculate totals
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.isActive).length;
  const totalPendingKobo = affiliates.reduce((sum, a) => sum + a.pendingEarningsKobo, 0);
  const totalPaidKobo = affiliates.reduce((sum, a) => sum + a.paidOutKobo, 0);
  const affiliatesReadyForPayout = affiliates.filter(
    a => a.payoutsUnlocked && a.pendingEarningsKobo >= 500000
  ).length;

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
          <p style={{ color: '#6b7280', margin: 0 }}>Loading admin panel...</p>
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
        maxWidth: '1400px',
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: '#111827'
              }}>
                Affiliate Admin Panel
              </h1>
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                Manage affiliates and process payouts
              </p>
            </div>
            <button
              onClick={loadData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
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
              <Users size={22} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Total Affiliates</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {totalAffiliates}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {activeAffiliates} active
            </div>
          </div>

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
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Pending Payouts</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {formatNaira(totalPendingKobo / 100)}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {affiliatesReadyForPayout} ready for payout
            </div>
          </div>

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
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Total Paid Out</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {formatNaira(totalPaidKobo / 100)}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              All time
            </div>
          </div>

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
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Pending Sales</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {pendingSales.length}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Awaiting confirmation
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            overflowX: 'auto'
          }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'affiliates', label: 'All Affiliates' },
              { id: 'sales', label: 'Pending Sales' },
              { id: 'payouts', label: 'Payouts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                style={{
                  padding: '16px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: selectedTab === tab.id ? '2px solid #667eea' : '2px solid transparent',
                  color: selectedTab === tab.id ? '#667eea' : '#6b7280',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px' }}>
            {/* Overview Tab */}
            {selectedTab === 'overview' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>
                  Ready for Payout (₦5,000+ minimum)
                </h3>
                {affiliatesReadyForPayout === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
                    No affiliates ready for payout yet
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {affiliates
                      .filter(a => a.payoutsUnlocked && a.pendingEarningsKobo >= 500000)
                      .map((affiliate) => (
                        <div
                          key={affiliate.id}
                          style={{
                            padding: '20px',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '16px'
                          }}
                        >
                          <div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#111827',
                              marginBottom: '4px'
                            }}>
                              {affiliate.accountName}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {affiliate.affiliateCode} • {affiliate.bankName} {affiliate.bankAccountNumber}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '24px',
                              fontWeight: 700,
                              color: '#10b981',
                              marginBottom: '4px'
                            }}>
                              {formatNaira(affiliate.pendingEarningsKobo / 100)}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {affiliate.totalConversions} conversions
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Affiliates Tab */}
            {selectedTab === 'affiliates' && (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                          Code
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                          Name
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                          Clicks
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                          Conversions
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                          Earnings
                        </th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliates.map((affiliate) => (
                        <tr key={affiliate.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#667eea' }}>
                            {affiliate.affiliateCode}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#111827' }}>
                            {affiliate.accountName}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
                            {affiliate.totalClicks}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
                            {affiliate.totalConversions}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                            {formatNaira(affiliate.totalEarningsKobo / 100)}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              ...(affiliate.payoutsUnlocked ? {
                                background: '#d1fae5',
                                color: '#065f46'
                              } : {
                                background: '#fef3c7',
                                color: '#92400e'
                              })
                            }}>
                              {affiliate.payoutsUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sales Tab */}
            {selectedTab === 'sales' && (
              <div>
                {pendingSales.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
                    No pending sales
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                            Affiliate
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                            Customer
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                            Plan
                          </th>
                          <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                            Commission
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
                            Days Left
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSales.map((sale) => (
                          <tr key={sale.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '16px', fontSize: '14px' }}>
                              <div style={{ fontWeight: 600, color: '#667eea' }}>{sale.affiliateCode}</div>
                              <div style={{ fontSize: '13px', color: '#6b7280' }}>{sale.affiliateName}</div>
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#111827' }}>
                              {sale.customerEmail}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                              {sale.planName}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#10b981', textAlign: 'right' }}>
                              {formatNaira(sale.commissionAmountKobo / 100)}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: sale.daysUntilConfirmation <= 2 ? '#d1fae5' : '#fef3c7',
                                color: sale.daysUntilConfirmation <= 2 ? '#065f46' : '#92400e'
                              }}>
                                {sale.daysUntilConfirmation} days
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Payouts Tab */}
            {selectedTab === 'payouts' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#6b7280', opacity: 0.5 }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#111827' }}>
                  Manual Payout Processing
                </h3>
                <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
                  Payout history and Paystack integration will be added in Phase 2
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  For now, manually transfer funds to affiliates listed in the Overview tab
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
