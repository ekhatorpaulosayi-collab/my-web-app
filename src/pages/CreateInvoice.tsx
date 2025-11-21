/**
 * Create Invoice Page
 * Professional invoice creation form with line items, customer details, and payment terms
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, Calculator } from 'lucide-react';
import {
  createInvoice,
  calculateInvoiceTotals,
  calculateDueDate,
  formatCurrency,
  Invoice,
  InvoiceItem,
  PaymentTerms,
} from '../services/invoiceService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/CreateInvoice.css';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('NET_15');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('Payment is due within the agreed terms. Late payments may incur additional charges.');
  const [discountKobo, setDiscountKobo] = useState(0);
  const [vatPercentage, setVatPercentage] = useState(7.5);

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      productName: '',
      description: '',
      quantity: 1,
      unitPriceKobo: 0,
      totalKobo: 0,
    },
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate due date when payment terms or issue date changes
  useEffect(() => {
    if (issueDate) {
      const calculated = calculateDueDate(new Date(issueDate), paymentTerms);
      setDueDate(calculated.toISOString().split('T')[0]);
    }
  }, [paymentTerms, issueDate]);

  // Add line item
  const addItem = () => {
    setItems([
      ...items,
      {
        productName: '',
        description: '',
        quantity: 1,
        unitPriceKobo: 0,
        totalKobo: 0,
      },
    ]);
  };

  // Remove line item
  const removeItem = (index: number) => {
    if (items.length === 1) return; // Keep at least one item
    setItems(items.filter((_, i) => i !== index));
  };

  // Update line item
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total
    if (field === 'quantity' || field === 'unitPriceKobo') {
      newItems[index].totalKobo =
        newItems[index].quantity * newItems[index].unitPriceKobo;
    }

    setItems(newItems);
  };

  // Calculate totals
  const totals = calculateInvoiceTotals(items, discountKobo, vatPercentage);

  // Validate form
  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      setError('Customer name is required');
      return false;
    }

    if (!customerEmail.trim() && !customerPhone.trim()) {
      setError('Customer email or phone is required');
      return false;
    }

    if (items.length === 0 || items.every((item) => !item.productName.trim())) {
      setError('At least one line item is required');
      return false;
    }

    if (items.some((item) => item.quantity <= 0 || item.unitPriceKobo <= 0)) {
      setError('All items must have valid quantity and price');
      return false;
    }

    return true;
  };

  // Save invoice
  const handleSave = async (status: 'draft' | 'sent') => {
    setError('');

    if (!validateForm()) return;

    if (!userId) {
      setError('You must be logged in to create invoices');
      return;
    }

    try {
      setLoading(true);

      const invoice: Invoice = {
        userId,
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        paymentTerms,
        subtotalKobo: totals.subtotalKobo,
        discountKobo,
        vatKobo: totals.vatKobo,
        vatPercentage,
        totalKobo: totals.totalKobo,
        notes: notes || undefined,
        termsConditions: termsConditions || undefined,
        status,
        items: items.filter((item) => item.productName.trim()),
      };

      const result = await createInvoice(userId, invoice);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      // Redirect to invoices list
      navigate('/invoices');
    } catch (err: any) {
      console.error('[CreateInvoice] Error:', err);
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-invoice-page">
      {/* Header */}
      <div className="create-invoice-header">
        <button onClick={() => navigate('/invoices')} className="back-btn">
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Create New Invoice</h1>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="create-invoice-container">
        {/* Customer Details */}
        <section className="invoice-section">
          <h2>Customer Information</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="customerName">
                Customer Name <span className="required">*</span>
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerEmail">Email</label>
              <input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerPhone">Phone</label>
              <input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="customerAddress">Address (Optional)</label>
              <textarea
                id="customerAddress"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Customer's business address"
                rows={2}
              />
            </div>
          </div>
        </section>

        {/* Invoice Details */}
        <section className="invoice-section">
          <h2>Invoice Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="issueDate">Issue Date</label>
              <input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="paymentTerms">Payment Terms</label>
              <select
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
              >
                <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                <option value="NET_7">Net 7 days</option>
                <option value="NET_15">Net 15 days</option>
                <option value="NET_30">Net 30 days</option>
                <option value="NET_60">Net 60 days</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="invoice-section">
          <div className="section-header">
            <h2>Items</h2>
            <button onClick={addItem} className="add-item-btn" type="button">
              <Plus size={18} />
              Add Item
            </button>
          </div>

          <div className="items-table">
            <div className="items-header">
              <div className="item-col-name">Item</div>
              <div className="item-col-qty">Qty</div>
              <div className="item-col-price">Price (₦)</div>
              <div className="item-col-total">Total (₦)</div>
              <div className="item-col-actions"></div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-col-name">
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) =>
                      updateItem(index, 'productName', e.target.value)
                    }
                    placeholder="Item name"
                    required
                  />
                  <input
                    type="text"
                    value={item.description || ''}
                    onChange={(e) =>
                      updateItem(index, 'description', e.target.value)
                    }
                    placeholder="Description (optional)"
                    className="item-description"
                  />
                </div>

                <div className="item-col-qty">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', parseInt(e.target.value) || 0)
                    }
                    required
                  />
                </div>

                <div className="item-col-price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPriceKobo / 100}
                    onChange={(e) =>
                      updateItem(
                        index,
                        'unitPriceKobo',
                        Math.round(parseFloat(e.target.value || '0') * 100)
                      )
                    }
                    required
                  />
                </div>

                <div className="item-col-total">
                  {formatCurrency(item.totalKobo)}
                </div>

                <div className="item-col-actions">
                  <button
                    onClick={() => removeItem(index)}
                    className="remove-item-btn"
                    type="button"
                    disabled={items.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Totals & Adjustments */}
        <section className="invoice-section">
          <div className="totals-grid">
            <div className="adjustments-col">
              <h3>Adjustments</h3>

              <div className="form-group">
                <label htmlFor="discount">Discount (₦)</label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountKobo / 100}
                  onChange={(e) =>
                    setDiscountKobo(
                      Math.round(parseFloat(e.target.value || '0') * 100)
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="vat">VAT (%)</label>
                <input
                  id="vat"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={vatPercentage}
                  onChange={(e) =>
                    setVatPercentage(parseFloat(e.target.value || '0'))
                  }
                />
              </div>
            </div>

            <div className="totals-col">
              <div className="total-line">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotalKobo)}</span>
              </div>

              {discountKobo > 0 && (
                <div className="total-line discount">
                  <span>Discount:</span>
                  <span>-{formatCurrency(discountKobo)}</span>
                </div>
              )}

              {totals.vatKobo > 0 && (
                <div className="total-line">
                  <span>VAT ({vatPercentage}%):</span>
                  <span>{formatCurrency(totals.vatKobo)}</span>
                </div>
              )}

              <div className="total-line grand-total">
                <span>Total:</span>
                <span>{formatCurrency(totals.totalKobo)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notes & Terms */}
        <section className="invoice-section">
          <h2>Additional Information</h2>

          <div className="form-group">
            <label htmlFor="notes">Internal Notes (Optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes for your reference"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="terms">Terms & Conditions</label>
            <textarea
              id="terms"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Payment terms, refund policy, etc."
              rows={4}
            />
          </div>
        </section>

        {/* Action Buttons */}
        <div className="invoice-actions">
          <button
            onClick={() => handleSave('draft')}
            className="btn-secondary"
            disabled={loading}
          >
            <Save size={18} />
            Save as Draft
          </button>

          <button
            onClick={() => handleSave('sent')}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Creating...
              </>
            ) : (
              <>
                <Send size={18} />
                Create & Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
