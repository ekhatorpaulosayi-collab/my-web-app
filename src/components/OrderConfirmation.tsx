/**
 * Order Confirmation Component
 * Displays receipt after successful online store purchase
 */

import React, { useRef } from 'react';
import { Check, Download, Share2, ShoppingBag, X } from 'lucide-react';
import { currencyNGN } from '../utils/format';
import type { StoreProfile } from '../types';
import '../styles/order-confirmation.css';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface OrderConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreProfile;
  orderData: {
    reference: string;
    items: OrderItem[];
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    subtotal: number;
    discount: number;
    finalTotal: number;
    paymentMethod: string;
    promoCode?: string;
    timestamp: Date;
  };
}

export function OrderConfirmation({ isOpen, onClose, store, orderData }: OrderConfirmationProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const handleDownloadReceipt = () => {
    if (!receiptRef.current) return;

    // Create a simple text receipt
    const receiptText = generateReceiptText();
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${orderData.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareReceipt = () => {
    const receiptText = generateReceiptText();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateReceiptText = () => {
    const lines: string[] = [];

    lines.push('═══════════════════════════');
    lines.push(`${store.businessName}`);
    lines.push('ORDER RECEIPT');
    lines.push('═══════════════════════════');
    lines.push('');
    lines.push(`Order #: ${orderData.reference.slice(0, 12)}`);
    lines.push(`Date: ${formatDate(orderData.timestamp)}`);
    lines.push('');
    lines.push('CUSTOMER DETAILS');
    lines.push(`Name: ${orderData.customerName}`);
    lines.push(`Phone: ${orderData.customerPhone}`);
    if (orderData.customerAddress) {
      lines.push(`Address: ${orderData.customerAddress}`);
    }
    lines.push('');
    lines.push('ORDER ITEMS');
    lines.push('───────────────────────────');
    orderData.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      lines.push(`${item.name}${item.variant ? ` (${item.variant})` : ''}`);
      lines.push(`  ${item.quantity} × ${currencyNGN(item.price)} = ${currencyNGN(itemTotal)}`);
    });
    lines.push('───────────────────────────');
    lines.push('');
    lines.push(`Subtotal: ${currencyNGN(orderData.subtotal)}`);
    if (orderData.discount > 0) {
      lines.push(`Discount${orderData.promoCode ? ` (${orderData.promoCode})` : ''}: -${currencyNGN(orderData.discount)}`);
    }
    lines.push(`TOTAL PAID: ${currencyNGN(orderData.finalTotal)}`);
    lines.push('');
    lines.push(`Payment: ${orderData.paymentMethod.toUpperCase()}`);
    lines.push('Status: CONFIRMED');
    lines.push('');
    lines.push('Thank you for your order!');
    lines.push('');
    lines.push('───────────────────────────');
    lines.push('Powered by Storehouse');
    lines.push('https://storehouse.ng');

    return lines.join('\n');
  };

  return (
    <>
      {/* Overlay */}
      <div className="order-confirmation-overlay" onClick={onClose} />

      {/* Confirmation Modal */}
      <div className="order-confirmation-modal">
        {/* Success Icon */}
        <div className="confirmation-success-icon">
          <Check size={48} strokeWidth={3} />
        </div>

        {/* Header */}
        <h2 className="confirmation-title">Order Confirmed!</h2>
        <p className="confirmation-subtitle">
          Your order has been received and is being processed
        </p>

        {/* Receipt */}
        <div className="order-receipt" ref={receiptRef}>
          {/* Store Info */}
          <div className="receipt-header">
            <h3>{store.businessName}</h3>
            {store.phone && <p>📞 {store.phone}</p>}
            {store.address && <p>📍 {store.address}</p>}
          </div>

          {/* Order Info */}
          <div className="receipt-section">
            <div className="receipt-meta">
              <span>Order #: <strong>{orderData.reference.slice(0, 12)}</strong></span>
              <span>{formatDate(orderData.timestamp)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="receipt-section">
            <h4>Customer Details</h4>
            <p>👤 {orderData.customerName}</p>
            <p>📱 {orderData.customerPhone}</p>
            {orderData.customerAddress && <p>📍 {orderData.customerAddress}</p>}
          </div>

          {/* Items */}
          <div className="receipt-section">
            <h4>Order Items</h4>
            <div className="receipt-items">
              {orderData.items.map((item, index) => (
                <div key={index} className="receipt-item">
                  <div className="item-details">
                    <span className="item-name">
                      {item.name}
                      {item.variant && <span className="item-variant">({item.variant})</span>}
                    </span>
                    <span className="item-qty">× {item.quantity}</span>
                  </div>
                  <span className="item-price">{currencyNGN(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="receipt-section receipt-totals">
            <div className="total-line">
              <span>Subtotal</span>
              <span>{currencyNGN(orderData.subtotal)}</span>
            </div>
            {orderData.discount > 0 && (
              <div className="total-line discount-line">
                <span>
                  Discount {orderData.promoCode && `(${orderData.promoCode})`}
                </span>
                <span>-{currencyNGN(orderData.discount)}</span>
              </div>
            )}
            <div className="total-line grand-total">
              <span>TOTAL PAID</span>
              <span>{currencyNGN(orderData.finalTotal)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="receipt-section payment-info">
            <p>
              <strong>Payment Method:</strong> {orderData.paymentMethod.toUpperCase()}
            </p>
            <p className="payment-status">
              <span className="status-badge">✓ CONFIRMED</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="confirmation-actions">
          <button onClick={handleDownloadReceipt} className="action-btn secondary">
            <Download size={18} />
            Download
          </button>
          <button onClick={handleShareReceipt} className="action-btn secondary">
            <Share2 size={18} />
            Share
          </button>
          <button onClick={onClose} className="action-btn primary">
            <ShoppingBag size={18} />
            Continue Shopping
          </button>
        </div>

        {/* Close Button */}
        <button className="confirmation-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Footer Note */}
        <p className="confirmation-footer">
          Questions about your order? Contact <strong>{store.businessName}</strong> directly
        </p>
      </div>
    </>
  );
}
