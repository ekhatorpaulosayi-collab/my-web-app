// Agent Chat Interface - Allows agents to respond to customer messages
import React, { useState, useEffect } from 'react';
import { Send, User, Bot, Users, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  role: string;
  sender_type: string;
  created_at: string;
}

interface AgentChatInterfaceProps {
  conversationId: string;
  storeId: string;
  sessionId: string;
}

export function AgentChatInterface({ conversationId, storeId, sessionId }: AgentChatInterfaceProps) {
  const { currentUser: user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationStatus, setConversationStatus] = useState<string>('ai');
  const [agentInfo, setAgentInfo] = useState<any>(null);

  // Load conversation and messages
  useEffect(() => {
    loadConversation();
    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`agent-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_chat_conversations',
          filter: `id=eq.${conversationId}`
        },
        (payload) => {
          setConversationStatus(payload.new.takeover_status);
          if (payload.new.agent_id) {
            loadAgentInfo(payload.new.agent_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*, agent:agent_id(email)')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      setConversationStatus(data.takeover_status || 'ai');
      setAgentInfo(data.agent);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadAgentInfo = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', agentId)
        .single();

      if (data) setAgentInfo(data);
    } catch (error) {
      console.error('Error loading agent info:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const takeOverConversation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('agent_takeover_conversation', {
          p_conversation_id: conversationId,
          p_agent_id: user.uid
        });

      if (error) throw error;

      setConversationStatus('agent_active');
      setAgentInfo({ email: user.email });
    } catch (error) {
      console.error('Error taking over conversation:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .rpc('send_agent_message', {
          p_conversation_id: conversationId,
          p_agent_id: user.uid,
          p_message: newMessage
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.sender_type === 'customer' || message.role === 'user') {
      return <User className="h-4 w-4" />;
    } else if (message.sender_type === 'ai') {
      return <Bot className="h-4 w-4" />;
    } else if (message.sender_type === 'agent') {
      return <Users className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  const getMessageStyle = (message: Message) => {
    if (message.sender_type === 'customer' || message.role === 'user') {
      return 'bg-gray-100 text-gray-900';
    } else if (message.sender_type === 'agent') {
      return 'bg-gradient-to-r from-green-50 to-emerald-50 text-gray-900 border border-green-200';
    } else if (message.sender_type === 'system') {
      return 'bg-yellow-50 text-yellow-800 border border-yellow-200 text-center text-sm italic';
    }
    return 'bg-blue-50 text-gray-900';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Session: {sessionId.slice(0, 8)}</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            {conversationStatus === 'agent_requested' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                Agent Requested
              </span>
            )}
            {conversationStatus === 'agent_active' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                {agentInfo?.email || 'Agent Active'}
              </span>
            )}
            {conversationStatus === 'ai' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI Mode
              </span>
            )}
          </div>
        </div>

        {/* Take Over Button */}
        {conversationStatus === 'agent_requested' && user && (
          <button
            onClick={takeOverConversation}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white
                     rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all
                     text-sm font-medium flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Take Over Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${getMessageStyle(message)}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-1">{getMessageIcon(message)}</div>
                <div className="flex-1">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input - Only show when agent is active */}
      {conversationStatus === 'agent_active' && user?.uid === agentInfo?.id && (
        <form onSubmit={sendMessage} className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
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
        </form>
      )}
    </div>
  );
}