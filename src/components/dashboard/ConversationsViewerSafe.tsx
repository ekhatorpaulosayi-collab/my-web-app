// Safe Conversations Viewer - Won't crash with React error #306
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  MessageCircle,
  Clock,
  User,
  Phone,
  Mail,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Bell
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  created_at: string;
  updated_at: string;
  source_page?: string;
  message_count: number;
  last_message_at: string;
  status: 'active' | 'recent' | 'inactive';
  messages?: Message[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function ConversationsViewerSafe() {
  const { currentUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [user?.id]);

  const fetchConversations = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get store ID for current user
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (storeError || !store) {
        console.log('No store found for user');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Try to fetch conversations
      const { data, error } = await supabase
        .from('store_conversations')
        .select('*')
        .eq('store_id', store.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        // Don't crash, just show empty state
        setConversations([]);
        if (error.code === '42P01') {
          setError('Chat tracking is not set up yet. Please contact support.');
        }
      } else {
        setConversations(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred.');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await fetchMessages(conv.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Setup Required</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Conversations Yet</h3>
          <p className="text-gray-500">Customer chats will appear here when visitors use the chat on your storefront.</p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Test it by visiting your store in an incognito window and sending a chat message!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 bg-white border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations ({conversations.length})
          </h2>
        </div>

        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => handleSelectConversation(conv)}
            className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
              selectedConversation?.id === conv.id ? 'bg-white border-l-4 border-l-blue-600' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm">
                {conv.visitor_name ||
                 (conv.session_id ? `Visitor ${conv.session_id.slice(0, 8)}` : 'Anonymous')}
              </span>
              <span className="text-xs text-gray-500">
                {conv.last_message_at
                  ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                  : 'Just now'}
              </span>
            </div>

            {(conv.visitor_email || conv.visitor_phone) && (
              <div className="text-xs text-gray-600 space-y-1">
                {conv.visitor_email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{conv.visitor_email}</span>
                  </div>
                )}
                {conv.visitor_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{conv.visitor_phone}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>{conv.message_count || 0} messages</span>
              {conv.status === 'active' && (
                <span className="text-green-600">● Active</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">
                {selectedConversation.visitor_name ||
                 (selectedConversation.session_id
                   ? `Visitor ${selectedConversation.session_id.slice(0, 8)}`
                   : 'Anonymous Visitor')}
              </h3>
              <p className="text-sm text-gray-600">
                Started {format(new Date(selectedConversation.created_at), 'PPp')}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages in this conversation
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.role === 'assistant'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content || ''}</p>
                        <p className={`text-xs mt-1 ${
                          msg.role === 'assistant' ? 'text-gray-500' : 'text-blue-100'
                        }`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}