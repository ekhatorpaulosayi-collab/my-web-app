import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { searchDocumentation, getSuggestedQuestions, getDocById } from '../utils/docSearch';
import { useAppContext } from '../hooks/useAppContext';
import SupportEscalation from './SupportEscalation';
import { BookOpen, Zap } from 'lucide-react';
import { Documentation } from '../types/documentation';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  docReferences?: string[]; // IDs of referenced docs
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: () => void;
}

interface AIChatWidgetProps {
  contextType?: 'onboarding' | 'help' | 'storefront';
  storeSlug?: string;
  autoOpen?: boolean;
}

export default function AIChatWidget({
  contextType = 'onboarding',
  storeSlug,
  autoOpen = false
}: AIChatWidgetProps) {
  console.log('[AIChatWidget] Component mounted!', { contextType, autoOpen });
  const { user } = useAuth();
  const location = useLocation();
  const appContext = useAppContext(); // Get app context for personalization

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [failedAttempts, setFailedAttempts] = useState(0); // Track escalation
  const [userType, setUserType] = useState<'visitor' | 'shopper' | 'user'>('visitor');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect user type (visitor, shopper, or authenticated user)
  useEffect(() => {
    if (user) {
      setUserType('user'); // Logged in = onboarding mode
    } else if (storeSlug) {
      setUserType('shopper'); // On storefront = shopping assistant
    } else {
      setUserType('visitor'); // Landing page = marketing mode
    }
  }, [user, storeSlug]);

  // Auto-open with context-aware welcome messages
  useEffect(() => {
    const isOnlineStoreSetup = location.pathname.includes('/online-store-setup');
    const isLandingPage = location.pathname === '/' || location.pathname === '/home' || location.pathname === '/landing';

    // Auto-open for Online Store Setup (first visit only)
    if (isOnlineStoreSetup && user) {
      const hasSeenStoreSetupChat = localStorage.getItem('storehouse_store_setup_chat_seen');
      if (!hasSeenStoreSetupChat) {
        setTimeout(() => {
          setIsOpen(true);
          setMessages([{
            role: 'assistant',
            content: "👋 Hi! Setting up your online store? I'm here to help! Ask me anything about choosing a store URL, adding payment details, or customizing your store!",
            timestamp: new Date(),
          }]);
          localStorage.setItem('storehouse_store_setup_chat_seen', 'true');
        }, 3000);
      }
      return;
    }

    // Marketing mode: Auto-open for landing page visitors (not logged in)
    if (!user && isLandingPage) {
      const hasSeenMarketingChat = localStorage.getItem('storehouse_marketing_chat_seen');
      if (!hasSeenMarketingChat) {
        setTimeout(() => {
          setIsOpen(true);
          setMessages([{
            role: 'assistant',
            content: "👋 Hi there! Looking to manage your inventory and grow your business?\n\nI can show you how Storehouse helps 5,000+ Nigerian businesses:\n\n✅ Track products & profit in real-time\n✅ Create an online store in 3 minutes\n✅ Accept payments via OPay, Moniepoint, Banks\n✅ 100% FREE to start (no credit card needed)\n\nWhat would you like to know?",
            timestamp: new Date(),
          }]);
          localStorage.setItem('storehouse_marketing_chat_seen', 'true');
        }, 5000); // 5 seconds for visitors to read page first
      }
      return;
    }

    // Onboarding mode: Auto-open for new authenticated users
    if (autoOpen && user && contextType === 'onboarding') {
      const hasSeenChat = localStorage.getItem('storehouse_chat_seen');
      if (!hasSeenChat) {
        setTimeout(() => {
          setIsOpen(true);
          setMessages([{
            role: 'assistant',
            content: "🎉 Welcome to Storehouse! I'm your personal guide.\n\nLet's get you started with a quick win! In the next 5 minutes, you'll:\n\n1️⃣ Add your first product (1 min)\n2️⃣ Record a test sale (1 min)\n3️⃣ Create your online store (3 min)\n\nReady? Ask me: \"Show me the 5-minute checklist\"",
            timestamp: new Date(),
          }]);
          localStorage.setItem('storehouse_chat_seen', 'true');
        }, 8000); // 8 seconds delay to let users view dashboard first
      }
    }
  }, [autoOpen, contextType, location.pathname, user]);

  // Load suggested questions based on user type and app context
  useEffect(() => {
    let suggestions: string[] = [];

    if (userType === 'visitor') {
      // Marketing questions for non-logged-in visitors
      suggestions = [
        "What makes Storehouse different from Excel?",
        "Can I really create an online store in 3 minutes?",
        "How much does it cost?",
        "Is my business data secure?",
        "Can I accept OPay and bank transfers?",
        "Do I need to know coding?",
      ];
    } else if (userType === 'shopper') {
      // Shopping assistant questions for storefront visitors
      suggestions = [
        "What payment methods do you accept?",
        "How do I place an order?",
        "Do you deliver?",
        "Can I get a bulk discount?",
      ];
    } else {
      // Onboarding questions for authenticated users (context-aware)
      suggestions = getSuggestedQuestions(appContext);
    }

    setSuggestedQuestions(suggestions);
  }, [appContext, userType]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Progressive feature showcasing: Detect milestones and suggest next steps
  useEffect(() => {
    if (!user || userType !== 'user') return; // Only for authenticated users

    // Milestone 1: User just added their first product
    if (appContext.hasProducts && !appContext.hasSales) {
      const hasSeenSalesSuggestion = localStorage.getItem('storehouse_seen_sales_suggestion');
      if (!hasSeenSalesSuggestion && messages.length > 0) {
        setTimeout(() => {
          const showcaseMessage: Message = {
            role: 'assistant',
            content: "🎉 Great job adding your first product!\n\n💡 **Next feature:** Want to see how sales tracking works?\n\nStorehouse automatically calculates your profit when you record sales. Your cost price vs selling price = instant profit insights!\n\nInterested in recording a test sale?",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, showcaseMessage]);
          localStorage.setItem('storehouse_seen_sales_suggestion', 'true');
        }, 3000); // 3 seconds after adding product
      }
    }

    // Milestone 2: User recorded their first sale
    if (appContext.hasSales && !appContext.hasOnlineStore) {
      const hasSeenStoreSuggestion = localStorage.getItem('storehouse_seen_store_suggestion');
      if (!hasSeenStoreSuggestion && messages.length > 0) {
        setTimeout(() => {
          const showcaseMessage: Message = {
            role: 'assistant',
            content: "💰 Awesome! You're tracking sales and profit now!\n\n💡 **Next feature:** Did you know you can create an online store in 3 minutes?\n\nYour customers can:\n✅ Browse products 24/7\n✅ Send orders via WhatsApp\n✅ Pay with OPay, Moniepoint, or Banks\n\nWant me to show you how?",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, showcaseMessage]);
          localStorage.setItem('storehouse_seen_store_suggestion', 'true');
        }, 4000);
      }
    }

    // Milestone 3: User created their online store
    if (appContext.hasOnlineStore) {
      const hasSeenPaymentSuggestion = localStorage.getItem('storehouse_seen_payment_suggestion');
      if (!hasSeenPaymentSuggestion && messages.length > 0) {
        setTimeout(() => {
          const showcaseMessage: Message = {
            role: 'assistant',
            content: "🎊 Your store is live! Congratulations!\n\n💡 **Pro tip:** Have you added payment methods yet?\n\nMost customers prefer:\n🟢 OPay (instant settlement)\n🔵 Moniepoint (business banking)\n🟣 PalmPay (youth demographic)\n\nAdding multiple payment options increases sales by 30-50%!\n\nWant to add OPay or Moniepoint now?",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, showcaseMessage]);
          localStorage.setItem('storehouse_seen_payment_suggestion', 'true');
        }, 5000);
      }
    }
  }, [appContext.hasProducts, appContext.hasSales, appContext.hasOnlineStore, user, userType, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message immediately
    const newMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);

    setLoading(true);

    try {
      // STEP 1: Search documentation for relevant guides (hybrid: keyword + vector)
      const docResults = await searchDocumentation(userMessage, appContext, 3);
      console.log('[AIChatWidget] Found', docResults.length, 'relevant docs');

      // STEP 2: Format docs for AI context
      const relevantDocs = docResults.map(result => ({
        id: result.doc.id,
        title: result.doc.title,
        description: result.doc.description,
        content: result.doc.content || result.doc.steps?.map(s => s.instruction).join('\n') || '',
        score: result.score,
      }));

      // STEP 2.5: Fetch store info for intelligent storefront chat responses
      let storeInfo = null;
      if (storeSlug && userType === 'shopper') {
        console.log('[AIChatWidget] Fetching store info for:', storeSlug);
        const { data: storeData } = await supabase
          .from('stores')
          .select('about_us, delivery_areas, delivery_time, return_policy, whatsapp_number, business_name')
          .eq('store_slug', storeSlug)
          .single();

        if (storeData) {
          storeInfo = {
            aboutUs: storeData.about_us,
            deliveryAreas: storeData.delivery_areas,
            deliveryTime: storeData.delivery_time,
            returnPolicy: storeData.return_policy,
            whatsappNumber: storeData.whatsapp_number,
            businessName: storeData.business_name,
          };
          console.log('[AIChatWidget] Store info fetched successfully:', {
            hasAbout: !!storeInfo.aboutUs,
            hasDelivery: !!storeInfo.deliveryAreas,
            hasReturns: !!storeInfo.returnPolicy,
          });
        } else {
          console.log('[AIChatWidget] Store not found or no data');
        }
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();

      // STEP 3: Call AI chat endpoint with RAG context
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          message: userMessage,
          contextType,
          storeSlug,
          userType, // NEW: Send visitor/shopper/user type
          appContext, // Send app state
          relevantDocs, // Send documentation context (RAG)
          storeInfo, // NEW: Send store info for intelligent responses
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // STEP 4: Add AI response with doc references and quick actions
      const quickActions: QuickAction[] = [];

      // Add "Contact Support" if confidence is low
      if (data.confidence && data.confidence < 0.6) {
        quickActions.push({
          label: '💬 Talk to Support',
          action: () => setShowSupport(true),
        });
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        docReferences: docResults.map(r => r.doc.id),
        quickActions: quickActions.length > 0 ? quickActions : undefined,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Update quota info
      if (data.quotaInfo) {
        setQuotaInfo(data.quotaInfo);
      }

      // Reset failed attempts on success
      setFailedAttempts(0);

    } catch (error: any) {
      console.error('Chat error:', error);

      // Increment failed attempts
      setFailedAttempts(prev => prev + 1);

      // Show error message
      const errorMessage: Message = {
        role: 'assistant',
        content: error.message || 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);

      // Auto-escalate after 2 failures
      if (failedAttempts >= 1) {
        setTimeout(() => {
          setShowSupport(true);
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
    // Auto-send
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="ai-chat-container" style={{
      position: 'fixed',
      bottom: isOpen ? '20px' : '20px',
      right: '20px',
      zIndex: 9998, // Below modals (10000+) but above content
      pointerEvents: 'none', // Allow clicks to pass through container
    }}>
      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window" style={{
          width: '380px',
          maxWidth: '90vw',
          height: '600px',
          maxHeight: '80vh',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '16px',
          overflow: 'hidden',
          pointerEvents: 'auto', // Re-enable clicks for chat window
        }}>
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
                  {userType === 'visitor' ? 'Your Business Growth Partner' :
                   userType === 'shopper' ? 'Shopping Assistant' :
                   contextType === 'onboarding' ? 'Your Setup Guide' :
                   contextType === 'help' ? 'Here to Help' : 'Product Inquiries'}
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

          {/* Quota Info */}
          {quotaInfo && user && (
            <div style={{
              padding: '8px 16px',
              background: quotaInfo.remaining < 3 ? '#fef3c7' : '#ecfdf5',
              fontSize: '0.75rem',
              color: quotaInfo.remaining < 3 ? '#92400e' : '#065f46',
              borderBottom: '1px solid #e5e7eb',
            }}>
              {quotaInfo.remaining} of {quotaInfo.chat_limit} chats remaining this month
              {quotaInfo.remaining < 3 && ' - Consider upgrading!'}
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* Suggested Questions (only show if no messages yet) */}
            {messages.length === 0 && suggestedQuestions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
                  <Zap size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Quick Questions:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {suggestedQuestions.slice(0, 4).map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuestion(question)}
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.8125rem',
                        color: '#374151',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f7ff';
                        e.currentTarget.style.borderColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#f3f4f6',
                    color: msg.role === 'user' ? 'white' : '#374151',
                    fontSize: '0.9375rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>

                {/* Quick Actions for assistant messages */}
                {msg.role === 'assistant' && msg.quickActions && msg.quickActions.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '8px',
                    flexWrap: 'wrap',
                  }}>
                    {msg.quickActions.map((action, actionIdx) => (
                      <button
                        key={actionIdx}
                        onClick={action.action}
                        style={{
                          background: 'white',
                          border: '1.5px solid #667eea',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.8125rem',
                          color: '#667eea',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#667eea';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.color = '#667eea';
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
              }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '0.9375rem',
                }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ animation: 'pulse 1.5s infinite' }}>●</span>
                    <span style={{ animation: 'pulse 1.5s infinite 0.2s' }}>●</span>
                    <span style={{ animation: 'pulse 1.5s infinite 0.4s' }}>●</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
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
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
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
                onClick={handleSendMessage}
                disabled={loading || !inputMessage.trim()}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !inputMessage.trim() ? 0.5 : 1,
                }}
              >
                Send
              </button>
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: '#6b7280',
              textAlign: 'center',
            }}>
              Powered by AI • Press Enter to send
            </div>
          </div>
        </div>
      )}

      {/* Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            transition: 'transform 0.2s',
            pointerEvents: 'auto', // Re-enable clicks for button
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          aria-label="Open AI Chat Assistant"
        >
          💬
        </button>
      )}

      {/* Support Escalation Modal */}
      {showSupport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => setShowSupport(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <SupportEscalation
              conversationHistory={messages}
              userQuestion={messages[messages.length - 1]?.content}
              onClose={() => setShowSupport(false)}
            />
          </div>
        </div>
      )}

      {/* Pulse Animation & Mobile Positioning */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        /* Smart mobile positioning to avoid blocking key buttons */
        @media (max-width: 768px) {
          /* When closed, position above mobile nav and footers */
          .ai-chat-container:not(:has(.ai-chat-window)) {
            bottom: 90px !important; /* Above typical mobile bottom nav (72px) */
          }

          /* When open, stack from bottom with safe spacing */
          .ai-chat-container:has(.ai-chat-window) {
            bottom: 16px !important;
            right: 16px !important;
            left: 16px !important;
            max-width: calc(100vw - 32px);
          }

          /* Make chat window responsive on mobile */
          .ai-chat-window {
            width: 100% !important;
            max-width: 100% !important;
            height: 70vh !important;
            max-height: 70vh !important;
            margin-bottom: 0 !important;
          }

          /* Reduce bubble size slightly on mobile for less obstruction */
          .ai-chat-container:not(:has(.ai-chat-window)) button {
            width: 52px !important;
            height: 52px !important;
          }
        }

        /* Extra small screens - even less obtrusive */
        @media (max-width: 480px) {
          .ai-chat-container:not(:has(.ai-chat-window)) {
            bottom: 85px !important;
            right: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
