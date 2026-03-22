import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, MessageSquare, Users, Clock, Hash, Bot, UserCheck, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  uniqueVisitors: number;
  identifiedVisitors: number;
  storefrontConversations: number;
  dashboardConversations: number;
  takeoverCount: number;
  commonTopics: Topic[];
  hourlyDistribution: HourlyData[];
}

interface Topic {
  topic: string;
  category: string;
  frequency: number;
  sample_questions: string[];
}

interface HourlyData {
  hour: number;
  count: number;
}

interface Props {
  storeId: string;
  dateRange?: { start: Date; end: Date };
}

export const ConversationAnalytics: React.FC<Props> = ({ storeId, dateRange }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadAnalytics();
  }, [storeId, selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();

      switch (selectedPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Fetch analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('conversation_analytics')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (analyticsError) throw analyticsError;

      // Aggregate analytics data
      const aggregated = analyticsData?.reduce((acc, day) => {
        acc.totalConversations += day.total_conversations || 0;
        acc.totalMessages += day.total_messages || 0;
        acc.uniqueVisitors += day.unique_visitors || 0;
        acc.identifiedVisitors += day.identified_visitors || 0;
        acc.storefrontConversations += day.storefront_conversations || 0;
        acc.dashboardConversations += day.dashboard_conversations || 0;
        acc.takeoverCount += day.takeover_count || 0;
        return acc;
      }, {
        totalConversations: 0,
        totalMessages: 0,
        uniqueVisitors: 0,
        identifiedVisitors: 0,
        storefrontConversations: 0,
        dashboardConversations: 0,
        takeoverCount: 0
      });

      // Calculate average messages per conversation
      const avgMessages = aggregated.totalConversations > 0
        ? Math.round(aggregated.totalMessages / aggregated.totalConversations * 10) / 10
        : 0;

      // Fetch common topics
      const { data: topics, error: topicsError } = await supabase
        .from('conversation_topics')
        .select('*')
        .eq('store_id', storeId)
        .order('frequency', { ascending: false })
        .limit(5);

      if (topicsError) throw topicsError;

      // Fetch hourly distribution
      const { data: conversations, error: convError } = await supabase
        .from('ai_chat_conversations')
        .select('created_at')
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (convError) throw convError;

      // Calculate hourly distribution
      const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
      conversations?.forEach(conv => {
        const hour = new Date(conv.created_at).getHours();
        hourlyData[hour].count++;
      });

      setAnalytics({
        ...aggregated,
        avgMessagesPerConversation: avgMessages,
        commonTopics: topics || [],
        hourlyDistribution: hourlyData
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    marginTop: '20px'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const metricsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  };

  const metricCardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const chartContainerStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    marginRight: '10px',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: isActive ? '#4CAF50' : '#e0e0e0',
    color: isActive ? 'white' : '#666',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  });

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} style={{ marginBottom: '10px', color: '#999' }} />
          <div>No analytics data available</div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          <TrendingUp size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Conversation Analytics
        </h2>
        <div>
          <button
            onClick={() => setSelectedPeriod('today')}
            style={buttonStyle(selectedPeriod === 'today')}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedPeriod('week')}
            style={buttonStyle(selectedPeriod === 'week')}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            style={buttonStyle(selectedPeriod === 'month')}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={metricsGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <MessageSquare size={20} style={{ marginRight: '10px', color: '#4CAF50' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>Total Conversations</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.totalConversations}</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Hash size={20} style={{ marginRight: '10px', color: '#2196F3' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>Total Messages</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.totalMessages}</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Users size={20} style={{ marginRight: '10px', color: '#FF9800' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>Unique Visitors</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.uniqueVisitors}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            {analytics.identifiedVisitors} identified
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Clock size={20} style={{ marginRight: '10px', color: '#9C27B0' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>Avg Messages/Chat</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {analytics.avgMessagesPerConversation}
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Bot size={20} style={{ marginRight: '10px', color: '#607D8B' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>Channel Distribution</span>
          </div>
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            <div>Storefront: {analytics.storefrontConversations}</div>
            <div>Dashboard: {analytics.dashboardConversations}</div>
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <UserCheck size={20} style={{ marginRight: '10px', color: '#F44336' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>Agent Takeovers</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.takeoverCount}</div>
        </div>
      </div>

      {/* Hourly Distribution Chart */}
      <div style={chartContainerStyle}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
          Activity by Hour
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '2px' }}>
          {analytics.hourlyDistribution.map((data) => {
            const maxCount = Math.max(...analytics.hourlyDistribution.map(d => d.count));
            const height = maxCount > 0 ? (data.count / maxCount) * 100 : 0;

            return (
              <div
                key={data.hour}
                style={{
                  flex: 1,
                  backgroundColor: '#4CAF50',
                  height: `${height}%`,
                  minHeight: '2px',
                  borderRadius: '2px 2px 0 0',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                title={`${data.hour}:00 - ${data.count} conversations`}
              >
                {data.count > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    color: '#666'
                  }}>
                    {data.hour % 6 === 0 ? `${data.hour}h` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Common Topics */}
      {analytics.commonTopics.length > 0 && (
        <div style={chartContainerStyle}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
            Common Topics & Questions
          </h3>
          <div>
            {analytics.commonTopics.map((topic, index) => (
              <div
                key={index}
                style={{
                  padding: '15px',
                  borderBottom: index < analytics.commonTopics.length - 1 ? '1px solid #e0e0e0' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '5px' }}>{topic.topic}</div>
                    {topic.category && (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#2196F3'
                      }}>
                        {topic.category}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#4CAF50'
                  }}>
                    {topic.frequency}
                  </div>
                </div>
                {topic.sample_questions && topic.sample_questions.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                    Sample: "{topic.sample_questions[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};