import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, RefreshCw, Calendar, TrendingUp, Package, Users, MessageCircle, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStaff } from '../contexts/StaffContext';
import { getUserTier } from '../services/subscriptionService';
import { supabase } from '../lib/supabase';
import '../styles/BusinessInsights.css';

interface BusinessSummary {
  id: string;
  store_id: string;
  period: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  summary_text: string;
  data_snapshot: any;
  created_at: string;
}

const BusinessInsights: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentRole } = useStaff();
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('Free');
  const [storeId, setStoreId] = useState<string | null>(null);

  // Check access permissions
  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Debug logging
      console.log('[BusinessInsights] Current user object:', currentUser);
      console.log('[BusinessInsights] Current user UID:', currentUser.uid);
      console.log('[BusinessInsights] Expected test user ID: dffba89b-869d-422a-a542-2e2494850b44');
      console.log('[BusinessInsights] User ID matches test:', currentUser.uid === 'dffba89b-869d-422a-a542-2e2494850b44');

      // Check if user is staff
      if (currentRole !== 'owner') {
        alert('Business Insights is only available to store owners.');
        navigate('/dashboard');
        return;
      }

      // Get user tier
      const tierData = await getUserTier(currentUser.uid);
      const tier = tierData?.tier_name || 'Free';
      setUserTier(tier);

      // Check if Pro or Business
      if (!['Pro', 'Business'].includes(tier)) {
        alert('Business Insights is available for Pro and Business tiers only.');
        navigate('/upgrade');
        return;
      }

      // Get store ID - handle multiple stores like ConversationsSimplifiedFixed
      console.log('[BusinessInsights] Querying stores with user_id:', currentUser.uid);

      const { data: stores, error } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', currentUser.uid);

      console.log('[BusinessInsights] Store query result:', { stores, error });
      console.log('[BusinessInsights] Number of stores found:', stores?.length || 0);

      // Use the first store if multiple exist
      if (stores && stores.length > 0) {
        console.log('[BusinessInsights] Setting store ID to:', stores[0].id);
        console.log('[BusinessInsights] Expected store ID: d93cd891-7e0a-47a8-9963-5e2a00a2591f');
        setStoreId(stores[0].id);
      } else {
        console.log('[BusinessInsights] No stores found for user!');
        // Try with just the UID as a fallback (for legacy single-store setups)
        console.log('[BusinessInsights] Trying fallback query with store ID = user UID...');
        const { data: fallbackStore, error: fallbackError } = await supabase
          .from('stores')
          .select('id')
          .eq('id', currentUser.uid);

        console.log('[BusinessInsights] Fallback query result:', { fallbackStore, fallbackError });

        if (fallbackStore && fallbackStore.length > 0) {
          console.log('[BusinessInsights] Using fallback store ID:', fallbackStore[0].id);
          setStoreId(fallbackStore[0].id);
        }
      }
    };

    checkAccess();
  }, [currentUser, currentRole, navigate]);

  // Load existing summary
  useEffect(() => {
    if (!storeId) return;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range for today/this week in WAT
        const now = new Date();
        const watOffset = 1; // WAT is UTC+1
        const watNow = new Date(now.getTime() + watOffset * 60 * 60 * 1000);

        let periodStart: Date;
        if (period === 'daily') {
          periodStart = new Date(watNow);
          periodStart.setUTCHours(0, 0, 0, 0);
        } else {
          // Weekly: Get Monday of this week
          const dayOfWeek = watNow.getUTCDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          periodStart = new Date(watNow);
          periodStart.setUTCDate(periodStart.getUTCDate() - daysToMonday);
          periodStart.setUTCHours(0, 0, 0, 0);
        }

        // Query for existing summary
        const { data, error: queryError } = await supabase
          .from('business_summaries')
          .select('*')
          .eq('store_id', storeId)
          .eq('period', period)
          .eq('period_start', periodStart.toISOString().split('T')[0])
          .single();

        if (queryError && queryError.code !== 'PGRST116') {
          throw queryError;
        }

        setSummary(data);
      } catch (err) {
        console.error('Error loading summary:', err);
        setError('Failed to load business summary');
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [storeId, period]);

  // Generate new summary
  const generateSummary = async () => {
    if (!storeId) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-business-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          store_id: storeId,
          period
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();

      // Create a summary object from the response
      const newSummary: BusinessSummary = {
        id: data.id || crypto.randomUUID(),
        store_id: storeId,
        period,
        period_start: data.data?.period?.start || new Date().toISOString(),
        period_end: data.data?.period?.end || new Date().toISOString(),
        summary_text: data.summary,
        data_snapshot: data.data,
        created_at: new Date().toISOString()
      };

      setSummary(newSummary);
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(err.message || 'Failed to generate business summary');
    } finally {
      setGenerating(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="business-insights-loading">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="business-insights-app">
      {/* Header */}
      <header className="business-insights-header">
        <div className="business-insights-header-content">
          <div className="business-insights-header-left">
            <button
              onClick={() => navigate('/dashboard')}
              className="business-insights-back-btn"
              aria-label="Back to dashboard"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="business-insights-title-wrapper">
              <Sparkles className="business-insights-icon" size={28} />
              <h1 className="business-insights-title">Business Insights</h1>
            </div>
          </div>

          {/* Period Toggle */}
          <div className="business-insights-period-toggle">
            <button
              onClick={() => setPeriod('daily')}
              className={`business-insights-period-btn ${
                period === 'daily' ? 'active' : ''
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`business-insights-period-btn ${
                period === 'weekly' ? 'active' : ''
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="business-insights-main">
        {error && (
          <div className="business-insights-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Card */}
        {summary ? (
          <div className="business-insights-card">
            <div className="business-insights-card-header">
              <div className="business-insights-date">
                <Calendar size={18} />
                <span>{period === 'daily' ? 'Today' : 'This Week'}'s Summary</span>
              </div>
              <button
                onClick={generateSummary}
                disabled={generating}
                className="business-insights-refresh-btn"
              >
                <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* AI Summary Text */}
            <div className="business-insights-summary">
              <p className="business-insights-summary-text">
                {summary.summary_text}
              </p>
            </div>

            {/* Data Snapshot */}
            {summary.data_snapshot && (
              <div className="business-insights-stats">
                {/* Sales Stats */}
                {summary.data_snapshot.sales && (
                  <div className="business-insights-stat-card business-insights-stat-green">
                    <div className="business-insights-stat-header">
                      <TrendingUp size={18} />
                      <h3>Sales Performance</h3>
                    </div>
                    <div className="business-insights-stat-content">
                      <p className="business-insights-stat-value">
                        {formatCurrency(summary.data_snapshot.sales.total)}
                      </p>
                      <p className="business-insights-stat-label">
                        {summary.data_snapshot.sales.count} sales
                      </p>
                      {summary.data_snapshot.sales.change && (
                        <p className={`business-insights-stat-change ${
                          parseFloat(summary.data_snapshot.sales.change) >= 0 ? 'positive' : 'negative'
                        }`}>
                          {parseFloat(summary.data_snapshot.sales.change) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(summary.data_snapshot.sales.change))}%
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat Insights */}
                {summary.data_snapshot.chatInsights && (
                  <div className="business-insights-stat-card business-insights-stat-purple">
                    <div className="business-insights-stat-header">
                      <MessageCircle size={18} />
                      <h3>Customer Chats</h3>
                    </div>
                    <div className="business-insights-stat-content">
                      <p className="business-insights-stat-value">
                        {summary.data_snapshot.chatInsights.totalConversations}
                      </p>
                      <p className="business-insights-stat-label">conversations</p>
                      <div className="business-insights-stat-details">
                        <span>Human help: {summary.data_snapshot.chatInsights.humanTakeovers}</span>
                        <span>WhatsApp: {summary.data_snapshot.chatInsights.whatsappRedirects}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Products */}
                {summary.data_snapshot.topProducts && summary.data_snapshot.topProducts.length > 0 && (
                  <div className="business-insights-stat-card business-insights-stat-blue">
                    <div className="business-insights-stat-header">
                      <Package size={18} />
                      <h3>Top Products</h3>
                    </div>
                    <div className="business-insights-stat-content">
                      <div className="business-insights-stat-list">
                        {summary.data_snapshot.topProducts.slice(0, 3).map((product: any, index: number) => (
                          <p key={index}>
                            {index + 1}. {product.name} ({product.quantity} sold)
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Low Stock Alert */}
                {summary.data_snapshot.lowStock && summary.data_snapshot.lowStock.length > 0 && (
                  <div className="business-insights-stat-card business-insights-stat-red">
                    <div className="business-insights-stat-header">
                      <AlertCircle size={18} />
                      <h3>Low Stock Alert</h3>
                    </div>
                    <div className="business-insights-stat-content">
                      <div className="business-insights-stat-list">
                        {summary.data_snapshot.lowStock.slice(0, 3).map((item: any, index: number) => (
                          <p key={index}>
                            {item.name}: {item.stock} left
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // No Summary - Generate Button
          <div className="business-insights-empty-state">
            <Sparkles className="business-insights-empty-icon" size={48} />
            <h2>No {period} summary yet</h2>
            <p>Generate your AI-powered business insights to see how your store is performing</p>
            <button
              onClick={generateSummary}
              disabled={generating}
              className="business-insights-generate-btn"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Summary
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div className="business-insights-footer">
          <p>Summaries are generated using AI based on your real business data</p>
          <p>Daily summaries auto-generate at 9pm WAT</p>
        </div>
      </main>
    </div>
  );
};

export default BusinessInsights;