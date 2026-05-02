// REDESIGNED CONVERSATIONS PAGE - MODERN UI WITH TABS AND AVATARS
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Search, Send, MessageSquare, X, UserCheck, UserX, AlertCircle, Check } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { parseISO } from 'date-fns';
import QuotaAlert from './QuotaAlert';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'agent' | string;
  content: string;
  created_at: string;
  is_agent_message?: boolean;
  agent_id?: string;
  sender_type?: string;
  detected_language?: string;
  translated_text?: string;
}

interface Conversation {
  id: string;
  session_id: string;
  store_id: string;
  visitor_name?: string;
  visitor_email?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  is_active?: boolean;
  is_agent_active?: boolean;
  agent_id?: string;
  takeover_status?: string;
  waiting_for_owner_since?: string;
  first_message?: string;
  detected_language?: string;
}

type TabFilter = 'waiting' | 'active' | 'all';

// Markdown rendering functions (copied from AIChatWidget)
function renderMarkdown(text: string): React.ReactNode {
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

  // Wrap in a div for better mobile rendering instead of Fragment
  return <div style={{ display: 'contents' }}>{elements}</div>;
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

  return <span style={{ display: 'inline' }}>{parts}</span>;
}

export default function ConversationsSimplifiedFixed() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [hasTakeoverMessageSent, setHasTakeoverMessageSent] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [isMobile, setIsMobile] = useState(false);

  const { currentUser: user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIds = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Some Supabase responses return timestamptz columns without a
  // timezone suffix. Treat naked ISO strings as UTC.
  const parseUtc = (dateStr: string): Date => {
    if (!dateStr) return new Date(NaN);
    // If string already has Z or +/- offset, parseISO handles it.
    // Otherwise, append Z to force UTC interpretation.
    const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(dateStr);
    return parseISO(hasTz ? dateStr : dateStr + 'Z');
  };

  // Helper function to get relative time
  const getRelativeTime = (dateStr: string): string => {
    const date = parseUtc(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 1) return `${diffInDays} days ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInHours > 1) return `${diffInHours} hours ago`;
    if (diffInHours === 1) return '1 hour ago';
    if (diffInMinutes > 1) return `${diffInMinutes} min ago`;
    if (diffInMinutes === 1) return '1 min ago';
    return 'Just now';
  };

  // Helper to get conversation status
  const getConversationStatus = (conv: Conversation): 'waiting' | 'active' | 'missed' | 'ended' => {
    if (conv.takeover_status === 'requested') {
      if (conv.waiting_for_owner_since) {
        const waitingTime = Date.now() - parseUtc(conv.waiting_for_owner_since).getTime();
        if (waitingTime > 30 * 60 * 1000) { // 30 minutes
          return 'missed';
        }
      }
      return 'waiting';
    }
    if (conv.is_agent_active) return 'active';
    return 'ended';
  };

  // Get customer name with language detection
  const getCustomerName = (conv: Conversation): string => {
    if (conv.visitor_name) return conv.visitor_name;

    // Check for detected language in conversation or first message
    if (conv.detected_language && conv.detected_language.toLowerCase() !== 'english') {
      const langMap: Record<string, string> = {
        'hausa': 'Hausa speaker',
        'yoruba': 'Yoruba speaker',
        'igbo': 'Igbo speaker',
        'pidgin': 'Pidgin speaker'
      };
      return langMap[conv.detected_language.toLowerCase()] || 'Anonymous visitor';
    }

    return 'Anonymous visitor';
  };

  // Load conversations with first message
  const loadConversations = async () => {
    try {
      // First get stores for this user
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.uid || '');

      const storeIds = stores?.map(s => s.id) || [];

      // Get conversations
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*, takeover_status, waiting_for_owner_since')
        .in('store_id', storeIds.length > 0 ? storeIds : [user?.uid || ''])
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        // Auto-expire stale conversations
        for (const conv of data) {
          try {
            // Check if waiting for too long (> 30 minutes)
            if (conv.waiting_for_owner_since) {
              const waitingTime = Date.now() - parseUtc(conv.waiting_for_owner_since).getTime();
              if (waitingTime > 30 * 60 * 1000) {
                // Update database to end the waiting state
                await supabase
                  .from('ai_chat_conversations')
                  .update({
                    waiting_for_owner_since: null,
                    is_agent_active: false,
                    takeover_status: 'ai'
                  })
                  .eq('id', conv.id);

                // Update local object
                conv.waiting_for_owner_since = null;
                conv.is_agent_active = false;
                conv.takeover_status = 'ai';
              }
            }

            // Check if agent session is too old (> 24 hours since last message)
            if (conv.is_agent_active) {
              const { data: lastMessage } = await supabase
                .from('ai_chat_messages')
                .select('created_at')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (lastMessage) {
                const timeSinceLastMessage = Date.now() - parseUtc(lastMessage.created_at).getTime();
                if (timeSinceLastMessage > 24 * 60 * 60 * 1000) {
                  // Update database to end the agent session
                  await supabase
                    .from('ai_chat_conversations')
                    .update({
                      is_agent_active: false,
                      takeover_status: 'ai'
                    })
                    .eq('id', conv.id);

                  // Update local object
                  conv.is_agent_active = false;
                  conv.takeover_status = 'ai';
                }
              }
            }
          } catch (expireError) {
            // If update fails, just display as-is
            console.error('Error expiring conversation:', expireError);
          }
        }

        // Load first message for each conversation
        const conversationsWithMessages = await Promise.all(
          data.map(async (conv) => {
            const { data: firstMsg } = await supabase
              .from('ai_chat_messages')
              .select('content, detected_language')
              .eq('conversation_id', conv.id)
              .eq('role', 'user')
              .order('created_at', { ascending: true })
              .limit(1)
              .single();

            return {
              ...conv,
              first_message: firstMsg?.content || '',
              detected_language: firstMsg?.detected_language || conv.detected_language
            };
          })
        );

        // Sort conversations
        const sortedConversations = [...conversationsWithMessages].sort((a, b) => {
          const statusA = getConversationStatus(a);
          const statusB = getConversationStatus(b);

          // Priority: waiting > active > missed > ended
          const priorityMap = { waiting: 0, active: 1, missed: 2, ended: 3 };
          if (priorityMap[statusA] !== priorityMap[statusB]) {
            return priorityMap[statusA] - priorityMap[statusB];
          }

          // Within same status, sort by time. Use parseUtc so naked ISO
          // strings from Supabase aren't misread as local time.
          return parseUtc(b.updated_at).getTime() - parseUtc(a.updated_at).getTime();
        });

        setConversations(sortedConversations);

        // Set default tab based on conversations
        const hasWaiting = sortedConversations.some(c => getConversationStatus(c) === 'waiting');
        if (hasWaiting && activeTab === 'all') {
          setActiveTab('waiting');
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages with deduplication
  const loadMessages = async () => {
    if (!selectedConversation) return;

    try {
      const { data: messages, error } = await supabase
        .from('ai_chat_messages')
        .select('*, detected_language, translated_text')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (!error && messages) {
        // Deduplicate messages
        const uniqueMessages = new Map<string, Message>();
        const seenContents = new Map<string, number>();

        messages.forEach((msg) => {
          const contentKey = `${msg.content}-${msg.sender_type}-${msg.role}`;
          const timeKey = parseUtc(msg.created_at).getTime();

          const lastSeenTime = seenContents.get(contentKey);
          if (lastSeenTime && Math.abs(timeKey - lastSeenTime) < 5000) {
            return;
          }

          const messageKey = msg.id || `${contentKey}-${timeKey}`;

          if (!uniqueMessages.has(messageKey)) {
            uniqueMessages.set(messageKey, msg);
            seenContents.set(contentKey, timeKey);
          }
        });

        const deduplicatedMessages = Array.from(uniqueMessages.values());

        setSelectedConversation(prev => {
          if (!prev) return prev;
          return { ...prev, messages: deduplicatedMessages };
        });

        deduplicatedMessages.forEach(msg => {
          if (msg.id) {
            processedMessageIds.current.add(msg.id);
          }
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Take over conversation
  const initiateTakeover = async () => {
    if (!selectedConversation || !user) return;

    setIsTakeoverActive(true);

    try {
      const { data: currentConv } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, agent_id')
        .eq('id', selectedConversation.id)
        .single();

      if (currentConv?.is_agent_active) {
        setHasTakeoverMessageSent(true);
        return;
      }

      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          is_agent_active: true,
          agent_id: user.uid,
          takeover_status: 'agent_active'
        })
        .eq('id', selectedConversation.id);

      if (error) {
        setIsTakeoverActive(false);
        console.error('Failed to take over chat:', error);
        return;
      }

      setSelectedConversation(prev => prev ? {
        ...prev,
        is_agent_active: true,
        agent_id: user.uid,
        takeover_status: 'agent_active'
      } : null);

      const { data: existingTakeoverMsg } = await supabase
        .from('ai_chat_messages')
        .select('id')
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_type', 'system')
        .or('content.eq.A human agent has joined the chat,content.eq.You joined the chat')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!existingTakeoverMsg) {
        await supabase
          .from('ai_chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            role: 'system',
            content: 'You joined the chat',
            sender_type: 'system'
          });
      }

      setHasTakeoverMessageSent(true);
      setTimeout(() => loadMessages(), 200);
    } catch (error) {
      setIsTakeoverActive(false);
      console.error('Error taking over chat:', error);
    }
  };

  // Send agent message
  const sendAgentMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !user || sendingMessage) return;

    setSendingMessage(true);
    const messageToSend = messageText.trim();
    setMessageText('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No auth session available:', sessionError);
        setMessageText(messageToSend);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-agent-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: messageToSend,
          agentId: user.uid
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('Error sending message via edge function:', data.error);
        setMessageText(messageToSend);
      } else {
        if (data.message?.id) {
          processedMessageIds.current.add(data.message.id);
        }
      }

      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(messageToSend);
    } finally {
      setSendingMessage(false);
    }
  };

  // End takeover
  const endTakeover = async () => {
    if (!selectedConversation || !user) return;

    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          is_agent_active: false,
          takeover_status: 'ai'
        })
        .eq('id', selectedConversation.id);

      if (!error) {
        setIsTakeoverActive(false);
        setHasTakeoverMessageSent(false);

        const { data: existingEndMsg } = await supabase
          .from('ai_chat_messages')
          .select('id')
          .eq('conversation_id', selectedConversation.id)
          .eq('sender_type', 'system')
          .eq('content', 'The agent has left the chat. AI assistant will continue.')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!existingEndMsg) {
          await supabase
            .from('ai_chat_messages')
            .insert({
              conversation_id: selectedConversation.id,
              role: 'system',
              content: 'The agent has left the chat. AI assistant will continue.',
              sender_type: 'system'
            });
        }

        loadMessages();
      }
    } catch (error) {
      console.error('Error ending takeover:', error);
    }
  };

  // Filter conversations based on active tab
  const getFilteredConversations = () => {
    let filtered = conversations;

    // Apply tab filter
    if (activeTab === 'waiting') {
      filtered = filtered.filter(conv => getConversationStatus(conv) === 'waiting');
    } else if (activeTab === 'active') {
      filtered = filtered.filter(conv => getConversationStatus(conv) === 'active');
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        getCustomerName(conv).toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.first_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.session_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Count waiting conversations
  const waitingCount = conversations.filter(c => getConversationStatus(c) === 'waiting').length;

  // Setup polling for messages
  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      setHasTakeoverMessageSent(false);

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      pollingInterval.current = setInterval(() => {
        loadMessages();
      }, 2000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [selectedConversation?.id]);

  // Detect mobile/desktop and handle resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();

      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Check takeover status when selecting conversation
  useEffect(() => {
    if (selectedConversation) {
      if (!isTakeoverActive) {
        const isActive = selectedConversation.is_agent_active === true ||
                        selectedConversation.takeover_status === 'agent_active';
        setIsTakeoverActive(isActive);

        if (isActive) {
          setHasTakeoverMessageSent(true);
        }
      }
    }
  }, [selectedConversation?.id]);

  const filteredConversations = getFilteredConversations();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading conversations...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar - hide on mobile when conversation is selected */}
      <div style={{
        width: isMobile ? '100%' : '380px',
        backgroundColor: 'white',
        borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
        display: (isMobile && selectedConversation) ? 'none' : 'flex',
        flexDirection: 'column'
      }}>
        {/* Blue Header (matching main dashboard) */}
        <div style={{
          backgroundColor: '#2063F0',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'white'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Conversations</h2>
          </div>

          {/* Quota Alert - Hidden on this page as dashboard already handles it */}
          {/* <QuotaAlert userId={user?.uid} /> */}
        </div>

        {/* Tab Filter Bar */}
        <div style={{ padding: '12px 0 12px 16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('waiting')}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: activeTab === 'waiting' ? '#2063F0' : '#f0f0f0',
                color: activeTab === 'waiting' ? 'white' : '#666',
                boxShadow: activeTab === 'waiting' ? '0 2px 4px rgba(32, 99, 240, 0.25)' : 'none'
              }}
            >
              Waiting {waitingCount > 0 && `(${waitingCount})`}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: activeTab === 'active' ? '#2063F0' : '#f0f0f0',
                color: activeTab === 'active' ? 'white' : '#666',
                boxShadow: activeTab === 'active' ? '0 2px 4px rgba(32, 99, 240, 0.25)' : 'none'
              }}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: activeTab === 'all' ? '#2063F0' : '#f0f0f0',
                color: activeTab === 'all' ? 'white' : '#666',
                boxShadow: activeTab === 'all' ? '0 2px 4px rgba(32, 99, 240, 0.25)' : 'none'
              }}
            >
              All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} size={20} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: '24px',
                fontSize: '14px',
                backgroundColor: '#f9fafb'
              }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
              No conversations found
            </div>
          ) : (
            filteredConversations.map(conv => {
              const status = getConversationStatus(conv);
              const isOld = Date.now() - new Date(conv.updated_at).getTime() > 24 * 60 * 60 * 1000; // 24 hours

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    backgroundColor: selectedConversation?.id === conv.id ? '#f0f9ff' : 'white',
                    transition: 'background-color 0.2s',
                    opacity: isOld ? 0.45 : 1,
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}
                >
                  {/* Avatar Circle */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: status === 'waiting' ? '#FEE2E2' :
                                   status === 'active' ? '#DCFCE7' :
                                   status === 'missed' ? '#FEF3C7' : '#F3F4F6',
                    color: status === 'waiting' ? '#DC2626' :
                          status === 'active' ? '#16A34A' :
                          status === 'missed' ? '#92400E' : '#9CA3AF',
                    flexShrink: 0,
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    {status === 'waiting' ? '!' :
                     status === 'active' ? '●' :
                     status === 'missed' ? '⚠' :
                     '✓'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                        {getCustomerName(conv)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>
                        {getRelativeTime(conv.updated_at)}
                      </div>
                    </div>

                    {/* Message Preview */}
                    {conv.first_message && (
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '6px'
                      }}>
                        {conv.first_message}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div style={{ marginTop: '5px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '500',
                        backgroundColor: status === 'waiting' ? '#FEE2E2' :
                                       status === 'active' ? '#DCFCE7' :
                                       status === 'missed' ? '#FEF3C7' : '#F3F4F6',
                        color: status === 'waiting' ? '#DC2626' :
                               status === 'active' ? '#16A34A' :
                               status === 'missed' ? '#92400E' : '#6B7280',
                        display: 'inline-block'
                      }}>
                        {status === 'waiting' ? 'Waiting for you' :
                         status === 'active' ? 'Agent active' :
                         status === 'missed' ? 'Missed' : 'Ended'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area - show full width on mobile when conversation selected, or hide when no conversation */}
      <div style={{
        flex: 1,
        display: (isMobile && !selectedConversation) ? 'none' : 'flex',
        flexDirection: 'column',
        width: isMobile ? '100%' : 'auto'
      }}>
        {selectedConversation ? (
          <>
            {/* Header with Blue background */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: '#2063F0',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Back Chevron - always visible on mobile, optional on desktop */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Customer Name and Translation Info */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    {getCustomerName(selectedConversation)}
                  </h3>
                  {(() => {
                    // Get the most recent customer message's detected language
                    const recentCustomerMsg = selectedConversation.messages
                      ?.filter(m => m.role === 'user' && !m.is_agent_message)
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                    const detectedLang = recentCustomerMsg?.detected_language || selectedConversation.detected_language;

                    if (detectedLang && detectedLang.toLowerCase() !== 'english') {
                      return (
                        <p style={{
                          fontSize: '12px',
                          opacity: 0.9,
                          marginTop: '2px',
                          margin: 0
                        }}>
                          Translating: {detectedLang} ↔ English
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* End Takeover Button */}
              {isTakeoverActive && (
                <button
                  onClick={endTakeover}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                >
                  End takeover
                </button>
              )}

              {/* Take Over Button (if not active) */}
              {!isTakeoverActive && (
                <button
                  onClick={initiateTakeover}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  }}
                >
                  Take over chat
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: '#f9fafb'
            }}>
              {selectedConversation.messages?.map((msg, idx) => {
                // Determine message alignment and styling
                const isCustomer = msg.role === 'user' && !msg.is_agent_message;
                const isOwner = msg.is_agent_message || msg.sender_type === 'agent';
                const isAI = !isCustomer && !isOwner && msg.role === 'assistant';
                const isSystem = msg.sender_type === 'system';

                // System messages are centered
                if (isSystem) {
                  return (
                    <div
                      key={msg.id || `msg-${idx}-${msg.created_at}`}
                      style={{
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {msg.content === 'A human agent has joined the chat' ? 'You joined the chat' : msg.content}
                      </div>
                    </div>
                  );
                }

                // Format time
                const msgTime = parseUtc(msg.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });

                return (
                  <div
                    key={msg.id || `msg-${idx}-${msg.created_at}`}
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: isOwner ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 14px',
                      borderRadius: isCustomer ? '16px 16px 16px 4px' :
                                  isOwner ? '16px 16px 4px 16px' :
                                  '16px 16px 16px 4px',
                      backgroundColor: isCustomer ? '#f3f4f6' :
                                     isOwner ? '#2563eb' :
                                     '#f0f7ff',
                      color: isCustomer ? '#111827' :
                            isOwner ? 'white' :
                            '#111827',
                      border: isAI ? '1px solid #d0e2ff' : 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      {/* Main message content */}
                      <div style={{ lineHeight: '1.5', wordBreak: 'break-word' }}>
                        {isAI ? renderMarkdown(msg.content) : msg.content}
                      </div>

                      {/* Translation display for customer messages */}
                      {isCustomer && msg.translated_text && msg.detected_language &&
                       msg.detected_language.toLowerCase() !== 'english' &&
                       msg.detected_language.toLowerCase() !== 'en' && (
                        <div style={{
                          fontSize: '11px',
                          color: '#666',
                          fontStyle: 'italic',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          🌐 {msg.translated_text}
                        </div>
                      )}

                      {/* Translation display for owner messages */}
                      {isOwner && msg.translated_text && (
                        <div style={{
                          fontSize: '12px',
                          opacity: 0.85,
                          fontStyle: 'italic',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          🌐 → {msg.translated_text}
                        </div>
                      )}

                      {/* Timestamp metadata */}
                      <div style={{
                        fontSize: '11px',
                        opacity: isOwner ? 0.8 : 0.6,
                        marginTop: '4px',
                        color: isOwner ? 'inherit' : '#6b7280'
                      }}>
                        {isCustomer ? msgTime :
                         isAI ? `${msgTime} · AI` :
                         isOwner ? `${msgTime} · You` : msgTime}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {isTakeoverActive && (
              <div style={{
                padding: '16px 24px',
                backgroundColor: 'white',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendAgentMessage();
                      }
                    }}
                    placeholder="Reply in English..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '24px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendAgentMessage}
                    disabled={sendingMessage || !messageText.trim()}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: sendingMessage || !messageText.trim() ? '#e5e7eb' : '#2563eb',
                      color: 'white',
                      border: 'none',
                      cursor: sendingMessage || !messageText.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (!sendingMessage && messageText.trim()) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.background = '#1e40af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      if (!sendingMessage && messageText.trim()) {
                        e.currentTarget.style.background = '#2563eb';
                      }
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280'
          }}>
            <MessageSquare size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: '500' }}>Select a conversation to start</p>
          </div>
        )}
      </div>
    </div>
  );
}