import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Download, Share2, Search, Calendar, CreditCard, DollarSign, Filter } from 'lucide-react';
import '../styles/SalesHistory.css';

interface Sale {
  id: string | number;
  itemName: string;
  sellPrice: number;
  sellKobo: number;
  buyPrice: number;
  qty: number;
  profit: number;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'credit';
  customerName?: string;
  createdAt: string | number;
  timestamp?: number;
}

interface SalesHistoryProps {
  sales: Sale[];
  onClose: () => void;
  onExportCSV: () => void;
  onShare: (period: 'today' | 'week' | 'month') => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales,
  onClose,
  onExportCSV,
  onShare
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'transfer' | 'card' | 'credit'>('all');
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Filter sales based on search and filters
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Time filter
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (timeFilter === 'today') {
      filtered = filtered.filter(sale => {
        const saleTime = typeof sale.createdAt === 'string'
          ? new Date(sale.createdAt).getTime()
          : sale.timestamp || sale.createdAt;
        return saleTime >= startOfDay.getTime();
      });
    } else if (timeFilter === 'week') {
      filtered = filtered.filter(sale => {
        const saleTime = typeof sale.createdAt === 'string'
          ? new Date(sale.createdAt).getTime()
          : sale.timestamp || sale.createdAt;
        return saleTime >= startOfWeek.getTime();
      });
    } else if (timeFilter === 'month') {
      filtered = filtered.filter(sale => {
        const saleTime = typeof sale.createdAt === 'string'
          ? new Date(sale.createdAt).getTime()
          : sale.timestamp || sale.createdAt;
        return saleTime >= startOfMonth.getTime();
      });
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentFilter);
    }

    // Sort by date descending
    filtered.sort((a, b) => {
      const timeA = typeof a.createdAt === 'string'
        ? new Date(a.createdAt).getTime()
        : a.timestamp || a.createdAt;
      const timeB = typeof b.createdAt === 'string'
        ? new Date(b.createdAt).getTime()
        : b.timestamp || b.createdAt;
      return timeB - timeA;
    });

    return filtered;
  }, [sales, searchTerm, timeFilter, paymentFilter]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const total = filteredSales.reduce((sum, sale) =>
      sum + ((sale.sellKobo || sale.sellPrice * 100) * sale.qty) / 100, 0
    );

    const byPayment = {
      cash: 0,
      transfer: 0,
      card: 0,
      credit: 0
    };

    filteredSales.forEach(sale => {
      const amount = ((sale.sellKobo || sale.sellPrice * 100) * sale.qty) / 100;
      byPayment[sale.paymentMethod] += amount;
    });

    return {
      total,
      count: filteredSales.length,
      byPayment
    };
  }, [filteredSales]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date/time
  const formatDateTime = (timestamp: string | number) => {
    const date = typeof timestamp === 'string'
      ? new Date(timestamp)
      : new Date(timestamp);

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="sales-history-modal">
      {/* Header with blue gradient */}
      <header className="sales-history-header">
        <div className="sales-history-header-content">
          <div className="sales-history-header-left">
            <button
              onClick={onClose}
              className="sales-history-back-btn"
              aria-label="Back to dashboard"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="sales-history-title">Sales History</h1>
          </div>

          <div className="sales-history-header-actions">
            <button
              onClick={onExportCSV}
              className="sales-history-action-btn"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <div className="sales-history-share-wrapper">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="sales-history-action-btn"
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
              {showShareMenu && (
                <div className="sales-history-share-menu">
                  <button onClick={() => { onShare('today'); setShowShareMenu(false); }}>
                    Today's Summary
                  </button>
                  <button onClick={() => { onShare('week'); setShowShareMenu(false); }}>
                    This Week
                  </button>
                  <button onClick={() => { onShare('month'); setShowShareMenu(false); }}>
                    This Month
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter toggles in header */}
        <div className="sales-history-filters">
          <div className="sales-history-time-filters">
            <button
              onClick={() => setTimeFilter('today')}
              className={`sales-history-filter-btn ${timeFilter === 'today' ? 'active' : ''}`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`sales-history-filter-btn ${timeFilter === 'week' ? 'active' : ''}`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`sales-history-filter-btn ${timeFilter === 'month' ? 'active' : ''}`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`sales-history-filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
            >
              All Time
            </button>
          </div>

          <div className="sales-history-payment-filters">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`sales-history-filter-btn small ${paymentFilter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setPaymentFilter('cash')}
              className={`sales-history-filter-btn small ${paymentFilter === 'cash' ? 'active' : ''}`}
            >
              Cash
            </button>
            <button
              onClick={() => setPaymentFilter('transfer')}
              className={`sales-history-filter-btn small ${paymentFilter === 'transfer' ? 'active' : ''}`}
            >
              Transfer
            </button>
            <button
              onClick={() => setPaymentFilter('card')}
              className={`sales-history-filter-btn small ${paymentFilter === 'card' ? 'active' : ''}`}
            >
              Card
            </button>
            <button
              onClick={() => setPaymentFilter('credit')}
              className={`sales-history-filter-btn small ${paymentFilter === 'credit' ? 'active' : ''}`}
            >
              Credit
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="sales-history-main">
        {/* Search bar */}
        <div className="sales-history-search">
          <Search size={20} />
          <input
            type="search"
            placeholder="Search by product or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sales-history-search-input"
          />
        </div>

        {/* Summary Card */}
        <div className="sales-history-summary">
          <div className="sales-history-total-card">
            <div className="sales-history-total-label">Total Sales</div>
            <div className="sales-history-total-amount">{formatCurrency(summary.total)}</div>
            <div className="sales-history-total-count">{summary.count} sale{summary.count !== 1 ? 's' : ''}</div>
          </div>

          {/* Payment breakdown cards */}
          <div className="sales-history-breakdown">
            <div className="sales-history-breakdown-card cash">
              <div className="sales-history-breakdown-icon">
                <DollarSign size={16} />
              </div>
              <div className="sales-history-breakdown-content">
                <div className="sales-history-breakdown-label">Cash</div>
                <div className="sales-history-breakdown-amount">{formatCurrency(summary.byPayment.cash)}</div>
              </div>
            </div>

            <div className="sales-history-breakdown-card transfer">
              <div className="sales-history-breakdown-icon">
                <CreditCard size={16} />
              </div>
              <div className="sales-history-breakdown-content">
                <div className="sales-history-breakdown-label">Transfer</div>
                <div className="sales-history-breakdown-amount">{formatCurrency(summary.byPayment.transfer)}</div>
              </div>
            </div>

            <div className="sales-history-breakdown-card card">
              <div className="sales-history-breakdown-icon">
                <CreditCard size={16} />
              </div>
              <div className="sales-history-breakdown-content">
                <div className="sales-history-breakdown-label">Card</div>
                <div className="sales-history-breakdown-amount">{formatCurrency(summary.byPayment.card)}</div>
              </div>
            </div>

            <div className="sales-history-breakdown-card credit">
              <div className="sales-history-breakdown-icon">
                <Calendar size={16} />
              </div>
              <div className="sales-history-breakdown-content">
                <div className="sales-history-breakdown-label">Credit</div>
                <div className="sales-history-breakdown-amount">{formatCurrency(summary.byPayment.credit)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales List */}
        <div className="sales-history-list">
          {filteredSales.length === 0 ? (
            <div className="sales-history-empty">
              {searchTerm || timeFilter !== 'all' || paymentFilter !== 'all' ? (
                <p>No sales found matching your filters</p>
              ) : (
                <p>No sales recorded yet</p>
              )}
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div key={sale.id} className="sales-history-item">
                <div className="sales-history-item-header">
                  <div>
                    <div className="sales-history-item-name">{sale.itemName}</div>
                    {sale.customerName && (
                      <div className="sales-history-item-customer">{sale.customerName}</div>
                    )}
                  </div>
                  <div className="sales-history-item-amount">
                    {formatCurrency(((sale.sellKobo || sale.sellPrice * 100) * sale.qty) / 100)}
                  </div>
                </div>
                <div className="sales-history-item-footer">
                  <div className="sales-history-item-meta">
                    <span className="sales-history-item-time">
                      {formatDateTime(sale.createdAt)}
                    </span>
                    {sale.qty > 1 && (
                      <span className="sales-history-item-qty">Qty: {sale.qty}</span>
                    )}
                  </div>
                  <span className={`sales-history-item-payment ${sale.paymentMethod}`}>
                    {sale.paymentMethod}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};