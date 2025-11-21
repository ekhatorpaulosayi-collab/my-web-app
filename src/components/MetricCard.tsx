/**
 * Metric Card Component
 * Large number display with emoji icon and color coding
 * Shows the 4 primary metrics: Sales, Profit, Debt, Stock
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './MetricCard.css';

interface MetricCardProps {
  emoji: string;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'highlight';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  emoji,
  label,
  value,
  subtitle,
  trend,
  variant = 'default',
  onClick
}) => {
  const className = `metric-card metric-card-${variant} ${onClick ? 'metric-card-clickable' : ''}`;

  return (
    <div className={className} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="metric-card-header">
        <span className="metric-card-emoji">{emoji}</span>
        <span className="metric-card-label">{label}</span>
      </div>
      <div className="metric-card-body">
        <div className="metric-card-value">{value}</div>
        {trend && (
          <span className={`metric-card-trend metric-card-trend-${trend}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </span>
        )}
      </div>
      {subtitle && <div className="metric-card-subtitle">{subtitle}</div>}
    </div>
  );
};

interface MetricRowProps {
  todaySales: number;
  todayProfit: number;
  creditOwed: number;
  lowStockCount: number;
  salesCount: number;
  profitTrend?: 'up' | 'down' | 'neutral';
  onViewDebts?: () => void;
  onViewStock?: () => void;
}

export const MetricRow: React.FC<MetricRowProps> = ({
  todaySales,
  todayProfit,
  creditOwed,
  lowStockCount,
  salesCount,
  profitTrend,
  onViewDebts,
  onViewStock
}) => {
  const formatCurrency = (kobo: number) => {
    const naira = kobo / 100;
    if (naira >= 1000000) {
      return `₦${(naira / 1000000).toFixed(1)}M`;
    } else if (naira >= 1000) {
      return `₦${(naira / 1000).toFixed(1)}k`;
    } else {
      return `₦${naira.toLocaleString()}`;
    }
  };

  return (
    <div className="metric-row">
      <MetricCard
        emoji="💰"
        label="Sales"
        value={formatCurrency(todaySales)}
        subtitle={`${salesCount} sale${salesCount !== 1 ? 's' : ''}`}
        variant="default"
      />

      <MetricCard
        emoji="📈"
        label="PROFIT"
        value={formatCurrency(todayProfit)}
        subtitle="Today's earnings"
        trend={profitTrend}
        variant="highlight"
      />

      {creditOwed > 0 && (
        <MetricCard
          emoji="🔔"
          label="Debt"
          value={formatCurrency(creditOwed)}
          subtitle="To collect"
          variant="warning"
          onClick={onViewDebts}
        />
      )}

      {lowStockCount > 0 && (
        <MetricCard
          emoji="📦"
          label="Stock"
          value={lowStockCount}
          subtitle={`item${lowStockCount > 1 ? 's' : ''} low`}
          variant="danger"
          onClick={onViewStock}
        />
      )}
    </div>
  );
};
