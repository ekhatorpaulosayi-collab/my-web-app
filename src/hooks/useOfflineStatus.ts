/**
 * useOfflineStatus Hook
 * Tracks online/offline status and provides utilities
 * Safe, non-breaking addition to existing offline infrastructure
 */

import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineTime: Date | null;
  offlineDuration: number; // in seconds
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineTime: null,
    offlineDuration: 0
  });

  useEffect(() => {
    let offlineStartTime: number | null = null;

    const handleOnline = () => {
      const now = new Date();
      const duration = offlineStartTime ? (now.getTime() - offlineStartTime) / 1000 : 0;

      setStatus({
        isOnline: true,
        wasOffline: true,
        lastOnlineTime: now,
        offlineDuration: duration
      });

      offlineStartTime = null;

      // Auto-clear wasOffline flag after 5 seconds
      setTimeout(() => {
        setStatus(prev => ({ ...prev, wasOffline: false }));
      }, 5000);
    };

    const handleOffline = () => {
      offlineStartTime = Date.now();
      setStatus(prev => ({
        ...prev,
        isOnline: false
      }));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/**
 * Get pending operations count from all queues
 */
export function usePendingOperations() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = () => {
      try {
        // Check sales queue
        const salesQueue = localStorage.getItem('storehouse:pending-sales:v1');
        const salesCount = salesQueue ? JSON.parse(salesQueue).length : 0;

        // Check products queue (we'll create this)
        const productsQueue = localStorage.getItem('storehouse:pending-products:v1');
        const productsCount = productsQueue ? JSON.parse(productsQueue).length : 0;

        // Check customers queue (we'll create this)
        const customersQueue = localStorage.getItem('storehouse:pending-customers:v1');
        const customersCount = customersQueue ? JSON.parse(customersQueue).length : 0;

        setPendingCount(salesCount + productsCount + customersCount);
      } catch (err) {
        console.error('[useOfflineStatus] Error checking pending operations:', err);
        setPendingCount(0);
      }
    };

    // Check immediately
    checkPending();

    // Check every 5 seconds
    const interval = setInterval(checkPending, 5000);

    // Listen for storage changes (when queue is updated)
    window.addEventListener('storage', checkPending);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkPending);
    };
  }, []);

  return pendingCount;
}
