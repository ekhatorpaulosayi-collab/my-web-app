/**
 * Product Share Menu Component
 * Share products to Instagram, WhatsApp, Facebook, TikTok
 */

import React, { useState, useRef, useEffect } from 'react';
import { Share2, X } from 'lucide-react';
import { shareToInstagram, shareToWhatsApp, shareToFacebook, shareToTikTok, type ProductShareData } from '../utils/socialShare';
import { useBusinessProfile } from '../contexts/BusinessProfile';
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
}

export const ProductShareMenu: React.FC<ProductShareMenuProps> = ({ product, onClose }) => {
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { profile } = useBusinessProfile();

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

  const handleShare = async (platform: 'instagram' | 'whatsapp' | 'facebook' | 'tiktok') => {
    if (isSharing) return;

    setIsSharing(true);
    setMessage('');

    // Generate store URL from current page location
    // If we're on a storefront page, use that URL
    const currentPath = window.location.pathname;
    const isStorefront = currentPath.startsWith('/store/');

    let storeBaseUrl: string | undefined;
    if (isStorefront) {
      // Extract store slug from current URL
      const match = currentPath.match(/^\/store\/([^\/]+)/);
      if (match) {
        const storeSlug = match[1];
        storeBaseUrl = `${window.location.origin}/store/${storeSlug}`;
      }
    } else if (profile.storeUrl && profile.storeUrl.trim()) {
      // Use profile store URL if available
      storeBaseUrl = profile.storeUrl;
    }

    // Generate product-specific URL
    const productUrl = storeBaseUrl
      ? `${storeBaseUrl}?product=${product.id}`
      : undefined;

    // Prepare share data
    const shareData: ProductShareData = {
      name: product.name,
      price: product.price,
      description: product.description,
      imageUrl: product.imageUrl,
      storeUrl: productUrl, // Product-specific URL
      whatsappNumber: profile.whatsappNumber,
      instagramHandle: profile.instagramHandle,
      facebookPage: profile.facebookPage,
      storeName: profile.businessName
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
        case 'facebook':
          result = shareToFacebook(shareData);
          break;
        case 'tiktok':
          result = shareToTikTok(shareData);
          break;
      }

      if (result) {
        showMessage(result.message);

        // Close menu after short delay (except for Instagram which needs time to paste)
        if (platform !== 'instagram') {
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
    <div className="share-menu-overlay">
      <div ref={menuRef} className="share-menu-content">
        <div className="share-menu-header">
          <h3>Share Product</h3>
          <button onClick={onClose} className="share-menu-close" aria-label="Close">
            <X size={20} />
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

        <div className="share-menu-options">
          <button
            className="share-option instagram"
            onClick={() => handleShare('instagram')}
            disabled={isSharing}
          >
            <div className="share-option-icon">📷</div>
            <div className="share-option-info">
              <div className="share-option-name">Instagram</div>
              <div className="share-option-desc">Stories & Posts</div>
            </div>
          </button>

          <button
            className="share-option whatsapp"
            onClick={() => handleShare('whatsapp')}
            disabled={isSharing}
          >
            <div className="share-option-icon">💬</div>
            <div className="share-option-info">
              <div className="share-option-name">WhatsApp</div>
              <div className="share-option-desc">Status & Chat</div>
            </div>
          </button>

          <button
            className="share-option facebook"
            onClick={() => handleShare('facebook')}
            disabled={isSharing}
          >
            <div className="share-option-icon">📘</div>
            <div className="share-option-info">
              <div className="share-option-name">Facebook</div>
              <div className="share-option-desc">Posts & Marketplace</div>
            </div>
          </button>

          <button
            className="share-option tiktok"
            onClick={() => handleShare('tiktok')}
            disabled={isSharing}
          >
            <div className="share-option-icon">🎵</div>
            <div className="share-option-info">
              <div className="share-option-name">TikTok</div>
              <div className="share-option-desc">Videos & Shop</div>
            </div>
          </button>
        </div>

        {message && (
          <div className="share-menu-message">
            {message}
          </div>
        )}
      </div>
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
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  product,
  variant = 'icon',
  className = ''
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
        />
      )}
    </>
  );
};
