import React, { useState, useEffect } from 'react';
import { getStoreUrl, getStoreSlug } from '../utils/storeSlug';
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
    } catch (err) {
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
      } catch (fallbackErr) {
        // Last resort: show the URL and tell user to copy manually
        alert(`Copy this link:\n\n${storeUrl}`);
      }
    }
  };

  // Share on WhatsApp
  const shareStoreOnWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi! 👋\n\n` +
      `Check out ${storeName}:\n` +
      `${storeUrl}\n\n` +
      `Browse all my products and pay securely with your card! 🛍️💳`
    );

    // This works on both mobile (opens WhatsApp app) and desktop (opens WhatsApp Web)
    const whatsappUrl = `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
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
