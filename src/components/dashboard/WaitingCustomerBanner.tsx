import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';

interface WaitingCustomerBannerProps {
  waitingCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onGoToChats: () => void;
  onDismiss?: () => void;
  audioBlocked?: boolean;
  onEnableAudio?: () => void;
}

const WaitingCustomerBanner: React.FC<WaitingCustomerBannerProps> = ({
  waitingCount,
  isMuted,
  onToggleMute,
  onGoToChats,
  onDismiss,
  audioBlocked = false,
  onEnableAudio
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('waiting-customer-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('waiting-customer-banner-dismissed', 'true');
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="waiting-customer-banner"
      style={{
        background: 'linear-gradient(90deg, #DC2626, #991B1B)',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '8px',
        margin: '8px 16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: '8px',
        zIndex: 1000
      }}
    >
      <style>{`
        @keyframes whitePulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        .waiting-customer-banner .mute-button:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }
        .waiting-customer-banner .mute-button:active {
          background: rgba(255, 255, 255, 0.4) !important;
        }
        .waiting-customer-banner .view-chats-btn:hover {
          background: #f5f5f5 !important;
        }
        .waiting-customer-banner .dismiss-btn:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* White pulsing dot with opacity animation */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'white',
            animation: 'whitePulse 1.5s ease-in-out infinite',
            flexShrink: 0
          }}
        />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px', lineHeight: '1.2' }}>
            {waitingCount} customer{waitingCount !== 1 ? 's' : ''} waiting
          </div>
          {isMuted && !audioBlocked && (
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
              Tap speaker to enable sound
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Mute/Unmute toggle button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (audioBlocked && onEnableAudio) {
              onEnableAudio();
            } else {
              onToggleMute();
            }
          }}
          className="mute-button"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'background 0.2s',
            padding: 0
          }}
          type="button"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* View chats button */}
        <button
          onClick={onGoToChats}
          className="view-chats-btn"
          style={{
            background: 'white',
            color: '#DC2626',
            border: 'none',
            borderRadius: '6px',
            padding: '0 14px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          View chats
        </button>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="dismiss-btn"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'background 0.2s',
            padding: 0
          }}
          title="Dismiss for this session"
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default WaitingCustomerBanner;