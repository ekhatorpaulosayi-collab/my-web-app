// Enhanced Conversations with Chat Takeover, Analytics, and WhatsApp Integration
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Search, Clock, User, ChevronRight, ArrowLeft, BarChart2, Phone, UserCheck, Bot, Settings, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ChatTakeoverPanel } from '../ChatTakeoverPanel';
import { ConversationAnalytics } from '../ConversationAnalytics';
import { createWhatsAppService } from '../../services/whatsappIntegration';

interface Conversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  visitor_whatsapp?: string;
  visitor_identified?: boolean;
  context_type?: string;
  is_storefront?: boolean;
  is_agent_active?: boolean;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  ai_chat_messages?: Message[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  created_at: string;
  is_agent_message?: boolean;
}

const styles = {
  // Reuse all existing styles from CleanConversations
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
    marginBottom: '16px'
  },
  // Enhanced feature tabs
  tabContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '24px',
    display: 'flex',
    gap: '8px'
  },
  tabButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  tabButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff'
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
    color: '#6b7280'
  },
  // Feature settings panel
  settingsPanel: {
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid #fbbf24'
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  toggle: {
    position: 'relative' as const,
    width: '48px',
    height: '24px',
    backgroundColor: '#d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  toggleActive: {
    backgroundColor: '#10b981'
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s'
  },
  toggleKnobActive: {
    transform: 'translateX(24px)'
  },
  // Copy existing styles from CleanConversations
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
  // WhatsApp customer panel
  whatsappPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginTop: '24px'
  },
  whatsappTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  whatsappCustomerList: {
    display: 'grid',
    gap: '12px'
  },
  whatsappCustomerCard: {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  whatsappCustomerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  whatsappAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  }
};

