import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Prompt } from '../utils/contextualPrompts';
import { dismissPrompt, setPromptCooldown } from '../utils/contextualPrompts';

interface ContextualPromptToastProps {
  prompt: Prompt | null;
  onDismiss: () => void;
}

/**
 * Smart Toast Notification for Contextual Prompts
 *
 * Shows helpful suggestions at the right time with "Add Now" and "Later" actions
 */
export function ContextualPromptToast({ prompt, onDismiss }: ContextualPromptToastProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (prompt) {
      // Delay showing to allow for smooth entrance animation
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [prompt]);

  if (!prompt) return null;

  const handleAddNow = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate(prompt.action);
      onDismiss();
    }, 300);
  };

  const handleLater = () => {
    setIsExiting(true);
    dismissPrompt(prompt.id);
    setPromptCooldown(); // Don't show another prompt for 24 hours
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '400px',
        width: 'calc(100% - 40px)',
        transform: isVisible && !isExiting ? 'translateY(0)' : 'translateY(120%)',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
          color: 'white',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '12px',
        }}>
          <div style={{
            fontSize: '32px',
            lineHeight: 1,
          }}>
            {prompt.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
              fontWeight: '700',
              color: 'white',
            }}>
              {prompt.title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.5,
            }}>
              {prompt.message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '16px',
        }}>
          <button
            onClick={handleAddNow}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }}
          >
            Add Now
          </button>
          <button
            onClick={handleLater}
            style={{
              padding: '12px 20px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
