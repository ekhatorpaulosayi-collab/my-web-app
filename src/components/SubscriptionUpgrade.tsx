/**
 * Subscription Upgrade Component
 *
 * Allows users to upgrade their subscription tier
 * Integrates with Paystack for payments
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Check, X, Loader2, CreditCard, XCircle } from 'lucide-react';

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
  // Feature flags from database
  has_product_variants?: boolean;
  has_invoicing?: boolean;
  has_whatsapp_ai?: boolean;
  has_priority_support?: boolean;
  // Legacy support for features object
  features?: Record<string, boolean>;
}

interface UserSubscription {
  tier_id: string;
  tier_name: string;
  status: string;
  billing_cycle: string;
  payment_reference: string | null;
  payment_provider: string | null;
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
  const [cancelling, setCancelling] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>('');

  useEffect(() => {
    loadData();
    loadPaystackScript();
  }, [currentUser]);

  const loadPaystackScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script already loaded and PaystackPop is available
      if (window.PaystackPop) {
        resolve();
        return;
      }

      // Check if script tag exists
      const existingScript = document.getElementById('paystack-script');
      if (existingScript) {
        // Script exists but PaystackPop not ready yet, wait for it
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Paystack script')));
        return;
      }

      // Create new script
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;

      script.onload = () => {
        console.log('[SubscriptionUpgrade] Paystack script loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('[SubscriptionUpgrade] Failed to load Paystack script');
        reject(new Error('Failed to load Paystack script'));
      };

      document.body.appendChild(script);
    });
  };

  const loadData = async () => {
    if (!currentUser) return;

    console.log('[SubscriptionUpgrade] Starting to load data...');
    setLoading(true);

    try {
      // Get Paystack public key from environment
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      console.log('[SubscriptionUpgrade] Environment check:', {
        hasPublicKey: !!publicKey,
        keyLength: publicKey ? publicKey.length : 0,
        keyPrefix: publicKey ? publicKey.substring(0, 7) : 'none'
      });
      if (publicKey) {
        setPaystackPublicKey(publicKey);
      } else {
        console.warn('[SubscriptionUpgrade] VITE_PAYSTACK_PUBLIC_KEY not configured');
      }

      // Fetch subscription tiers
      console.log('[SubscriptionUpgrade] Fetching subscription tiers...');
      const { data: tiersData, error: tiersError } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (tiersError) {
        console.error('[SubscriptionUpgrade] Error fetching tiers:', tiersError);
        throw tiersError;
      }
      console.log('[SubscriptionUpgrade] Tiers loaded:', tiersData);
      setTiers(tiersData || []);

      // Fetch user's current subscription
      console.log('[SubscriptionUpgrade] Fetching user subscription for:', currentUser.uid);
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          tier_id,
          status,
          billing_cycle,
          payment_reference,
          payment_provider,
          subscription_tiers (name)
        `)
        .eq('user_id', currentUser.uid)
        .single();

      if (subError) {
        // Log the error but don't block - user might not have subscription yet
        console.warn('[SubscriptionUpgrade] Could not load current subscription:', subError);
        console.warn('[SubscriptionUpgrade] Error code:', subError.code);
        console.warn('[SubscriptionUpgrade] Error message:', subError.message);
        console.warn('[SubscriptionUpgrade] User may not have a subscription record yet');
        setCurrentSubscription(null);
      } else if (subData) {
        // Only set current subscription if it's active
        if (subData.status === 'active') {
          setCurrentSubscription({
            tier_id: subData.tier_id,
            tier_name: (subData.subscription_tiers as any)?.name || '',
            status: subData.status,
            billing_cycle: subData.billing_cycle,
            payment_reference: subData.payment_reference,
            payment_provider: subData.payment_provider
          });
          console.log('[SubscriptionUpgrade] Active subscription loaded:', subData);
        } else {
          // Subscription exists but is not active (cancelled, expired, etc.)
          console.log('[SubscriptionUpgrade] Found subscription with status:', subData.status);
          setCurrentSubscription(null);
        }
      } else {
        // No subscription data
        setCurrentSubscription(null);
      }
    } catch (error) {
      console.error('[SubscriptionUpgrade] Error loading data:', error);
      if (error instanceof Error) {
        console.error('[SubscriptionUpgrade] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      // Try to show a user-friendly message
      alert('Failed to load subscription plans. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) {
      alert('No active subscription to cancel');
      return;
    }

    if (!confirm(`Are you sure you want to cancel your ${currentSubscription.tier_name} subscription? You will lose access to premium features.`)) {
      return;
    }

    setCancelling(true);

    try {
      console.log('[SubscriptionUpgrade] Cancelling subscription...');
      console.log('[SubscriptionUpgrade] Provider:', currentSubscription.payment_provider);
      console.log('[SubscriptionUpgrade] Reference:', currentSubscription.payment_reference);

      // Check if this is a Paystack subscription
      if (currentSubscription.payment_provider === 'paystack' && currentSubscription.payment_reference) {
        // Paystack subscription - try to cancel via API, but if it fails (already cancelled), just update database
        console.log('[SubscriptionUpgrade] Cancelling Paystack subscription via API');

        try {
          // Get auth session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Not authenticated');
          }

          // Call Edge Function to cancel subscription
          const response = await fetch(
            `${supabase.supabaseUrl}/functions/v1/manage-subscription`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'cancel',
                subscriptionCode: currentSubscription.payment_reference
              })
            }
          );

          const result = await response.json();

          if (result.success) {
            console.log('[SubscriptionUpgrade] Paystack subscription cancelled:', result);
          } else {
            console.log('[SubscriptionUpgrade] Paystack cancel failed (might be already cancelled):', result.error);
          }
        } catch (paystackError) {
          console.log('[SubscriptionUpgrade] Paystack API error (might be already cancelled):', paystackError);
        }
      }

      // Always update database regardless of Paystack result
      console.log('[SubscriptionUpgrade] Updating database to mark as cancelled');

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser!.uid);

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      console.log('[SubscriptionUpgrade] Subscription marked as cancelled in database');

      // Immediately clear current subscription state
      setCurrentSubscription(null);

      alert('✅ Subscription cancelled successfully. You can now subscribe to a different plan.');

      // Reload subscription data to get updated status
      await loadData();
    } catch (error) {
      console.error('[SubscriptionUpgrade] Cancel error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to cancel subscription: ${errorMessage}`);
    } finally {
      setCancelling(false);
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
      // Get session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      const accessToken = session.access_token;
      // Check if user has a cancelled subscription - need to create fresh
      if (currentSubscription && currentSubscription.status === 'cancelled') {
        console.log('[SubscriptionUpgrade] User has cancelled subscription, creating fresh subscription');

        // Delete the old cancelled subscription record so we can create a new one
        const { error: deleteError } = await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', currentUser.uid);

        if (deleteError) {
          console.error('[SubscriptionUpgrade] Failed to delete old subscription:', deleteError);
        } else {
          console.log('[SubscriptionUpgrade] Deleted old cancelled subscription');
          // Clear local state
          setCurrentSubscription(null);
        }
      }

      // Check if user already has an active subscription (excluding Free tier)
      if (currentSubscription && currentSubscription.status === 'active') {
        console.log('[SubscriptionUpgrade] User has active subscription');
        console.log('[SubscriptionUpgrade] Current:', currentSubscription.tier_name, currentSubscription.billing_cycle);
        console.log('[SubscriptionUpgrade] New:', tier.name, billingCycle);

        // Allow upgrades FROM Free tier
        if (currentSubscription.tier_name.toLowerCase() === 'free') {
          console.log('[SubscriptionUpgrade] Upgrading from FREE tier - allowed');
          // Delete the free tier subscription before continuing
          await supabase
            .from('user_subscriptions')
            .delete()
            .eq('user_id', currentUser.uid)
            .eq('tier_id', currentSubscription.tier_id);

          console.log('[SubscriptionUpgrade] Deleted FREE tier subscription');
        } else if (currentSubscription.tier_name.toLowerCase() === tier.name.toLowerCase()) {
          // Same tier - don't allow
          alert('⚠️ You are already subscribed to this plan.');
          setUpgrading(null);
          return;
        } else {
          // Different paid plan - require cancellation first
          alert('⚠️ You already have an active subscription. Please cancel it first before subscribing to a new plan.');
          setUpgrading(null);
          return;
        }
      }

      // Ensure Paystack script is loaded
      console.log('[SubscriptionUpgrade] Ensuring Paystack script is loaded...');
      await loadPaystackScript();

      // Double-check PaystackPop is available
      if (!window.PaystackPop) {
        throw new Error('Paystack script loaded but PaystackPop is not available');
      }

      console.log('[SubscriptionUpgrade] Initializing payment for tier:', tier.name);
      console.log('[SubscriptionUpgrade] Plan code:', planCode);
      console.log('[SubscriptionUpgrade] User email:', currentUser.email);

      // Store the tier info for later use in onClose
      const paymentTier = tier;
      const paymentBillingCycle = billingCycle;

      // Initialize Paystack subscription
      console.log('[SubscriptionUpgrade] About to initialize Paystack with:', {
        hasKey: !!paystackPublicKey,
        keyLength: paystackPublicKey ? paystackPublicKey.length : 0,
        keyPrefix: paystackPublicKey ? paystackPublicKey.substring(0, 7) : 'none',
        email: currentUser.email,
        planCode: planCode
      });

      if (!paystackPublicKey) {
        throw new Error('Paystack public key is not configured. Please contact support.');
      }

      // Trim the key to remove any whitespace
      const cleanKey = paystackPublicKey.trim();

      // Validate the key format
      if (!cleanKey.startsWith('pk_live_') && !cleanKey.startsWith('pk_test_')) {
        console.error('[SubscriptionUpgrade] Invalid Paystack key format:', cleanKey.substring(0, 10));
        throw new Error('Invalid Paystack key format. Please contact support.');
      }

      console.log('[SubscriptionUpgrade] Creating Paystack handler with clean key:', cleanKey.substring(0, 10) + '...');

      let handler: any = null;

      try {
        handler = window.PaystackPop.setup({
          key: cleanKey,
          email: currentUser.email || '',
          plan: planCode,
          currency: 'NGN',
          metadata: {
            user_id: currentUser.uid,
            tier_id: tier.id,
            tier_name: tier.name,
            billing_cycle: billingCycle,
            custom_fields: [
              {
                display_name: "User ID",
                variable_name: "user_id",
                value: currentUser.uid
              }
            ]
          },
        onSuccess: async function(reference: any) {
          console.log('[SubscriptionUpgrade] ========================================');
          console.log('[SubscriptionUpgrade] ✅ PAYMENT SUCCESS CALLBACK FIRED');
          console.log('[SubscriptionUpgrade] Transaction reference:', reference);
          console.log('[SubscriptionUpgrade] Full reference object:', JSON.stringify(reference, null, 2));
          console.log('[SubscriptionUpgrade] ========================================');

          try {
            // Clear the backup polling since payment succeeded
            if (backupCheckInterval) {
              clearInterval(backupCheckInterval);
            }

            // Step 1: Verify the transaction and create subscription
            console.log('[SubscriptionUpgrade] 🔄 Verifying transaction with Paystack...');

            // Extract the actual reference string
            const transactionRef = reference.reference || reference.trxref || reference;

            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-transaction',
              {
                body: {
                  reference: transactionRef,
                  planCode
                },
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            );

            if (verifyError) {
              console.error('[SubscriptionUpgrade] ❌ Transaction verification failed:', verifyError);
              throw new Error('Failed to verify transaction');
            }

            if (!verifyData?.success) {
              console.error('[SubscriptionUpgrade] ❌ Transaction verification failed:', verifyData?.error);
              throw new Error(verifyData?.error || 'Failed to verify transaction');
            }

            console.log('[SubscriptionUpgrade] ✅ Transaction verified and subscription created!');
            console.log('[SubscriptionUpgrade] Subscription data:', verifyData.data);

            // Step 2: Show success and reload
            setUpgrading(null);
            alert(`🎉 Welcome to ${verifyData.data.tier_name}! Your subscription is now active.`);

            setTimeout(() => {
              window.location.reload();
            }, 500);
          } catch (error) {
            console.error('[SubscriptionUpgrade] ❌ Error in onSuccess:', error);
            setUpgrading(null);
            alert(`⚠️ Payment received but activation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`);
          }
        },
        onClose: function() {
          console.log('[SubscriptionUpgrade] ========================================');
          console.log('[SubscriptionUpgrade] 🚪 POPUP CLOSED');
          console.log('[SubscriptionUpgrade] Note: onSuccess callback did not fire yet');
          console.log('[SubscriptionUpgrade] This could mean:');
          console.log('[SubscriptionUpgrade] 1. User cancelled the payment');
          console.log('[SubscriptionUpgrade] 2. Payment is still processing');
          console.log('[SubscriptionUpgrade] 3. Test mode issue with callbacks');
          console.log('[SubscriptionUpgrade] ========================================');

          // DO NOT automatically verify/activate subscription here!
          // onClose fires even when user cancels payment
          // Only the backup polling should check for actual payment completion

          console.log('[SubscriptionUpgrade] Backup polling will continue checking for payment...');

          // Clear the upgrading state after a delay if payment wasn't completed
          setTimeout(() => {
            // Check if still upgrading (backup polling hasn't found a payment)
            if (upgrading === tier.id) {
              console.log('[SubscriptionUpgrade] No payment detected after popup close, clearing state');
              setUpgrading(null);
            }
          }, 30000); // Wait 30 seconds before giving up
        }
      });
      } catch (setupError) {
        console.error('[SubscriptionUpgrade] Failed to setup Paystack handler:', setupError);
        console.error('[SubscriptionUpgrade] Error details:', {
          message: setupError instanceof Error ? setupError.message : 'Unknown error',
          stack: setupError instanceof Error ? setupError.stack : undefined
        });

        // More specific error messages
        if (setupError instanceof Error && setupError.message.includes('key')) {
          throw new Error('Invalid Paystack public key. Please contact support.');
        } else if (setupError instanceof Error && setupError.message.includes('plan')) {
          throw new Error('Invalid subscription plan code. Please contact support.');
        } else {
          throw new Error(`Failed to initialize payment: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`);
        }
      }

      if (!handler) {
        throw new Error('Failed to create payment handler. Please try again.');
      }

      console.log('[SubscriptionUpgrade] Handler created successfully, opening iframe...');

      // Declare backupCheckInterval before using it
      let backupCheckInterval: any = null;

      // Set a backup check that tries subscription verification first, then transaction verification
      let checkCount = 0;
      const maxChecks = 24; // Check for 2 minutes (every 5 seconds)
      let lastTransactionRef: string | null = null;

      backupCheckInterval = setInterval(async () => {
        checkCount++;
        console.log(`[SubscriptionUpgrade] Backup check ${checkCount}/${maxChecks} - Checking for payment...`);

        try {
          // First try subscription verification (for recurring payments)
          const response = await fetch(`${supabase.supabaseUrl}/functions/v1/verify-subscription`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerEmail: currentUser.email,
              planCode: planCode
            })
          });

          const result = await response.json();

          if (result.success) {
            console.log('[SubscriptionUpgrade] ✅ BACKUP CHECK: Subscription verified and synced!', result.data);
            clearInterval(backupCheckInterval);
            setUpgrading(null);
            alert(`🎉 Welcome to ${result.data.tier_name}! Your subscription is now active.`);
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } else if (checkCount >= maxChecks) {
            console.log('[SubscriptionUpgrade] ❌ BACKUP CHECK: Timeout - no payment found after 2 minutes');
            console.log('[SubscriptionUpgrade] Last error:', result.error);
            clearInterval(backupCheckInterval);
            setUpgrading(null);
            alert('⚠️ No payment detected. If you completed payment, please refresh the page or contact support.');
          } else {
            console.log('[SubscriptionUpgrade] No subscription found yet, will retry...');
          }
        } catch (error) {
          console.error('[SubscriptionUpgrade] Backup check error:', error);
          if (checkCount >= maxChecks) {
            clearInterval(backupCheckInterval);
            setUpgrading(null);
            alert('⚠️ Payment status unclear. Please refresh the page to check your subscription.');
          }
        }
      }, 5000); // Check every 5 seconds

      // Small delay to ensure handler is ready
      setTimeout(() => {
        try {
          handler.openIframe();
          console.log('[SubscriptionUpgrade] Iframe opened successfully');
          console.log('[SubscriptionUpgrade] Backup check interval started - will check every 5 seconds');
        } catch (iframeError) {
          console.error('[SubscriptionUpgrade] Failed to open iframe:', iframeError);
          clearInterval(backupCheckInterval);
          setUpgrading(null);
          alert('Failed to open payment window. Please disable any popup blockers and try again.');
        }
      }, 100);
    } catch (error) {
      console.error('[SubscriptionUpgrade] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to initialize payment: ${errorMessage}. Please try again.`);
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
    // Free tier is always disabled (can't "upgrade" to free)
    if (tier.name === 'Free') return false;

    // If no current subscription, allow all paid tiers
    if (!currentSubscription) return true;

    // Allow changing to different tier OR different billing cycle
    const isDifferentTier = tier.id !== currentSubscription.tier_id;
    const isDifferentCycle = billingCycle !== currentSubscription.billing_cycle;

    return isDifferentTier || isDifferentCycle;
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

      {/* Current Subscription Info */}
      {currentSubscription && currentSubscription.status === 'active' && currentSubscription.tier_name !== 'Free' && (
        <div className="current-subscription-banner">
          <div className="banner-content">
            <div className="banner-info">
              <strong>Current Plan:</strong> {currentSubscription.tier_name} ({currentSubscription.billing_cycle})
              {currentSubscription.payment_provider === 'paystack' ? (
                <span className="provider-badge">via Paystack</span>
              ) : (
                <span className="provider-badge" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>Manual</span>
              )}
            </div>
            <button
              className="cancel-subscription-btn"
              onClick={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  Cancel Subscription
                </>
              )}
            </button>
          </div>
          <p className="banner-note">
            {currentSubscription.payment_provider === 'paystack' ? (
              <>💡 To switch plans, cancel your current subscription first, then subscribe to a new plan.</>
            ) : (
              <>💡 This is a manual subscription. Click cancel to switch to a different plan or payment method.</>
            )}
          </p>
        </div>
      )}

      {/* Processing Message */}
      {upgrading && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          textAlign: 'center',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <p style={{ margin: 0, color: '#92400e', fontWeight: 700, fontSize: '1.1rem' }}>
            ⏳ PAYMENT WINDOW IS OPEN
          </p>
          <p style={{ margin: '12px 0 8px 0', color: '#78350f', fontSize: '1rem', fontWeight: 600 }}>
            👉 Look for the Paystack payment popup window
          </p>
          <p style={{ margin: '8px 0 0 0', color: '#78350f', fontSize: '0.875rem' }}>
            It might be behind your browser window!<br/>
            Try Alt+Tab (Windows) or Cmd+Tab (Mac) to find it
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Billing Cycle Toggle */}
      <div className="billing-toggle-wrapper">
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
        {billingCycle === 'annual' && (
          <div className="annual-savings-message">
            💰 Save up to <strong>₦{(12000).toLocaleString()}</strong> per year with annual billing!
          </div>
        )}
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

                {(tier.has_product_variants || tier.features?.product_variants) && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>Product variants</span>
                  </div>
                )}
                {(tier.has_invoicing || tier.features?.invoicing) && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>Invoicing</span>
                  </div>
                )}
                {(tier.has_whatsapp_ai || tier.features?.whatsapp_ai_integration) && (
                  <div className="feature">
                    <Check size={16} className="check-icon" />
                    <span>WhatsApp AI</span>
                  </div>
                )}
                {(tier.has_priority_support || tier.features?.priority_support) && (
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
                    <span>Processing payment...</span>
                  </>
                ) : isCurrent && billingCycle === currentSubscription?.billing_cycle ? (
                  'Current Plan'
                ) : tier.name === 'Free' ? (
                  'Free Forever'
                ) : (
                  <>
                    <CreditCard size={16} />
                    {isCurrent ? `Switch to ${billingCycle}` : 'Subscribe Now'}
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

        .current-subscription-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 32px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .banner-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .banner-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .provider-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .cancel-subscription-btn {
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .cancel-subscription-btn:hover:not(:disabled) {
          background: rgba(220, 38, 38, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .cancel-subscription-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .banner-note {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.95;
          line-height: 1.5;
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

        .billing-toggle-wrapper {
          margin-bottom: 40px;
        }

        .billing-toggle {
          display: flex;
          justify-content: center;
          gap: 8px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 12px;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        .annual-savings-message {
          text-align: center;
          margin-top: 12px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 8px;
          color: #92400e;
          font-size: 0.875rem;
          animation: fadeIn 0.3s ease;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .annual-savings-message strong {
          color: #78350f;
          font-weight: 700;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
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

          .banner-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .cancel-subscription-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
