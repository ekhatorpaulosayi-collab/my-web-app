/**
 * Product Share Menu Component
 * Share products to Instagram, WhatsApp, Facebook, TikTok
 */

import React, { useState, useRef, useEffect } from 'react';
import { Share2, X } from 'lucide-react';
import { shareToInstagram, shareToWhatsApp, shareToWhatsAppStatus, shareToFacebook, shareToTikTok, type ProductShareData } from '../utils/socialShare';
import { useBusinessProfile } from '../contexts/BusinessProfile';
import { ShareInstructionsModal } from './ShareInstructionsModal';
import './ProductShareMenu.css';

interface ProductShareMenuProps {
  product: {
    id: string | number;
    name: string;
    price: number; // in Naira
    description?: string;
    imageUrl?: string;
  };
  onClose?: () => void;
  storeUrl?: string; // Optional: override store URL (for public storefront pages)
  storeName?: string; // Optional: override store name (for public storefront pages)
  whatsappNumber?: string; // Optional: override WhatsApp number (for public storefront pages)
}

export const ProductShareMenu: React.FC<ProductShareMenuProps> = ({
  product,
  onClose,
  storeUrl,
  storeName,
  whatsappNumber
}) => {
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [modalData, setModalData] = useState<{
    platform: 'instagram' | 'tiktok' | 'whatsapp';
    caption: string;
    imageUrl?: string;
    productName?: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { profile } = useBusinessProfile();

  // Debug log to see exact price value
  console.log('[ProductShareMenu] Received product price:', product.price, 'Type:', typeof product.price, 'Full product:', product);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const showMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  const handleShare = async (platform: 'instagram' | 'whatsapp' | 'whatsapp-status' | 'facebook' | 'tiktok') => {
    if (isSharing) return;

    setIsSharing(true);
    setMessage('');

    // Generate store URL from current page location
    // If we're on a storefront page, use that URL
    const currentPath = window.location.pathname;
    const isStorefront = currentPath.startsWith('/store/');

    let storeBaseUrl: string | undefined;

    // Priority 1: Use explicitly provided storeUrl prop (from StorefrontPage)
    if (storeUrl) {
      // Remove query params to get base URL
      storeBaseUrl = storeUrl.split('?')[0];
    }
    // Priority 2: Extract from current URL if on storefront
    else if (isStorefront) {
      const match = currentPath.match(/^\/store\/([^\/]+)/);
      if (match) {
        const storeSlug = match[1];
        storeBaseUrl = `${window.location.origin}/store/${storeSlug}`;
      }
    }
    // Priority 3: Use profile store URL if available
    else if (profile.storeUrl && profile.storeUrl.trim()) {
      storeBaseUrl = profile.storeUrl;
    }

    // Generate product-specific URL
    const productUrl = storeBaseUrl
      ? `${storeBaseUrl}?product=${product.id}`
      : undefined;

    // Prepare share data with prop overrides
    const shareData: ProductShareData = {
      name: product.name,
      price: product.price,
      description: product.description,
      imageUrl: product.imageUrl,
      storeUrl: productUrl, // Product-specific URL
      whatsappNumber: whatsappNumber || profile.whatsappNumber,
      instagramHandle: profile.instagramHandle,
      facebookPage: profile.facebookPage,
      storeName: storeName || profile.businessName
    };

    try {
      let result;

      switch (platform) {
        case 'instagram':
          result = await shareToInstagram(shareData);
          break;
        case 'whatsapp':
          result = shareToWhatsApp(shareData);
          break;
        case 'whatsapp-status':
          result = await shareToWhatsAppStatus(shareData);
          break;
        case 'facebook':
          result = await shareToFacebook(shareData);
          break;
        case 'tiktok':
          result = shareToTikTok(shareData);
          break;
      }

      if (result) {
        // Show modal for Instagram, TikTok, and WhatsApp Status with detailed instructions
        if ((platform === 'instagram' || platform === 'tiktok' || platform === 'whatsapp-status') && result.caption) {
          setModalData({
            platform: platform === 'whatsapp-status' ? 'whatsapp' : platform as 'instagram' | 'tiktok',
            caption: result.caption,
            imageUrl: result.imageUrl,
            productName: result.productName
          });
          setShowInstructionsModal(true);
          // Don't close menu immediately - modal will handle this
        } else {
          // For other platforms, use old toast message behavior
          showMessage(result.message);

          // Close menu after short delay
          setTimeout(() => onClose?.(), 1500);
        }
      }
    } catch (error) {
      console.error(`[Share ${platform}] Error:`, error);
      showMessage(`❌ Failed to share to ${platform}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      className="share-menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-menu-title"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      {!showInstructionsModal && (
        <div ref={menuRef} className="share-menu-content" role="document">
          <div className="share-menu-header">
            <h3 id="share-menu-title">Share Product</h3>
            <button
              onClick={onClose}
              className="share-menu-close"
              aria-label="Close share dialog"
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

        <div className="share-menu-product">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="share-menu-product-image" />
          )}
          <div className="share-menu-product-info">
            <div className="share-menu-product-name">{product.name}</div>
            <div className="share-menu-product-price">₦{product.price.toLocaleString()}</div>
          </div>
        </div>

        <div className="share-menu-options" role="group" aria-label="Social media sharing options">
          <button
            className="share-option whatsapp"
            onClick={() => handleShare('whatsapp')}
            disabled={isSharing}
            type="button"
            aria-label="Share to WhatsApp - Send to your contacts"
            aria-disabled={isSharing}
          >
            <div className="share-option-icon" role="img" aria-label="WhatsApp">💬</div>
            <div className="share-option-info">
              <div className="share-option-name">WhatsApp</div>
              <div className="share-option-desc">Send to Contacts</div>
            </div>
          </button>

          <button
            className="share-option instagram"
            onClick={() => handleShare('instagram')}
            disabled={isSharing}
            type="button"
            aria-label="Share to Instagram - Post to stories and feed"
            aria-disabled={isSharing}
          >
            <div className="share-option-icon" role="img" aria-label="Instagram">📷</div>
            <div className="share-option-info">
              <div className="share-option-name">Instagram</div>
              <div className="share-option-desc">Stories & Posts</div>
            </div>
          </button>

          <button
            className="share-option facebook"
            onClick={() => handleShare('facebook')}
            disabled={isSharing}
            type="button"
            aria-label="Share to Facebook - Post to timeline and marketplace"
            aria-disabled={isSharing}
          >
            <div className="share-option-icon" role="img" aria-label="Facebook">📘</div>
            <div className="share-option-info">
              <div className="share-option-name">Facebook</div>
              <div className="share-option-desc">Posts & Marketplace</div>
            </div>
          </button>
        </div>

        {message && (
          <div
            className="share-menu-message"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {message}
          </div>
        )}

        {isSharing && (
          <div
            className="share-menu-loading"
            role="status"
            aria-live="polite"
            aria-label="Preparing to share product"
          >
            <div className="share-loading-spinner" aria-hidden="true"></div>
            <span>Preparing to share...</span>
          </div>
        )}
      </div>
      )}

      {/* Share Instructions Modal */}
      {showInstructionsModal && modalData && (
        <ShareInstructionsModal
          platform={modalData.platform}
          caption={modalData.caption}
          imageUrl={modalData.imageUrl}
          productName={modalData.productName}
          onClose={() => {
            setShowInstructionsModal(false);
            setModalData(null);
            onClose?.(); // Also close the share menu
          }}
        />
      )}
    </div>
  );
};

/**
 * Simple share button component
 */
interface ShareButtonProps {
  product: {
    id: string | number;
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
  };
  variant?: 'icon' | 'text' | 'full';
  className?: string;
  storeUrl?: string; // Optional: override store URL (for public storefront pages)
  storeName?: string; // Optional: override store name (for public storefront pages)
  whatsappNumber?: string; // Optional: override WhatsApp number (for public storefront pages)
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  product,
  variant = 'icon',
  className = '',
  storeUrl,
  storeName,
  whatsappNumber
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setShowMenu(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`share-button share-button-${variant} ${className}`}
        aria-label="Share product"
        title="Share to social media"
      >
        <Share2 size={variant === 'icon' ? 18 : 16} />
        {variant === 'text' && <span>Share</span>}
        {variant === 'full' && <span>Share to Social Media</span>}
      </button>

      {showMenu && (
        <ProductShareMenu
          product={product}
          onClose={() => setShowMenu(false)}
          storeUrl={storeUrl}
          storeName={storeName}
          whatsappNumber={whatsappNumber}
        />
      )}
    </>
  );
};
