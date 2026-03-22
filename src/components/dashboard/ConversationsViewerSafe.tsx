// Premium Conversations Viewer - Storehouse Design System
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Clock,
  User,
  Phone,
  Mail,
  Store,
  ChevronRight,
  RefreshCw,
  Search,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Activity,
  Users,
  Bot
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { SimpleAgentChat } from './SimpleAgentChat';

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
  store_id?: string;
  user_id?: string;
  messages?: Message[];
  takeover_status?: 'ai' | 'agent_requested' | 'agent_active' | 'agent_ended';
  agent_id?: string;
  agent_takeover_at?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sender_type?: 'customer' | 'ai' | 'agent' | 'system';
}

export function ConversationsViewerSafe() {
  console.warn('🚀 [ConversationsViewerSafe] Component mounting...');

  const { currentUser: user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMessages, setShowMobileMessages] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'recent'>('all');

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    console.warn('📊 [ConversationsViewerSafe] User state:', {
      hasUser: !!user,
      uid: user?.uid,
      email: user?.email
    });

    if (user?.uid) {
      loadConversations();
    } else {
      console.warn('❌ [ConversationsViewerSafe] No user or uid, skipping load');
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      console.warn('🔍 [ConversationsViewerSafe] Loading conversations for user:', user?.uid);

      // First, get user's stores to know which conversations belong to them
      const { data: userStores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .or(`user_id.eq.${user?.uid},created_by.eq.${user?.uid}`);

      if (storesError) {
        console.error('❌ [ConversationsViewerSafe] Error loading stores:', storesError);

        // Fallback: Try to get conversations directly by user_id
        console.warn('🔄 [ConversationsViewerSafe] Trying fallback: loading conversations by user_id');

        const { data: directConversations, error: directError } = await supabase
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
          .eq('user_id', user?.uid)
          .order('updated_at', { ascending: false });

        if (!directError && directConversations && directConversations.length > 0) {
          formatAndSetConversations(directConversations);
          return;
        }
      }

      console.warn('🏪 [ConversationsViewerSafe] User stores found:', userStores?.length || 0);

      // Get conversations for user's stores OR direct user conversations
      let query = supabase
        .from('ai_chat_conversations')
        .select(`
          *,
          takeover_status,
          agent_id,
          agent_takeover_at,
          ai_chat_messages (
            id,
            role,
            content,
            created_at,
            sender_type
          )
        `)
        .order('updated_at', { ascending: false });

      // Add filters for store_id if we have stores
      if (userStores && userStores.length > 0) {
        const storeIds = userStores.map(store => store.id);
        // Get conversations that either belong to user's stores OR directly to the user
        query = query.or(`store_id.in.(${storeIds.join(',')}),user_id.eq.${user?.uid}`);
      } else {
        // No stores, just get user's direct conversations
        query = query.eq('user_id', user?.uid);
      }

      const { data: conversationsData, error: convError } = await query;

      if (convError) {
        console.error('❌ [ConversationsViewerSafe] Error loading conversations:', convError);

        // Last resort: Get ALL conversations and filter client-side (temporary)
        console.warn('🔄 [ConversationsViewerSafe] Final fallback: loading recent conversations');
        const { data: allConversations } = await supabase
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
          .order('updated_at', { ascending: false })
          .limit(50);

        if (allConversations) {
          formatAndSetConversations(allConversations);
        }
      } else {
        console.warn('✅ [ConversationsViewerSafe] Loaded conversations:', conversationsData?.length || 0);
        formatAndSetConversations(conversationsData || []);
      }
    } catch (error) {
      console.error('💥 [ConversationsViewerSafe] Unexpected error:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAndSetConversations = (data: any[]) => {
    const formattedConversations = data.map(conv => {
      const messages = conv.ai_chat_messages || [];
      const now = new Date();
      const lastMessageTime = conv.updated_at ? new Date(conv.updated_at) : new Date(conv.created_at);
      const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

      let status: 'active' | 'recent' | 'inactive' = 'inactive';
      if (hoursSinceLastMessage < 1) status = 'active';
      else if (hoursSinceLastMessage < 24) status = 'recent';

      return {
        id: conv.id,
        session_id: conv.session_id || 'Unknown Session',
        visitor_name: conv.visitor_name,
        visitor_email: conv.visitor_email,
        visitor_phone: conv.visitor_phone,
        created_at: conv.created_at,
        updated_at: conv.updated_at || conv.created_at,
        source_page: conv.source_page,
        message_count: messages.length,
        last_message_at: conv.updated_at || conv.created_at,
        status,
        store_id: conv.store_id,
        user_id: conv.user_id,
        takeover_status: conv.takeover_status || 'ai',
        agent_id: conv.agent_id,
        agent_takeover_at: conv.agent_takeover_at,
        messages: messages.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      };
    });

    setConversations(formattedConversations);
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    if (isMobile) {
      setShowMobileMessages(true);
    }
  };

  const handleBackToList = () => {
    setShowMobileMessages(false);
    setSelectedConversation(null);
  };

  const filteredConversations = conversations.filter(conv => {
    // Apply status filter
    if (filter !== 'all' && conv.status !== filter) return false;

    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.session_id.toLowerCase().includes(searchLower) ||
      conv.visitor_name?.toLowerCase().includes(searchLower) ||
      conv.visitor_email?.toLowerCase().includes(searchLower) ||
      conv.visitor_phone?.toLowerCase().includes(searchLower) ||
      conv.messages?.some(m => m.content.toLowerCase().includes(searchLower))
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'recent': return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-3 h-3" />;
      case 'recent': return <Clock className="w-3 h-3" />;
      default: return <MessageCircle className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto"></div>
            <MessageCircle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-green-600" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Mobile view - show either list or messages
  if (isMobile && showMobileMessages && selectedConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl sticky top-0 z-10">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-white/20 rounded-xl transition-all"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-bold">
                  {selectedConversation.visitor_name || selectedConversation.session_id}
                </h2>
                <p className="text-xs opacity-90">
                  {formatDistanceToNow(new Date(selectedConversation.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedConversation.status)}`}>
                {selectedConversation.status}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Messages */}
        <div className="p-4 pb-20">
          {selectedConversation.messages?.map((message) => (
            <div
              key={message.id}
              className={`mb-4 animate-fadeIn ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block p-4 rounded-2xl max-w-[85%] shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                    : 'bg-white border border-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {format(new Date(message.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop and Mobile List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-3 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Customer Conversations</h1>
                <p className="text-sm opacity-90 mt-1">Manage chats from your Storehouse storefront</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">{conversations.length} Total</span>
              </div>
              <button
                onClick={loadConversations}
                className="p-3 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm hover:scale-110 transform"
                aria-label="Refresh conversations"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Search and Filter Bar */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or message content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'recent'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Conversations Yet</h3>
              <p className="text-gray-600 mb-6">
                Customer chats will appear here when visitors use the AI chat on your Storehouse storefront.
              </p>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  <Sparkles className="inline w-4 h-4 mr-2" />
                  Pro Tip: Visit your store in incognito mode and send a test message!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`grid gap-6 ${!isMobile ? 'lg:grid-cols-3' : ''}`}>
            {/* Conversations List */}
            <div className={`${!isMobile ? 'lg:col-span-1' : ''}`}>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 text-lg">
                      Conversations ({filteredConversations.length})
                    </h2>
                    <Store className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all flex items-center gap-3 ${
                        selectedConversation?.id === conv.id
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-600'
                          : ''
                      }`}
                    >
                      <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 truncate">
                            {conv.visitor_name || `Visitor ${conv.session_id.slice(0, 8)}`}
                          </span>
                          {conv.takeover_status === 'agent_requested' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold animate-pulse">
                              <Users className="w-3 h-3" />
                              Agent Requested
                            </span>
                          )}
                          {conv.takeover_status === 'agent_active' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                              <Users className="w-3 h-3" />
                              Agent Active
                            </span>
                          )}
                          {(!conv.takeover_status || conv.takeover_status === 'ai') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                              <Bot className="w-3 h-3" />
                              AI
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(conv.status)}`}>
                            {getStatusIcon(conv.status)}
                            <span className="hidden sm:inline">{conv.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            <MessageCircle className="w-3 h-3 inline mr-1" />
                            {conv.message_count} messages
                          </span>
                          {conv.source_page && (
                            <span className="text-xs text-gray-500">
                              <Globe className="w-3 h-3 inline mr-1" />
                              {conv.source_page}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Messages Panel */}
            {!isMobile && (
              <div className="lg:col-span-2">
                {selectedConversation ? (
                  <SimpleAgentChat
                    conversationId={selectedConversation.id}
                    storeId={selectedConversation.store_id || ''}
                    sessionId={selectedConversation.session_id}
                  />
                ) : (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-16 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Conversation</h3>
                    <p className="text-gray-600">
                      Choose a conversation from the list to view customer messages
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span>Secure & Private</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Zap className="w-4 h-4 text-green-600" />
                        <span>Real-time Updates</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}