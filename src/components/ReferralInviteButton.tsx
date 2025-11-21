/**
 * Referral Invite Button
 * Share referral code via WhatsApp, SMS, or copy link
 */

import React, { useState, useCallback } from 'react';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';

interface ReferralInviteButtonProps {
  referralCode: string;
  businessName?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export function ReferralInviteButton({
  referralCode,
  businessName = 'Storehouse',
  variant = 'primary',
  fullWidth = false
}: ReferralInviteButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build referral message
  const buildMessage = () => {
    return `Hey! 👋

I've been using ${businessName} to manage my business inventory and sales. It's been amazing!

You should try it too - use my referral code to get started:

🎁 Code: ${referralCode}

Benefits you get:
✅ Easy inventory management
✅ Track sales & profits
✅ WhatsApp integration
✅ Customer credit tracking

Sign up here: ${window.location.origin}/signup?ref=${referralCode}

Let me know how it goes! 🚀`;
  };

  const handleShareWhatsApp = useCallback(() => {
    const message = buildMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  }, [referralCode, businessName]);

  const handleShareSMS = useCallback(() => {
    const message = buildMessage();
    const url = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = url;
    setShowShareMenu(false);
  }, [referralCode, businessName]);

  const handleCopyLink = useCallback(async () => {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy link');
    }
  }, [referralCode]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy code');
    }
  }, [referralCode]);

  // Use native share if available
  const handleNativeShare = useCallback(async () => {
    const message = buildMessage();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Storehouse',
          text: message,
        });
        setShowShareMenu(false);
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled:', err);
      }
    } else {
      // Fallback to menu
      setShowShareMenu(true);
    }
  }, [referralCode, businessName]);

  const buttonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    width: fullWidth ? '100%' : 'auto',
    transition: 'all 0.2s',
    ...(variant === 'primary' && {
      background: '#10b981',
      color: 'white',
    }),
    ...(variant === 'secondary' && {
      background: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
    }),
    ...(variant === 'outline' && {
      background: 'transparent',
      color: '#10b981',
      border: '2px solid #10b981',
    }),
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleNativeShare}
        style={buttonStyles}
        onMouseEnter={(e) => {
          if (variant === 'primary') {
            e.currentTarget.style.background = '#059669';
          }
        }}
        onMouseLeave={(e) => {
          if (variant === 'primary') {
            e.currentTarget.style.background = '#10b981';
          }
        }}
      >
        <Share2 size={18} />
        Invite Friends
      </button>

      {/* Share Menu */}
      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowShareMenu(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 999,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '8px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={handleShareWhatsApp}
              style={{
                width: '100%',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: 'none',
                background: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <MessageCircle size={20} color="#25D366" />
              Share via WhatsApp
            </button>

            <div style={{ height: '1px', background: '#e5e7eb', margin: '0 16px' }} />

            <button
              onClick={handleShareSMS}
              style={{
                width: '100%',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: 'none',
                background: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <MessageCircle size={20} color="#3b82f6" />
              Share via SMS
            </button>

            <div style={{ height: '1px', background: '#e5e7eb', margin: '0 16px' }} />

            <button
              onClick={handleCopyLink}
              style={{
                width: '100%',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: 'none',
                background: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              {copied ? <Check size={20} color="#10b981" /> : <Copy size={20} color="#6b7280" />}
              {copied ? 'Link Copied!' : 'Copy Referral Link'}
            </button>

            <div style={{ height: '1px', background: '#e5e7eb', margin: '0 16px' }} />

            <button
              onClick={handleCopyCode}
              style={{
                width: '100%',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: 'none',
                background: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              {copied ? <Check size={20} color="#10b981" /> : <Copy size={20} color="#6b7280" />}
              {copied ? 'Code Copied!' : `Copy Code: ${referralCode}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
