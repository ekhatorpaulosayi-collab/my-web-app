import React from 'react';
import { formatNGN } from '../utils/currency';
import { openWhatsApp } from '../utils/whatsapp';
import './ReceiptOptionsModal.css';

interface ReceiptData {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  isCredit: boolean;
  dueDate?: string;
  customerName?: string;
  customerPhone?: string;
  businessName: string;
  timestamp: Date;
}

interface ReceiptOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export function ReceiptOptionsModal({ isOpen, onClose, receiptData }: ReceiptOptionsModalProps) {
  if (!isOpen) return null;

  const generateReceiptText = () => {
    const { items, total, paymentMethod, isCredit, dueDate, customerName, businessName, timestamp } = receiptData;

    const formattedDate = timestamp.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsSection = items.map((item, index) => {
      const itemNum = items.length > 1 ? `${index + 1}. ` : '• ';
      const itemTotal = item.price * item.quantity;
      return `${itemNum}${item.name}\n   ${item.quantity} × ${formatNGN(item.price)} = ${formatNGN(itemTotal)}`;
    }).join('\n\n');

    const customerSection = customerName ? `👤 ${customerName}\n` : '';

    return `
━━━━━━━━━━━━━━━━━━━
🧾 SALES RECEIPT
━━━━━━━━━━━━━━━━━━━

📍 ${businessName}
${customerSection}
📦 ITEMS
${itemsSection}

━━━━━━━━━━━━━━━━━━━
💰 TOTAL: ${formatNGN(total)}
${isCredit ? '💳 Payment: CREDIT' + (dueDate ? ` (Due ${new Date(dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })})` : '') : '✅ Payment: ' + paymentMethod}
━━━━━━━━━━━━━━━━━━━

📅 ${formattedDate}

Thank you for your business!

━━━━━━━━━━━━━━━━━━━
Powered by Storehouse
    `.trim();
  };

  const handleWhatsAppShare = async () => {
    const receiptText = generateReceiptText();
    const phone = receiptData.customerPhone;

    if (phone) {
      // Open WhatsApp with pre-filled message to customer
      await openWhatsApp(phone, receiptText);
    } else {
      // Open WhatsApp without phone number (user can choose recipient)
      const url = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
      window.open(url, '_blank');
    }
  };

  const handleCopyReceipt = async () => {
    const receiptText = generateReceiptText();
    try {
      await navigator.clipboard.writeText(receiptText);
      alert('Receipt copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = receiptText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Receipt copied to clipboard!');
    }
  };

  const handleEmailReceipt = () => {
    const receiptText = generateReceiptText();
    const subject = `Receipt from ${receiptData.businessName}`;
    const body = encodeURIComponent(receiptText);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const handleDownloadReceipt = () => {
    const receiptText = generateReceiptText();
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintReceipt = () => {
    const receiptText = generateReceiptText();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body {
                font-family: monospace;
                padding: 20px;
                white-space: pre-wrap;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>${receiptText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={e => e.stopPropagation()}>
        <div className="receipt-modal-header">
          <h2>Share Receipt</h2>
          <button className="receipt-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="receipt-modal-body">
          <p className="receipt-modal-subtitle">
            How would you like to deliver this receipt?
          </p>

          <div className="receipt-options">
            <button className="receipt-option whatsapp" onClick={handleWhatsAppShare}>
              <span className="receipt-option-icon">📱</span>
              <div className="receipt-option-content">
                <div className="receipt-option-title">Share via WhatsApp</div>
                <div className="receipt-option-desc">
                  {receiptData.customerPhone
                    ? `Send to ...${receiptData.customerPhone.slice(-4)}`
                    : 'Choose contact to share with'
                  }
                </div>
              </div>
            </button>

            <button className="receipt-option email" onClick={handleEmailReceipt}>
              <span className="receipt-option-icon">📧</span>
              <div className="receipt-option-content">
                <div className="receipt-option-title">Email Receipt</div>
                <div className="receipt-option-desc">Send via your email app</div>
              </div>
            </button>

            <button className="receipt-option copy" onClick={handleCopyReceipt}>
              <span className="receipt-option-icon">📋</span>
              <div className="receipt-option-content">
                <div className="receipt-option-title">Copy to Clipboard</div>
                <div className="receipt-option-desc">Paste anywhere you like</div>
              </div>
            </button>

            <button className="receipt-option download" onClick={handleDownloadReceipt}>
              <span className="receipt-option-icon">💾</span>
              <div className="receipt-option-content">
                <div className="receipt-option-title">Download Receipt</div>
                <div className="receipt-option-desc">Save as text file</div>
              </div>
            </button>

            <button className="receipt-option print" onClick={handlePrintReceipt}>
              <span className="receipt-option-icon">🖨️</span>
              <div className="receipt-option-content">
                <div className="receipt-option-title">Print Receipt</div>
                <div className="receipt-option-desc">Print a hard copy</div>
              </div>
            </button>
          </div>
        </div>

        <div className="receipt-modal-footer">
          <button className="receipt-modal-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
