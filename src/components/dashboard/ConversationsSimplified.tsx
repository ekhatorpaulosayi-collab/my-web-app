// SIMPLIFIED CONVERSATIONS PAGE - NO REALTIME COMPLICATIONS, JUST POLLING
import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, MessageSquare, X, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'agent' | string;
  content: string;
  created_at: string;
  is_agent_message?: boolean;
  agent_id?: string;
  sender_type?: string;
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
}

export default function ConversationsSimplified() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);

  const { currentUser: user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .eq('store_id', user?.uid || '')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async () => {
    if (!selectedConversation) return;

    try {
      const { data: messages, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (!error && messages) {
        setSelectedConversation(prev => {
          if (!prev) return prev;
          return { ...prev, messages };
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Take over conversation
  const initiateTakeover = async () => {
    if (!selectedConversation || !user) return;

    try {
      // Update conversation status
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          is_agent_active: true,
          agent_id: user.uid,
          takeover_status: 'agent_active'
        })
        .eq('id', selectedConversation.id);

      if (!error) {
        setIsTakeoverActive(true);

        // Add system message
        await supabase
          .from('ai_chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            role: 'system',
            content: 'A human agent has joined the chat',
            sender_type: 'system'
          });

        // Reload messages
        loadMessages();
      }
    } catch (error) {
      console.error('Error taking over chat:', error);
    }
  };

  // Send agent message - ALWAYS USE RPC FUNCTION
  const sendAgentMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !user || sendingMessage) return;

    setSendingMessage(true);
    const messageToSend = messageText.trim();
    setMessageText('');

    try {
      // CRITICAL: Use the RPC function to ensure proper message handling
      const { data, error } = await supabase.rpc('send_agent_message', {
        p_conversation_id: selectedConversation.id,
        p_message: messageToSend,
        p_agent_id: user.uid
      });

      if (error) {
        console.error('Error sending message via RPC:', error);

        // Fallback: Try direct insert with all necessary fields
        const { error: insertError } = await supabase
          .from('ai_chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            role: 'assistant',
            content: messageToSend,
            is_agent_message: true,
            agent_id: user.uid,
            sender_type: 'agent'
          });

        if (insertError) {
          console.error('Fallback insert also failed:', insertError);
          setMessageText(messageToSend); // Restore message on failure
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

        // Add system message
        await supabase
          .from('ai_chat_messages')
          .insert({
            conversation_id: selectedConversation.id,
            role: 'system',
            content: 'The agent has left the chat. AI assistant will continue.',
            sender_type: 'system'
          });

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
      setIsTakeoverActive(
        selectedConversation.is_agent_active === true ||
        selectedConversation.takeover_status === 'agent_active'
      );
    }
  }, [selectedConversation]);

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
                  backgroundColor: selectedConversation?.id === conv.id ? '#f3f4f6' : 'white',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {conv.visitor_name || 'Anonymous'}
                  </div>
                  {conv.is_agent_active && (
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
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {conv.visitor_email || conv.session_id.slice(0, 8)}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  {new Date(conv.updated_at).toLocaleString()}
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
                  key={msg.id || idx}
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
    </div>
  );
}