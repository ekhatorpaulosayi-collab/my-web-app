/**
 * Invoice Detail Page
 * View full invoice, share, record payments, and manage
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Mail,
  MessageSquare,
  Copy,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
} from 'lucide-react';
import {
  getInvoice,
  deleteInvoice,
  sendInvoice,
  recordPayment,
  generatePaystackLink,
  formatCurrency,
  generateInvoiceWhatsAppMessage,
  InvoiceStatus,
} from '../services/invoiceService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/InvoiceDetail.css';

export default function InvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  // State
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load invoice
  useEffect(() => {
    if (id && userId) {
      loadInvoice();
    }
  }, [id, userId]);

  const loadInvoice = async () => {
    if (!id || !userId) return;

    try {
      setLoading(true);
      setError('');

      const result = await getInvoice(id, userId);
      if (!result.success) {
        throw new Error(result.error);
      }

      setInvoice(result.invoice);
    } catch (err: any) {
      console.error('[InvoiceDetail] Error loading invoice:', err);
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!invoice) return;

    const message = generateInvoiceWhatsAppMessage(invoice);
    const whatsappUrl = `https://wa.me/${invoice.customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Share via Email
  const handleShareEmail = () => {
    if (!invoice) return;

    const subject = `Invoice ${invoice.invoice_number} from ${currentUser?.displayName || 'Storehouse'}`;
    const body = `Dear ${invoice.customer_name},\n\nPlease find your invoice details below:\n\nInvoice #: ${invoice.invoice_number}\nAmount: ${formatCurrency(invoice.total_kobo)}\nDue Date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nView invoice: ${window.location.origin}/invoice/${invoice.id}\n\nThank you for your business!`;

    const mailtoUrl = `mailto:${invoice.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // Share via SMS
  const handleShareSMS = () => {
    if (!invoice) return;

    const message = `Invoice ${invoice.invoice_number}: ${formatCurrency(invoice.total_kobo)} due ${new Date(invoice.due_date).toLocaleDateString()}. View: ${window.location.origin}/invoice/${invoice.id}`;
    const smsUrl = `sms:${invoice.customer_phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  // Copy link
  const handleCopyLink = async () => {
    const link = `${window.location.origin}/invoice/${invoice?.id}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Invoice link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Mark as sent
  const handleMarkAsSent = async () => {
    if (!invoice || !userId) return;

    try {
      const result = await sendInvoice(invoice.id, userId);
      if (result.success) {
        loadInvoice(); // Reload to show updated status
      }
    } catch (err) {
      console.error('Failed to mark as sent:', err);
    }
  };

  // Record payment
  const handleRecordPayment = async () => {
    if (!invoice || !userId || !paymentAmount) return;

    try {
      setProcessingPayment(true);

      const amountKobo = Math.round(parseFloat(paymentAmount) * 100);

      const result = await recordPayment(invoice.id, userId, {
        amountKobo,
        paymentMethod: paymentMethod as any,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Reset form and reload invoice
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentReference('');
      setPaymentNotes('');
      loadInvoice();
    } catch (err: any) {
      console.error('[InvoiceDetail] Error recording payment:', err);
      alert(err.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Delete invoice
  const handleDelete = async () => {
    if (!invoice || !userId) return;

    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
      return;
    }

    try {
      const result = await deleteInvoice(invoice.id, userId);
      if (result.success) {
        navigate('/invoices');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice');
    }
  };

  // Get status badge
  const getStatusBadge = (status: InvoiceStatus) => {
    const badges = {
      draft: { icon: Edit, color: '#94a3b8', bg: '#f1f5f9', label: 'Draft' },
      sent: { icon: Send, color: '#3b82f6', bg: '#dbeafe', label: 'Sent' },
      viewed: { icon: CheckCircle, color: '#8b5cf6', bg: '#ede9fe', label: 'Viewed' },
      partial: { icon: Clock, color: '#f59e0b', bg: '#fef3c7', label: 'Partial Payment' },
      paid: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Paid' },
      overdue: { icon: AlertCircle, color: '#ef4444', bg: '#fee2e2', label: 'Overdue' },
      cancelled: { icon: Trash2, color: '#64748b', bg: '#f1f5f9', label: 'Cancelled' },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span
        className="status-badge-large"
        style={{ color: badge.color, background: badge.bg }}
      >
        <Icon size={18} />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="invoice-detail-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="invoice-detail-page">
        <div className="error-container">
          <AlertCircle size={48} style={{ color: '#ef4444' }} />
          <h3>Failed to load invoice</h3>
          <p>{error || 'Invoice not found'}</p>
          <button onClick={() => navigate('/invoices')} className="btn-secondary">
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-detail-page">
      {/* Header */}
      <div className="invoice-detail-header">
        <button onClick={() => navigate('/invoices')} className="back-btn">
          <ArrowLeft size={20} />
          Back to Invoices
        </button>

        <div className="header-actions">
          <button onClick={() => navigate(`/invoices/${invoice.id}/edit`)} className="btn-secondary">
            <Edit size={18} />
            Edit
          </button>
          <button onClick={handleDelete} className="btn-danger">
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      {/* Invoice Container */}
      <div className="invoice-container">
        {/* Invoice Header */}
        <div className="invoice-header-section">
          <div>
            <h1 className="invoice-number">Invoice {invoice.invoice_number}</h1>
            {getStatusBadge(invoice.status)}
          </div>
          <div className="invoice-dates">
            <div className="date-item">
              <Calendar size={16} />
              <div>
                <span className="date-label">Issue Date</span>
                <span className="date-value">
                  {new Date(invoice.issue_date).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <div className="date-item">
              <Calendar size={16} />
              <div>
                <span className="date-label">Due Date</span>
                <span className="date-value">
                  {new Date(invoice.due_date).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="invoice-section">
          <h3>Bill To</h3>
          <div className="customer-details">
            <p className="customer-name">{invoice.customer_name}</p>
            {invoice.customer_email && (
              <p className="customer-contact">
                <Mail size={16} />
                {invoice.customer_email}
              </p>
            )}
            {invoice.customer_phone && (
              <p className="customer-contact">
                <Phone size={16} />
                {invoice.customer_phone}
              </p>
            )}
            {invoice.customer_address && (
              <p className="customer-contact">
                <MapPin size={16} />
                {invoice.customer_address}
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="invoice-section">
          <h3>Items</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <div>
                      <div className="item-name">{item.product_name}</div>
                      {item.description && (
                        <div className="item-description">{item.description}</div>
                      )}
                    </div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unit_price_kobo)}</td>
                  <td className="item-total">{formatCurrency(item.total_kobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="total-line">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal_kobo)}</span>
          </div>
          {invoice.discount_kobo > 0 && (
            <div className="total-line discount">
              <span>Discount:</span>
              <span>-{formatCurrency(invoice.discount_kobo)}</span>
            </div>
          )}
          {invoice.vat_kobo > 0 && (
            <div className="total-line">
              <span>VAT ({invoice.vat_percentage}%):</span>
              <span>{formatCurrency(invoice.vat_kobo)}</span>
            </div>
          )}
          <div className="total-line grand-total">
            <span>Total:</span>
            <span>{formatCurrency(invoice.total_kobo)}</span>
          </div>
          <div className="total-line">
            <span>Amount Paid:</span>
            <span className="paid">{formatCurrency(invoice.amount_paid_kobo)}</span>
          </div>
          <div className="total-line balance">
            <span>Balance Due:</span>
            <span>{formatCurrency(invoice.balance_due_kobo)}</span>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="invoice-section">
            <h3>Payment History</h3>
            <div className="payment-history">
              {invoice.payments.map((payment: any) => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-info">
                    <CreditCard size={18} />
                    <div>
                      <div className="payment-method">{payment.payment_method}</div>
                      <div className="payment-date">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="payment-amount">{formatCurrency(payment.amount_kobo)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="invoice-section">
            <h3>Notes</h3>
            <p className="invoice-notes">{invoice.notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms_conditions && (
          <div className="invoice-section">
            <h3>Terms & Conditions</h3>
            <p className="invoice-terms">{invoice.terms_conditions}</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="invoice-actions-bar">
        <div className="action-group">
          <h4>Share Invoice</h4>
          <div className="share-buttons">
            {invoice.customer_phone && (
              <button onClick={handleShareWhatsApp} className="share-btn whatsapp">
                <MessageSquare size={18} />
                WhatsApp
              </button>
            )}
            {invoice.customer_email && (
              <button onClick={handleShareEmail} className="share-btn email">
                <Mail size={18} />
                Email
              </button>
            )}
            {invoice.customer_phone && (
              <button onClick={handleShareSMS} className="share-btn sms">
                <Phone size={18} />
                SMS
              </button>
            )}
            <button onClick={handleCopyLink} className="share-btn copy">
              <Copy size={18} />
              Copy Link
            </button>
          </div>
        </div>

        <div className="action-group">
          <h4>Actions</h4>
          <div className="action-buttons">
            {invoice.status === 'draft' && (
              <button onClick={handleMarkAsSent} className="btn-primary">
                <Send size={18} />
                Mark as Sent
              </button>
            )}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <button onClick={() => setShowPaymentModal(true)} className="btn-success">
                <DollarSign size={18} />
                Record Payment
              </button>
            )}
            <button className="btn-secondary">
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Amount (₦)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={invoice.balance_due_kobo / 100}
                />
                <span className="form-hint">
                  Balance due: {formatCurrency(invoice.balance_due_kobo)}
                </span>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="paystack">Paystack</option>
                  <option value="pos">POS</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction reference"
                />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="btn-success"
                disabled={!paymentAmount || processingPayment}
              >
                {processingPayment ? (
                  <>
                    <span className="spinner-small"></span>
                    Recording...
                  </>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