export function EnhancedConversations() {
  const { currentUser: user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'conversations' | 'analytics' | 'whatsapp'>('conversations');

  // Feature toggles (for power users only)
  const [isPowerUser, setIsPowerUser] = useState(false);
  const [features, setFeatures] = useState({
    chatTakeover: false,
    visitorIdentification: true,
    whatsappIntegration: false,
    analytics: true
  });

  // Chat takeover panel
  const [showTakeoverPanel, setShowTakeoverPanel] = useState(false);
  const [takeoverConversation, setTakeoverConversation] = useState<Conversation | null>(null);

  // WhatsApp customers
  const [whatsappCustomers, setWhatsappCustomers] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadConversations();
      checkPowerUserStatus();
      loadStoreId();
    }
  }, [user]);

  const checkPowerUserStatus = async () => {
    // Check if user has power user privileges
    const { data: userData } = await supabase
      .from('stores')
      .select('metadata')
      .eq('user_id', user?.uid)
      .single();

    if (userData?.metadata?.isPowerUser) {
      setIsPowerUser(true);
    }
  };

  const loadStoreId = async () => {
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', user?.uid)
      .single();

    if (store) {
      setStoreId(store.id);
      if (features.whatsappIntegration) {
        loadWhatsAppCustomers(store.id);
      }
    }
  };

  const loadConversations = async () => {
    try {
      const { data: userStores } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user?.uid);

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
            created_at,
            is_agent_message
          )
        `)
        .in('store_id', storeIds)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (convData) {
        const formatted = convData.map(conv => ({
          ...conv,
          ai_chat_messages: (conv.ai_chat_messages || []).sort((a, b) =>
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

  const loadWhatsAppCustomers = async (storeId: string) => {
    const whatsappService = createWhatsAppService(storeId);
    const customers = await whatsappService.getAllCustomers();
    setWhatsappCustomers(customers);
  };

  const handleTakeover = (conv: Conversation) => {
    if (!isPowerUser || !features.chatTakeover) {
      alert('Chat takeover is only available for power users');
      return;
    }
    setTakeoverConversation(conv);
    setShowTakeoverPanel(true);
  };

  const toggleFeature = (featureName: keyof typeof features) => {
    if (!isPowerUser && featureName === 'chatTakeover') {
      alert('Chat takeover is only available for power users');
      return;
    }
    setFeatures(prev => ({
      ...prev,
      [featureName]: !prev[featureName]
    }));
  };

  const getCustomerName = (conv: Conversation) => {
    if (conv.visitor_identified && conv.visitor_name) {
      return `✅ ${conv.visitor_name}`;
    }
    if (conv.visitor_whatsapp) {
      return `📱 WhatsApp ${conv.visitor_whatsapp}`;
    }
    if (conv.context_type === 'storefront') {
      if (conv.visitor_name) return `🛍️ ${conv.visitor_name}`;
      if (conv.visitor_email) return `🛍️ ${conv.visitor_email.split('@')[0]}`;
      return `🛍️ Store Visitor`;
    }
    if (conv.context_type === 'help') {
      return `💬 Store Owner`;
    }
    return `Customer ${conv.session_id.slice(0, 6)}`;
  };

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    return (
      getCustomerName(conv).toLowerCase().includes(search) ||
      conv.session_id.toLowerCase().includes(search) ||
      (conv.visitor_email && conv.visitor_email.toLowerCase().includes(search)) ||
      (conv.visitor_phone && conv.visitor_phone.includes(search))
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

  return (
    <div style={styles.container}>
      <div style={styles.mainWrapper}>
        <h1 style={styles.title}>Customer Conversations</h1>
        <p style={styles.subtitle}>
          View and manage chats with advanced features
          {isPowerUser && ' (Power User Mode)'}
        </p>

        {/* Feature Tabs */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setViewMode('conversations')}
            style={{
              ...styles.tabButton,
              ...(viewMode === 'conversations' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
          >
            <MessageSquare size={16} />
            Conversations
          </button>
          {features.analytics && (
            <button
              onClick={() => setViewMode('analytics')}
              style={{
                ...styles.tabButton,
                ...(viewMode === 'analytics' ? styles.tabButtonActive : styles.tabButtonInactive)
              }}
            >
              <BarChart2 size={16} />
              Analytics
            </button>
          )}
          {features.whatsappIntegration && (
            <button
              onClick={() => setViewMode('whatsapp')}
              style={{
                ...styles.tabButton,
                ...(viewMode === 'whatsapp' ? styles.tabButtonActive : styles.tabButtonInactive)
              }}
            >
              <Phone size={16} />
              WhatsApp
            </button>
          )}
        </div>

        {/* Feature Settings Panel */}
        {viewMode === 'conversations' && (
          <div style={styles.settingsPanel}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              <Settings size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Advanced Features
            </h3>
            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <UserCheck size={16} />
                Visitor Identification
              </label>
              <div
                onClick={() => toggleFeature('visitorIdentification')}
                style={{
                  ...styles.toggle,
                  ...(features.visitorIdentification ? styles.toggleActive : {})
                }}
              >
                <div style={{
                  ...styles.toggleKnob,
                  ...(features.visitorIdentification ? styles.toggleKnobActive : {})
                }} />
              </div>
            </div>
            {isPowerUser && (
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>
                  <Shield size={16} />
                  Chat Takeover (Power Users)
                </label>
                <div
                  onClick={() => toggleFeature('chatTakeover')}
                  style={{
                    ...styles.toggle,
                    ...(features.chatTakeover ? styles.toggleActive : {})
                  }}
                >
                  <div style={{
                    ...styles.toggleKnob,
                    ...(features.chatTakeover ? styles.toggleKnobActive : {})
                  }} />
                </div>
              </div>
            )}
            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <Phone size={16} />
                WhatsApp Integration
              </label>
              <div
                onClick={() => toggleFeature('whatsappIntegration')}
                style={{
                  ...styles.toggle,
                  ...(features.whatsappIntegration ? styles.toggleActive : {})
                }}
              >
                <div style={{
                  ...styles.toggleKnob,
                  ...(features.whatsappIntegration ? styles.toggleKnobActive : {})
                }} />
              </div>
            </div>
            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>
                <BarChart2 size={16} />
                Analytics Dashboard
              </label>
              <div
                onClick={() => toggleFeature('analytics')}
                style={{
                  ...styles.toggle,
                  ...(features.analytics ? styles.toggleActive : {})
                }}
              >
                <div style={{
                  ...styles.toggleKnob,
                  ...(features.analytics ? styles.toggleKnobActive : {})
                }} />
              </div>
            </div>
          </div>
        )}

        {/* View Content */}
        {viewMode === 'conversations' && (
          <>
            {/* Stats Card */}
            <div style={styles.statsCard}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                  Total Conversations
                </p>
                <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>
                  {conversations.length}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {features.chatTakeover && (
                  <span style={{
                    ...styles.activeBadge,
                    backgroundColor: '#fef3c7',
                    color: '#92400e'
                  }}>
                    {conversations.filter(c => c.is_agent_active).length} Active Agents
                  </span>
                )}
                <span style={styles.activeBadge}>
                  {filteredConversations.length} Active
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div style={styles.searchCard}>
              <div style={styles.searchWrapper}>
                <Search size={20} style={styles.searchIcon} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, phone..."
                  style={styles.searchInput}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div style={styles.conversationsList}>
              {filteredConversations.map((conv, index) => (
                <div
                  key={conv.id}
                  style={{
                    ...styles.conversationItem,
                    ...(index === 0 ? styles.conversationItemFirst : {})
                  }}
                >
                  <div style={styles.conversationContent}>
                    <div style={styles.conversationLeft}>
                      <div style={{
                        ...styles.avatar,
                        backgroundColor: conv.visitor_identified ? '#10b981' :
                                      conv.visitor_whatsapp ? '#25d366' : '#3b82f6'
                      }}>
                        {conv.visitor_identified ? <UserCheck size={20} /> :
                         conv.visitor_whatsapp ? <Phone size={20} /> :
                         conv.is_agent_active ? <Shield size={20} /> : <User size={20} />}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                          {getCustomerName(conv)}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {conv.is_agent_active && (
                        <span style={{
                          ...styles.activeBadge,
                          backgroundColor: '#fee2e2',
                          color: '#991b1b'
                        }}>
                          Agent Active
                        </span>
                      )}
                      {features.chatTakeover && isPowerUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeover(conv);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Take Over
                        </button>
                      )}
                      <ChevronRight size={20} color="#9ca3af" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && storeId && (
          <ConversationAnalytics storeId={storeId} />
        )}

        {/* WhatsApp View */}
        {viewMode === 'whatsapp' && (
          <div style={styles.whatsappPanel}>
            <h3 style={styles.whatsappTitle}>
              <Phone size={20} />
              WhatsApp Customers
            </h3>
            {whatsappCustomers.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
                No WhatsApp customers yet
              </p>
            ) : (
              <div style={styles.whatsappCustomerList}>
                {whatsappCustomers.map((customer) => (
                  <div key={customer.id} style={styles.whatsappCustomerCard}>
                    <div style={styles.whatsappCustomerInfo}>
                      <div style={styles.whatsappAvatar}>
                        <Phone size={18} />
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>
                          {customer.customer_name || customer.phone_number}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>
                          {customer.total_messages} messages
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Last contact: {formatDistanceToNow(new Date(customer.last_contact), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Takeover Panel */}
      {showTakeoverPanel && takeoverConversation && user?.uid && (
        <ChatTakeoverPanel
          conversation={takeoverConversation}
          onClose={() => {
            setShowTakeoverPanel(false);
            setTakeoverConversation(null);
            loadConversations(); // Reload to update status
          }}
          userId={user.uid}
          isPowerUser={isPowerUser}
        />
      )}
    </div>
  );
}