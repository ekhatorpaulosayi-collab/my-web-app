import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, X, Phone, Mail, User, Bot, UserCheck, Clock, MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  context_type: string;
  is_agent_active: boolean;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  ai_chat_messages: Message[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  created_at: string;
  is_agent_message?: boolean;
}

interface Props {
  conversation: Conversation;
  onClose: () => void;
  userId: string;
  isPowerUser?: boolean;
}

export const ChatTakeoverPanel: React.FC<Props> = ({
  conversation,
  onClose,
  userId,
  isPowerUser = false
}) => {
  const [messages, setMessages] = useState<Message[]>(conversation.ai_chat_messages || []);
  const [newMessage, setNewMessage] = useState('');
  const [isAgentActive, setIsAgentActive] = useState(conversation.is_agent_active);
  const [takeoverSessionId, setTakeoverSessionId] = useState<string | null>(null);
  const [visitorInfo, setVisitorInfo] = useState({
    name: conversation.visitor_name || '',
    email: conversation.visitor_email || '',
    phone: conversation.visitor_phone || ''
  });
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  // Take over conversation
  const handleTakeover = async () => {
    if (!isPowerUser) {
      alert('This feature is only available for power users');
      return;
    }

    try {
      // Call the takeover function
      const { data, error } = await supabase
        .rpc('initiate_agent_takeover', {
          p_conversation_id: conversation.id,
          p_agent_id: userId,
          p_reason: 'Manual intervention requested'
        });

      if (error) throw error;

      setTakeoverSessionId(data);
      setIsAgentActive(true);

      // Add system message
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: '🔔 A human agent has joined the conversation',
        created_at: new Date().toISOString(),
        is_agent_message: true
      };
      setMessages(prev => [...prev, systemMessage]);

    } catch (error) {
      console.error('Error taking over chat:', error);
      alert('Failed to take over conversation');
    }
  };

  // End takeover
  const handleEndTakeover = async () => {
    if (!takeoverSessionId) return;

    try {
      const { error } = await supabase
        .rpc('end_agent_takeover', {
          p_conversation_id: conversation.id,
          p_session_id: takeoverSessionId
        });

      if (error) throw error;

      setIsAgentActive(false);
      setTakeoverSessionId(null);

      // Add system message
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: '🔔 The human agent has left. AI assistant is back',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemMessage]);

    } catch (error) {
      console.error('Error ending takeover:', error);
    }
  };

  // Send message as agent
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isAgentActive) return;

    try {
      const messageData = {
        conversation_id: conversation.id,
        role: 'agent',
        content: newMessage,
        is_agent_message: true,
        agent_id: userId
      };

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setNewMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Update visitor information
  const handleUpdateVisitor = async () => {
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({
          visitor_name: visitorInfo.name,
          visitor_email: visitorInfo.email,
          visitor_phone: visitorInfo.phone,
          visitor_identified: true
        })
        .eq('id', conversation.id);

      if (error) throw error;

      setShowVisitorForm(false);
      alert('Visitor information updated');

    } catch (error) {
      console.error('Error updating visitor:', error);
    }
  };

  // Panel styles
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: '0',
    top: '0',
    bottom: '0',
    width: '450px',
    backgroundColor: 'white',
    boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px',
    borderBottom: '1px solid #e5e5e5',
    backgroundColor: '#f9f9f9'
  };

  const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#f5f5f5'
  };

  const messageStyle = (role: string): React.CSSProperties => ({
    marginBottom: '15px',
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-start' : 'flex-end'
  });

  const messageBubbleStyle = (role: string): React.CSSProperties => ({
    maxWidth: '70%',
    padding: '10px 15px',
    borderRadius: '15px',
    backgroundColor: role === 'user' ? '#e3e3e3' : role === 'agent' ? '#4CAF50' : '#007bff',
    color: role === 'user' ? '#333' : 'white'
  });

  const inputContainerStyle: React.CSSProperties = {
    padding: '20px',
    borderTop: '1px solid #e5e5e5',
    backgroundColor: 'white'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    margin: '5px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
              {isAgentActive ? '🟢 Live Chat' : 'Chat Viewer'}
            </h3>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                <User size={14} style={{ marginRight: '5px' }} />
                {conversation.visitor_name || 'Anonymous Visitor'}
              </div>
              {conversation.visitor_email && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <Mail size={14} style={{ marginRight: '5px' }} />
                  {conversation.visitor_email}
                </div>
              )}
              {conversation.visitor_phone && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Phone size={14} style={{ marginRight: '5px' }} />
                  {conversation.visitor_phone}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ ...buttonStyle, backgroundColor: '#f44336', color: 'white' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '15px' }}>
          {!isAgentActive && isPowerUser && (
            <button
              onClick={handleTakeover}
              style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: 'white' }}
            >
              <MessageCircle size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              Take Over Chat
            </button>
          )}
          {isAgentActive && (
            <button
              onClick={handleEndTakeover}
              style={{ ...buttonStyle, backgroundColor: '#ff9800', color: 'white' }}
            >
              End Takeover
            </button>
          )}
          <button
            onClick={() => setShowVisitorForm(!showVisitorForm)}
            style={{ ...buttonStyle, backgroundColor: '#2196F3', color: 'white' }}
          >
            <UserCheck size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
            Identify Visitor
          </button>
        </div>

        {/* Visitor Info Form */}
        {showVisitorForm && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
            <input
              type="text"
              placeholder="Visitor Name"
              value={visitorInfo.name}
              onChange={(e) => setVisitorInfo({ ...visitorInfo, name: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={visitorInfo.email}
              onChange={(e) => setVisitorInfo({ ...visitorInfo, email: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="tel"
              placeholder="Phone"
              value={visitorInfo.phone}
              onChange={(e) => setVisitorInfo({ ...visitorInfo, phone: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <button
              onClick={handleUpdateVisitor}
              style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: 'white', width: '100%' }}
            >
              Save Visitor Info
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={messagesContainerStyle}>
        {messages.map((msg) => (
          <div key={msg.id} style={messageStyle(msg.role)}>
            <div style={messageBubbleStyle(msg.role)}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                {msg.role === 'user' ? (
                  <User size={14} style={{ marginRight: '5px' }} />
                ) : msg.is_agent_message ? (
                  <UserCheck size={14} style={{ marginRight: '5px' }} />
                ) : (
                  <Bot size={14} style={{ marginRight: '5px' }} />
                )}
                <span style={{ fontSize: '11px', opacity: 0.8 }}>
                  {msg.role === 'user' ? 'Visitor' : msg.is_agent_message ? 'Agent' : 'AI'}
                </span>
                <span style={{ fontSize: '10px', marginLeft: 'auto', opacity: 0.7 }}>
                  <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (only when agent is active) */}
      {isAgentActive && (
        <div style={inputContainerStyle}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                ...buttonStyle,
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '10px 20px'
              }}
            >
              <Send size={18} />
            </button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            You are chatting as a human agent. The AI is paused.
          </div>
        </div>
      )}
    </div>
  );
};