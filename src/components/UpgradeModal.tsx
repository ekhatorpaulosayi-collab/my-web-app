/**
 * UpgradeModal Component
 * Beautiful, conversion-optimized modal for tier upgrades
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import './UpgradeModal.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'products' | 'images' | 'users' | 'ai_chats';
  currentTier: string;
  suggestedTier: string;
  currentCount?: number;
  limit?: number;
  reason?: string;
}

const TIER_BENEFITS = {
  Starter: [
    '200 products with 3 images each',
    'Debt tracking & installment plans',
    'Professional invoicing system',
    '3 staff members with roles',
    'Profit tracking & analytics',
    '500 AI chats per month'
  ],
  Pro: [
    'UNLIMITED products',
    'WhatsApp AI Assistant (24/7)',
    'Recurring invoices',
    '5 staff members',
    '2,000 AI chats per month',
    'Priority support'
  ],
  Business: [
    'UNLIMITED products',
    '10 staff members',
    '5,000 AI chats per month',
    'Dedicated account manager',
    'Custom training session',
    '24/7 priority support'
  ]
};

const TIER_PRICES = {
  Starter: { monthly: 5000, annual: 48000 },
  Pro: { monthly: 10000, annual: 96000 },
  Business: { monthly: 15000, annual: 144000 }
};

const TIER_COLORS = {
  Starter: '#10b981',
  Pro: '#6366f1',
  Business: '#f59e0b'
};

export default function UpgradeModal({
  isOpen,
  onClose,
  limitType,
  currentTier,
  suggestedTier,
  currentCount,
  limit,
  reason
}: UpgradeModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const benefits = TIER_BENEFITS[suggestedTier as keyof typeof TIER_BENEFITS] || [];
  const pricing = TIER_PRICES[suggestedTier as keyof typeof TIER_PRICES];
  const tierColor = TIER_COLORS[suggestedTier as keyof typeof TIER_COLORS];

  const annualSavings = pricing ? (pricing.monthly * 12) - pricing.annual : 0;
  const monthlyEquivalent = pricing ? Math.floor(pricing.annual / 12) : 0;

  const getLimitMessage = () => {
    switch (limitType) {
      case 'products':
        return `You have reached your ${currentTier} tier limit of ${limit} products.`;
      case 'images':
        return `Your ${currentTier} tier allows ${limit} images per product.`;
      case 'users':
        return `Your ${currentTier} tier allows ${limit} users.`;
      case 'ai_chats':
        return `You have used all ${limit} AI chats this month.`;
      default:
        return reason || 'You have reached your tier limit.';
    }
  };

  return (
    <>
      <div className="upgrade-modal-overlay" onClick={onClose} />
      <div className="upgrade-modal">
        <button className="upgrade-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="upgrade-modal-header">
          <div className="upgrade-icon" style={{ background: tierColor }}>
            <TrendingUp size={32} />
          </div>
          <h2 className="upgrade-title">
            Upgrade to {suggestedTier}
          </h2>
          <p className="upgrade-subtitle">
            {getLimitMessage()}
          </p>
        </div>

        <div className="upgrade-modal-body">
          {/* Progress indicator */}
          {limit && currentCount !== undefined && (
            <div className="upgrade-progress">
              <div className="upgrade-progress-header">
                <span>Current Usage</span>
                <span className="upgrade-progress-count">
                  {currentCount} / {limit}
                </span>
              </div>
              <div className="upgrade-progress-bar">
                <div
                  className="upgrade-progress-fill"
                  style={{
                    width: `${Math.min((currentCount / limit) * 100, 100)}%`,
                    background: tierColor
                  }}
                />
              </div>
            </div>
          )}

          {/* Pricing */}
          {pricing && (
            <div className="upgrade-pricing">
              <div className="upgrade-price-option">
                <div className="upgrade-price-label">Monthly</div>
                <div className="upgrade-price-amount">
                  ₦{pricing.monthly.toLocaleString()}<span>/month</span>
                </div>
              </div>
              <div className="upgrade-price-divider">or</div>
              <div className="upgrade-price-option upgrade-price-annual">
                <div className="upgrade-price-badge">Save ₦{annualSavings.toLocaleString()}</div>
                <div className="upgrade-price-label">Annual</div>
                <div className="upgrade-price-amount">
                  ₦{monthlyEquivalent.toLocaleString()}<span>/month</span>
                </div>
                <div className="upgrade-price-note">
                  Billed ₦{pricing.annual.toLocaleString()}/year
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="upgrade-benefits">
            <h3 className="upgrade-benefits-title">
              <Zap size={20} style={{ color: tierColor }} />
              What you'll unlock:
            </h3>
            <ul className="upgrade-benefits-list">
              {benefits.map((benefit, index) => (
                <li key={index} className="upgrade-benefit-item">
                  <CheckCircle size={18} style={{ color: tierColor }} />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="upgrade-actions">
            <button
              className="upgrade-btn-primary"
              style={{ background: tierColor }}
              onClick={() => {
                navigate('/pricing');
                onClose();
              }}
            >
              View Pricing & Upgrade
            </button>
            <button className="upgrade-btn-secondary" onClick={onClose}>
              Maybe Later
            </button>
          </div>

          {/* Trust badges */}
          <div className="upgrade-trust">
            <div className="upgrade-trust-item">
              <CheckCircle size={16} />
              <span>Cancel anytime</span>
            </div>
            <div className="upgrade-trust-item">
              <CheckCircle size={16} />
              <span>Upgrade instantly</span>
            </div>
            <div className="upgrade-trust-item">
              <CheckCircle size={16} />
              <span>No credit card to start</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
