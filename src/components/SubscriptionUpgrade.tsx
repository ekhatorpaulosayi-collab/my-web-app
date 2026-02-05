/**
 * Subscription Upgrade Component
 *
 * Allows users to upgrade their subscription tier
 * Integrates with Paystack for payments
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Check, X, Loader2, CreditCard } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  paystack_plan_code_monthly: string | null;
  paystack_plan_code_annual: string | null;
  max_products: number;
  max_images_per_product: number;
  max_users: number;
  max_ai_chats_monthly: number;
  features: Record<string, boolean>;
}

interface UserSubscription {
  tier_id: string;
  tier_name: string;
  status: string;
  billing_cycle: string;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function SubscriptionUpgrade({ onClose }: { onClose?: () => void }) {
  const { currentUser } = useAuth();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>('');

  useEffect(() => {
    loadData();
    loadPaystackScript();
  }, [currentUser]);

  const loadPaystackScript = () => {
    // Load Paystack inline script
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  };

  const loadData = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      // Get Paystack public key from environment
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (publicKey) {
        setPaystackPublicKey(publicKey);
      } else {
        console.warn('[SubscriptionUpgrade] VITE_PAYSTACK_PUBLIC_KEY not configured');
      }

      // Fetch subscription tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);

      // Fetch user's current subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          tier_id,
          status,
          billing_cycle,
          subscription_tiers (name)
        `)
        .eq('user_id', currentUser.uid)
        .single();

      if (!subError && subData) {
        setCurrentSubscription({
          tier_id: subData.tier_id,
          tier_name: (subData.subscription_tiers as any)?.name || '',
          status: subData.status,
          billing_cycle: subData.billing_cycle
        });
      }
    } catch (error) {
      console.error('[SubscriptionUpgrade] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!currentUser || !paystackPublicKey) {
      alert('Paystack is not configured. Please contact support.');
      return;
    }

    const planCode = billingCycle === 'monthly'
      ? tier.paystack_plan_code_monthly
      : tier.paystack_plan_code_annual;

    if (!planCode) {
      alert(`${tier.name} ${billingCycle} plan is not configured yet. Please contact support.`);
      return;
    }

    setUpgrading(tier.id);

    try {
      // Initialize Paystack subscription
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: currentUser.email,
        plan: planCode,
        currency: 'NGN',
        metadata: {
          user_id: currentUser.uid,
          tier_id: tier.id,
          tier_name: tier.name,
          billing_cycle: billingCycle
        },
        onSuccess: (response: any) => {
          console.log('[SubscriptionUpgrade] Payment successful:', response);
          alert(`🎉 Welcome to ${tier.name}! Your subscription is now active.`);

          // Refresh subscription data
          loadData();

          if (onClose) {
            onClose();
          }

          // Reload page to apply new tier
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        },
        onClose: () => {
          console.log('[SubscriptionUpgrade] Payment cancelled');
          setUpgrading(null);
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('[SubscriptionUpgrade] Error:', error);
      alert('Failed to initialize payment. Please try again.');
      setUpgrading(null);
    }
  };

  const getPrice = (tier: SubscriptionTier) => {
    return billingCycle === 'monthly' ? tier.price_monthly : tier.price_annual;
  };

  const getMonthlyPrice = (tier: SubscriptionTier) => {
    return billingCycle === 'monthly'
      ? tier.price_monthly
      : Math.round(tier.price_annual / 12);
  };

  const getSavings = (tier: SubscriptionTier) => {
    if (billingCycle === 'annual') {
      const monthlyTotal = tier.price_monthly * 12;
      const savings = monthlyTotal - tier.price_annual;
      return savings;
    }
    return 0;
  };

  const isCurrentTier = (tierId: string) => {
    return currentSubscription?.tier_id === tierId;
  };

  const canUpgrade = (tier: SubscriptionTier) => {
    if (tier.name === 'Free') return false;
    if (!currentSubscription) return true;
    return !isCurrentTier(tier.id);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="subscription-upgrade">
      {/* Header */}
      <div className="upgrade-header">
        <h2>Choose Your Plan</h2>
        <p>Unlock more features and grow your business</p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="billing-toggle">
        <button
          className={billingCycle === 'monthly' ? 'active' : ''}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </button>
        <button
          className={billingCycle === 'annual' ? 'active' : ''}
          onClick={() => setBillingCycle('annual')}
        >
          Annual
          <span className="save-badge">Save 20%</span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="pricing-grid">
        {tiers.map((tier) => {
          const price = getPrice(tier);
          const monthlyPrice = getMonthlyPrice(tier);
          const savings = getSavings(tier);
          const isCurrent = isCurrentTier(tier.id);
          const isUpgradeable = canUpgrade(tier);

          return (
            <div
              key={tier.id}
              className={`pricing-card ${isCurrent ? 'current' : ''} ${tier.name === 'Pro' ? 'popular' : ''}`}
            >
              {tier.name === 'Pro' && <div className="popular-badge">Most Popular</div>}
              {isCurrent && <div className="current-badge">Current Plan</div>}

              <div className="tier-header">
                <h3>{tier.name}</h3>
                <p className="tier-description">{tier.description}</p>
              </div>

              <div className="tier-pricing">
                {tier.name === 'Free' ? (
                  <div className="price">
                    <span className="currency">₦</span>
                    <span className="amount">0</span>
                    <span className="period">/month</span>
                  </div>
                ) : (
                  <>
                    <div className="price">
                      <span className="currency">₦</span>
                      <span className="amount">{monthlyPrice.toLocaleString()}</span>
                      <span className="period">/month</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="billing-info">
                        <p>₦{price.toLocaleString()} billed annually</p>
                        {savings > 0 && (
                          <p className="savings">Save ₦{savings.toLocaleString()}/year</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="tier-features">
                <div className="feature">
                  <Check size={16} className="check-icon" />
                  <span>{tier.max_products === -1 ? 'Unlimited' : tier.max_products} products</span>
                </div>
                <div className="feature">
                  <Check size={16} className="check-icon" />
                  <span>{tier.max_images_per_product} images per product</span>
                </div>
                <div className="feature">
                  <Check size={16} className="check-icon" />
                  <span>{tier.max_users} team {tier.max_users === 1 ? 'member' : 'members'}</span>
                </div>
                <div className="feature">
                  <Check size={16} className="check-icon" />
                  <span>{tier.max_ai_chats_monthly} AI chats/month</span>
                </div>

                {tier.features?.product_variants && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>Product variants</span>
                  </div>
                )}
                {tier.features?.invoicing && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>Invoicing</span>
                  </div>
                )}
                {tier.features?.whatsapp_ai_integration && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>WhatsApp AI</span>
                  </div>
                )}
                {tier.features?.priority_support && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>Priority support</span>
                  </div>
                )}
              </div>

              <button
                className={`upgrade-btn ${isCurrent ? 'current' : ''} ${!isUpgradeable ? 'disabled' : ''}`}
                onClick={() => handleUpgrade(tier)}
                disabled={!isUpgradeable || upgrading === tier.id}
              >
                {upgrading === tier.id ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Processing...
                  </>
                ) : isCurrent ? (
                  'Current Plan'
                ) : tier.name === 'Free' ? (
                  'Free Forever'
                ) : (
                  <>
                    <CreditCard size={16} />
                    Upgrade Now
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Close Button */}
      {onClose && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={onClose} className="close-btn">
            Maybe Later
          </button>
        </div>
      )}

      <style>{`
        .subscription-upgrade {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .upgrade-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .upgrade-header h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .upgrade-header p {
          font-size: 1.125rem;
          color: #6b7280;
        }

        .billing-toggle {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 40px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 12px;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        .billing-toggle button {
          padding: 12px 24px;
          border: none;
          background: transparent;
          color: #6b7280;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .billing-toggle button.active {
          background: white;
          color: #667eea;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .save-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #10b981;
          color: white;
          font-size: 0.625rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .pricing-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 32px 24px;
          position: relative;
          transition: all 0.3s;
        }

        .pricing-card:hover {
          border-color: #667eea;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.15);
          transform: translateY(-4px);
        }

        .pricing-card.popular {
          border-color: #667eea;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }

        .pricing-card.current {
          border-color: #10b981;
        }

        .popular-badge,
        .current-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #667eea;
          color: white;
          padding: 4px 16px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .current-badge {
          background: #10b981;
        }

        .tier-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .tier-header h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .tier-description {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .tier-pricing {
          text-align: center;
          margin-bottom: 32px;
        }

        .price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 8px;
        }

        .currency {
          font-size: 1.25rem;
          color: #6b7280;
        }

        .amount {
          font-size: 3rem;
          font-weight: 700;
          color: #1f2937;
        }

        .period {
          font-size: 1rem;
          color: #6b7280;
        }

        .billing-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .savings {
          color: #10b981;
          font-weight: 600;
          margin-top: 4px;
        }

        .tier-features {
          margin-bottom: 24px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          font-size: 0.9375rem;
          color: #4b5563;
        }

        .check-icon {
          color: #10b981;
          flex-shrink: 0;
        }

        .upgrade-btn {
          width: 100%;
          padding: 14px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .upgrade-btn:hover:not(.disabled):not(.current) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .upgrade-btn.current {
          background: #10b981;
          cursor: default;
        }

        .upgrade-btn.disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .close-btn {
          background: #f3f4f6;
          border: none;
          color: #6b7280;
          padding: 12px 32px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #e5e7eb;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }

          .upgrade-header h2 {
            font-size: 1.5rem;
          }

          .amount {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}
