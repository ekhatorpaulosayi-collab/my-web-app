import React, { useState } from 'react';
import { StatusPill } from '../../common/StatusPill';
import { getPaystackConfig, isPaystackEnabled } from '../../../utils/paystackSettings';

interface PaymentsSectionProps {
  onToast?: (message: string) => void;
  onOpenPaystackSetup: () => void;
}

export default function PaymentsSection({ onToast, onOpenPaystackSetup }: PaymentsSectionProps) {
  // Paystack state
  const paystackConfig = getPaystackConfig();
  const paystackConnected = isPaystackEnabled();
  const paystackState = paystackConnected ? 'connected' : 'not_connected';

  // Payment Link state
  const [paymentLinkEnabled, setPaymentLinkEnabled] = useState(() => {
    const stored = localStorage.getItem('storehouse-payment-link');
    return stored ? JSON.parse(stored).enabled : false;
  });
  const [paymentPageUrl, setPaymentPageUrl] = useState(() => {
    const stored = localStorage.getItem('storehouse-payment-link');
    return stored ? JSON.parse(stored).url : '';
  });

  console.debug('[Payments] status', { paystack: paystackState });

  const handleCreatePaymentLink = (e: React.MouseEvent) => {
    if (!paystackConnected) {
      e.preventDefault();
      onToast?.('⚠️ Connect Paystack first to create payment links');
      return;
    }
    // Link will open naturally via href, just show toast
    onToast?.('Opening Paystack Dashboard to create payment page...');
  };

  const handleCopyLink = async () => {
    if (!paymentPageUrl) {
      onToast?.('⚠️ No payment link configured yet');
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentPageUrl);
      onToast?.('✅ Payment link copied to clipboard!');
    } catch (err) {
      console.error('[Payments] copy failed', err);
      onToast?.('❌ Failed to copy link');
    }
  };

  return (
    <div className="bs-section-content">
      {/* Paystack Card */}
      <div className="payments-card">
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>
            Paystack Payment Integration
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            Accept card & bank transfer in Nigeria.
          </p>
        </div>
        <div className="actions">
          <StatusPill state={paystackState} />
          <button
            type="button"
            className="bs-btn-secondary"
            onClick={onOpenPaystackSetup}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            {paystackConnected ? 'Manage' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Paystack Setup Guide - Empty State */}
      {!paystackConnected && (
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          border: '1px solid #C7D2FE',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>🚀</span>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#312E81' }}>
              Quick Setup Guide
            </h4>
          </div>

          <div style={{ fontSize: '13px', color: '#4C1D95', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
              <span style={{
                background: '#818CF8',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                flexShrink: 0
              }}>1</span>
              <p style={{ margin: 0 }}>
                Create a free account at{' '}
                <a
                  href="https://paystack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4F46E5', textDecoration: 'underline' }}
                >
                  paystack.com
                </a>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
              <span style={{
                background: '#818CF8',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                flexShrink: 0
              }}>2</span>
              <p style={{ margin: 0 }}>
                Get your API keys from{' '}
                <a
                  href="https://dashboard.paystack.com/#/settings/developer"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4F46E5', textDecoration: 'underline' }}
                >
                  Dashboard → Settings → Developer
                </a>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
              <span style={{
                background: '#818CF8',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                flexShrink: 0
              }}>3</span>
              <p style={{ margin: 0 }}>
                Click <strong>"Connect"</strong> above and enter your keys
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{
                background: '#818CF8',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                flexShrink: 0
              }}>4</span>
              <p style={{ margin: 0 }}>
                Enable <strong>Test Mode</strong> first to try it out safely
              </p>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#4C1D95',
            display: 'flex',
            gap: '8px'
          }}>
            <span>💡</span>
            <span>
              <strong>Tip:</strong> Start with test keys (pk_test_...) to practice without real charges
            </span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid #E5E7EB', margin: '16px 0' }} />

      {/* Payment Link Card */}
      <div className="payments-card">
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>
            Payment Link (Easy Sharing)
          </h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280' }}>
            Create a simple checkout link you can share.
          </p>
          {!paystackConnected && (
            <p style={{ margin: 0, fontSize: '12px', color: '#DC2626' }}>
              ⚠️ Connect Paystack first to enable payment links
            </p>
          )}
          {paymentPageUrl && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#059669', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {paymentPageUrl}
            </p>
          )}
        </div>
        <div className="actions">
          <a
            href="https://dashboard.paystack.com/payment-pages"
            target="_blank"
            rel="noopener noreferrer"
            className={`bs-btn-secondary ${!paystackConnected ? 'disabled' : ''}`}
            onClick={handleCreatePaymentLink}
            style={{
              fontSize: '13px',
              padding: '6px 12px',
              textDecoration: 'none',
              display: 'inline-block',
              pointerEvents: !paystackConnected ? 'none' : 'auto',
              opacity: !paystackConnected ? 0.5 : 1
            }}
          >
            Create Link
          </a>
          {paymentPageUrl && (
            <button
              type="button"
              className="bs-btn-secondary"
              onClick={handleCopyLink}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              📋 Copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
