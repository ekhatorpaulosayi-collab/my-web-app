/**
 * OfflineBanner Component
 * Shows when user is offline with pending operations count
 * Provides manual sync button
 */

import React from 'react';
import { useOfflineStatus, usePendingOperations } from '../hooks/useOfflineStatus';

interface OfflineBannerProps {
  onSync?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onSync }) => {
  const { isOnline, wasOffline } = useOfflineStatus();
  const pendingCount = usePendingOperations();

  // Don't show if online and no pending operations
  if (isOnline && !wasOffline && pendingCount === 0) {
    return null;
  }

  // Back online banner (success message)
  if (wasOffline && isOnline) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        zIndex: 10000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>
            Back online! {pendingCount > 0 && `Syncing ${pendingCount} pending ${pendingCount === 1 ? 'operation' : 'operations'}...`}
          </span>
        </div>
      </div>
    );
  }

  // Offline banner (warning)
  if (!isOnline) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        color: 'white',
        padding: '12px 16px',
        zIndex: 10000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.3s ease-out'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📡</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                You're offline
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? 'operation' : 'operations'} waiting to sync`
                  : 'Changes will sync when you reconnect'
                }
              </div>
            </div>
          </div>

          {/* Retry/Sync Button - only show if we have a custom sync handler */}
          {onSync && pendingCount > 0 && (
            <button
              onClick={onSync}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#D97706',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEF3C7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              🔄 Retry Sync
            </button>
          )}
        </div>
      </div>
    );
  }

  // Pending operations banner (when online but have pending)
  if (isOnline && pendingCount > 0) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        zIndex: 10000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        animation: 'slideDown 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', animation: 'spin 2s linear infinite' }}>⏳</span>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>
            Syncing {pendingCount} pending {pendingCount === 1 ? 'operation' : 'operations'}...
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// Add animations via style tag
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
