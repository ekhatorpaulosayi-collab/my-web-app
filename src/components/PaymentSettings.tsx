import React, { useState, useEffect } from 'react';
import {
  getPaystackConfig,
  savePaystackConfig,
  validatePublicKey,
  type PaystackConfig
} from '../utils/paystackSettings';

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
      <div className="bs-field">
        <label className="bs-checkbox">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateField('enabled', e.target.checked)}
          />
          <span>Enable Paystack payment integration</span>
        </label>
        <p className="bs-help">
          Accept card and bank transfer payments via Paystack
        </p>
      </div>

      {config.enabled && (
        <>
          <div className="bs-field">
            <label className="bs-checkbox">
              <input
                type="checkbox"
                checked={config.testMode}
                onChange={(e) => updateField('testMode', e.target.checked)}
              />
              <span>Test Mode</span>
            </label>
            <p className="bs-help">
              Use test keys for development. Uncheck for live transactions.
            </p>
          </div>

          {config.testMode && (
            <div className="bs-alert bs-alert-warning" style={{ marginBottom: '16px' }}>
              ⚠️ Test mode active - Payments won't be charged
            </div>
          )}

          <div className="bs-field">
            <label htmlFor="paystack-test-key" className="bs-label">
              Paystack Test Public Key
            </label>
            <input
              id="paystack-test-key"
              type="text"
              className="bs-input"
              value={config.publicKeyTest}
              onChange={(e) => updateField('publicKeyTest', e.target.value)}
              placeholder="pk_test_..."
            />
            {config.publicKeyTest && testKeyValidation.message && (
              <small className={testKeyValidation.valid ? 'bs-help' : 'bs-error'}>
                {testKeyValidation.message}
              </small>
            )}
            <p className="bs-help" style={{ marginTop: '4px' }}>
              Get your test key from <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener noreferrer">Paystack Dashboard</a>
            </p>
          </div>

          <div className="bs-field">
            <label htmlFor="paystack-live-key" className="bs-label">
              Paystack Live Public Key
            </label>
            <input
              id="paystack-live-key"
              type="text"
              className="bs-input"
              value={config.publicKeyLive}
              onChange={(e) => updateField('publicKeyLive', e.target.value)}
              placeholder="pk_live_..."
            />
            {config.publicKeyLive && liveKeyValidation.message && (
              <small className={liveKeyValidation.valid ? 'bs-help' : 'bs-error'}>
                {liveKeyValidation.message}
              </small>
            )}
            <p className="bs-help" style={{ marginTop: '4px' }}>
              Only use live key when ready for real transactions
            </p>
          </div>

          {isDirty && (
            <button
              type="button"
              className="bs-btn bs-btn-primary"
              onClick={handleSave}
              style={{ marginTop: '12px' }}
            >
              Save Payment Settings
            </button>
          )}
        </>
      )}
    </div>
  );
}
