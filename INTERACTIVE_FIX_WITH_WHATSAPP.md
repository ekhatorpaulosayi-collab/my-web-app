// WhatsApp Fallback Timer Component
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WhatsAppFallbackProps {
  conversationId: string;
  storeId: string;
  lastCustomerMessage: string;
  onCancel?: () => void;
}

export default function WhatsAppFallback({
  conversationId,
  storeId,
  lastCustomerMessage,
  onCancel
}: WhatsAppFallbackProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [fallbackMinutes, setFallbackMinutes] = useState(5);
  const [isWaiting, setIsWaiting] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load store settings
  useEffect(() => {
    loadStoreSettings();
  }, [storeId]);

  // Monitor for agent takeover
  useEffect(() => {
    if (!conversationId) return;

    const checkInterval = setInterval(async () => {
      const { data } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, agent_id')
        .eq('id', conversationId)
        .single();

      if (data?.is_agent_active) {
        // Agent took over - cancel fallback
        cancelFallback();
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [conversationId]);

  const loadStoreSettings = async () => {
    try {
      const { data } = await supabase
        .from('stores')
        .select('whatsapp_number, wa_fallback_minutes')
        .eq('id', storeId)
        .single();

      if (data) {
        setWhatsappNumber(data.whatsapp_number || '');
        const minutes = data.wa_fallback_minutes || 5;
        setFallbackMinutes(minutes);
        startFallbackTimer(minutes);
      }
    } catch (error) {
      console.error('Error loading store settings:', error);
    }
  };

  const startFallbackTimer = (minutes: number) => {
    // Clear any existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setTimeRemaining(minutes * 60);
    setIsWaiting(true);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setShowFallback(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Main timer
    timerRef.current = setTimeout(() => {
      setShowFallback(true);
      setIsWaiting(false);
    }, minutes * 60 * 1000);
  };

  const cancelFallback = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowFallback(false);
    setIsWaiting(false);
    onCancel?.();
  };

  const keepWaiting = () => {
    setShowFallback(false);
    startFallbackTimer(fallbackMinutes);
  };

  const switchToWhatsApp = async () => {
    if (!whatsappNumber) return;

    // Update conversation status
    await supabase
      .from('ai_chat_conversations')
      .update({ chat_status: 'moved_to_whatsapp' })
      .eq('id', conversationId);

    // Create WhatsApp link
    const message = encodeURIComponent(
      `Hi, I was asking about "${lastCustomerMessage}" on your SmartStock page`
    );
    const waLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`;

    // Open WhatsApp
    window.open(waLink, '_blank');
    cancelFallback();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!whatsappNumber) return null;

  return (
    <>
      {/* Waiting indicator */}
      {isWaiting && timeRemaining > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px'
        }}>
          <Clock size={14} />
          <span>Waiting for store owner... {formatTime(timeRemaining)}</span>
        </div>
      )}

      {/* Fallback dialog */}
      {showFallback && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Store owner is not available
              </h3>
              <button
                onClick={cancelFallback}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{
              color: '#6b7280',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              The store owner hasn't responded yet. Would you like to continue
              waiting or switch to WhatsApp for faster response?
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={keepWaiting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Clock size={16} />
                Keep Waiting
              </button>

              <button
                onClick={switchToWhatsApp}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#25d366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MessageCircle size={16} />
                Chat on WhatsApp
              </button>
            </div>

            <p style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              You can continue this conversation on WhatsApp
            </p>
          </div>
        </div>
      )}
    </>
  );
}