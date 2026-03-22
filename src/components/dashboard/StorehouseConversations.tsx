// Storehouse Conversations - Matching Dashboard Design System
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  MessageSquare,
  Search,
  Clock,
  User,
  ChevronRight,
  ArrowLeft,
  Send,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function StorehouseConversations() {
  const { currentUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    if (user?.uid) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
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
        const formatted = convData.map(conv => ({
          ...conv,
          messages: (conv.ai_chat_messages || []).sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }));
        setConversations(formatted);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setViewMode('chat');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedConversation(null);
  };

  const getCustomerName = (conv: Conversation) => {
    if (conv.visitor_name) return conv.visitor_name;
    if (conv.visitor_email) return conv.visitor_email.split('@')[0];
    return `Customer ${conv.session_id.slice(0, 6)}`;
  };

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    return (
      getCustomerName(conv).toLowerCase().includes(search) ||
      conv.session_id.toLowerCase().includes(search) ||
      conv.messages?.some(m => m.content.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Chat View - Matches Dashboard Style
  if (viewMode === 'chat' && selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header matching dashboard */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={backToList}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  {getCustomerName(selectedConversation)}
                </h2>
              </div>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(selectedConversation.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {selectedConversation.messages?.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View - Matches Dashboard Style
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title - Like Dashboard */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Customer Conversations</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage chats from your online store
          </p>
        </div>

        {/* Stats Bar - Like Dashboard Sales Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Conversations</p>
              <p className="text-2xl font-semibold text-gray-900">{conversations.length}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {filteredConversations.length} Active
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar - Clean like Dashboard */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List or Empty State */}
        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h3>
            <p className="text-gray-600 mb-4">
              Customer chats will appear here when visitors use the chat on your storefront.
            </p>
            <p className="text-sm text-gray-500">
              💡 Tip: Test by visiting your store in incognito mode!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {filteredConversations.map((conv, index) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition ${
                  index !== 0 ? 'border-t border-gray-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getCustomerName(conv)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {conv.messages?.length || 0} messages
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer - Matching Dashboard */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">Powered by Storehouse</p>
        </div>
      </div>
    </div>
  );
}