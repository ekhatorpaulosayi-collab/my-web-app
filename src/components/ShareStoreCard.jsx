import React, { useState } from 'react';
import { getStoreUrl } from '../utils/storeSlug';
import { useBusinessProfile } from '../contexts/BusinessProfile';
import '../styles/ShareStoreCard.css';

export default function ShareStoreCard({ onOpenSettings }) {
  const { profile } = useBusinessProfile();
  const [copied, setCopied] = useState(false);

  // Don't show card if user hasn't set business name yet
  if (!profile.businessName || profile.businessName.trim() === '') {
    return (
      <div className="share-store-card share-store-card-setup">
        <div className="setup-content">
          <span className="setup-icon">📱</span>
          <div className="setup-text">
            <h3>Get Your Shareable Store Link</h3>
            <p>Set your business name in Settings to get a unique link you can share with customers!</p>
          </div>
          <button
            className="setup-button"
            onClick={onOpenSettings}
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  const storeUrl = getStoreUrl();
  const storeName = profile.businessName || 'My Store';

  // Copy link to clipboard
  const copyStoreLink = async () => {
    try {
      // Modern clipboard API (works on most browsers)
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Fallback for older browsers or iOS
      try {
        const input = document.createElement('input');
        input.value = storeUrl;
        input.style.position = 'fixed';
        input.style.top = '0';
        input.style.left = '0';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices

        const successful = document.execCommand('copy');
        document.body.removeChild(input);

        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('Copy failed');
        }
      } catch (_fallbackErr) {
        // Last resort: show the URL and tell user to copy manually
        alert(`Copy this link:\n\n${storeUrl}`);
      }
    }
  };

  // Share on WhatsApp
  const shareStoreOnWhatsApp = () => {
    const message = `🏪 *${storeName}*\n\n` +
      `🛍️ Browse all my products!\n\n` +
      `✨ Easy ordering via WhatsApp\n` +
      `💳 Pay with card or bank transfer\n` +
      `📦 Fast delivery across Nigeria\n\n` +
      `👉 Visit store: ${storeUrl}\n\n` +
      `🔥 Start shopping now!`;

    const fullMessage = message + '\n\n' + storeUrl;

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Try to open WhatsApp
    const whatsappWindow = window.open(whatsappUrl, '_blank');

    // Fallback: If popup blocked or WhatsApp not available, copy to clipboard
    setTimeout(() => {
      if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
        // WhatsApp failed to open - fallback to clipboard
        navigator.clipboard.writeText(fullMessage).then(() => {
          alert(
            '✅ Message copied to clipboard!\n\n' +
            'Now open WhatsApp and paste it to share with your contacts.'
          );
        }).catch(() => {
          // Old browser fallback
          const textArea = document.createElement('textarea');
          textArea.value = fullMessage;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert(
            '✅ Message copied!\n\n' +
            'Now open WhatsApp and paste it to share with your contacts.'
          );
        });
      }
    }, 1000);
  };

  // Truncate URL for display if too long
  const displayUrl = storeUrl.length > 50 ? storeUrl.substring(0, 47) + '...' : storeUrl;

  return (
    <div className="share-store-card">
      <h3 className="share-store-title">
        📱 Share Your Store
      </h3>

      <div className="store-url-display" title={storeUrl}>
        {displayUrl}
      </div>

      <div className="share-buttons">
        <button
          className="share-button copy-button"
          onClick={copyStoreLink}
        >
          {copied ? '✓ Copied!' : '📋 Copy Link'}
        </button>

        <button
          className="share-button whatsapp-button"
          onClick={shareStoreOnWhatsApp}
        >
          💬 WhatsApp
        </button>
      </div>

      <p className="help-text">
        💡 Send this link to customers so they can browse all your products!
      </p>
    </div>
  );
}
