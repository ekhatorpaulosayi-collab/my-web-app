// World-Class Conversations Viewer - Clean, Simple, Beautiful
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  MessageCircle,
  Clock,
  User,
  Search,
  Filter,
  ChevronRight,
  ArrowLeft,
  Send,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Hash,
  Globe,
  Activity,
  TrendingUp
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

interface Conversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  created_at: string;
  updated_at: string;
  source_page?: string;
  messages?: Message[];
  unread_count?: number;
  last_message?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function WorldClassConversations() {
  const { currentUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user?.uid) {
      loadConversations();
      // Set up real-time subscription
      const channel = supabase
        .channel('conversations-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'ai_chat_conversations'
        }, () => {
          loadConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      // Get user's stores
      const { data: userStores } = await supabase
        .from('stores')
        .select('id')
        .or(`user_id.eq.${user?.uid},created_by.eq.${user?.uid}`);

      if (!userStores || userStores.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const storeIds = userStores.map(s => s.id);

      // Get conversations with messages
      const { data: convData } = await supabase
        .from('ai_chat_conversations')
        .select(`
          *,
          ai_chat_messages (
            id,
            role,
            content,
            created_at
          )
        `)
        .in('store_id', storeIds)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (convData) {
        const formatted = convData.map(conv => {
          const messages = conv.ai_chat_messages || [];
          const lastMessage = messages[messages.length - 1];

          return {
            ...conv,
            messages: messages.sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
            last_message: lastMessage?.content || 'No messages yet',
            unread_count: messages.filter(m => m.role === 'user').length
          };
        });

        setConversations(formatted);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          role: 'assistant',
          content: replyText,
          metadata: {
            is_manual_reply: true,
            replied_by: user?.email
          }
        });

      setReplyText('');
      setReplyMode(false);
      loadConversations();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return `Yesterday, ${format(messageDate, 'h:mm a')}`;
    }
    return format(messageDate, 'MMM d, h:mm a');
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.visitor_name) return conv.visitor_name;
    if (conv.visitor_email) return conv.visitor_email;
    return `Customer #${conv.session_id.slice(0, 6)}`;
  };

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    return (
      getConversationTitle(conv).toLowerCase().includes(search) ||
      conv.last_message?.toLowerCase().includes(search) ||
      conv.visitor_email?.toLowerCase().includes(search) ||
      conv.session_id.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Mobile View
  if (isMobile && selectedConversation) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Mobile Header */}
        <div className="sticky top-0 z-20 bg-white border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                {getConversationTitle(selectedConversation)}
              </h2>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(selectedConversation.created_at), { addSuffix: true })}
              </p>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedConversation.messages?.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {formatMessageTime(message.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Optional Reply (for power users) */}
        {replyMode && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {filteredConversations.length} Active
              </div>
            </div>
          </div>
          <p className="text-gray-600">Manage customer conversations from your AI assistant</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              When customers chat with your AI assistant, their conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {getConversationTitle(conv).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getConversationTitle(conv)}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {conv.last_message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {conv.messages?.length || 0}
                        </span>
                        {conv.source_page && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {conv.source_page.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversation Details */}
            <div className="lg:col-span-2">
              {selectedConversation ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Conversation Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {getConversationTitle(selectedConversation).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">
                            {getConversationTitle(selectedConversation)}
                          </h2>
                          <div className="flex items-center gap-4 mt-1">
                            {selectedConversation.visitor_email && (
                              <a href={`mailto:${selectedConversation.visitor_email}`}
                                 className="text-sm text-gray-600 hover:text-green-600 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {selectedConversation.visitor_email}
                              </a>
                            )}
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(selectedConversation.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyMode(!replyMode)}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Reply (Optional)
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                    {selectedConversation.messages?.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%]`}>
                          <div className={`px-4 py-3 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className={`text-xs mt-1 px-2 ${
                            message.role === 'user' ? 'text-right' : 'text-left'
                          } text-gray-500`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Optional Reply Section */}
                  {replyMode && (
                    <div className="p-4 border-t bg-gray-50">
                      <p className="text-xs text-gray-600 mb-2">
                        💡 Power User Feature: Send a manual reply to this conversation
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={sendReply}
                          disabled={!replyText.trim() || sending}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600">
                    Choose a conversation from the list to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}