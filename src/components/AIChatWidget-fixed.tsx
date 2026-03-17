import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';

// Simplified fixed-width chat widget for desktop
export default function AIChatWidgetFixed({
  contextType = 'help',
  autoOpen = false,
  persistentBubble = true
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chatWindowStyle = isDesktop ? {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '400px',
    height: '600px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
  } : {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    right: '20px',
    height: '80vh',
    maxHeight: '600px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div style={chatWindowStyle}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                  Storehouse Assistant
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Here to Help
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#f9fafb',
          }}>
            {messages.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                padding: '40px 20px',
              }}>
                <p>👋 Hi! How can I help you today?</p>
                <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                  Ask me anything about using Storehouse!
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'white',
                  color: msg.role === 'user' ? 'white' : '#111827',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            background: '#fafafa',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // Send message logic here
                    if (inputMessage.trim()) {
                      setMessages([...messages,
                        { role: 'user', content: inputMessage },
                        { role: 'assistant', content: 'I understand your question. This feature is being improved. For now, please check our help documentation or contact support.' }
                      ]);
                      setInputMessage('');
                    }
                  }
                }}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  if (inputMessage.trim()) {
                    setMessages([...messages,
                      { role: 'user', content: inputMessage },
                      { role: 'assistant', content: 'I understand your question. This feature is being improved. For now, please check our help documentation or contact support.' }
                    ]);
                    setInputMessage('');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            borderRadius: '50px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            zIndex: 9998,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🤖</span>
          <span>Need Help?</span>
        </button>
      )}
    </>
  );
}