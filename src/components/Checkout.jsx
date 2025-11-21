import React, { useState, useEffect } from 'react';
import {
  getPaystackConfig,
  getActivePublicKey,
  isPaystackEnabled,
  loadPaystackScript
} from '../utils/paystackSettings';
import '../styles/Checkout.css';

/**
 * Checkout Component
 *
 * Handles payment processing via Paystack
 *
 * @param {string} productName - Name of product being purchased
 * @param {number} amount - Amount in Naira
 * @param {function} onSuccess - Callback when payment succeeds
 * @param {function} onClose - Callback when checkout is closed
 */
export default function Checkout({ productName, amount, onSuccess, onClose }) {
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [config, setConfig] = useState(null);

  // Load Paystack configuration and script on mount
  useEffect(() => {
    const loadConfig = async () => {
      const paystackConfig = getPaystackConfig();
      setConfig(paystackConfig);

      // Check if Paystack is enabled
      if (!isPaystackEnabled()) {
        setError('Payment not configured. Please contact the store owner.');
        return;
      }

      // Load Paystack script
      const loaded = await loadPaystackScript();
      if (loaded) {
        setScriptLoaded(true);
      } else {
        setError('Failed to load payment system. Please refresh and try again.');
      }
    };

    loadConfig();
  }, []);

  // Validate email
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle payment
  const handlePayment = async () => {
    // Validate email
    if (!customerEmail || !isValidEmail(customerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Get active public key based on test mode
      const publicKey = getActivePublicKey();

      if (!publicKey) {
        setError('Payment system not configured');
        setIsLoading(false);
        return;
      }

      // Check if Paystack script is loaded
      if (!window.PaystackPop) {
        setError('Payment system not ready. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      // Generate unique reference
      const reference = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Initialize Paystack
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: customerEmail,
        amount: Math.round(amount * 100), // Convert to kobo (smallest currency unit)
        currency: 'NGN',
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: 'Product',
              variable_name: 'product_name',
              value: productName
            }
          ]
        },
        callback: function(response) {
          // Payment successful
          setIsLoading(false);

          // Call success callback with payment data
          if (onSuccess) {
            onSuccess({
              reference: response.reference,
              status: response.status,
              trans: response.trans,
              transaction: response.transaction,
              message: response.message,
              amount: amount,
              email: customerEmail,
              productName: productName
            });
          }
        },
        onClose: function() {
          // User closed payment modal
          setIsLoading(false);
          setError('Payment cancelled');
        }
      });

      // Open Paystack payment modal
      handler.openIframe();

    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to initialize payment. Please try again.');
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="checkout-header">
          <h2 className="checkout-title">Complete Your Purchase</h2>
          <button
            className="checkout-close"
            onClick={onClose}
            aria-label="Close checkout"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="checkout-body">
          {/* Order Summary */}
          <div className="order-summary">
            <h3 className="summary-title">Order Summary</h3>
            <div className="summary-item">
              <span className="item-name">{productName}</span>
              <span className="item-price">{formatCurrency(amount)}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-total">
              <span className="total-label">Total</span>
              <span className="total-amount">{formatCurrency(amount)}</span>
            </div>
          </div>

          {/* Test Mode Banner */}
          {config?.testMode && (
            <div className="checkout-test-banner">
              <span className="test-icon">⚠️</span>
              <div className="test-content">
                <strong>Test Mode</strong>
                <p>This is a test payment. No charges will be made.</p>
              </div>
            </div>
          )}

          {/* Customer Email */}
          <div className="checkout-field">
            <label htmlFor="customer-email" className="checkout-label">
              Email Address
            </label>
            <input
              id="customer-email"
              type="email"
              className={`checkout-input ${error && !isValidEmail(customerEmail) ? 'input-error' : ''}`}
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                setError('');
              }}
              placeholder="customer@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
            <p className="checkout-hint">
              Payment receipt will be sent to this email
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="checkout-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Payment Info */}
          <div className="payment-info">
            <div className="info-icon">🔒</div>
            <div className="info-content">
              <p className="info-text">
                Secure payment powered by <strong>Paystack</strong>
              </p>
              <p className="info-subtext">
                We accept cards, bank transfers, and mobile money
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="checkout-footer">
          <button
            type="button"
            className="checkout-btn checkout-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="checkout-btn checkout-btn-pay"
            onClick={handlePayment}
            disabled={isLoading || !scriptLoaded || !customerEmail}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <span className="btn-icon">💳</span>
                Pay {formatCurrency(amount)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
