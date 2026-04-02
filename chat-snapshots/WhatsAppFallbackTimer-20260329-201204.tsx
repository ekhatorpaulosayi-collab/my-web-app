import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WhatsAppFallbackTimerProps {
  conversationId: string;
  storeId: string;
  store: {
    whatsapp_number?: string;
    wa_fallback_minutes?: number;
  };
  takeoverStatus: string;
  lastCustomerMessage: string;
  onReset?: () => void;
}

export default function WhatsAppFallbackTimer({
  conversationId,
  storeId,
  store,
  takeoverStatus,
  lastCustomerMessage,
  onReset
}: WhatsAppFallbackTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [waitingSinceTimestamp, setWaitingSinceTimestamp] = useState<string | null>(null);

  // Get fallback minutes (default to 2 if not set)
  const fallbackMinutes = store?.wa_fallback_minutes || 2;
  const hasWhatsApp = !!store?.whatsapp_number;

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate WhatsApp link with context
  const generateWhatsAppLink = (): string => {
    if (!store?.whatsapp_number) return '';

    // Clean the phone number (remove spaces, dashes, etc)
    const cleanNumber = store.whatsapp_number.replace(/\D/g, '');

    // Create the message with better formatting
    const message = `Hi, I was chatting on your Storehouse page and was asking about "${lastCustomerMessage}". Can you help?`;

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  // Handle moving to WhatsApp
  const moveToWhatsApp = async () => {
    try {
      // Update conversation status
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          takeover_status: 'moved_to_whatsapp',
          moved_to_whatsapp_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation status:', error);
      }

      // Open WhatsApp
      const whatsappLink = generateWhatsAppLink();
      window.open(whatsappLink, '_blank');

      // Hide options after redirect
      setShowOptions(false);
      setTimerActive(false);
    } catch (err) {
      console.error('Error moving to WhatsApp:', err);
    }
  };

  // Reset timer
  const resetTimer = async () => {
    // Update the waiting timestamp on server to current time
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          waiting_for_owner_since: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('[WhatsAppTimer] Error updating timestamp:', error);
      }
    } catch (err) {
      console.error('[WhatsAppTimer] Error in resetTimer:', err);
    }

    // Reset local state
    setTimeLeft(fallbackMinutes * 60);
    setShowOptions(false);
    setTimerActive(true);
    setWaitingSinceTimestamp(new Date().toISOString());
    onReset?.();
  };

  // Fetch waiting_for_owner_since timestamp and calculate time remaining
  useEffect(() => {
    const fetchTimerState = async () => {
      if (takeoverStatus === 'requested' && !timerActive) {
        try {
          // Fetch the waiting_for_owner_since timestamp from database
          const { data, error } = await supabase
            .from('ai_chat_conversations')
            .select('waiting_for_owner_since')
            .eq('id', conversationId)
            .single();

          if (error) {
            console.error('[WhatsAppTimer] Error fetching timestamp:', error);
            // If column doesn't exist, use current time as fallback
            if (error.message?.includes('does not exist')) {
              console.log('[WhatsAppTimer] Column not yet added - using local timer');
            }
            // Fallback to starting fresh timer
            setTimeLeft(fallbackMinutes * 60);
            setTimerActive(true);
            setShowOptions(false);
            setWaitingSinceTimestamp(new Date().toISOString());
            return;
          }

          if (data?.waiting_for_owner_since) {
            // Calculate time elapsed since request
            const requestTime = new Date(data.waiting_for_owner_since).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - requestTime) / 1000);
            const totalSeconds = fallbackMinutes * 60;
            const remaining = Math.max(0, totalSeconds - elapsedSeconds);

            console.log('[WhatsAppTimer] Timer state from server:', {
              requestTime: data.waiting_for_owner_since,
              elapsedSeconds,
              remaining
            });

            setWaitingSinceTimestamp(data.waiting_for_owner_since);

            if (remaining > 0) {
              setTimeLeft(remaining);
              setTimerActive(true);
              setShowOptions(false);
            } else {
              // Timer already expired
              setTimeLeft(0);
              setTimerActive(false);
              setShowOptions(true);
            }
          } else {
            // No timestamp yet, start fresh
            setTimeLeft(fallbackMinutes * 60);
            setTimerActive(true);
            setShowOptions(false);
          }
        } catch (err) {
          console.error('[WhatsAppTimer] Error in fetchTimerState:', err);
          // Fallback to starting fresh timer
          setTimeLeft(fallbackMinutes * 60);
          setTimerActive(true);
          setShowOptions(false);
        }
      } else if (takeoverStatus === 'agent') {
        // Owner took over - cancel timer
        setTimerActive(false);
        setShowOptions(false);
        setTimeLeft(0);
        setWaitingSinceTimestamp(null);
      }
    };

    fetchTimerState();
  }, [takeoverStatus, fallbackMinutes, timerActive, conversationId]);

  // Countdown logic with poll-before-modal pattern
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const interval = setInterval(async () => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer expired - do a fresh status check BEFORE showing modal
          checkStatusBeforeModal();
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Poll-before-modal pattern: Check if owner took over before showing options
  const checkStatusBeforeModal = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, takeover_status')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('[WhatsAppTimer] Error checking status before modal:', error);
        setShowOptions(true); // Show modal on error as fallback
        return;
      }

      // Only show modal if owner hasn't taken over
      if (!data?.is_agent_active) {
        setShowOptions(true);
      } else {
        console.log('[WhatsAppTimer] Owner took over before timer expired - not showing modal');
        setTimerActive(false);
        setShowOptions(false);
      }
    } catch (err) {
      console.error('[WhatsAppTimer] Error in checkStatusBeforeModal:', err);
      setShowOptions(true); // Show modal on error as fallback
    }
  };

  // Auto-dismiss modal if owner takes over while it's showing
  useEffect(() => {
    if (!showOptions) return;

    // Poll every 3 seconds while modal is showing
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('ai_chat_conversations')
          .select('is_agent_active, takeover_status')
          .eq('id', conversationId)
          .single();

        if (!error && data?.is_agent_active) {
          console.log('[WhatsAppTimer] Owner took over - auto-dismissing modal');
          setShowOptions(false);
          setTimerActive(false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('[WhatsAppTimer] Error polling during modal:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [showOptions, conversationId]);

  // Don't render anything if not in requested state
  if (takeoverStatus !== 'requested') return null;

  return (
    <>
      {/* Timer Display (while counting down) */}
      {timerActive && timeLeft > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <Clock size={14} />
          <span>Waiting for store owner... {formatTime(timeLeft)}</span>
        </div>
      )}

      {/* Fallback Options Modal */}
      {showOptions && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <Clock size={48} color="#f59e0b" style={{ marginBottom: '12px' }} />
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1f2937'
              }}>
                Store owner hasn't responded yet
              </h3>

              {hasWhatsApp ? (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Would you like to continue waiting or chat on WhatsApp?
                </p>
              ) : (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Please keep waiting or try again later.
                </p>
              )}
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Keep Waiting Button (Always shown) */}
              <button
                onClick={resetTimer}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  ':hover': {
                    backgroundColor: '#f9fafb',
                    borderColor: '#9ca3af'
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                <RefreshCw size={16} />
                Keep Waiting ({fallbackMinutes} more minutes)
              </button>

              {/* WhatsApp Button (Only if configured) */}
              {hasWhatsApp && (
                <button
                  onClick={moveToWhatsApp}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#25d366',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    ':hover': {
                      backgroundColor: '#22c55e'
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#22c55e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#25d366';
                  }}
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </button>
              )}

              {/* No WhatsApp Notice */}
              {!hasWhatsApp && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  💡 The store owner will be notified about your request
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}