/**
 * Channel Analytics Component
 * Shows sales breakdown by channel (Instagram, WhatsApp, etc.)
 */

import React, { useState, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { formatNGN } from '../utils/currency';
import { getDB } from '../db/idb';
import './ChannelAnalytics.css';

interface ChannelStat {
  channel: string;
  emoji: string;
  label: string;
  salesCount: number;
  revenue: number;
  percentage: number;
}

interface ChannelAnalyticsProps {
  onClose: () => void;
}

export const ChannelAnalytics: React.FC<ChannelAnalyticsProps> = ({ onClose }) => {
  const [stats, setStats] = useState<ChannelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const channelMap: Record<string, { emoji: string; label: string }> = {
    'in-store': { emoji: '🏪', label: 'In-Store' },
    'whatsapp': { emoji: '💬', label: 'WhatsApp' },
    'instagram': { emoji: '📷', label: 'Instagram' },
    'facebook': { emoji: '📘', label: 'Facebook' },
    'website': { emoji: '🌐', label: 'Online Store' },
    'tiktok': { emoji: '🎵', label: 'TikTok' },
    'referral': { emoji: '👥', label: 'Referral' },
    'other': { emoji: '📦', label: 'Other' }
  };

  useEffect(() => {
    loadChannelStats();
  }, [dateRange]);

  const getDateFilter = (): number => {
    const now = Date.now();
    switch (dateRange) {
      case 'today':
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return startOfDay.getTime();
      case 'week':
        return now - (7 * 24 * 60 * 60 * 1000);
      case 'month':
        return now - (30 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return 0;
    }
  };

  const loadChannelStats = async () => {
    try {
      setLoading(true);
      const db = await getDB();
      const tx = db.transaction(['sales'], 'readonly');
      const salesStore = tx.objectStore('sales');

      const allSales = await new Promise<any[]>((resolve) => {
        const request = salesStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });

      // Filter by date range
      const dateFilter = getDateFilter();
      const filteredSales = allSales.filter(sale => sale.createdAt >= dateFilter);

      // Group by channel
      const channelGroups: Record<string, { count: number; revenue: number }> = {};
      let total = 0;

      filteredSales.forEach(sale => {
        const channel = sale.salesChannel || 'in-store';
        const revenue = Math.round(sale.sellKobo / 100);

        if (!channelGroups[channel]) {
          channelGroups[channel] = { count: 0, revenue: 0 };
        }

        channelGroups[channel].count += 1;
        channelGroups[channel].revenue += revenue;
        total += revenue;
      });

      setTotalRevenue(total);

      // Convert to stats array
      const channelStats: ChannelStat[] = Object.entries(channelGroups).map(([channel, data]) => {
        const channelInfo = channelMap[channel] || { emoji: '📦', label: channel };
        return {
          channel,
          emoji: channelInfo.emoji,
          label: channelInfo.label,
          salesCount: data.count,
          revenue: data.revenue,
          percentage: total > 0 ? (data.revenue / total) * 100 : 0
        };
      });

      // Sort by revenue (highest first)
      channelStats.sort((a, b) => b.revenue - a.revenue);

      setStats(channelStats);
      setLoading(false);
    } catch (error) {
      console.error('[ChannelAnalytics] Error loading stats:', error);
      setLoading(false);
    }
  };

  return (
    <div className="channel-analytics-overlay" onClick={onClose}>
      <div className="channel-analytics-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="channel-analytics-header">
          <div>
            <h2>📊 Sales by Channel</h2>
            <p className="channel-analytics-subtitle">Track where your sales come from</p>
          </div>
          <button onClick={onClose} className="channel-analytics-close" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="channel-analytics-filters">
          <button
            className={`filter-btn ${dateRange === 'today' ? 'active' : ''}`}
            onClick={() => setDateRange('today')}
          >
            Today
          </button>
          <button
            className={`filter-btn ${dateRange === 'week' ? 'active' : ''}`}
            onClick={() => setDateRange('week')}
          >
            Last 7 Days
          </button>
          <button
            className={`filter-btn ${dateRange === 'month' ? 'active' : ''}`}
            onClick={() => setDateRange('month')}
          >
            Last 30 Days
          </button>
          <button
            className={`filter-btn ${dateRange === 'all' ? 'active' : ''}`}
            onClick={() => setDateRange('all')}
          >
            All Time
          </button>
        </div>

        {/* Total Revenue */}
        <div className="channel-analytics-total">
          <TrendingUp size={20} />
          <span>Total Revenue: {formatNGN(totalRevenue)}</span>
        </div>

        {/* Channel Stats */}
        <div className="channel-analytics-body">
          {loading ? (
            <div className="channel-analytics-loading">
              <div className="spinner"></div>
              <p>Loading analytics...</p>
            </div>
          ) : stats.length === 0 ? (
            <div className="channel-analytics-empty">
              <p>No sales data for selected period</p>
              <small>Sales will appear here once you start recording them</small>
            </div>
          ) : (
            <div className="channel-stats-list">
              {stats.map((stat) => (
                <div key={stat.channel} className="channel-stat-card">
                  <div className="channel-stat-icon">{stat.emoji}</div>
                  <div className="channel-stat-info">
                    <div className="channel-stat-name">{stat.label}</div>
                    <div className="channel-stat-details">
                      {stat.salesCount} sale{stat.salesCount !== 1 ? 's' : ''} • {formatNGN(stat.revenue)}
                    </div>
                  </div>
                  <div className="channel-stat-percentage">
                    {stat.percentage.toFixed(1)}%
                  </div>
                  <div className="channel-stat-bar">
                    <div
                      className="channel-stat-bar-fill"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
