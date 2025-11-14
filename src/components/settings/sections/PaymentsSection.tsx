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
