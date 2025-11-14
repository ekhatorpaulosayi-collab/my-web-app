import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import BusinessSettings from '../components/BusinessSettings';
import Checkout from '../components/Checkout';
import {
  getPaystackConfig,
  isPaystackEnabled
} from '../utils/paystackSettings';
import '../styles/TestPayment.css';

/**
 * Test Payment Page
 *
 * A complete demo page to test Paystack integration
 */
export default function TestPayment({ onBack }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [config, setConfig] = useState(null);
  const [paystackEnabled, setPaystackEnabled] = useState(false);

  // Load Paystack configuration
  useEffect(() => {
    loadConfig();
  }, []);

  // Reload config when settings modal closes
  useEffect(() => {
    if (!showSettings) {
      loadConfig();
    }
  }, [showSettings]);

  const loadConfig = () => {
    const paystackConfig = getPaystackConfig();
    setConfig(paystackConfig);
    setPaystackEnabled(isPaystackEnabled());
  };

  const handlePaymentSuccess = (paymentData) => {
    console.log('✅ Payment successful!', paymentData);

    // Show success alert
    alert(
      `🎉 Payment Successful!\n\n` +
      `Reference: ${paymentData.reference}\n` +
      `Amount: ₦${paymentData.amount.toLocaleString()}\n` +
      `Email: ${paymentData.email}\n` +
      `Product: ${paymentData.productName}`
    );

    setShowCheckout(false);
  };

  const handleBuyNow = () => {
    if (!paystackEnabled) {
      alert('⚠️ Paystack is not configured.\n\nPlease click "Business Settings" to set up your payment keys.');
      setShowSettings(true);
      return;
    }

    setShowCheckout(true);
  };

  return (
    <div className="test-payment-page">
      {/* Header */}
      <header className="test-header">
        <div className="test-header-content">
          <h1 className="test-title">🧪 Paystack Integration Test</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {onBack && (
              <button
                className="settings-btn"
                onClick={onBack}
                style={{ background: 'rgba(255, 255, 255, 0.9)' }}
              >
                ← Back to App
              </button>
            )}
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={20} />
              Business Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="test-content">
        {/* Status Card */}
        <div className="status-card">
          <h2 className="status-title">Payment System Status</h2>

          <div className="status-items">
            {/* Paystack Status */}
            <div className="status-item">
              <span className="status-label">Paystack Integration:</span>
              <span className={`status-badge ${paystackEnabled ? 'badge-success' : 'badge-error'}`}>
                {paystackEnabled ? '✅ Enabled' : '❌ Not Configured'}
              </span>
            </div>

            {/* Mode Status */}
            {config?.enabled && (
              <div className="status-item">
                <span className="status-label">Payment Mode:</span>
                <span className={`status-badge ${config.testMode ? 'badge-warning' : 'badge-live'}`}>
                  {config.testMode ? '🧪 TEST MODE' : '🔴 LIVE MODE'}
                </span>
              </div>
            )}

            {/* Active Key */}
            {config?.enabled && (
              <div className="status-item">
                <span className="status-label">Active Key:</span>
                <span className="status-value">
                  {config.testMode
                    ? (config.publicKeyTest ? `${config.publicKeyTest.substring(0, 20)}...` : 'Not set')
                    : (config.publicKeyLive ? `${config.publicKeyLive.substring(0, 20)}...` : 'Not set')
                  }
                </span>
              </div>
            )}
          </div>

          {!paystackEnabled && (
            <div className="status-warning">
              <span className="warning-icon">⚠️</span>
              <div>
                <strong>Setup Required</strong>
                <p>Click "Business Settings" above to configure your Paystack API keys</p>
              </div>
            </div>
          )}
        </div>

        {/* Product Card */}
        <div className="product-card">
          <div className="product-image">
            <div className="product-image-placeholder">
              📦
            </div>
          </div>

          <div className="product-details">
            <h3 className="product-name">Sample Product</h3>
            <p className="product-description">
              Premium wireless headphones with noise cancellation
            </p>

            <div className="product-price">
              <span className="price-label">Price:</span>
              <span className="price-amount">₦5,000</span>
            </div>

            <button
              className="buy-now-btn"
              onClick={handleBuyNow}
            >
              <span className="btn-icon">💳</span>
              Buy Now - ₦5,000
            </button>
          </div>
        </div>

        {/* Test Cards Info */}
        {config?.testMode && (
          <div className="test-cards-info">
            <h3 className="info-title">🧪 Test Cards</h3>
            <p className="info-subtitle">
              Use these cards to test payments in test mode
            </p>

            <div className="test-cards-grid">
              {/* Success Card */}
              <div className="test-card-item">
                <div className="card-header">
                  <span className="card-badge badge-success">✓ Success</span>
                </div>
                <div className="card-details">
                  <div className="card-field">
                    <span className="field-label">Card Number:</span>
                    <code className="field-value">4084 0840 8408 4081</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">Expiry:</span>
                    <code className="field-value">12/26</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">CVV:</span>
                    <code className="field-value">408</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">PIN:</span>
                    <code className="field-value">1234</code>
                  </div>
                </div>
              </div>

              {/* Declined Card */}
              <div className="test-card-item">
                <div className="card-header">
                  <span className="card-badge badge-error">✗ Declined</span>
                </div>
                <div className="card-details">
                  <div className="card-field">
                    <span className="field-label">Card Number:</span>
                    <code className="field-value">5060 6666 6666 6666</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">Expiry:</span>
                    <code className="field-value">12/26</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">CVV:</span>
                    <code className="field-value">123</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">PIN:</span>
                    <code className="field-value">1234</code>
                  </div>
                </div>
              </div>

              {/* Insufficient Funds */}
              <div className="test-card-item">
                <div className="card-header">
                  <span className="card-badge badge-warning">⚠ Insufficient</span>
                </div>
                <div className="card-details">
                  <div className="card-field">
                    <span className="field-label">Card Number:</span>
                    <code className="field-value">4084 0840 8408 4084</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">Expiry:</span>
                    <code className="field-value">12/26</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">CVV:</span>
                    <code className="field-value">408</code>
                  </div>
                  <div className="card-field">
                    <span className="field-label">PIN:</span>
                    <code className="field-value">1234</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-card">
          <h3 className="instructions-title">📚 How to Test</h3>
          <ol className="instructions-list">
            <li>Click <strong>"Business Settings"</strong> button above</li>
            <li>Expand <strong>"💳 Payment Integration"</strong> section</li>
            <li>Enable Paystack and check <strong>"Test Mode"</strong></li>
            <li>Enter your test public key: <code>pk_test_xxx...</code></li>
            <li>Save settings and close the modal</li>
            <li>Click <strong>"Buy Now"</strong> on the sample product</li>
            <li>Enter any email and use the test card above</li>
            <li>Complete the payment flow</li>
          </ol>

          <div className="instructions-note">
            <span className="note-icon">💡</span>
            <p>
              Get your test keys from{' '}
              <a
                href="https://dashboard.paystack.com/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="note-link"
              >
                Paystack Dashboard → Settings → Developer/API
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Business Settings Modal */}
      {showSettings && (
        <BusinessSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onToast={(message) => console.log('Toast:', message)}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <Checkout
          productName="Sample Product"
          amount={5000}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
