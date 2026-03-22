// Premium World-Class Conversations - Storehouse Design System
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  MessageCircle,
  Clock,
  User,
  Search,
  ChevronRight,
  ArrowLeft,
  Send,
  Phone,
  Mail,
  Calendar,
  Globe,
  Activity,
  Sparkles,
  TrendingUp,
  Star,
  Zap,
  Shield
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
  status?: 'active' | 'recent' | 'inactive';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function PremiumConversations() {
  const { currentUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);

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
      // Real-time updates
      const channel = supabase
        .channel('conversations-live')
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
          const hoursSinceUpdate = (Date.now() - new Date(conv.updated_at).getTime()) / (1000 * 60 * 60);

          let status: 'active' | 'recent' | 'inactive' = 'inactive';
          if (hoursSinceUpdate < 1) status = 'active';
          else if (hoursSinceUpdate < 24) status = 'recent';

          return {
            ...conv,
            messages: messages.sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
            last_message: lastMessage?.content || 'No messages yet',
            unread_count: messages.filter(m => m.role === 'user').length,
            status
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

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'h:mm a')}`;
    }
    return format(messageDate, 'MMM d, h:mm a');
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.visitor_name) return conv.visitor_name;
    if (conv.visitor_email) return conv.visitor_email.split('@')[0];
    return `Visitor ${conv.session_id.slice(0, 6)}`;
  };

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    return (
      getConversationTitle(conv).toLowerCase().includes(search) ||
      conv.last_message?.toLowerCase().includes(search) ||
      conv.session_id.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'from-green-500 to-emerald-500 shadow-green-200';
      case 'recent': return 'from-yellow-500 to-amber-500 shadow-yellow-200';
      default: return 'from-gray-400 to-gray-500 shadow-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <Zap className="w-3 h-3" />;
      case 'recent': return <Clock className="w-3 h-3" />;
      default: return <Shield className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-green-600 animate-pulse" />
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Mobile View with Premium Design
  if (isMobile && selectedConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex flex-col">
        {/* Premium Mobile Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-green-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-2 -ml-2 hover:bg-green-100 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-green-700" />
            </button>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900">
                {getConversationTitle(selectedConversation)}
              </h2>
              <p className="text-xs text-green-600 font-medium">
                <Activity className="w-3 h-3 inline mr-1" />
                {formatDistanceToNow(new Date(selectedConversation.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className={`px-3 py-1.5 bg-gradient-to-r ${getStatusColor(selectedConversation.status)}
                         text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-lg`}>
              {getStatusIcon(selectedConversation.status)}
              {selectedConversation.status}
            </div>
          </div>
        </div>

        {/* Premium Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedConversation.messages?.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg shadow-green-200'
                    : 'bg-white text-gray-900 shadow-md border border-gray-100'
                } px-4 py-3 rounded-2xl`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-400'
                }`}>
                  {formatMessageTime(message.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Premium Desktop View
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Premium Header */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-10 rounded-3xl blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg shadow-green-200">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-700
                               bg-clip-text text-transparent">
                    Customer Conversations
                  </h1>
                  <p className="text-gray-600 mt-1">View and manage chats from your online store</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white
                             rounded-full text-sm font-bold shadow-lg shadow-green-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {filteredConversations.length} Active
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-xl opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-14 pr-6 py-4 text-lg focus:outline-none placeholder-gray-400"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">⌘K</kbd>
              </div>
            </div>
          </div>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-green-100 p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-100 to-emerald-100
                         rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl
                           flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">No Conversations Yet</h3>
              <p className="text-gray-600 max-w-md mx-auto text-lg">
                Customer chats will appear here when visitors use the chat on your storefront.
              </p>
              <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl
                           border border-green-200 max-w-sm mx-auto">
                <p className="text-green-800 font-medium flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  Tip: Test by visiting your store in incognito mode!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Premium Conversations Grid */}
            <div className="lg:col-span-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                {filteredConversations.slice(0, 6).map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl
                             border-2 transition-all duration-300 overflow-hidden
                             ${selectedConversation?.id === conv.id
                               ? 'border-green-400 shadow-green-200'
                               : 'border-transparent hover:border-green-200'}`}
                  >
                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r ${getStatusColor(conv.status)}
                                  text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-md`}>
                      {getStatusIcon(conv.status)}
                      {conv.status}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${
                          conv.status === 'active'
                            ? 'from-green-500 to-emerald-500'
                            : 'from-gray-400 to-gray-500'
                        } rounded-full flex items-center justify-center text-white font-bold text-lg
                        group-hover:scale-110 transition-transform shadow-lg`}>
                          {getConversationTitle(conv).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                            {getConversationTitle(conv)}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 text-left mb-3">
                        {conv.last_message}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-green-600" />
                            {conv.messages?.length || 0} messages
                          </span>
                          {conv.source_page && (
                            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-green-600" />
                              {conv.source_page.split('/').pop()}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Conversation Premium View */}
              {selectedConversation && (
                <div className="bg-white rounded-3xl shadow-2xl border border-green-100 overflow-hidden">
                  {/* Premium Header */}
                  <div className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600
                                     rounded-2xl flex items-center justify-center text-white font-bold
                                     text-2xl shadow-xl shadow-green-200">
                          {getConversationTitle(selectedConversation).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-1">
                            {getConversationTitle(selectedConversation)}
                          </h2>
                          <div className="flex items-center gap-4">
                            {selectedConversation.visitor_email && (
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Mail className="w-4 h-4 text-green-600" />
                                {selectedConversation.visitor_email}
                              </span>
                            )}
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-green-600" />
                              Started {format(new Date(selectedConversation.created_at), 'MMM d, yyyy')}
                            </span>
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Clock className="w-4 h-4 text-green-600" />
                              {format(new Date(selectedConversation.created_at), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Messages */}
                  <div className="p-8 max-h-[600px] overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
                    <div className="space-y-6">
                      {selectedConversation.messages?.map((message, index) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}
                                   animate-fadeIn`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className={`max-w-[70%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`relative ${
                              message.role === 'user'
                                ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-xl shadow-green-200'
                                : 'bg-white text-gray-900 shadow-lg border border-gray-100'
                            } px-5 py-4 rounded-2xl`}>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                            <p className={`text-xs mt-2 px-2 ${
                              message.role === 'user' ? 'text-right' : 'text-left'
                            } text-gray-500 font-medium`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}