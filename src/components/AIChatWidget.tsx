import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { searchDocumentation, getSuggestedQuestions, getDocById } from '../utils/docSearch';
import { useAppContext } from '../hooks/useAppContext';
import SupportEscalation from './SupportEscalation';
import { BookOpen, Zap, MessageCircle } from 'lucide-react';
import { Documentation } from '../types/documentation';
import { getSmartQuestionsForContext, getTopQuestions } from '../data/smartQuestions';

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

// Simple markdown-to-JSX renderer for chat messages
function renderMarkdown(text: string): React.ReactNode {
  console.log('[renderMarkdown] Rendering text:', text.substring(0, 100));
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Handle horizontal rules (---)
    if (line.trim() === '---') {
      elements.push(<hr key={lineIndex} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />);
      return;
    }

    // Handle headings (## text)
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      elements.push(
        <div key={lineIndex} style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: '8px', marginBottom: '4px' }}>
          {parseInlineMarkdown(headingMatch[1])}
        </div>
      );
      return;
    }

    // Handle numbered lists (1️⃣ or 1. text)
    const numberedMatch = line.match(/^(\d+[️⃣.])\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <div key={lineIndex} style={{ marginLeft: '8px', marginTop: '4px' }}>
          <span style={{ fontWeight: 600 }}>{numberedMatch[1]}</span> {parseInlineMarkdown(numberedMatch[2])}
        </div>
      );
      return;
    }

    // Handle bullet lists (✅ or - or • text)
    const bulletMatch = line.match(/^([✅🎉📧💬📞🔵🟢🟣→•-])\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div key={lineIndex} style={{ marginLeft: '8px', marginTop: '4px' }}>
          {bulletMatch[1]} {parseInlineMarkdown(bulletMatch[2])}
        </div>
      );
      return;
    }

    // Regular text with inline markdown
    if (line.trim()) {
      elements.push(
        <div key={lineIndex} style={{ marginTop: '4px' }}>
          {parseInlineMarkdown(line)}
        </div>
      );
    } else {
      // Empty line = spacing
      elements.push(<div key={lineIndex} style={{ height: '4px' }} />);
    }
  });

  return <>{elements}</>;
}

// Parse inline markdown (bold, links)
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for markdown link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      console.log('[parseInlineMarkdown] Found link:', { linkText, linkUrl });
      parts.push(
        <a
          key={key++}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#667eea',
            fontWeight: 600,
            textDecoration: 'underline',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
          onClick={async (e) => {
            e.stopPropagation();
            console.log('[AIChatWidget] Link clicked:', linkUrl);

            // Track click analytics
            try {
              const eventType = linkUrl.includes('signup') ? 'signup_clicked' :
                               linkUrl.includes('support') || linkUrl.includes('mailto') ? 'support_clicked' :
                               'link_clicked';

              await fetch(`${supabaseUrl}/functions/v1/track-chat-event`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({
                  eventType,
                  linkUrl,
                  userType,
                }),
              }).catch(err => console.error('Analytics tracking failed:', err));
            } catch (err) {
              console.error('Failed to track link click:', err);
            }
          }}
        >
          {linkText}
        </a>
      );
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Check for bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Regular text until next markdown
    const nextSpecial = remaining.search(/\[|\*\*/);
    if (nextSpecial === -1) {
      // No more markdown, add rest as text
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    } else {
      // Add text before next markdown
      parts.push(<span key={key++}>{remaining.substring(0, nextSpecial)}</span>);
      remaining = remaining.substring(nextSpecial);
    }
  }

  return <>{parts}</>;
}

interface AIChatWidgetProps {
  contextType?: 'onboarding' | 'help' | 'storefront' | 'business-advisory';
  storeSlug?: string;
  autoOpen?: boolean;
  persistentBubble?: boolean;  // PHASE 1: Always show chat bubble even if not auto-opening
  storeInfo?: {
    businessName?: string;
    aboutUs?: string;
    address?: string;
    whatsappNumber?: string;
    deliveryAreas?: string;
    deliveryTime?: string;
    businessHours?: string;
    returnPolicy?: string;
  };
}

