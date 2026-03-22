// Simplified Agent Chat - Easy for all users
import React, { useState, useEffect } from 'react';
import { Send, User, Bot, MessageCircle, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'agent';
  created_at: string;
  is_agent_message?: boolean;
}

interface SimpleAgentChatProps {
  conversationId: string;
  storeId: string;
  sessionId: string;
}

export function SimpleAgentChat({ conversationId, storeId, sessionId }: SimpleAgentChatProps) {
  const { currentUser: user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load messages
  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            content: newMsg.content,
            role: newMsg.role,
            created_at: newMsg.created_at,
            is_agent_message: newMsg.metadata?.is_agent === true
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process messages to identify agent messages
      const processedMessages = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'agent',
        created_at: msg.created_at,
        is_agent_message: msg.metadata?.is_agent === true || msg.metadata?.agent_id === user?.uid
      }));

      setMessages(processedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendAgentMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;

    // Add message optimistically
    const optimisticMessage: Message = {
      id: tempId,
      content: newMessage,
      role: 'assistant',
      created_at: new Date().toISOString(),
      is_agent_message: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      // Insert as a regular message but mark it as from agent in metadata
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: `[Agent ${user.email}]: ${newMessage}`,
          metadata: {
            is_agent: true,
            agent_id: user.uid,
            agent_email: user.email,
            sent_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Update the optimistic message with real data
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? {
          ...data,
          is_agent_message: true
        } : msg
      ));

      // Update conversation to mark agent interaction
      await supabase
        .from('ai_chat_conversations')
        .update({
          metadata: {
            last_agent_interaction: new Date().toISOString(),
            agent_id: user.uid,
            agent_email: user.email
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(newMessage); // Restore message
    } finally {
      setSending(false);
    }
  };

  const getMessageStyle = (message: Message) => {
    if (message.role === 'user') {
      return 'bg-gradient-to-r from-green-600 to-emerald-600 text-white ml-auto';
    } else if (message.is_agent_message) {
      return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-900 border-2 border-blue-200';
    }
    return 'bg-white text-gray-800 border border-gray-200';
  };

  const getMessageIcon = (message: Message) => {
    if (message.role === 'user') return <User className="h-4 w-4" />;
    if (message.is_agent_message) return <User className="h-4 w-4 text-blue-600" />;
    return <Bot className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-900">
              Chat with Customer
            </span>
            <span className="text-sm text-gray-500">
              Session: {sessionId.slice(0, 8)}
            </span>
          </div>

          {/* Simple WhatsApp Link */}
          <a
            href={`https://wa.me/?text=Hi, I'm helping with chat session ${sessionId.slice(0, 8)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-[#25D366] text-white rounded-lg
                     hover:bg-[#128C7E] transition-colors text-sm"
          >
            <Phone className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] p-3 rounded-lg ${getMessageStyle(message)}`}>
                <div className="flex items-start gap-2">
                  {getMessageIcon(message)}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Always show message input for store owners */}
      <form onSubmit={sendAgentMessage} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message to help the customer..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none
                     focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white
                     rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Your messages will be marked as agent responses to help customers know a human is helping
        </p>
      </form>
    </div>
  );
}