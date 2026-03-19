/**
 * AI Usage Counter Component
 * Shows remaining AI chats and triggers upgrade prompts
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAIUsage, getUpgradeBenefits, AIUsageData } from '../services/aiUsageService';
import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
import './AIUsageCounter.css';

interface AIUsageCounterProps {
  onUpgradeClick?: () => void;
  compact?: boolean;
}

export const AIUsageCounter: React.FC<AIUsageCounterProps> = ({
  onUpgradeClick,
  compact = false
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<AIUsageData | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      loadUsageData();
      // Refresh usage data every 30 seconds
      const interval = setInterval(loadUsageData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadUsageData = async () => {
    if (!currentUser?.uid) return;

    try {
      const data = await getAIUsage(currentUser.uid);
      setUsage(data);

      // Auto-show upgrade modal when approaching limit
      if (data?.isApproachingLimit && !showUpgradeModal) {
        setTimeout(() => setShowUpgradeModal(true), 2000);
      }
    } catch (error) {
      console.error('Error loading AI usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate('/subscription');
    }
    setShowUpgradeModal(false);
  };

  if (loading || !usage) return null;

  const progressPercentage = Math.min(100, usage.percentageUsed);
  const isLowCredits = usage.chatsRemaining <= 5;
  const isExhausted = usage.hasExhausted;

  // Compact view for header/widget
  if (compact) {
    return (
      <div className={`ai-usage-compact ${isExhausted ? 'exhausted' : isLowCredits ? 'low' : ''}`}>
        <div className="usage-icon">
          {isExhausted ? <Lock size={16} /> : <Zap size={16} />}
        </div>
        <span className="usage-text">
          {isExhausted ? 'AI Locked' : `${usage.chatsRemaining} AI`}
        </span>
        {(isLowCredits || isExhausted) && (
          <button className="upgrade-btn-compact" onClick={handleUpgradeClick}>
            Upgrade
          </button>
        )}
      </div>
    );
  }

  // Full view with progress bar and details
  return (
    <>
      <div className={`ai-usage-counter ${isExhausted ? 'exhausted' : isLowCredits ? 'warning' : ''}`}>
        <div className="usage-header">
          <div className="usage-title">
            <Zap size={20} />
            <span>AI Assistant Credits</span>
          </div>
          {usage.tierName !== 'Business' && (
            <button className="upgrade-link" onClick={handleUpgradeClick}>
              Upgrade {usage.tierName === 'Free' ? '→ Starter' : usage.tierName === 'Starter' ? '→ Pro' : '→ Business'}
            </button>
          )}
        </div>

        <div className="usage-stats">
          <div className="stat">
            <span className="stat-value">{usage.chatsUsed}</span>
            <span className="stat-label">Used</span>
          </div>
          <div className="stat primary">
            <span className="stat-value">{usage.chatsRemaining}</span>
            <span className="stat-label">Remaining</span>
          </div>
          <div className="stat">
            <span className="stat-value">{usage.totalLimit}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>

        <div className="usage-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="progress-text">
            {usage.percentageUsed.toFixed(0)}% used this month
          </span>
        </div>

        {usage.upgradeMessage && (
          <div className="usage-alert">
            {isExhausted ? <Lock size={16} /> : <AlertTriangle size={16} />}
            <span>{usage.upgradeMessage}</span>
          </div>
        )}

        {usage.valueMetric && (
          <div className="value-metric">
            <TrendingUp size={16} />
            <span>{usage.valueMetric}</span>
          </div>
        )}

        {isExhausted && (
          <button className="unlock-ai-btn" onClick={handleUpgradeClick}>
            🚀 Unlock AI Assistant - Start Free Trial
          </button>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && !isExhausted && (
        <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowUpgradeModal(false)}>×</button>

            <div className="modal-header">
              <Zap size={32} className="modal-icon" />
              <h2>You're Running Low on AI Credits!</h2>
              <p>Only {usage.chatsRemaining} chats remaining this month</p>
            </div>

            <div className="modal-benefits">
              <h3>Upgrade to {usage.tierName === 'Free' ? 'Starter' : 'Pro'} and get:</h3>
              <ul>
                {getUpgradeBenefits(usage.tierName).map((benefit, i) => (
                  <li key={i}>{benefit}</li>
                ))}
              </ul>
            </div>

            <div className="modal-pricing">
              <div className="price-tag">
                <span className="currency">₦</span>
                <span className="amount">{usage.tierName === 'Free' ? '5,000' : '10,000'}</span>
                <span className="period">/month</span>
              </div>
              <div className="savings">
                Save ₦{usage.tierName === 'Free' ? '12,000' : '24,000'}/year with annual plan
              </div>
            </div>

            <div className="modal-actions">
              <button className="upgrade-btn-primary" onClick={handleUpgradeClick}>
                🚀 Upgrade Now & Never Run Out
              </button>
              <button className="remind-later" onClick={() => setShowUpgradeModal(false)}>
                Remind me later
              </button>
            </div>

            <div className="social-proof">
              <p>⭐ Join 2,847 stores that upgraded this month</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};