export default function AIChatWidget({
  contextType = 'onboarding',
  storeSlug,
  autoOpen = false,
  persistentBubble = false,  // PHASE 1: Default false for backward compatibility
  storeInfo: propsStoreInfo  // Rename to avoid conflict
}: AIChatWidgetProps) {
  // Removed excessive logging - was causing performance issues
  // console.log('[AIChatWidget] Component mounted!', { contextType, autoOpen });
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
  // IMPORTANT: Wait for auth to load before setting userType
  useEffect(() => {
    console.log('[AIChatWidget] Auth check starting...', {
      hasUserFromContext: !!user,
      userIdFromContext: user?.id,
      storeSlug
    });

    // Give auth context time to load (check session)
    const checkAuth = async () => {
      try {
        console.log('[AIChatWidget] Checking Supabase session...');

        // Check Supabase session directly
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('[AIChatWidget] Session check result:', {
          hasSession: !!session,
          sessionUserId: session?.user?.id,
          hasUser: !!user,
          userIdFromContext: user?.id,
          error: error?.message
        });

        // PRIORITY 1: If on storefront, ALWAYS use shopper mode (even if logged in)
        if (storeSlug && contextType === 'storefront') {
          setUserType('shopper'); // Storefront = shopping assistant (always!)
          console.log('[AIChatWidget] 🛍️ Storefront mode - userType set to: shopper', { storeSlug, isLoggedIn: !!(session?.user || user) });
        } else if (session?.user || user) {
          setUserType('user'); // Logged in on dashboard/admin = user mode
          console.log('[AIChatWidget] ✅ User detected - userType set to: user', {
            userId: user?.id,
            hasAuthContext: !!user,
            hasSession: !!session
          });
        } else {
          setUserType('visitor'); // Landing page = marketing mode
          console.log('[AIChatWidget] 👋 No user - userType set to: visitor');
        }
      } catch (err) {
        console.error('[AIChatWidget] Auth check error:', err);
        setUserType('visitor');
      }
    };

    checkAuth();
  }, [user, storeSlug]);

  // Auto-open with context-aware welcome messages
  useEffect(() => {
    const isOnlineStoreSetup = location.pathname.includes('/online-store-setup');
    const isLandingPage = location.pathname === '/' || location.pathname === '/home' || location.pathname === '/landing';

    // PHASE 1: Help mode - Available anytime for assistance (non-intrusive)
    // IMPORTANT: Check this FIRST before any early returns so it always runs
    if (contextType === 'help' && persistentBubble && user) {
      const hasSeenHelpChat = localStorage.getItem('storehouse_help_chat_seen');
      if (!hasSeenHelpChat) {
        // Show a subtle welcome after 10 seconds (non-intrusive)
        setTimeout(() => {
          // Don't auto-open, just show a small notification
          console.log('[AIChatWidget] Help mode activated - bubble always visible');
          localStorage.setItem('storehouse_help_chat_seen', 'true');
        }, 10000);
      }
      // In help mode with persistentBubble, we still want the bubble to show
      // even if we don't auto-open, so don't return early
    }

    // STOREFRONT MODE: NO auto-popup (less intrusive, user-initiated)
    // The pulsing animation and tooltip will draw attention instead
    if (contextType === 'storefront' && storeSlug) {
      // No auto-popup - let users click when ready
      return;
    }

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
  }, [autoOpen, contextType, location.pathname, user, persistentBubble]);

  // PHASE 2: Load context-aware smart questions based on user type and current page
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
    } else if (contextType === 'business-advisory') {
      // Business tips and marketing strategies
      suggestions = [
        "How do I price my products to attract customers?",
        "What's the best way to market on WhatsApp?",
        "How can I get more customers for my business?",
        "How do I retain customers and get repeat sales?",
        "What are good sales techniques for Nigerian markets?",
        "How do I deal with slow-moving inventory?",
      ];
    } else if (contextType === 'help') {
      // PHASE 2: Context-aware smart questions for help mode
      // Detect current page context from URL
      const path = location.pathname.toLowerCase();
      let pageContext = 'dashboard'; // default

      if (path.includes('staff')) pageContext = 'staff';
      else if (path.includes('customer')) pageContext = 'customers';
      else if (path.includes('invoice')) pageContext = 'invoices';
      else if (path.includes('online-store')) pageContext = 'online-store';
      else if (path.includes('report')) pageContext = 'reports';
      else if (path.includes('settings')) pageContext = 'settings';
      else if (path.includes('sale')) pageContext = 'sales';
      else if (path.includes('product') || path.includes('inventory')) pageContext = 'products';
      else if (path.includes('referral')) pageContext = 'referrals';

      // Get smart questions for this context
      suggestions = getSmartQuestionsForContext(pageContext, 6);

      // If no context-specific questions, show top questions
      if (suggestions.length === 0) {
        suggestions = getTopQuestions(6);
      }
    } else {
      // Fallback: Onboarding mode uses original logic
      suggestions = getSuggestedQuestions(appContext);
    }

    setSuggestedQuestions(suggestions);
  }, [appContext, userType, contextType, location.pathname]);

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

      // STEP 2.5: Get store info (use props if provided, otherwise fetch)
      let storeInfo = null;

      // PHASE 1 FIX: Prefer props (already loaded by parent), only fetch if not provided
      if (propsStoreInfo && Object.keys(propsStoreInfo).length > 0) {
        // Use storeInfo from props (faster, no extra query)
        storeInfo = propsStoreInfo;
        console.log('[AIChatWidget] Using store info from props:', {
          hasAbout: !!storeInfo.aboutUs,
          hasDelivery: !!storeInfo.deliveryAreas,
          hasReturns: !!storeInfo.returnPolicy,
          aboutUsLength: storeInfo.aboutUs?.length || 0,
        });
      } else if (storeSlug && contextType === 'storefront') {
        // Fallback: Fetch if not provided in props
        console.log('[AIChatWidget] Fetching store info for:', storeSlug);
        const { data: storeData } = await supabase
          .from('stores')
          .select('about_us, delivery_areas, delivery_time, return_policy, whatsapp_number, business_name, address')
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
            address: storeData.address,
          };
          console.log('[AIChatWidget] Store info fetched successfully:', {
            hasAbout: !!storeInfo.aboutUs,
            hasDelivery: !!storeInfo.deliveryAreas,
            hasReturns: !!storeInfo.returnPolicy,
            aboutUsLength: storeInfo.aboutUs?.length || 0,
          });
        } else {
          console.log('[AIChatWidget] Store not found or no data');
        }
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();

      // DEBUG: Log what we're sending
      console.log('[AIChatWidget] Sending to AI:', {
        contextType,
        userType,
        hasUser: !!user,
        docsFound: relevantDocs.length,
        message: userMessage
      });

      // STEP 3: Call AI chat endpoint with RAG context
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
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
        console.error('[AIChatWidget] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          data
        });
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
      right: contextType === 'storefront' ? '120px' : '20px', // Move left on storefront to avoid WhatsApp button
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
                   contextType === 'business-advisory' ? '💡 Nigerian Business Consultant' :
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
                  }}>
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
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

            {/* New Topic Button */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setInputMessage('');
                  console.log('[AIChatWidget] Conversation cleared - starting new topic');
                }}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '8px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                🔄 New Topic (Clear Chat)
              </button>
            )}

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

      {/* Chat Bubble - Enhanced Visibility for Storefront */}
      {!isOpen && (
        <div style={{ position: 'relative' }}>
          {/* Pulsing ring animation for storefront */}
          {contextType === 'storefront' && (
            <div
              className="pulse-ring"
              style={{
                position: 'absolute',
                top: '-4px',
                left: '-4px',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '3px solid #667eea',
                animation: 'pulse-ring 2s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          <button
            onClick={() => setIsOpen(true)}
            style={{
              width: '64px', // Increased from 56px
              height: '64px', // Increased from 56px
              borderRadius: '50%',
              background: contextType === 'storefront'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Green for shopping
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple for admin
              border: 'none',
              boxShadow: contextType === 'storefront'
                ? '0 6px 24px rgba(16, 185, 129, 0.5)' // Stronger green shadow
                : '0 4px 16px rgba(102, 126, 234, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem', // Increased from 1.75rem
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = contextType === 'storefront'
                ? '0 8px 32px rgba(16, 185, 129, 0.6)'
                : '0 6px 24px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = contextType === 'storefront'
                ? '0 6px 24px rgba(16, 185, 129, 0.5)'
                : '0 4px 16px rgba(102, 126, 234, 0.4)';
            }}
            aria-label={contextType === 'storefront' ? 'Shop with AI Assistant' : 'Open AI Chat Assistant'}
          >
            {contextType === 'storefront' ? (
              <MessageCircle size={32} color="white" fill="white" />
            ) : (
              '💬'
            )}
          </button>

          {/* "Need Help?" tooltip for storefront - positioned to avoid cutoff */}
          {contextType === 'storefront' && (
            <>
              {/* Tooltip above button (desktop) */}
              <div
                className="chat-tooltip"
                style={{
                  position: 'absolute',
                  bottom: '75px',
                  right: 'auto',
                  left: '50%',
                  transform: 'translateX(-50%)', // Center it above the button
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#059669',
                  whiteSpace: 'nowrap',
                  animation: 'bounce-tooltip 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              >
                💬 Need help?
              </div>

              {/* Label above button (mobile - more visible) */}
              <div
                className="chat-label-mobile"
                style={{
                  position: 'absolute',
                  bottom: '72px', // Above the 64px button (button height + 8px gap)
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#059669',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  border: '1.5px solid #10b981',
                }}
              >
                💬 Chat Here
              </div>
            </>
          )}
        </div>
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

        @keyframes pulse-ring {
          0% {
            transform: scale(0.9);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes bounce-tooltip {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .chat-tooltip {
          animation: bounce-tooltip 2s ease-in-out infinite; /* Continuous bounce for visibility */
        }

        /* Desktop: Show tooltip, hide label */
        .chat-label-mobile {
          display: none;
        }

        /* Smart mobile positioning to avoid blocking key buttons */
        @media (max-width: 768px) {
          /* Mobile: Hide tooltip, show label below button */
          .chat-tooltip {
            display: none !important;
          }

          .chat-label-mobile {
            display: block !important;
            animation: pulse-label 2s ease-in-out infinite !important;
            bottom: 64px !important; /* 56px button + 8px gap on mobile - positioned ABOVE button */
          }
          /* When closed, position above mobile nav and WhatsApp buttons */
          .ai-chat-container:not(:has(.ai-chat-window)) {
            bottom: 90px !important; /* Above WhatsApp buttons */
            right: 90px !important; /* Left of WhatsApp button (20px + 56px width + 14px gap = 90px) */
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
            width: 56px !important;
            height: 56px !important;
          }

          /* Adjust button size on mobile */
          .pulse-ring {
            width: 56px !important;
            height: 56px !important;
          }
        }

        /* Pulse animation for mobile label */
        @keyframes pulse-label {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateX(-50%) scale(1.05);
            opacity: 0.9;
          }
        }

        /* Extra small screens - keep visible */
        @media (max-width: 480px) {
          .ai-chat-container:not(:has(.ai-chat-window)) {
            bottom: 85px !important;
            right: 16px !important; /* Keep on screen */
          }
        }
      `}</style>
    </div>
  );
}
