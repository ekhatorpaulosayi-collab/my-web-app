/**
 * Contextual Paystack Help Component
 * Provides instant, relevant help exactly when users need it
 */

import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, CreditCard, Key, AlertCircle, DollarSign } from 'lucide-react';

interface PaystackHelpProps {
  context?: 'setup' | 'checkout' | 'settings' | 'general';
  isVisible?: boolean;
  onClose?: () => void;
}

const helpContent = {
  setup: {
    title: '🚀 Quick Setup Guide',
    steps: [
      {
        icon: '1️⃣',
        title: 'Create Account',
        content: 'Sign up at paystack.com - takes 2 minutes',
        link: 'https://paystack.com'
      },
      {
        icon: '2️⃣',
        title: 'Get Your Keys',
        content: 'Dashboard → Settings → API Keys',
        link: 'https://dashboard.paystack.com/#/settings/developer'
      },
      {
        icon: '3️⃣',
        title: 'Enter Keys Here',
        content: 'Paste your keys in the fields below'
      },
      {
        icon: '4️⃣',
        title: 'Test First',
        content: 'Use Test Mode to practice safely'
      }
    ],
    quickAnswers: [
      { q: 'What are the fees?', a: '1.5% + ₦100 per transaction' },
      { q: 'When do I get paid?', a: 'Next business day (T+1)' },
      { q: 'Is it safe?', a: 'Yes! Bank-level security, CBN licensed' }
    ]
  },
  checkout: {
    title: '💳 Payment Help',
    steps: [
      {
        icon: '🧪',
        title: 'Test Card',
        content: '4084 0840 8408 4081 | CVV: 408 | PIN: 0000',
      },
      {
        icon: '💰',
        title: 'Payment Methods',
        content: 'Cards, Bank Transfer, USSD all supported'
      },
      {
        icon: '⚠️',
        title: 'Common Issues',
        content: 'Check: Internet connection, Card limit, Correct mode'
      }
    ],
    quickAnswers: [
      { q: 'Payment failed?', a: 'Try different card or bank transfer' },
      { q: 'Card declined?', a: 'Check balance or daily limit' },
      { q: 'Test not working?', a: 'Ensure Test Mode is ON' }
    ]
  },
  settings: {
    title: '⚙️ Configuration Help',
    steps: [
      {
        icon: '🔑',
        title: 'API Keys Location',
        content: 'Dashboard → Settings → API Keys & Webhooks'
      },
      {
        icon: '🧪',
        title: 'Test vs Live',
        content: 'Test Mode: Practice | Live Mode: Real money'
      },
      {
        icon: '✅',
        title: 'Verify Setup',
        content: 'Do a test payment to confirm everything works'
      }
    ],
    quickAnswers: [
      { q: 'Invalid API Key?', a: 'Check for spaces, use correct mode keys' },
      { q: 'Change business name?', a: 'Dashboard → Business Profile' },
      { q: 'Switch to live?', a: 'Toggle Test Mode OFF, use live keys' }
    ]
  }
};

export function PaystackHelp({ context = 'general', isVisible = true, onClose }: PaystackHelpProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  if (!isVisible) return null;

  const content = helpContent[context as keyof typeof helpContent] || helpContent.setup;

  // Minimized bubble view
  if (!expanded) {
    return (
      <div
        className="fixed bottom-20 right-4 z-50 cursor-pointer animate-pulse"
        onClick={() => setExpanded(true)}
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full p-3 shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm font-medium pr-2">Paystack Help</span>
        </div>
      </div>
    );
  }

  // Expanded help view
  return (
    <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{content.title}</h3>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-3 border-b">
          {content.steps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <span className="text-xl flex-shrink-0">{step.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{step.title}</div>
                <div className="text-sm text-gray-600">{step.content}</div>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Open <ChevronRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Answers */}
        <div className="p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Common Questions
          </div>
          {content.quickAnswers.map((qa, index) => (
            <div
              key={index}
              className="cursor-pointer"
              onClick={() => setSelectedQuestion(selectedQuestion === index ? null : index)}
            >
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{qa.q}</span>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    selectedQuestion === index ? 'rotate-90' : ''
                  }`}
                />
              </div>
              {selectedQuestion === index && (
                <div className="px-2 pb-2 text-sm text-gray-600 animate-slideIn">
                  {qa.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 text-center">
          <a
            href="https://paystack.com/help"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View Complete Guide →
          </a>
        </div>
      </div>
    </div>
  );
}

// Context-aware floating button for payment pages
export function PaystackFloatingHelp() {
  const [showHelp, setShowHelp] = useState(false);

  // Auto-show on payment pages
  React.useEffect(() => {
    const isPaymentPage = window.location.pathname.includes('checkout') ||
                         window.location.pathname.includes('payment');
    if (isPaymentPage && !localStorage.getItem('paystack-help-dismissed')) {
      setTimeout(() => setShowHelp(true), 2000);
    }
  }, []);

  return <PaystackHelp isVisible={showHelp} onClose={() => setShowHelp(false)} />;
}