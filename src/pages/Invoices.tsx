/**
 * Invoices List Page
 * View, filter, and manage all invoices
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Download,
  Send,
  Filter,
  Search,
} from 'lucide-react';
import {
  getInvoices,
  getInvoiceSummary,
  formatCurrency,
  InvoiceStatus,
  sendInvoice,
} from '../services/invoiceService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Invoices.css';

export default function Invoices() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  // State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load invoices and summary
  useEffect(() => {
    loadData();
  }, [userId, statusFilter]);

  const loadData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError('');

      // Load invoices
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const invoicesResult = await getInvoices(userId, filters);
      if (!invoicesResult.success) {
        throw new Error(invoicesResult.error);
      }
      setInvoices(invoicesResult.invoices || []);

      // Load summary
      const summaryResult = await getInvoiceSummary(userId);
      if (summaryResult.success) {
        setSummary(summaryResult.summary);
      }
    } catch (err: any) {
      console.error('[Invoices] Error loading data:', err);
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userId) loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Send payment reminder
  const handleSendReminder = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();

    if (!userId) return;

    const confirmed = window.confirm('Send payment reminder to customer?');
    if (!confirmed) return;

    try {
      const result = await sendInvoice(invoiceId, userId);
      if (result.success) {
        alert('✅ Payment reminder sent successfully!');
        loadData(); // Reload to refresh status
      } else {
        alert(`Failed to send reminder: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder. Please try again.');
    }
  };

  // Get status badge
  const getStatusBadge = (status: InvoiceStatus) => {
    const badges = {
      draft: { icon: FileText, color: '#94a3b8', bg: '#f1f5f9', label: 'Draft' },
      sent: { icon: Send, color: '#3b82f6', bg: '#dbeafe', label: 'Sent' },
      viewed: { icon: Eye, color: '#8b5cf6', bg: '#ede9fe', label: 'Viewed' },
      partial: { icon: Clock, color: '#f59e0b', bg: '#fef3c7', label: 'Partial' },
      paid: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Paid' },
      overdue: { icon: AlertCircle, color: '#ef4444', bg: '#fee2e2', label: 'Overdue' },
      cancelled: { icon: XCircle, color: '#64748b', bg: '#f1f5f9', label: 'Cancelled' },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span
        className="status-badge"
        style={{ color: badge.color, background: badge.bg }}
      >
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  // Calculate days until/since due
  const getDaysInfo = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, color: '#ef4444' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: '#f59e0b' };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: '#f59e0b' };
    } else {
      return { text: `Due in ${diffDays} days`, color: '#64748b' };
    }
  };

  if (loading && !summary) {
    return (
      <div className="invoices-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoices-page">
      {/* Header */}
      <div className="invoices-header">
        <div>
          <h1>Invoices</h1>
          <p className="subtitle">Manage your B2B sales and payments</p>
        </div>
        <button onClick={() => navigate('/invoices/create')} className="create-btn">
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon" style={{ background: '#dbeafe' }}>
              <FileText size={24} style={{ color: '#3b82f6' }} />
            </div>
            <div className="summary-content">
              <p className="summary-label">Total Invoices</p>
              <p className="summary-value">{summary.totalInvoices}</p>
              <p className="summary-subtitle">
                {summary.paidInvoices} paid • {summary.unpaidInvoices} unpaid
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ background: '#d1fae5' }}>
              <CheckCircle size={24} style={{ color: '#10b981' }} />
            </div>
            <div className="summary-content">
              <p className="summary-label">Paid Amount</p>
              <p className="summary-value">{formatCurrency(summary.paidAmountKobo)}</p>
              <p className="summary-subtitle">From {summary.paidInvoices} invoices</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ background: '#fef3c7' }}>
              <DollarSign size={24} style={{ color: '#f59e0b' }} />
            </div>
            <div className="summary-content">
              <p className="summary-label">Pending Payment</p>
              <p className="summary-value">{formatCurrency(summary.unpaidAmountKobo)}</p>
              <p className="summary-subtitle">From {summary.unpaidInvoices} invoices</p>
            </div>
          </div>

          {summary.overdueAmountKobo > 0 && (
            <div className="summary-card">
              <div className="summary-icon" style={{ background: '#fee2e2' }}>
                <AlertCircle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div className="summary-content">
                <p className="summary-label">Overdue</p>
                <p className="summary-value">{formatCurrency(summary.overdueAmountKobo)}</p>
                <p className="summary-subtitle">From {summary.overdueInvoices} invoices</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="invoices-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by invoice #, customer name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={statusFilter === 'all' ? 'active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={statusFilter === 'draft' ? 'active' : ''}
            onClick={() => setStatusFilter('draft')}
          >
            Draft
          </button>
          <button
            className={statusFilter === 'sent' ? 'active' : ''}
            onClick={() => setStatusFilter('sent')}
          >
            Sent
          </button>
          <button
            className={statusFilter === 'partial' ? 'active' : ''}
            onClick={() => setStatusFilter('partial')}
          >
            Partial
          </button>
          <button
            className={statusFilter === 'overdue' ? 'active' : ''}
            onClick={() => setStatusFilter('overdue')}
          >
            Overdue
          </button>
          <button
            className={statusFilter === 'paid' ? 'active' : ''}
            onClick={() => setStatusFilter('paid')}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          {searchQuery || statusFilter !== 'all' ? (
            // Filtered empty state
            <>
              <FileText size={64} style={{ color: '#cbd5e1' }} />
              <h3>No invoices found</h3>
              <p>Try adjusting your filters</p>
            </>
          ) : (
            // True empty state - no invoices at all
            <>
              <div style={{
                background: '#dbeafe',
                borderRadius: '50%',
                padding: '24px',
                display: 'inline-flex',
                marginBottom: '16px'
              }}>
                <FileText size={48} style={{ color: '#3b82f6' }} />
              </div>
              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '24px',
                fontWeight: '600',
                color: '#111827'
              }}>
                Send Professional Invoices in 30 Seconds
              </h2>
              <p style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: '#6b7280',
                maxWidth: '500px'
              }}>
                Get paid 3x faster with tracked, professional invoices that your customers will love
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                maxWidth: '600px',
                margin: '0 auto 32px auto',
                textAlign: 'left'
              }}>
                <div style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                    Automatic Reminders
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Never chase payments manually again
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>👁️</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                    Track Views
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    See when customers open invoices
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>💳</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                    Online Payments
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Let customers pay instantly
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/invoices/create')}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <Plus size={20} />
                Create Your First Invoice
              </button>

              <p style={{
                margin: '24px 0 0 0',
                fontSize: '13px',
                color: '#9ca3af'
              }}>
                Free forever • No credit card required
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="invoices-table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const daysInfo = getDaysInfo(invoice.due_date);
                return (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    className="invoice-row"
                  >
                    <td className="invoice-number" data-label="Invoice #">
                      {invoice.invoice_number}
                    </td>
                    <td data-label="Customer">
                      <div className="customer-cell">
                        <p className="customer-name">{invoice.customer_name}</p>
                        {invoice.customer_email && (
                          <p className="customer-email">{invoice.customer_email}</p>
                        )}
                      </div>
                    </td>
                    <td data-label="Issue Date">
                      {new Date(invoice.issue_date).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td data-label="Due Date">
                      <div className="due-date-cell">
                        <p>
                          {new Date(invoice.due_date).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <p className="days-info" style={{ color: daysInfo.color }}>
                            {daysInfo.text}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="amount" data-label="Amount">
                      {formatCurrency(invoice.total_kobo)}
                    </td>
                    <td className="amount paid" data-label="Paid">
                      {formatCurrency(invoice.amount_paid_kobo)}
                    </td>
                    <td className="amount balance" data-label="Balance">
                      {formatCurrency(invoice.balance_due_kobo)}
                    </td>
                    <td data-label="Status">{getStatusBadge(invoice.status)}</td>
                    <td className="actions-cell">
                      {invoice.status === 'overdue' && (
                        <button
                          className="action-btn reminder-btn"
                          onClick={(e) => handleSendReminder(e, invoice.id)}
                          title="Send Payment Reminder"
                          style={{
                            background: '#fef3c7',
                            color: '#f59e0b',
                            marginRight: '8px'
                          }}
                        >
                          <Send size={16} />
                        </button>
                      )}
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/invoices/${invoice.id}`);
                        }}
                        title="View Invoice"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
