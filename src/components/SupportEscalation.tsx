/**
 * Support Escalation Component
 * Shows support options when user needs help beyond AI
 */

import React from 'react';
import { MessageCircle, Mail } from 'lucide-react';

interface SupportEscalationProps {
  conversationHistory?: Array<{ role: string; content: string }>;
  userQuestion?: string;
  onClose?: () => void;
}

export default function SupportEscalation({
  conversationHistory,
  userQuestion,
  onClose,
}: SupportEscalationProps) {
  const handleWhatsAppSupport = () => {
    // Create support message with conversation context
    const context = userQuestion ?  `I need help with: ${userQuestion}\n\n` : '';
    const message = `Hi Storehouse Support,\n\n${context}Looking for assistance. Thank you!`;
    const encodedMessage = encodeURIComponent(message);

    // Support WhatsApp number - will be added when available
    const supportNumber = ''; // TODO: Add WhatsApp Business number when ready

    if (!supportNumber) {
      alert('WhatsApp support coming soon! Please use email: storehouseapp@outlook.com');
      return;
    }

    window.open(`https://wa.me/${supportNumber}?text=${encodedMessage}`, '_blank');
  };

  const handleEmailSupport = () => {
    console.log('[SupportEscalation] Email support clicked');
    const subject = encodeURIComponent('Storehouse Support Request');
    // Keep body simple to avoid mailto character limits
    const body = encodeURIComponent(
      `Hi Storehouse Team,\n\nI need help with: ${userQuestion || 'My question...'}\n\nThank you!`
    );

    const mailtoLink = `mailto:storehouseapp@outlook.com?subject=${subject}&body=${body}`;
    console.log('[SupportEscalation] Generated mailto link:', mailtoLink);

    // Simply use window.location.href - most reliable method
    window.location.href = mailtoLink;
    console.log('[SupportEscalation] Email client should open now');
  };

  return (
    <div className="support-escalation">
      <div className="support-header">
        <h3>🆘 Need More Help?</h3>
        <p>Our support team is ready to assist you!</p>
      </div>

      <div className="support-options">
        <button
          className="support-option whatsapp"
          onClick={handleWhatsAppSupport}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
          <div className="support-icon">
            <MessageCircle size={24} />
          </div>
          <div className="support-info">
            <div className="support-title">WhatsApp Support</div>
            <div className="support-desc">Chat with us on WhatsApp (fastest)</div>
            <div className="support-badge">Usually responds in 10 minutes</div>
          </div>
        </button>

        <a
          className="support-option email"
          href={`mailto:storehouseapp@outlook.com?subject=${encodeURIComponent('Storehouse Support Request')}&body=${encodeURIComponent(`Hi Storehouse Team,\n\nI need help with: ${userQuestion || 'My question...'}\n\nThank you!`)}`}
          style={{ pointerEvents: 'auto', cursor: 'pointer', textDecoration: 'none' }}
        >
          <div className="support-icon">
            <Mail size={24} />
          </div>
          <div className="support-info">
            <div className="support-title">Email Support</div>
            <div className="support-desc">storehouseapp@outlook.com</div>
            <div className="support-badge">Response within 24 hours</div>
          </div>
        </a>
      </div>

      {onClose && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={onClose} className="support-close-btn">
            Go Back
          </button>
        </div>
      )}

      <style>{`
        .support-escalation {
          background: white;
          border-radius: 12px;
          padding: 20px;
        }

        .support-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .support-header h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .support-header p {
          margin: 0;
          font-size: 0.9375rem;
          color: #6b7280;
        }

        .support-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .support-option {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .support-option:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
          transform: translateY(-2px);
        }

        .support-option.whatsapp:hover {
          border-color: #25d366;
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);
        }

        .support-option.email:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .support-option.phone:hover {
          border-color: #8b5cf6;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }

        .support-icon {
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .whatsapp .support-icon {
          background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
        }

        .email .support-icon {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .phone .support-icon {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .support-info {
          flex: 1;
        }

        .support-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .support-desc {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .support-badge {
          display: inline-block;
          background: #f3f4f6;
          color: #6b7280;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .support-close-btn {
          background: #f3f4f6;
          border: none;
          color: #374151;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .support-close-btn:hover {
          background: #e5e7eb;
        }

        @media (max-width: 768px) {
          .support-option {
            padding: 12px;
            gap: 12px;
          }

          .support-icon {
            width: 48px;
            height: 48px;
          }

          .support-title {
            font-size: 0.9375rem;
          }

          .support-desc {
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
}
