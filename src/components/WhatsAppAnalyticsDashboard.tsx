import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ChatLog {
  id: string;
  customer_phone: string;
  customer_name?: string;
  customer_message: string;
  bot_response: string;
  products_mentioned: string[];
  response_time_ms: number;
  created_at: string;
}

interface DashboardStats {
  totalChats: number;
  chatsThisMonth: number;
  avgResponseTime: number;
  topProducts: Array<{ name: string; count: number }>;
  chatsByDay: Array<{ date: string; count: number }>;
}

export default function WhatsAppAnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalChats: 0,
    chatsThisMonth: 0,
    avgResponseTime: 0,
    topProducts: [],
    chatsByDay: [],
  });
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, filter]);

  const loadChats = async () => {
    setLoading(true);
    try {
      // Calculate date filter
      const now = new Date();
      let startDate = new Date();

      if (filter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filter === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(0); // All time
      }

      // Fetch chats
      const { data: chatsData, error } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setChats(chatsData || []);

      // Calculate stats
      const totalChats = chatsData?.length || 0;
      const avgResponseTime = chatsData?.length
        ? chatsData.reduce((sum, chat) => sum + (chat.response_time_ms || 0), 0) / chatsData.length
        : 0;

      // Count products mentioned
      const productCounts: Record<string, number> = {};
      chatsData?.forEach((chat) => {
        chat.products_mentioned?.forEach((productId: string) => {
          productCounts[productId] = (productCounts[productId] || 0) + 1;
        });
      });

      // Get top 5 products
      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({ name: id, count })); // TODO: Fetch actual product names

      // Group chats by day
      const chatsByDay: Record<string, number> = {};
      chatsData?.forEach((chat) => {
        const date = new Date(chat.created_at).toLocaleDateString();
        chatsByDay[date] = (chatsByDay[date] || 0) + 1;
      });

      const chatsByDayArray = Object.entries(chatsByDay)
        .map(([date, count]) => ({ date, count }))
        .slice(0, 7);

      setStats({
        totalChats,
        chatsThisMonth: totalChats,
        avgResponseTime,
        topProducts,
        chatsByDay: chatsByDayArray,
      });
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove whatsapp: prefix if present
    const cleaned = phone.replace('whatsapp:', '');
    // Format as +234 XXX XXX XXXX
    if (cleaned.length > 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
    }
    return cleaned;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p>Loading chat analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            📊 WhatsApp AI Analytics
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Track your AI chatbot performance and customer interactions
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: '#f3f4f6',
          padding: '0.25rem',
          borderRadius: '8px',
        }}>
          {(['today', 'week', 'month', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                background: filter === f ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: filter === f ? '#667eea' : '#6b7280',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Total Chats */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Total Chats
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {stats.totalChats}
          </div>
        </div>

        {/* Avg Response Time */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Avg Response Time
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {(stats.avgResponseTime / 1000).toFixed(1)}s
          </div>
        </div>

        {/* Success Rate */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Products Found
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {stats.topProducts.length}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* Top Products */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
            🏆 Most Asked Products
          </h3>
          {stats.topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.topProducts.map((product, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: `linear-gradient(135deg, #667eea${Math.max(100 - index * 20, 40)}%, #764ba2${Math.max(100 - index * 20, 40)}%)`,
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      Product ID: {product.name}
                    </div>
                  </div>
                  <div style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}>
                    {product.count} asks
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
              <div>No product queries yet</div>
            </div>
          )}
        </div>

        {/* Chats by Day */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
            📅 Chats Over Time
          </h3>
          {stats.chatsByDay.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats.chatsByDay.map((day, index) => {
                const maxCount = Math.max(...stats.chatsByDay.map(d => d.count));
                const percentage = (day.count / maxCount) * 100;

                return (
                  <div key={index}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      marginBottom: '0.25rem',
                      color: '#6b7280',
                    }}>
                      <span>{day.date}</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{day.count} chats</span>
                    </div>
                    <div style={{
                      height: '8px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <div>No chat data yet</div>
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
          💬 Recent Chat History
        </h3>

        {chats.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '600px',
            overflowY: 'auto',
          }}>
            {chats.map((chat) => (
              <div
                key={chat.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  background: '#fafafa',
                }}
              >
                {/* Chat Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}>
                      👤
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {formatPhoneNumber(chat.customer_phone)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(chat.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {chat.response_time_ms}ms
                  </div>
                </div>

                {/* Customer Message */}
                <div style={{
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Customer:
                  </div>
                  <div style={{ fontSize: '0.9375rem' }}>
                    {chat.customer_message}
                  </div>
                </div>

                {/* Bot Response */}
                <div style={{
                  background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#6366f1', marginBottom: '0.25rem' }}>
                    AI Response:
                  </div>
                  <div style={{ fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                    {chat.bot_response}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No chats yet
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              Your AI chat history will appear here once customers start messaging
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
