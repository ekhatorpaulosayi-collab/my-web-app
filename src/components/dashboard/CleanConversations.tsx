// Clean Conversations - Using Inline Styles (No Dependencies)
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Search, Clock, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  context_type?: string;
  is_storefront?: boolean;
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  mainWrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '32px'
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statsLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '4px'
  },
  statsNumber: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827'
  },
  activeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '9999px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontSize: '12px',
    fontWeight: '500'
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  },
  searchWrapper: {
    position: 'relative' as const
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  },
  searchInput: {
    width: '100%',
    paddingLeft: '40px',
    paddingRight: '16px',
    paddingTop: '8px',
    paddingBottom: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  conversationsList: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  conversationItem: {
    width: '100%',
    textAlign: 'left' as const,
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  conversationItemFirst: {
    borderTop: 'none'
  },
  conversationContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  conversationLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    flexShrink: 0
  },
  conversationInfo: {
    textAlign: 'left' as const
  },
  conversationName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
  },
  conversationTime: {
    fontSize: '12px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px'
  },
  conversationRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  messageCount: {
    fontSize: '14px',
    color: '#6b7280'
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '48px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    color: '#d1d5db',
    margin: '0 auto 16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  emptyTip: {
    fontSize: '13px',
    color: '#6b7280'
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#9ca3af'
  },
  // Chat view styles
  chatHeader: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px'
  },
  chatHeaderContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    padding: '8px',
    marginRight: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  chatTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827'
  },
  chatTime: {
    fontSize: '14px',
    color: '#6b7280'
  },
  messagesContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px'
  },
  messagesCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  messagesArea: {
    padding: '24px',
    maxHeight: '600px',
    overflowY: 'auto' as const
  },
  messageRow: {
    display: 'flex',
    marginBottom: '16px'
  },
  messageUser: {
    justifyContent: 'flex-end'
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '8px'
  },
  messageBubbleUser: {
    backgroundColor: '#3b82f6',
    color: '#ffffff'
  },
  messageBubbleAssistant: {
    backgroundColor: '#f3f4f6',
    color: '#111827'
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.5'
  },
  messageTime: {
    fontSize: '11px',
    marginTop: '4px',
    opacity: 0.8
  }
};

export function CleanConversations() {
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
      console.log('[ConversationsPage] Loading conversations for user:', user?.uid);

      const { data: userStores, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.uid);

      if (storeError) {
        console.error('[ConversationsPage] Error fetching stores:', storeError);
        setConversations([]);
        setLoading(false);
        return;
      }

      console.log('[ConversationsPage] Found stores:', userStores);

      if (!userStores || userStores.length === 0) {
        console.log('[ConversationsPage] No stores found for user');
        setConversations([]);
        setLoading(false);
        return;
      }

      const storeIds = userStores.map(s => s.id);
      console.log('[ConversationsPage] Store IDs:', storeIds);

      // Get conversations from BOTH storefront (customers) and help (owner)
      const { data: convData, error: convError } = await supabase
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

      if (convError) {
        console.error('[ConversationsPage] Error fetching conversations:', convError);
      }

      console.log('[ConversationsPage] Conversations found:', convData?.length || 0);

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
    // For storefront conversations (customers asking about products)
    if (conv.is_storefront || conv.context_type === 'storefront') {
      if (conv.visitor_name) return `🛍️ ${conv.visitor_name}`;
      if (conv.visitor_email) return `🛍️ ${conv.visitor_email.split('@')[0]}`;
      return `🛍️ Store Visitor ${conv.session_id.slice(0, 6)}`;
    }
    // For help conversations (store owner asking for help)
    if (conv.context_type === 'help') {
      return `💬 Store Owner`;
    }
    // Default
    if (conv.visitor_name) return conv.visitor_name;
    if (conv.visitor_email) return conv.visitor_email.split('@')[0];
    return `Customer ${conv.session_id.slice(0, 6)}`;
  };

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    return (
      getCustomerName(conv).toLowerCase().includes(search) ||
      conv.session_id.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #10b981',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Chat View
  if (viewMode === 'chat' && selectedConversation) {
    return (
      <div style={styles.container}>
        <div style={styles.chatHeader}>
          <div style={styles.chatHeaderContent}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={backToList} style={styles.backButton}>
                <ArrowLeft size={20} />
              </button>
              <h2 style={styles.chatTitle}>
                {getCustomerName(selectedConversation)}
              </h2>
            </div>
            <span style={styles.chatTime}>
              {formatDistanceToNow(new Date(selectedConversation.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div style={styles.messagesContainer}>
          <div style={styles.messagesCard}>
            <div style={styles.messagesArea}>
              {selectedConversation.messages?.map((message) => (
                <div
                  key={message.id}
                  style={{
                    ...styles.messageRow,
                    ...(message.role === 'user' ? styles.messageUser : {})
                  }}
                >
                  <div style={{
                    ...styles.messageBubble,
                    ...(message.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant)
                  }}>
                    <p style={styles.messageText}>{message.content}</p>
                    <p style={styles.messageTime}>
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

  // List View
  return (
    <div style={styles.container}>
      <div style={styles.mainWrapper}>
        <h1 style={styles.title}>Customer Conversations</h1>
        <p style={styles.subtitle}>View and manage chats from your online store</p>

        {/* Stats Card */}
        <div style={styles.statsCard}>
          <div>
            <p style={styles.statsLabel}>Total Conversations</p>
            <p style={styles.statsNumber}>{conversations.length}</p>
          </div>
          <span style={styles.activeBadge}>
            {filteredConversations.length} Active
          </span>
        </div>

        {/* Search Bar */}
        <div style={styles.searchCard}>
          <div style={styles.searchWrapper}>
            <Search size={20} style={styles.searchIcon} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Conversations List or Empty State */}
        {filteredConversations.length === 0 ? (
          <div style={styles.emptyState}>
            <MessageSquare style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No Conversations Yet</h3>
            <p style={styles.emptyText}>
              Customer chats will appear here when visitors use the chat on your storefront.
            </p>
            <p style={styles.emptyTip}>
              💡 Tip: Test by visiting your store in incognito mode!
            </p>
          </div>
        ) : (
          <div style={styles.conversationsList}>
            {filteredConversations.map((conv, index) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                style={{
                  ...styles.conversationItem,
                  ...(index === 0 ? styles.conversationItemFirst : {})
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div style={styles.conversationContent}>
                  <div style={styles.conversationLeft}>
                    <div style={styles.avatar}>
                      <User size={20} />
                    </div>
                    <div style={styles.conversationInfo}>
                      <p style={styles.conversationName}>
                        {getCustomerName(conv)}
                      </p>
                      <p style={styles.conversationTime}>
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div style={styles.conversationRight}>
                    {/* Show badge for storefront conversations */}
                    {(conv.is_storefront || conv.context_type === 'storefront') && (
                      <span style={{
                        ...styles.activeBadge,
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        marginRight: '8px'
                      }}>
                        Product Inquiry
                      </span>
                    )}
                    <span style={styles.messageCount}>
                      {conv.messages?.length || 0} messages
                    </span>
                    <ChevronRight size={20} color="#9ca3af" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          Powered by Storehouse
        </div>
      </div>
    </div>
  );
}