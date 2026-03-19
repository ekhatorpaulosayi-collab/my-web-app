// Basic Conversations Viewer for Store Owners
// This provides immediate visibility into storefront chats

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

export function ConversationsViewer() {
  const { currentUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'recent' | 'inactive'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);

      // Get store ID for current user
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!store) {
        console.log('No store found for user');
        return;
      }

      // Fetch conversations for this store (fallback to direct query if view doesn't exist)
      let { data, error } = await supabase
        .from('store_conversations')
        .select('*')
        .eq('store_id', store.id)
        .order('last_message_at', { ascending: false });

      // If view doesn't exist or any error, return empty array instead of crashing
      if (error) {
        if (error.code === '42P01') {
          console.log('store_conversations view not found, using empty state');
        } else {
          console.error('Error fetching conversations:', error);
        }
        data = [];
      }

      setConversations(data || []);

      // Count unread (active) conversations
      const active = data?.filter(c => c.status === 'active').length || 0;
      setUnreadCount(active);

    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Auto-refresh active conversations
  useEffect(() => {
    fetchConversations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('store-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_chat_messages'
      }, () => {
        // Refresh on new messages
        if (!refreshing) {
          setRefreshing(true);
          fetchConversations().then(() => setRefreshing(false));
        }
      })
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!refreshing) {
        setRefreshing(true);
        fetchConversations().then(() => setRefreshing(false));
      }
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  // Handle conversation selection
  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchTerm === '' ||
      conv.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.visitor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.visitor_phone?.includes(searchTerm);

    const matchesFilter = filterStatus === 'all' || conv.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-gray-50">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Customer Chats
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h2>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchConversations().then(() => setRefreshing(false));
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'active', 'recent', 'inactive'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs rounded-full capitalize transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="overflow-y-auto h-[calc(100%-180px)]">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Customer chats will appear here</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-white border-l-4 border-l-blue-600' : ''
                } ${conv.status === 'active' ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">
                      {conv.visitor_name || `Visitor ${conv.session_id?.slice(0, 8) || 'Unknown'}`}
                    </span>
                    {conv.status === 'active' && (
                      <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {conv.last_message_at
                      ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                      : 'Just now'}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="text-xs text-gray-600 space-y-1">
                  {conv.visitor_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {conv.visitor_email}
                    </div>
                  )}
                  {conv.visitor_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {conv.visitor_phone}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{conv.message_count || 0} messages</span>
                  {conv.source_page && <span>From: {conv.source_page}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedConversation.visitor_name || `Visitor ${selectedConversation.session_id?.slice(0, 8) || 'Unknown'}`}
                    {selectedConversation.status === 'active' && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                        Active Now
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Started {format(new Date(selectedConversation.created_at), 'PPp')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedConversation.visitor_phone && (
                    <a
                      href={`https://wa.me/${selectedConversation.visitor_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                  {selectedConversation.visitor_email && (
                    <a
                      href={`mailto:${selectedConversation.visitor_email}`}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'assistant' ? 'text-gray-500' : 'text-blue-100'
                    }`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
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