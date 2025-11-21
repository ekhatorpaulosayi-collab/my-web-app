import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '../contexts/BusinessProfile';
import '../styles/PaymentLinkCard.css';

/**
 * PaymentLinkCard - Quick access to share payment link
 *
 * Shows on the main dashboard for easy sharing with customers
 */
export default function PaymentLinkCard({ onOpenSettings }) {
  const { profile } = useBusinessProfile();
  const [paymentLink, setPaymentLink] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load payment link settings
  useEffect(() => {
    const loadPaymentLink = () => {
      try {
        const stored = localStorage.getItem('storehouse-payment-link');
        if (stored) {
          const data = JSON.parse(stored);
          if (data.enabled && data.url) {
            setPaymentLink(data);
          }
        }
      } catch (error) {
        console.error('Failed to load payment link:', error);
      }
    };

    loadPaymentLink();

    // Listen for storage changes (when settings are updated)
    window.addEventListener('storage', loadPaymentLink);

    // Custom event when settings are saved
    const handleSettingsUpdate = () => loadPaymentLink();
    window.addEventListener('payment-link-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', loadPaymentLink);
      window.removeEventListener('payment-link-updated', handleSettingsUpdate);
    };
  }, []);

  const handleCopyLink = async () => {
    if (!paymentLink?.url) return;

    try {
      await navigator.clipboard.writeText(paymentLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleShareWhatsApp = () => {
    if (!paymentLink?.url) return;

    const businessName = profile.businessName || 'My Store';
    const message = `Hi! 👋\n\nMake payments to *${businessName}* securely using this link:\n\n${paymentLink.url}\n\nThank you! 🙏`;
    const encodedMessage = encodeURIComponent(message);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile
      ? `whatsapp://send?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  // Don't show if not configured
  if (!paymentLink?.enabled || !paymentLink?.url) {
    return (
      <div className="payment-link-card payment-link-card-setup">
        <div className="payment-link-header">
          <h3 className="payment-link-title">📱 Share Payment Link</h3>
        </div>
        <div className="payment-link-body">
          <p className="payment-link-setup-text">
            Set up a payment link to receive payments from customers via WhatsApp
          </p>
          <button
            className="payment-link-setup-btn"
            onClick={onOpenSettings}
          >
            ⚙️ Configure Payment Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-link-card">
      <div className="payment-link-header">
        <h3 className="payment-link-title">📱 Share Payment Link</h3>
        <button
          className="payment-link-settings-icon"
          onClick={onOpenSettings}
          title="Configure payment link"
        >
          ⚙️
        </button>
      </div>

      <div className="payment-link-body">
        <div className="payment-link-url-display">
          <span className="payment-link-url">{paymentLink.url}</span>
        </div>

        <div className="payment-link-actions">
          <button
            className="payment-link-btn payment-link-btn-copy"
            onClick={handleCopyLink}
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
          <button
            className="payment-link-btn payment-link-btn-whatsapp"
            onClick={handleShareWhatsApp}
          >
            💬 Share on WhatsApp
          </button>
        </div>

        <p className="payment-link-help">
          Share this link with customers to receive payments directly
        </p>
      </div>
    </div>
  );
}
