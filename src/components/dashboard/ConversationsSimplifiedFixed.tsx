// SIMPLIFIED CONVERSATIONS - WITH DEDUPLICATION & SINGLE TAKEOVER MESSAGE
import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, MessageSquare, X, UserCheck, UserX, AlertCircle, Clock } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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

  const { currentUser: user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIds = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Helper function to calculate elapsed time
  const getElapsedTime = (waitingSince: string): string => {
    const start = new Date(waitingSince);
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Load conversations
  const loadConversations = async () => {
    try {
      // First get stores for this user
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.uid || '');

      const storeIds = stores?.map(s => s.id) || [];

      // Then get conversations for those stores with takeover_status and waiting_for_owner_since
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*, takeover_status, waiting_for_owner_since')
        .in('store_id', storeIds.length > 0 ? storeIds : [user?.uid || ''])
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        // Sort conversations: requested takeover status at the top
        const sortedConversations = [...data].sort((a, b) => {
          // Priority 1: Conversations with takeover_status = 'requested'
          if (a.takeover_status === 'requested' && b.takeover_status !== 'requested') return -1;
          if (b.takeover_status === 'requested' && a.takeover_status !== 'requested') return 1;

          // Priority 2: If both are requested, sort by waiting_for_owner_since (oldest first)
          if (a.takeover_status === 'requested' && b.takeover_status === 'requested') {
            const aTime = a.waiting_for_owner_since ? new Date(a.waiting_for_owner_since).getTime() : 0;
            const bTime = b.waiting_for_owner_since ? new Date(b.waiting_for_owner_since).getTime() : 0;
            return aTime - bTime; // Older waiting times come first
          }

          // Default: Sort by updated_at (most recent first)
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        setConversations(sortedConversations);
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
          // Create a unique key based on content, sender, and timestamp
          const contentKey = `${msg.content}-${msg.sender_type}-${msg.role}`;
          const timeKey = new Date(msg.created_at).getTime();

          // Check if we've seen this exact content recently (within 5 seconds)
          const lastSeenTime = seenContents.get(contentKey);
          if (lastSeenTime && Math.abs(timeKey - lastSeenTime) < 5000) {
            // Skip duplicate message within 5 second window
            return;
          }

          // Use message ID if available, otherwise create composite key
          const messageKey = msg.id || `${contentKey}-${timeKey}`;

          // Only add if not already processed
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

        // Update processed message IDs
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

  // Take over conversation - with single message check
  const initiateTakeover = async () => {
    if (!selectedConversation || !user) return;

    // Set UI state immediately to prevent flicker
    setIsTakeoverActive(true);

    try {
      // First check if takeover is already active
      const { data: currentConv } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, agent_id')
        .eq('id', selectedConversation.id)
        .single();

      if (currentConv?.is_agent_active) {
        // Already taken over, just update UI
        setHasTakeoverMessageSent(true);
        return;
      }

      // Update conversation status
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          is_agent_active: true,
          agent_id: user.uid,
          takeover_status: 'agent_active'
        })
        .eq('id', selectedConversation.id);

      if (error) {
        // Revert UI state on error
        setIsTakeoverActive(false);
        console.error('Failed to take over chat:', error);
        return;
      }

      // Update local conversation state to prevent polling from resetting
      setSelectedConversation(prev => prev ? {
        ...prev,
        is_agent_active: true,
        agent_id: user.uid,
        takeover_status: 'agent_active'
      } : null);

      // Check if takeover message already exists in database
      const { data: existingTakeoverMsg } = await supabase
        .from('ai_chat_messages')
        .select('id')
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_type', 'system')
        .eq('content', 'A human agent has joined the chat')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Only add system message if it doesn't already exist
      if (!existingTakeoverMsg) {
        await supabase
          .from('ai_chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            role: 'system',
            content: 'A human agent has joined the chat',
            sender_type: 'system'
          });
      }

      setHasTakeoverMessageSent(true);

      // Delay message reload slightly to ensure DB updates propagate
      setTimeout(() => loadMessages(), 200);
    } catch (error) {
      // Revert UI state on error
      setIsTakeoverActive(false);
      console.error('Error taking over chat:', error);
    }
  };

  // Send agent message - USE EDGE FUNCTION FOR TRANSLATION
  const sendAgentMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !user || sendingMessage) return;

    setSendingMessage(true);
    const messageToSend = messageText.trim();
    setMessageText('');

    try {
      // Get auth session for edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No auth session available:', sessionError);
        setMessageText(messageToSend);
        return;
      }

      // Use new edge function for translation support
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
        setMessageText(messageToSend); // Restore message on failure
      } else {
        // Mark message as processed to avoid duplication
        if (data.message?.id) {
          processedMessageIds.current.add(data.message.id);
        }
      }

      // Reload messages after sending
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

        // Check if end message already exists
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
          // Add system message only if it doesn't exist
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

  // Setup polling for messages
  useEffect(() => {
    if (selectedConversation) {
      // Initial load
      loadMessages();

      // Reset takeover message flag when conversation changes
      setHasTakeoverMessageSent(false);

      // Setup polling every 2 seconds
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

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();

      // Refresh conversations every 5 seconds
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
      // Don't override if already active (prevent flicker)
      if (!isTakeoverActive) {
        const isActive = selectedConversation.is_agent_active === true ||
                        selectedConversation.takeover_status === 'agent_active';
        setIsTakeoverActive(isActive);

        // If already active, mark takeover message as sent
        if (isActive) {
          setHasTakeoverMessageSent(true);
        }
      }
    }
  }, [selectedConversation?.id]); // Only re-run when conversation ID changes

  const filteredConversations = conversations.filter(conv =>
    !searchTerm ||
    conv.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.visitor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.session_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading conversations...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Conversations</h2>

          {/* Quota Alert Bar */}
          <QuotaAlert userId={user?.uid} />

          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} size={20} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
              No conversations found
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  backgroundColor: selectedConversation?.id === conv.id ? '#f3f4f6' :
                    conv.takeover_status === 'requested' ? '#fef2f2' : 'white',
                  transition: 'background-color 0.2s',
                  position: 'relative'
                }}
              >
                {/* Urgent indicator for waiting customers */}
                {conv.takeover_status === 'requested' && (
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    bottom: '0',
                    width: '4px',
                    backgroundColor: '#ef4444'
                  }} />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>
                        {conv.visitor_name || 'Anonymous'}
                      </div>
                      {conv.takeover_status === 'requested' && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          animation: 'pulse 2s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#ef4444',
                            borderRadius: '50%',
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                          }} />
                          <AlertCircle size={14} style={{ color: '#ef4444' }} />
                        </div>
                      )}
                    </div>

                    {/* Waiting indicator */}
                    {conv.takeover_status === 'requested' && conv.waiting_for_owner_since && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        <Clock size={12} />
                        <span>Customer waiting for {getElapsedTime(conv.waiting_for_owner_since)}</span>
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {conv.visitor_email || conv.session_id.slice(0, 8)}
                    </div>

                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                      {new Date(conv.updated_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {conv.takeover_status === 'requested' && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        WAITING
                      </span>
                    )}
                    {conv.is_agent_active && conv.takeover_status !== 'requested' && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        Agent Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div style={{
              padding: '16px',
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                  {selectedConversation.visitor_name || 'Anonymous Visitor'}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Session: {selectedConversation.session_id.slice(0, 16)}...
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!isTakeoverActive ? (
                  <button
                    onClick={initiateTakeover}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserCheck size={16} />
                    Take Over Chat
                  </button>
                ) : (
                  <button
                    onClick={endTakeover}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserX size={16} />
                    End Takeover
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: '#f9fafb'
            }}>
              {selectedConversation.messages?.map((msg, idx) => (
                <div
                  key={msg.id || `msg-${idx}-${msg.created_at}`}
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: msg.role === 'user' ? 'white' :
                                   msg.sender_type === 'agent' ? '#10b981' :
                                   msg.sender_type === 'system' ? '#fbbf24' : '#3b82f6',
                    color: msg.role === 'user' ? '#111827' : 'white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {msg.sender_type === 'agent' && (
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>
                        👤 Agent
                      </div>
                    )}
                    {msg.sender_type === 'system' && (
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>
                        ⚡ System
                      </div>
                    )}
                    <div>{msg.content}</div>
                    {/* Show translation for customer messages */}
                    {msg.role === 'user' && msg.translated_text && msg.detected_language?.toLowerCase() !== 'english' && (
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        fontStyle: 'italic',
                        marginTop: '4px',
                        borderTop: '1px solid #eee',
                        paddingTop: '4px'
                      }}>
                        🌐 {msg.translated_text}
                      </div>
                    )}
                    {/* Show language info for agent messages */}
                    {msg.is_agent_message && msg.translated_text && (
                      <div style={{
                        fontSize: '11px',
                        color: '#999',
                        marginTop: '2px'
                      }}>
                        Sent in {msg.detected_language === 'english' ? 'customer language' : msg.detected_language}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {isTakeoverActive && (
              <div style={{
                padding: '16px',
                backgroundColor: 'white',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                    placeholder="Type your message..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendAgentMessage}
                    disabled={sendingMessage || !messageText.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: sendingMessage ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: sendingMessage ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={16} />
                    {sendingMessage ? 'Sending...' : 'Send'}
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
            <MessageSquare size={48} />
            <p style={{ marginTop: '16px' }}>Select a conversation to start</p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}