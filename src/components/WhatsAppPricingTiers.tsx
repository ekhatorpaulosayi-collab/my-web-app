import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Tier {
  id: 'free' | 'starter' | 'pro' | 'business';
  name: string;
  price: string;
  priceValue: number;
  chats: number;
  features: string[];
  color: string;
  recommended?: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₦0',
    priceValue: 0,
    chats: 50,
    features: [
      '50 products',
      '50 AI chats/month (3 months)',
      '20 AI chats/month (after)',
      '1 image per product',
      '1 user',
      'Online storefront',
    ],
    color: '#9ca3af',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₦5,000',
    priceValue: 5000,
    chats: 500,
    features: [
      '200 products',
      '500 AI chats/month',
      '3 images per product',
      '2 users',
      'Profit tracking',
      'Advanced analytics',
    ],
    color: '#10b981',
    recommended: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦10,000',
    priceValue: 10000,
    chats: 1500,
    features: [
      'Unlimited products',
      '1,500 AI chats/month',
      '5 images per product',
      '5 users',
      'Everything in Starter',
      'Daily AI tips',
    ],
    color: '#6366f1',
  },
  {
    id: 'business',
    name: 'Business',
    price: '₦15,000',
    priceValue: 15000,
    chats: 10000,
    features: [
      'Unlimited products',
      '10,000 AI chats/month',
      '10 images per product',
      'Unlimited users',
      'API access',
      'White-label options',
    ],
    color: '#f59e0b',
  },
];

interface WhatsAppPricingTiersProps {
  onClose?: () => void;
  currentTier?: string;
}

export default function WhatsAppPricingTiers({ onClose, currentTier = 'free' }: WhatsAppPricingTiersProps) {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string>(currentTier);
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async (tierId: string) => {
    if (tierId === currentTier) {
      alert('You are already on this plan.');
      return;
    }

    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return;

    const confirmMessage = tier.priceValue === 0
      ? `Downgrade to ${tier.name}? You'll have ${tier.chats} AI chats/month.`
      : `Upgrade to ${tier.name} for ${tier.price}/month? You'll get ${tier.chats} AI chats/month.`;

    if (!confirm(confirmMessage)) return;

    setUpgrading(true);
    try {
      const { error } = await supabase
        .from('subscription_tiers')
        .update({
          tier: tierId,
          monthly_chat_limit: tier.chats,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      // In production, integrate with payment gateway here
      if (tier.priceValue > 0) {
        alert(`✅ Plan upgraded to ${tier.name}!\n\n💳 Payment of ${tier.price} is required.\n\nContact support to complete payment setup.`);
      } else {
        alert(`✅ Switched to ${tier.name}`);
      }

      window.location.reload();
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          WhatsApp AI Pricing Plans
        </h2>
        <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
          Choose the perfect plan for your business
        </p>
      </div>

      {/* Pricing Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {TIERS.map((tier) => {
          const isCurrentTier = tier.id === currentTier;
          const isPremium = tier.priceValue > 0;

          return (
            <div
              key={tier.id}
              style={{
                border: `3px solid ${isCurrentTier ? tier.color : '#e5e7eb'}`,
                borderRadius: '16px',
                padding: '1.5rem',
                background: isCurrentTier ? `${tier.color}08` : 'white',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 24px ${tier.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => setSelectedTier(tier.id)}
            >
              {/* Recommended Badge */}
              {tier.recommended && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                }}>
                  ⭐ RECOMMENDED
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentTier && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '12px',
                  background: tier.color,
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  ✓ CURRENT PLAN
                </div>
              )}

              {/* Plan Name */}
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                marginTop: tier.recommended || isCurrentTier ? '0.5rem' : 0,
              }}>
                {tier.name}
              </div>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: tier.color,
                }}>
                  {tier.price}
                </span>
                <span style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  marginLeft: '0.5rem',
                }}>
                  /month
                </span>
              </div>

              {/* Chats Included */}
              <div style={{
                background: `${tier.color}15`,
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  AI Chats Included
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: tier.color }}>
                  {tier.chats.toLocaleString()}
                </div>
              </div>

              {/* Features */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 1.5rem 0',
              }}>
                {tier.features.map((feature, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                      color: '#374151',
                    }}
                  >
                    <span style={{
                      color: tier.color,
                      marginRight: '0.5rem',
                      fontWeight: 700,
                    }}>
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpgrade(tier.id);
                }}
                disabled={upgrading || isCurrentTier}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: isCurrentTier
                    ? '#e5e7eb'
                    : `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}dd 100%)`,
                  color: isCurrentTier ? '#6b7280' : 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: isCurrentTier ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: upgrading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentTier && !upgrading) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {upgrading ? 'Processing...' : isCurrentTier ? 'Current Plan' : isPremium ? 'Upgrade Now' : 'Downgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div style={{
        background: '#f9fafb',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '3rem',
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          ❓ Frequently Asked Questions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              What happens if I exceed my monthly chat limit?
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Your AI will stop responding and customers will see a message to contact you directly. Upgrade your plan to avoid interruptions.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Can I change plans anytime?
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              How accurate is the AI?
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Our AI uses Claude (by Anthropic) to understand customer queries and match them with your product inventory. Accuracy is typically 90%+.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Do I need a separate WhatsApp number?
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              We recommend getting a dedicated AI number (we provide it). Alternatively, you can use your existing number but you'll lose the WhatsApp app on your phone.
            </div>
          </div>
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
