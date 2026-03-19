import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useUserStore } from '../hooks/useUserStore';
import { MessageSquare, User, Clock, Mail, Phone, Search, Filter, ChevronDown, ChevronUp, X, AlertCircle, CheckCircle, Reply } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ChatResponse } from '../components/ChatResponse';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ChatConversation {
  session_id: string;
  store_id: string;
  store_slug: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  last_user_message: string;
  has_unread: boolean;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  visitor_ip: string | null;
  messages: ChatMessage[];
}

const ChatHistory: React.FC = () => {
  const { user } = useAuth();
  const { store } = useUserStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChatResponse, setShowChatResponse] = useState(false);
  const [chatConversation, setChatConversation] = useState<ChatConversation | null>(null);

  // Function to fetch conversations
  const fetchConversations = async () => {
    if (!user || !store) return;

    try {
      setLoading(true);

      // Get all conversations for the store
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('store_id', store.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setConversations(data || []);

      // Count unread conversations
      const unreadConvs = (data || []).filter(c => c.has_unread).length;
      setUnreadCount(unreadConvs);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversations on mount
  useEffect(() => {
    if (!user || !store) return;

    fetchConversations();

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('chat-messages')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `store_id=eq.${store.id}`
        },
        () => {
          fetchConversations(); // Refresh on new message
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, store]);

  // Mark conversation as read
  const markAsRead = async (sessionId: string) => {
    if (!store) return;

    try {
      await supabase.rpc('mark_conversation_read', {
        p_session_id: sessionId,
        p_store_id: store.id
      });

      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.session_id === sessionId
            ? { ...c, has_unread: false }
            : c
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Open conversation details
  const openConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    if (conversation.has_unread) {
      markAsRead(conversation.session_id);
    }
  };

  // Open chat response modal
  const openChatResponse = (conversation: ChatConversation) => {
    setChatConversation(conversation);
    setShowChatResponse(true);
  };

  // Format date/time
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, yyyy HH:mm');
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchTerm === '' ||
      conv.last_user_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.visitor_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = !filterUnread || conv.has_unread;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Chat History</h1>
              <p className="text-gray-600 mt-1">
                View and manage customer conversations from your online store
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full">
                {unreadCount} unread
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                filterUnread
                  ? 'bg-green-600 text-white'
                  : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Unread only
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="divide-y">
          {filteredConversations.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.session_id}
                onClick={() => openConversation(conversation)}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  conversation.has_unread ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {conversation.has_unread && (
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                      )}
                      <span className="font-medium text-gray-900">
                        {conversation.visitor_name || 'Anonymous Visitor'}
                      </span>
                      {conversation.visitor_email && (
                        <span className="text-sm text-gray-500">
                          {conversation.visitor_email}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 line-clamp-2">
                      {conversation.last_user_message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {conversation.message_count} messages
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Conversation with {selectedConversation.visitor_name || 'Visitor'}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  {selectedConversation.visitor_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedConversation.visitor_email}
                    </span>
                  )}
                  {selectedConversation.visitor_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedConversation.visitor_phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Started {formatMessageTime(selectedConversation.started_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {selectedConversation.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-green-200' : 'text-gray-500'
                    }`}>
                      {format(new Date(message.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Session ID: <code className="bg-gray-100 px-2 py-1 rounded">
                    {selectedConversation.session_id.substring(0, 8)}...
                  </code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      openChatResponse(selectedConversation);
                      setSelectedConversation(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Reply className="w-4 h-4" />
                    Reply to Customer
                  </button>
                  {selectedConversation.visitor_email && (
                    <a
                      href={`mailto:${selectedConversation.visitor_email}`}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Response Modal */}
      {showChatResponse && chatConversation && (
        <ChatResponse
          conversation={chatConversation}
          onClose={() => {
            setShowChatResponse(false);
            setChatConversation(null);
          }}
          onMessageSent={() => {
            // Refresh conversations to show the new message
            if (user && store) {
              fetchConversations();
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatHistory;