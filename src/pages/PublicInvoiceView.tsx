/**
 * Public Invoice View
 * Customer-facing invoice view (no login required)
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../services/invoiceService';
import '../styles/PublicInvoiceView.css';

export default function PublicInvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');

      // Get invoice (public access - no RLS check)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;

      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('line_order', { ascending: true });

      if (itemsError) throw itemsError;

      // Track view (update viewed_at if first time viewing)
      if (invoice.status === 'sent' && !invoice.viewed_at) {
        await supabase
          .from('invoices')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          })
          .eq('id', id);
      }

      setInvoice({
        ...invoice,
        items: items || [],
      });
    } catch (err: any) {
      console.error('[PublicInvoiceView] Error:', err);
      setError(err.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusInfo = (status: string) => {
    const statuses: any = {
      draft: { icon: Clock, color: '#94a3b8', bg: '#f1f5f9', label: 'Draft' },
      sent: { icon: Mail, color: '#3b82f6', bg: '#dbeafe', label: 'Sent' },
      viewed: { icon: CheckCircle, color: '#8b5cf6', bg: '#ede9fe', label: 'Viewed' },
      partial: { icon: Clock, color: '#f59e0b', bg: '#fef3c7', label: 'Partial Payment' },
      paid: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Paid in Full' },
      overdue: { icon: AlertCircle, color: '#ef4444', bg: '#fee2e2', label: 'Overdue' },
      cancelled: { icon: AlertCircle, color: '#64748b', bg: '#f1f5f9', label: 'Cancelled' },
    };

    return statuses[status] || statuses.draft;
  };

  if (loading) {
    return (
      <div className="public-invoice-page">
        <div className="public-invoice-container">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="public-invoice-page">
        <div className="public-invoice-container">
          <div className="error-state">
            <AlertCircle size={64} style={{ color: '#ef4444' }} />
            <h2>Invoice Not Found</h2>
            <p>{error || 'This invoice does not exist or has been deleted.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="public-invoice-page">
      <div className="public-invoice-container">
        {/* Header */}
        <div className="invoice-header">
          <div className="header-left">
            <div className="business-name">Storehouse</div>
            <div className="invoice-label">INVOICE</div>
            <div className="invoice-number">{invoice.invoice_number}</div>
          </div>
          <div className="header-right">
            <div
              className="status-badge"
              style={{ color: statusInfo.color, background: statusInfo.bg }}
            >
              <StatusIcon size={18} />
              {statusInfo.label}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="invoice-dates-section">
          <div className="date-box">
            <Calendar size={18} />
            <div>
              <div className="date-label">Issue Date</div>
              <div className="date-value">
                {new Date(invoice.issue_date).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
          <div className="date-box">
            <Calendar size={18} />
            <div>
              <div className="date-label">Due Date</div>
              <div className="date-value">
                {new Date(invoice.due_date).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="billing-section">
          <div className="section-title">Bill To</div>
          <div className="customer-info">
            <div className="customer-name">{invoice.customer_name}</div>
            {invoice.customer_email && (
              <div className="customer-detail">
                <Mail size={16} />
                {invoice.customer_email}
              </div>
            )}
            {invoice.customer_phone && (
              <div className="customer-detail">
                <Phone size={16} />
                {invoice.customer_phone}
              </div>
            )}
            {invoice.customer_address && (
              <div className="customer-detail">
                <MapPin size={16} />
                {invoice.customer_address}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="items-section">
          <table className="public-items-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <div className="item-name">{item.product_name}</div>
                    {item.description && (
                      <div className="item-desc">{item.description}</div>
                    )}
                  </td>
                  <td className="qty">{item.quantity}</td>
                  <td className="price">{formatCurrency(item.unit_price_kobo)}</td>
                  <td className="amount">{formatCurrency(item.total_kobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="totals-section">
          <div className="totals-row">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal_kobo)}</span>
          </div>
          {invoice.discount_kobo > 0 && (
            <div className="totals-row discount">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount_kobo)}</span>
            </div>
          )}
          {invoice.vat_kobo > 0 && (
            <div className="totals-row">
              <span>VAT ({invoice.vat_percentage}%)</span>
              <span>{formatCurrency(invoice.vat_kobo)}</span>
            </div>
          )}
          <div className="totals-row total">
            <span>Total Amount</span>
            <span>{formatCurrency(invoice.total_kobo)}</span>
          </div>
          {invoice.amount_paid_kobo > 0 && (
            <>
              <div className="totals-row paid">
                <span>Amount Paid</span>
                <span>{formatCurrency(invoice.amount_paid_kobo)}</span>
              </div>
              <div className="totals-row balance">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balance_due_kobo)}</span>
              </div>
            </>
          )}
        </div>

        {/* Payment Button */}
        {invoice.payment_link && invoice.status !== 'paid' && (
          <div className="payment-section">
            <a
              href={invoice.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="pay-now-btn"
            >
              <CreditCard size={20} />
              Pay Now with Paystack
              <ExternalLink size={16} />
            </a>
            <p className="payment-hint">
              Secure payment powered by Paystack
            </p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms_conditions && (
          <div className="terms-section">
            <div className="section-title">Terms & Conditions</div>
            <p className="terms-text">{invoice.terms_conditions}</p>
          </div>
        )}

        {/* Footer */}
        <div className="invoice-footer">
          <p>Thank you for your business!</p>
          <p className="footer-note">
            If you have any questions about this invoice, please contact us.
          </p>
        </div>
      </div>

      {/* Powered By */}
      <div className="powered-by">
        <p>⚡ Powered by Storehouse</p>
      </div>
    </div>
  );
}
