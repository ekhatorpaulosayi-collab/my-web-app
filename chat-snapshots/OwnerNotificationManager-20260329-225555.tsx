import React, { useEffect, useState, useRef } from 'react';
import { Bell, BellOff, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ownerNotificationService, WaitingConversation } from '../../services/ownerNotificationService';

interface OwnerNotificationManagerProps {
  onNavigateToConversations?: () => void;
}

export default function OwnerNotificationManager({
  onNavigateToConversations
}: OwnerNotificationManagerProps) {
  const { currentUser: user } = useAuth();
  const [waitingConversations, setWaitingConversations] = useState<WaitingConversation[]>([]);
  const [isMuted, setIsMuted] = useState(ownerNotificationService.isMuted());
  const [showBanner, setShowBanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Request notification permission on first load
    const initNotifications = async () => {
      const permission = await ownerNotificationService.requestPermission();
      setHasPermission(permission);

      if (!permission && !localStorage.getItem('notification_permission_asked')) {
        localStorage.setItem('notification_permission_asked', 'true');
        // Show a friendly prompt explaining why notifications are useful
      }
    };

    initNotifications();

    // Poll for waiting conversations
    const pollForWaitingConversations = async () => {
      try {
        console.log('[OwnerNotificationManager] Polling for user:', user.uid);
        const conversations = await ownerNotificationService.getWaitingConversations(user.uid);
        console.log('[OwnerNotificationManager] Poll result:', conversations.length, 'waiting conversations');
        setWaitingConversations(conversations);
        setShowBanner(conversations.length > 0);

        // Handle notifications for new waiting conversations
        await ownerNotificationService.handleNewWaitingConversations(conversations);
      } catch (error) {
        console.error('[OwnerNotificationManager] Error polling:', error);
      }
    };

    // Initial poll
    pollForWaitingConversations();

    // Set up polling interval (every 5 seconds)
    pollIntervalRef.current = setInterval(pollForWaitingConversations, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      ownerNotificationService.dispose();
    };
  }, [user]);

  const handleToggleMute = () => {
    const newMutedState = ownerNotificationService.toggleMute();
    setIsMuted(newMutedState);
  };

  const handleBannerClick = () => {
    if (onNavigateToConversations) {
      onNavigateToConversations();
    } else {
      // Fallback navigation
      window.location.href = '/dashboard/conversations';
    }
  };

  // Notification badge for sidebar/nav (to be integrated where needed)
  const notificationBadgeCount = waitingConversations.length;

  return (
    <>
      {/* Top Banner Alert */}
      {showBanner && waitingConversations.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg cursor-pointer"
          onClick={handleBannerClick}
          style={{ animation: 'pulse 2s infinite' }}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 animate-bounce" />
              <span className="font-semibold">
                You have {waitingConversations.length} customer{waitingConversations.length > 1 ? 's' : ''} waiting for you!
              </span>
              <span className="text-sm opacity-90">
                {waitingConversations[0] && (
                  <>
                    Waiting for {ownerNotificationService.getElapsedTime(waitingConversations[0].waiting_for_owner_since)}
                  </>
                )}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBanner(false);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mute/Unmute Toggle Button (floating) */}
      <button
        onClick={handleToggleMute}
        className="fixed bottom-4 right-4 z-40 bg-white shadow-lg rounded-full p-3 hover:shadow-xl transition-all"
        title={isMuted ? "Unmute notifications" : "Mute notifications"}
      >
        {isMuted ? (
          <BellOff className="h-5 w-5 text-gray-500" />
        ) : (
          <Bell className="h-5 w-5 text-blue-600" />
        )}
        {notificationBadgeCount > 0 && !isMuted && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notificationBadgeCount}
          </span>
        )}
      </button>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
}

// Export a notification badge component that can be used in navigation
export function NotificationBadge() {
  const { currentUser: user } = useAuth();
  const [count, setCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkWaitingCount = async () => {
      try {
        const conversations = await ownerNotificationService.getWaitingConversations(user.uid);
        const newCount = conversations.length;
        if (newCount > count) {
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 3000);
        }
        setCount(newCount);
      } catch (error) {
        console.error('[NotificationBadge] Error checking count:', error);
      }
    };

    checkWaitingCount();
    const interval = setInterval(checkWaitingCount, 5000);

    return () => clearInterval(interval);
  }, [user, count]);

  if (count === 0) return null;

  return (
    <div className="relative">
      <span
        className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold ${
          isPulsing ? 'animate-ping' : ''
        }`}
      >
        {count}
      </span>
      {isPulsing && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 animate-ping" />
      )}
    </div>
  );
}