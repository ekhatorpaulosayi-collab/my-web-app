import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, MessageSquare, X, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'agent' | string;
  content: string;
  created_at: string;
  is_agent_message?: boolean;
  agent_id?: string;
}

interface Conversation {
  id: string;
  session_id: string;
  store_id: string;
  visitor_name?: string;
  visitor_email?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  is_active?: boolean;
  is_agent_active?: boolean;
  agent_id?: string;
  is_storefront?: boolean;
  context_type?: string;
}

export default function ConversationsPageFixed() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [takeoverSessionId, setTakeoverSessionId] = useState<string | null>(null);
  const [isInitiatingTakeover, setIsInitiatingTakeover] = useState(false);

  const { currentUser: user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Use refs to track polling intervals and prevent duplicates
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastSystemMessageRef = useRef<string>('');
  const processedMessageIds = useRef<Set<string>>(new Set());
  const lastPollTime = useRef<number>(0);
  const isPollingInProgress = useRef<boolean>(false);
  const subscriptionRef = useRef<any>(null);

  // Single polling function with deduplication
  const pollMessages = async (source: 'realtime' | 'polling' | 'initial' = 'polling') => {
    if (!selectedConversation) return;

    // Prevent concurrent polling (except for initial load)
    if (source !== 'initial' && isPollingInProgress.current) {
      console.log(`[Polling] Skipping ${source} poll - already in progress`);
      return;
    }

    // For realtime events, ensure we don't poll too frequently
    if (source === 'realtime') {
      const now = Date.now();
      if (now - lastPollTime.current < 500) { // Minimum 500ms between polls
        console.log('[Polling] Skipping realtime poll - too soon after last poll');
        return;
      }
    }

    isPollingInProgress.current = true;
    lastPollTime.current = Date.now();

    try {
      const { data: messages, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (!error && messages) {
        if (source === 'initial') {
          // For initial load, just set all messages and track their IDs
          messages.forEach(msg => {
            if (msg.id) processedMessageIds.current.add(msg.id);
          });

          setSelectedConversation(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: messages
            };
          });

          console.log(`[Polling] Initial load: ${messages.length} messages`);
        } else {
          // For updates, deduplicate messages using ID tracking
          const uniqueMessages = messages.filter((msg) => {
            // If message has an ID and we've seen it, skip
            if (msg.id && processedMessageIds.current.has(msg.id)) {
              console.log(`[Dedup] Skipping duplicate message: ${msg.id}`);
              return false;
            }
            // Add to processed set
            if (msg.id) {
              processedMessageIds.current.add(msg.id);
              console.log(`[Dedup] New message ID added: ${msg.id}`);
            }
            return true;
          });

        // Only update if there are truly new messages
        if (uniqueMessages.length > 0) {
          console.log(`[Polling] ${source}: Found ${uniqueMessages.length} new messages`);

          setSelectedConversation(prev => {
            if (!prev) return prev;
            const existingMessages = prev.messages || [];
            // Merge new messages with existing ones
            const allMessages = [...existingMessages, ...uniqueMessages];
            // Final deduplication by ID
            const finalMessages = allMessages.filter((msg, index, self) =>
              !msg.id || self.findIndex(m => m.id === msg.id) === index
            );
            return {
              ...prev,
              messages: finalMessages
            };
          });

          // Update conversations list
          setConversations(prevConvs => {
            return prevConvs.map(conv => {
              if (conv.id === selectedConversation.id) {
                const existingMessages = conv.messages || [];
                const allMessages = [...existingMessages, ...uniqueMessages];
                const finalMessages = allMessages.filter((msg, index, self) =>
                  !msg.id || self.findIndex(m => m.id === msg.id) === index
                );
                return {
                  ...conv,
                  messages: finalMessages,
                  updated_at: finalMessages[finalMessages.length - 1]?.created_at || conv.updated_at
                };
              }
              return conv;
            });
          });
        }
        }
      }
    } catch (error) {
      console.error('[Polling] Error:', error);
    } finally {
      isPollingInProgress.current = false;
    }
  };

  // Setup single polling interval
  useEffect(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (!selectedConversation) {
      return;
    }

    // Reset tracking when conversation changes
    lastMessageCountRef.current = selectedConversation.messages?.length || 0;
    lastSystemMessageRef.current = '';
    processedMessageIds.current.clear(); // Clear processed message IDs for new conversation

    // Add existing message IDs to processed set
    if (selectedConversation.messages) {
      selectedConversation.messages.forEach(msg => {
        if (msg.id) processedMessageIds.current.add(msg.id);
      });
    }

    console.log('[Polling] Starting message polling for conversation:', selectedConversation.id);

    // Set up subscription with fallback to polling
    const setupSubscription = async () => {
      // Clean up any existing subscription first
      if (subscriptionRef.current) {
        console.log('[Realtime] Cleaning up existing subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      // Also remove any existing channels for this conversation
      const existingChannels = supabase.getChannels().filter(ch =>
        ch.topic?.includes(`conversation-${selectedConversation.id}`)
      );
      existingChannels.forEach(ch => {
        console.log('[Realtime] Removing existing channel:', ch.topic);
        supabase.removeChannel(ch);
      });

      let retryCount = 0;
      const maxRetries = 3;

      const connect = async () => {
        try {
          // Create a unique channel name to prevent duplicates
          const channelName = `conversation-${selectedConversation.id}-${Date.now()}`;

          subscriptionRef.current = supabase
            .channel(channelName)
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'ai_chat_messages',
              filter: `conversation_id=eq.${selectedConversation.id}`
            }, (payload) => {
              console.log('[Realtime] New message received:', payload);
              pollMessages('realtime'); // Use polling to fetch the new message, mark as realtime source
            })
            .subscribe((status) => {
              console.log('[Realtime] Subscription status:', status);
              if (status === 'SUBSCRIBED') {
                retryCount = 0;
              } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`[Realtime] Retrying... (${retryCount}/${maxRetries})`);
                  setTimeout(connect, 2000);
                } else {
                  console.log('[Realtime] Max retries reached, using polling only');
                }
              }
            });
        } catch (err) {
          console.error('[Realtime] Subscription error:', err);
        }
      };

      await connect();

      // Set up single polling interval based on takeover status
      const pollInterval = isTakeoverActive ? 1000 : 3000; // 1 second during takeover, 3 seconds otherwise

      // Clear any existing interval before creating new one
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(pollMessages, pollInterval);

      // Poll immediately with initial flag to load all messages
      pollMessages('initial');

      // Cleanup is handled by the effect's return function
    };

    setupSubscription();

    return () => {
      // Clean up subscription
      if (subscriptionRef.current) {
        console.log('[Cleanup] Unsubscribing from realtime');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      // Clean up polling interval
      if (pollingIntervalRef.current) {
        console.log('[Cleanup] Clearing polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Clean up all channels for this conversation
      const channels = supabase.getChannels();
      channels.forEach(ch => {
        if (ch.topic?.includes('conversation-')) {
          console.log('[Cleanup] Removing channel:', ch.topic);
          supabase.removeChannel(ch);
        }
      });
    };
  }, [selectedConversation?.id, isTakeoverActive]);

  const loadConversations = async () => {
    try {
      console.log('[ConversationsPage] Loading conversations for user:', user?.uid);

      if (!user?.uid) {
        console.error('[ConversationsPage] No user ID available');
        return;
      }

      // Get stores owned by the user
      const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.uid);

      if (storeError) {
        console.error('[ConversationsPage] Error loading stores:', storeError);
        return;
      }

      if (!stores || stores.length === 0) {
        console.log('[ConversationsPage] No stores found for user');
        setConversations([]);
        setLoading(false);
        return;
      }

      const storeIds = stores.map(s => s.id);
      console.log('[ConversationsPage] Found stores:', storeIds);

      // Load conversations for all user's stores
      const { data: convs, error: convError } = await supabase
        .from('ai_chat_conversations')
        .select(`
          *,
          ai_chat_messages (
            *
          )
        `)
        .in('store_id', storeIds.map(id => id.toString()))
        .order('updated_at', { ascending: false });

      if (convError) {
        console.error('[ConversationsPage] Error loading conversations:', convError);
        return;
      }

      console.log('[ConversationsPage] Loaded conversations:', convs?.length || 0);

      const formattedConvs = convs?.map(conv => ({
        ...conv,
        messages: conv.ai_chat_messages?.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })) || [];

      setConversations(formattedConvs);
    } catch (error) {
      console.error('[ConversationsPage] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadConversations();
    }
  }, [user?.uid]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initiateAgentTakeover = async () => {
    if (!selectedConversation || isInitiatingTakeover) {
      console.error('[Takeover] No conversation selected or already initiating');
      return;
    }

    // Prevent multiple simultaneous takeover attempts
    setIsInitiatingTakeover(true);

    try {
      console.log('[Takeover] Initiating agent takeover for conversation:', selectedConversation.id);

      // Call the RPC function
      const { data: funcResponse, error: funcError } = await supabase
        .rpc('initiate_agent_takeover', {
          p_conversation_id: selectedConversation.id,
          p_agent_id: user?.uid,
          p_agent_name: 'Store Owner'
        });

      if (funcError) {
        console.error('[Takeover] Function error:', funcError);

        // If function doesn't exist, has overloading issues, or other errors, try direct update
        if (funcError.code === '42883' ||
            funcError.code === 'PGRST203' ||
            funcError.message?.includes('does not exist') ||
            funcError.message?.includes('could not choose')) {
          console.log('[Takeover] Function issue detected, using direct update fallback');

          const { error: updateError } = await supabase
            .from('ai_chat_conversations')
            .update({
              is_agent_active: true,
              agent_id: user?.uid,
              takeover_status: 'agent',
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedConversation.id);

          if (updateError) {
            throw updateError;
          }

          // Add system message manually (only once)
          // First check if message already exists in the database
          const { data: existingMessages } = await supabase
            .from('ai_chat_messages')
            .select('id, content, created_at')
            .eq('conversation_id', selectedConversation.id)
            .ilike('content', '%agent has joined%')
            .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Check last 30 seconds
            .limit(1);

          if (!existingMessages || existingMessages.length === 0) {
            const { data: insertedMessage } = await supabase
              .from('ai_chat_messages')
              .insert({
                conversation_id: selectedConversation.id,
                role: 'assistant',
                content: '👨‍💼 A human agent has joined the conversation. They will assist you from here.',
                is_agent_message: true,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            // Add the message ID to processed set immediately to prevent duplicates
            if (insertedMessage?.id) {
              processedMessageIds.current.add(insertedMessage.id);
            }
          } else {
            console.log('[Takeover] Agent joined message already exists, skipping insert');
          }
        } else {
          throw funcError;
        }
      } else if (funcResponse?.success) {
        console.log('[Takeover] Successfully initiated:', funcResponse);
        setTakeoverSessionId(funcResponse.takeover_session_id || `session_${Date.now()}`);
      }

      setIsTakeoverActive(true);

      // Update local state
      setSelectedConversation({
        ...selectedConversation,
        is_agent_active: true,
        agent_id: user?.uid
      });

      // Reload conversations after a short delay
      setTimeout(() => loadConversations(), 500);

    } catch (error: any) {
      console.error('[Takeover] Error:', error);
      alert(`Failed to take over conversation. ${error?.message || 'Please try again.'}`);
    } finally {
      setIsInitiatingTakeover(false);
    }
  };

  const endAgentTakeover = async () => {
    if (!selectedConversation) {
      console.error('[EndTakeover] No conversation selected');
      return;
    }

    try {
      // Try the RPC function first
      const { data: funcResponse, error: funcError } = await supabase
        .rpc('end_agent_takeover', {
          p_conversation_id: selectedConversation.id,
          p_agent_id: user?.uid
        });

      if (funcError && funcError.code !== '42883') {
        throw funcError;
      }

      // Always do direct update as well to ensure state is correct
      const { error: updateError } = await supabase
        .from('ai_chat_conversations')
        .update({
          is_agent_active: false,
          agent_id: null,
          takeover_status: 'ai',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      if (updateError) {
        console.error('[EndTakeover] Update error:', updateError);
        throw updateError;
      }

      setIsTakeoverActive(false);
      setTakeoverSessionId(null);

      // Update local state
      setSelectedConversation({
        ...selectedConversation,
        is_agent_active: false,
        agent_id: null
      });

      // Reload conversations
      setTimeout(() => loadConversations(), 500);

    } catch (error: any) {
      console.error('[EndTakeover] Error:', error);
      alert(`Failed to end takeover. Error: ${error?.message || 'Unknown error'}`);
    }
  };

  const sendAgentMessage = async () => {
    if (!selectedConversation || !messageText.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      // Update conversation timestamp
      await supabase
        .from('ai_chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      // Insert agent message
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          role: 'assistant',
          content: messageText.trim(),
          is_agent_message: true,
          agent_id: user?.uid,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      // Add message to local state immediately
      const newMessage: Message = {
        id: data?.[0]?.id || crypto.randomUUID(),
        role: 'assistant',
        content: messageText.trim(),
        is_agent_message: true,
        agent_id: user?.uid,
        created_at: new Date().toISOString()
      };

      setSelectedConversation({
        ...selectedConversation,
        messages: [...(selectedConversation.messages || []), newMessage]
      });

      setMessageText('');

      // Focus back to input
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const getCustomerName = (conv: Conversation) => {
    if (conv.is_storefront || conv.context_type === 'storefront') {
      if (conv.visitor_name) return `🛍️ ${conv.visitor_name}`;
      if (conv.visitor_email) return `🛍️ ${conv.visitor_email.split('@')[0]}`;
      return `🛍️ Store Visitor ${conv.session_id.slice(0, 6)}`;
    }
    if (conv.context_type === 'help') {
      return `💬 Store Owner`;
    }
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

  return (
    <div style={styles.container}>
      {/* Conversations List */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>
            <MessageSquare size={20} />
            Conversations
          </h2>
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.conversationsList}>
          {filteredConversations.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv);
                  setIsTakeoverActive(conv.is_agent_active || false);
                  lastMessageCountRef.current = conv.messages?.length || 0;
                }}
                style={{
                  ...styles.conversationItem,
                  ...(selectedConversation?.id === conv.id ? styles.conversationItemActive : {})
                }}
              >
                <div style={styles.conversationHeader}>
                  <span style={styles.customerName}>{getCustomerName(conv)}</span>
                  {conv.is_agent_active && (
                    <span style={styles.agentBadge}>Agent Active</span>
                  )}
                </div>
                <div style={styles.conversationMeta}>
                  <span style={styles.lastMessage}>
                    {conv.messages?.[conv.messages.length - 1]?.content.substring(0, 50) || 'No messages'}
                  </span>
                  <span style={styles.timestamp}>
                    {new Date(conv.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        {selectedConversation ? (
          <>
            <div style={styles.chatHeader}>
              <h3 style={styles.chatTitle}>{getCustomerName(selectedConversation)}</h3>
              <div style={styles.chatActions}>
                {isTakeoverActive ? (
                  <button
                    onClick={endAgentTakeover}
                    style={styles.endButton}
                    title="End agent takeover"
                  >
                    <UserX size={18} />
                    End Takeover
                  </button>
                ) : (
                  <button
                    onClick={initiateAgentTakeover}
                    style={styles.takeoverButton}
                    disabled={isInitiatingTakeover}
                    title="Take over conversation"
                  >
                    <UserCheck size={18} />
                    {isInitiatingTakeover ? 'Taking Over...' : 'Take Over'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedConversation(null)}
                  style={styles.closeButton}
                  title="Close conversation"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={styles.messagesContainer}>
              {selectedConversation.messages?.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  style={{
                    ...styles.message,
                    ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
                  }}
                >
                  <div style={styles.messageHeader}>
                    <span style={styles.messageRole}>
                      {msg.is_agent_message ? '👤 Human Agent' :
                       msg.role === 'user' ? '👤 Customer' : '🤖 AI'}
                    </span>
                    <span style={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={styles.messageContent}>{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {isTakeoverActive && (
              <div style={styles.inputContainer}>
                <textarea
                  ref={messageInputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendAgentMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  style={styles.messageInput}
                  rows={3}
                />
                <button
                  onClick={sendAgentMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  style={styles.sendButton}
                >
                  <Send size={18} />
                  {sendingMessage ? 'Sending...' : 'Send'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={styles.emptyChatState}>
            <MessageSquare size={48} style={{ color: '#9ca3af' }} />
            <p style={{ marginTop: '16px', color: '#6b7280' }}>
              Select a conversation to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f9fafb'
  } as React.CSSProperties,

  sidebar: {
    width: '350px',
    backgroundColor: 'white',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column'
  } as React.CSSProperties,

  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb'
  } as React.CSSProperties,

  sidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px'
  } as React.CSSProperties,

  searchContainer: {
    position: 'relative'
  } as React.CSSProperties,

  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: '8px 8px 8px 36px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  } as React.CSSProperties,

  conversationsList: {
    flex: 1,
    overflowY: 'auto'
  } as React.CSSProperties,

  conversationItem: {
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f9fafb'
    }
  } as React.CSSProperties,

  conversationItemActive: {
    backgroundColor: '#f0fdf4'
  } as React.CSSProperties,

  conversationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  } as React.CSSProperties,

  customerName: {
    fontWeight: '500',
    fontSize: '14px',
    color: '#111827'
  } as React.CSSProperties,

  agentBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500'
  } as React.CSSProperties,

  conversationMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  } as React.CSSProperties,

  lastMessage: {
    fontSize: '13px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  } as React.CSSProperties,

  timestamp: {
    fontSize: '12px',
    color: '#9ca3af'
  } as React.CSSProperties,

  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  } as React.CSSProperties,

  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  } as React.CSSProperties,

  chatHeader: {
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  } as React.CSSProperties,

  chatTitle: {
    fontSize: '18px',
    fontWeight: '600'
  } as React.CSSProperties,

  chatActions: {
    display: 'flex',
    gap: '8px'
  } as React.CSSProperties,

  takeoverButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  } as React.CSSProperties,

  endButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  } as React.CSSProperties,

  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s'
  } as React.CSSProperties,

  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#f9fafb'
  } as React.CSSProperties,

  message: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
    maxWidth: '70%'
  } as React.CSSProperties,

  userMessage: {
    marginLeft: 'auto',
    backgroundColor: '#dbeafe',
    borderBottomRightRadius: '4px'
  } as React.CSSProperties,

  assistantMessage: {
    backgroundColor: 'white',
    borderBottomLeftRadius: '4px'
  } as React.CSSProperties,

  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '12px',
    color: '#6b7280'
  } as React.CSSProperties,

  messageRole: {
    fontWeight: '500'
  } as React.CSSProperties,

  messageTime: {
    fontSize: '11px',
    color: '#9ca3af'
  } as React.CSSProperties,

  messageContent: {
    fontSize: '14px',
    color: '#111827',
    lineHeight: '1.5'
  } as React.CSSProperties,

  inputContainer: {
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px'
  } as React.CSSProperties,

  messageInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit'
  } as React.CSSProperties,

  sendButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  } as React.CSSProperties,

  emptyChatState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  } as React.CSSProperties
};