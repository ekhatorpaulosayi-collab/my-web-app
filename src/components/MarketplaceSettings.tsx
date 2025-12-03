/**
 * MARKETPLACE SETTINGS COMPONENT
 *
 * Add this to your Settings page NOW - it will show "Coming Soon" until marketplace launches.
 * When marketplace is enabled, users can toggle visibility, customize store, etc.
 *
 * Usage:
 * import { MarketplaceSettings } from './components/MarketplaceSettings';
 * <MarketplaceSettings />
 */

import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '../contexts/BusinessProfile';
import {
  isMarketplaceEnabled,
  updateStoreSettings,
  generateStoreSlug,
  getSubscriptionPlans
} from '../services/marketplace';
import './MarketplaceSettings.css';

export const MarketplaceSettings: React.FC = () => {
  const { profile } = useBusinessProfile();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Marketplace settings
  const [storeVisible, setStoreVisible] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [storeDescription, setStoreDescription] = useState('');

  const marketplaceEnabled = isMarketplaceEnabled();
  const plans = getSubscriptionPlans();
  const currentPlan = plans[0]; // Default to free tier

  useEffect(() => {
    // TODO: Load current marketplace settings from Supabase
    // For now, everything defaults to false/empty
  }, []);

  const handleGenerateSlug = async () => {
    if (!profile.businessName) {
      setMessage('Please set your business name in profile first');
      return;
    }

    setLoading(true);
    try {
      const slug = await generateStoreSlug(profile.businessName);
      setStoreSlug(slug);
      setMessage(`Generated slug: ${slug}`);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await updateStoreSettings('current-user-id', {
        storeVisible,
        storeSlug: storeSlug || undefined,
        storeDescription: storeDescription || undefined
      });

      if (result.success) {
        setMessage('✅ Settings saved!');
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!marketplaceEnabled) {
    return (
      <div className="marketplace-settings">
        <div className="marketplace-settings-header">
          <h3>🏪 Marketplace</h3>
          <span className="badge badge-coming-soon">Coming Soon</span>
        </div>

        <div className="marketplace-coming-soon">
          <div className="coming-soon-icon">🚀</div>
          <h4>Marketplace is coming!</h4>
          <p>
            Soon you'll be able to showcase your products to thousands of buyers across Nigeria.
            Get discovered, grow your business, and track which channels drive the most sales.
          </p>

          <div className="coming-soon-features">
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <div>
                <strong>Get Discovered</strong>
                <p>Buyers can find your store in marketplace search</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div>
                <strong>Track Performance</strong>
                <p>See views, clicks, and inquiries for each product</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">⭐</span>
              <div>
                <strong>Premium Placement</strong>
                <p>Rank higher in search results with paid plans</p>
              </div>
            </div>
          </div>

          <div className="coming-soon-cta">
            <p className="text-muted">
              We're launching marketplace when we reach <strong>5,000 active users</strong>.
              Help us get there by inviting other business owners!
            </p>
          </div>
        </div>

        {/* Preview of subscription tiers */}
        <div className="marketplace-tiers-preview">
          <h4>Future Subscription Plans</h4>
          <div className="tiers-grid">
            {plans.map(plan => (
              <div key={plan.tier} className={`tier-card tier-${plan.tier}`}>
                <h5>{plan.name}</h5>
                <div className="tier-price">{plan.priceDisplay}</div>
                <ul className="tier-features">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Marketplace is enabled - show full settings
  return (
    <div className="marketplace-settings">
      <div className="marketplace-settings-header">
        <h3>🏪 Marketplace Settings</h3>
        <span className="badge badge-live">Live</span>
      </div>

      {/* Store Visibility Toggle */}
      <div className="settings-section">
        <div className="setting-item">
          <div className="setting-info">
            <label>
              <strong>Make my store visible in marketplace</strong>
              <span className="setting-description">
                When enabled, buyers can discover your products in search
              </span>
            </label>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={storeVisible}
              onChange={(e) => setStoreVisible(e.target.checked)}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Store Slug */}
      <div className="settings-section">
        <label htmlFor="store-slug">
          <strong>Store URL</strong>
          <span className="setting-description">
            Your unique marketplace URL: storehouse.app/@{storeSlug || 'yourstore'}
          </span>
        </label>
        <div className="input-with-button">
          <input
            id="store-slug"
            type="text"
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
            placeholder="my-store-name"
            disabled={loading}
          />
          <button onClick={handleGenerateSlug} disabled={loading}>
            Generate
          </button>
        </div>
      </div>

      {/* Store Description */}
      <div className="settings-section">
        <label htmlFor="store-description">
          <strong>Store Description</strong>
          <span className="setting-description">
            Tell buyers what makes your store special (optional)
          </span>
        </label>
        <textarea
          id="store-description"
          value={storeDescription}
          onChange={(e) => setStoreDescription(e.target.value)}
          placeholder="We sell premium fashion items in Lagos..."
          rows={3}
          maxLength={500}
          disabled={loading}
        />
        <div className="char-count">{storeDescription.length}/500</div>
      </div>

      {/* Current Plan */}
      <div className="settings-section">
        <div className="current-plan-card">
          <div className="plan-header">
            <div>
              <strong>Current Plan: {currentPlan.name}</strong>
              <p className="plan-price">{currentPlan.priceDisplay}</p>
            </div>
            {currentPlan.tier === 'free' && (
              <button className="btn-upgrade">Upgrade to Pro</button>
            )}
          </div>
          <ul className="plan-features-list">
            {currentPlan.features.map((feature, idx) => (
              <li key={idx}>✓ {feature}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && (
        <div className={`settings-message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};
