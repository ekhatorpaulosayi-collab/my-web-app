import React from 'react';
import { AlertCircle, Volume2, VolumeX, MessageSquare, X } from 'lucide-react';

interface WaitingCustomerBannerProps {
  waitingCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onGoToChats: () => void;
  onDismiss?: () => void;
}

const WaitingCustomerBanner: React.FC<WaitingCustomerBannerProps> = ({
  waitingCount,
  isMuted,
  onToggleMute,
  onGoToChats,
  onDismiss
}) => {
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
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        borderRadius: '8px',
        margin: '8px 16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: '8px',
        zIndex: 1000
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }
        .mute-button:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }
        .mute-button:active {
          background: rgba(255, 255, 255, 0.4) !important;
          transform: scale(0.98);
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertCircle size={24} style={{ animation: 'bounce 1s infinite' }} />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            {waitingCount} customer{waitingCount !== 1 ? 's' : ''} waiting for help!
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            They requested assistance and are waiting for you to respond
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleMute();
          }}
          className="mute-button"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'white',
            transition: 'background 0.2s',
            position: 'relative',
            zIndex: 1001
          }}
          type="button"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span style={{ fontSize: '14px' }}>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          onClick={onGoToChats}
          style={{
            background: 'white',
            color: '#DC2626',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <MessageSquare size={18} />
          Go to Customer Chats
        </button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              transition: 'background 0.2s',
              marginLeft: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            title="Dismiss for this session"
            type="button"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WaitingCustomerBanner;