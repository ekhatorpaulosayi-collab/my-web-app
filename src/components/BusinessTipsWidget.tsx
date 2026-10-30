/**
 * Business Tips Widget
 *
 * Standalone widget for accessing business advisory chat mode
 * Only shown to authenticated users with products
 */

import React from 'react';
import { Lightbulb } from 'lucide-react';
import AIChatWidget from './AIChatWidget';

interface BusinessTipsProps {
  show?: boolean;
}

export function BusinessTipsWidget({ show = true }: { show?: boolean }) {
  if (!show) return null;

  return (
    <AIChatWidget
      contextType="business-advisory"
      autoOpen={false}
      persistentBubble={true}
    />
  );
}

export default function BusinessTipsButton() {
  return (
    <div style={{
      position: 'fixed',
      bottom: '90px', // Above the main chat widget
      right: '20px',
      zIndex: 9998,
    }}>
      <button
        onClick={() => {
          // This will be handled by parent component
          // For now, let's create a simple way to trigger business advisory mode
          window.dispatchEvent(new CustomEvent('open-business-tips'));
        }}
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          padding: '12px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }}
      >
        💡 Get Business Tips
      </button>
    </div>
  );
}
