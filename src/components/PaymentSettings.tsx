import React, { useState, useEffect } from 'react';
import {
  getPaystackConfig,
  savePaystackConfig,
  validatePublicKey,
  type PaystackConfig
} from '../utils/paystackSettings';
import '../styles/PaymentSettings.css';

interface PaymentSettingsProps {
  onToast?: (message: string) => void;
}

export default function PaymentSettings({ onToast }: PaymentSettingsProps) {
  const [config, setConfig] = useState<PaystackConfig>(getPaystackConfig());
  const [testKeyValidation, setTestKeyValidation] = useState({ valid: true, message: '' });
  const [liveKeyValidation, setLiveKeyValidation] = useState({ valid: true, message: '' });
  const [isDirty, setIsDirty] = useState(false);

  // Load config on mount
  useEffect(() => {
    const loaded = getPaystackConfig();
    setConfig(loaded);
  }, []);

  // Update field
  const updateField = (field: keyof PaystackConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);

    // Validate keys in real-time
    if (field === 'publicKeyTest') {
      setTestKeyValidation(validatePublicKey(value));
    } else if (field === 'publicKeyLive') {
      setLiveKeyValidation(validatePublicKey(value));
    }
  };

  // Save configuration
  const handleSave = () => {
    // Validate before saving
    if (config.enabled) {
      const testKey = validatePublicKey(config.publicKeyTest);
      const liveKey = validatePublicKey(config.publicKeyLive);

      if (!testKey.valid || !liveKey.valid) {
        onToast?.('Please fix invalid API keys before saving');
        return;
      }

      // Ensure at least one key is provided
      if (!config.publicKeyTest && !config.publicKeyLive) {
        onToast?.('Please provide at least one API key (test or live)');
        return;
      }
    }

    const success = savePaystackConfig(config);
    if (success) {
      setIsDirty(false);
      onToast?.('✓ Payment settings saved');
    } else {
      onToast?.('Failed to save payment settings');
    }
  };

  return (
    <div className="payment-settings">
      {/* Header with icon and description */}
      <div className="payment-settings-header">
        <h4 className="payment-settings-title">
          <span className="payment-icon">💳</span>
          Paystack Payment Integration
        </h4>
        <p className="payment-settings-desc">
          Accept card and bank transfer payments directly in your store
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="payment-field">
        <label className="payment-toggle-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateField('enabled', e.target.checked)}
            className="payment-checkbox"
          />
          <span className="payment-toggle-text">Enable Paystack Payments</span>
        </label>
      </div>

      {config.enabled && (
        <div className="payment-enabled-content">
          {/* Test Mode Toggle */}
          <div className="payment-field">
            <label className="payment-toggle-label">
              <input
                type="checkbox"
                checked={config.testMode}
                onChange={(e) => updateField('testMode', e.target.checked)}
                className="payment-checkbox"
              />
              <span className="payment-toggle-text">Test Mode</span>
            </label>
            <p className="payment-field-hint">
              Use test keys for development. Uncheck for live transactions.
            </p>
          </div>

          {/* Test Mode Warning Banner */}
          {config.testMode && (
            <div className="payment-warning-banner">
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <strong>Test Mode Active</strong>
                <p>Payments won't be charged. Use test cards only.</p>
              </div>
            </div>
          )}

          {/* Help Box */}
          <div className="payment-help-box">
            <div className="help-box-icon">💡</div>
            <div className="help-box-content">
              <strong>Get your API keys from Paystack Dashboard</strong>
              <p>
                Visit{' '}
                <a
                  href="https://dashboard.paystack.com/#/settings/developer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payment-link"
                >
                  Paystack Dashboard → Settings → Developer/API
                </a>
                {' '}to copy your public keys
              </p>
            </div>
          </div>

          {/* Test Public Key */}
          <div className="payment-field">
            <label htmlFor="paystack-test-key" className="payment-label">
              Test Public Key
              <span className="label-badge">Test</span>
            </label>
            <input
              id="paystack-test-key"
              type="text"
              className={`payment-input ${config.publicKeyTest && !testKeyValidation.valid ? 'input-error' : ''}`}
              value={config.publicKeyTest}
              onChange={(e) => updateField('publicKeyTest', e.target.value)}
              placeholder="pk_test_..."
            />
            {config.publicKeyTest && testKeyValidation.message && (
              <p className={`payment-field-hint ${testKeyValidation.valid ? 'hint-success' : 'hint-error'}`}>
                {testKeyValidation.message}
              </p>
            )}
            {!config.publicKeyTest && (
              <p className="payment-field-hint">
                For testing payments without real charges
              </p>
            )}
          </div>

          {/* Live Public Key */}
          <div className="payment-field">
            <label htmlFor="paystack-live-key" className="payment-label">
              Live Public Key
              <span className="label-badge label-badge-live">Live</span>
            </label>
            <input
              id="paystack-live-key"
              type="text"
              className={`payment-input ${config.publicKeyLive && !liveKeyValidation.valid ? 'input-error' : ''}`}
              value={config.publicKeyLive}
              onChange={(e) => updateField('publicKeyLive', e.target.value)}
              placeholder="pk_live_..."
            />
            {config.publicKeyLive && liveKeyValidation.message && (
              <p className={`payment-field-hint ${liveKeyValidation.valid ? 'hint-success' : 'hint-error'}`}>
                {liveKeyValidation.message}
              </p>
            )}
            {!config.publicKeyLive && (
              <p className="payment-field-hint">
                Only use when ready for real transactions
              </p>
            )}
          </div>

          {/* Save Button */}
          {isDirty && (
            <button
              type="button"
              className="payment-save-btn"
              onClick={handleSave}
            >
              💾 Save Payment Settings
            </button>
          )}
        </div>
      )}
    </div>
  );
}
