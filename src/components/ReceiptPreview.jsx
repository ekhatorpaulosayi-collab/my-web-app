import React, { useState, useEffect, useCallback } from 'react';
import '../styles/receipt.css';
import { formatNaira } from '../utils/money.ts';
import { downloadPDFReceipt, downloadReceiptImage } from '../utils/receiptGenerator.ts';

// Helper: Format currency in NGN (kobo to naira)
const formatNGN = (kobo) => {
  return formatNaira((kobo || 0) / 100);
};

// Helper: Short ID for receipt number
const shortId = (id) => {
  return id ? id.slice(0, 6).toUpperCase() : 'XXXXXX';
};

// Helper: Format date and time
const dateTimeFormat = (isoString) => {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Helper: Build plain text receipt for WhatsApp/Copy
const buildReceiptText = (sale, business, customNote) => {
  const lines = [];

  // Header
  lines.push(business.name || 'Storehouse Shop');
  if (business.phone) lines.push(`📞 ${business.phone}`);
  if (business.address) lines.push(`📍 ${business.address}`);
  lines.push('');

  // Meta
  lines.push(`Receipt • ${dateTimeFormat(sale.createdAt)} • #${shortId(sale.id)}`);
  lines.push('================================');
  lines.push('');

  // Customer
  const customerName = sale.customerName || 'Walk-in';
  const customerPhone = sale.phone ? ` • ${sale.phone}` : '';
  lines.push(`Customer: ${customerName}${customerPhone}`);
  lines.push('');

  // Items - handle single item format from current schema
  const items = sale.items || [{
    name: sale.itemName,
    qty: sale.qty,
    unitKobo: sale.sellKobo
  }];

  items.forEach(item => {
    const lineTotal = (item.qty || 0) * (item.unitKobo || 0);
    lines.push(`${item.name}`);
    lines.push(`  ${item.qty} × ${formatNGN(item.unitKobo)} = ${formatNGN(lineTotal)}`);
  });
  lines.push('');

  // Totals
  const subtotal = (sale.sellKobo || 0) * (sale.qty || 0);
  lines.push(`Subtotal: ${formatNGN(subtotal)}`);

  if (sale.discountKobo && sale.discountKobo > 0) {
    lines.push(`Discount: ${formatNGN(sale.discountKobo)}`);
  }

  if (sale.vatKobo && sale.vatKobo > 0) {
    lines.push(`VAT: ${formatNGN(sale.vatKobo)}`);
  }

  const total = subtotal - (sale.discountKobo || 0) + (sale.vatKobo || 0);
  lines.push(`TOTAL: ${formatNGN(total)}`);
  lines.push('');

  // Payment
  const paymentMethod = (sale.paymentMethod || 'cash').toUpperCase();
  lines.push(`Payment: ${paymentMethod}`);

  // Credit info
  if (sale.paymentMethod === 'credit' && sale.credit) {
    if (sale.credit.balanceKobo) {
      lines.push(`Balance Due: ${formatNGN(sale.credit.balanceKobo)}`);
    }
    if (sale.dueDate) {
      const dueDate = new Date(sale.dueDate).toLocaleDateString('en-GB');
      lines.push(`Due: ${dueDate}`);
    }
  }
  lines.push('');

  // Custom note
  if (customNote && customNote.trim()) {
    lines.push(`Note: ${customNote.trim()}`);
    lines.push('');
  }

  // Footer
  lines.push('Thank you for your patronage!');
  lines.push('— Sent from Storehouse');

  return lines.join('\n');
};

const ReceiptPreview = ({ sale, business = {} }) => {
  const noteKey = `sh:receiptNote:${sale.id}`;
  const [customNote, setCustomNote] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  // Load note from localStorage on mount
  useEffect(() => {
    const savedNote = localStorage.getItem(noteKey) || '';
    setCustomNote(savedNote);
    setCharCount(savedNote.length);
  }, [noteKey]);

  // Save note to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customNote !== null) {
        localStorage.setItem(noteKey, customNote.slice(0, 120));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customNote, noteKey]);

  const handleNoteChange = (e) => {
    const value = e.target.value.slice(0, 120);
    setCustomNote(value);
    setCharCount(value.length);
  };

  const receiptText = buildReceiptText(sale, business, customNote);

  const handleShareWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [receiptText]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy receipt text');
    }
  }, [receiptText]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    try {
      const receiptData = {
        businessName: business.name || 'Storehouse Shop',
        businessPhone: business.phone,
        businessAddress: business.address,
        date: dateTimeFormat(sale.createdAt),
        receiptNumber: shortId(sale.id),
        items: items.map(item => ({
          name: item.name,
          quantity: item.qty || 0,
          price: (item.unitKobo || 0) / 100,
          total: ((item.qty || 0) * (item.unitKobo || 0)) / 100
        })),
        subtotal: subtotal / 100,
        discount: (sale.discountKobo || 0) / 100,
        total: (subtotal - (sale.discountKobo || 0) + (sale.vatKobo || 0)) / 100,
        paymentMethod: sale.paymentMethod || 'cash',
        customerName: sale.customerName,
        customerPhone: sale.phone,
        staffName: sale.recorded_by_staff_name
      };

      await downloadPDFReceipt(receiptData, `receipt-${shortId(sale.id)}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF receipt');
    }
  }, [sale, business, items, subtotal]);

  const handleDownloadImage = useCallback(async () => {
    try {
      // Use the receipt card element
      await downloadReceiptImage('receipt-card-' + sale.id, `receipt-${shortId(sale.id)}.png`);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image receipt');
    }
  }, [sale.id]);

  // Calculate totals
  const items = sale.items || [{
    name: sale.itemName,
    qty: sale.qty,
    unitKobo: sale.sellKobo
  }];

  const subtotal = (sale.sellKobo || 0) * (sale.qty || 0);
  const discount = sale.discountKobo || 0;
  const vat = sale.vatKobo || 0;
  const total = subtotal - discount + vat;

  return (
    <div id={'receipt-card-' + sale.id} className="receiptCard receiptPrintable">
      {/* Header */}
      <div className="receiptHeader">
        <div className="receiptBusinessName">
          {business.name || 'Storehouse Shop'}
        </div>
        {(business.phone || business.address) && (
          <div className="receiptBusinessInfo">
            {business.phone && <div>📞 {business.phone}</div>}
            {business.address && <div>📍 {business.address}</div>}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="receiptMeta">
        <span>Receipt</span>
        <span>{dateTimeFormat(sale.createdAt)}</span>
        <span className="receiptId">#{shortId(sale.id)}</span>
      </div>

      {/* Customer */}
      <div className="receiptCustomer">
        <strong>Customer:</strong> {sale.customerName || 'Walk-in'}
        {sale.phone && <span> • {sale.phone}</span>}
      </div>

      {/* Items Table */}
      <table className="rTable">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty × Unit</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const lineTotal = (item.qty || 0) * (item.unitKobo || 0);
            return (
              <tr key={idx}>
                <td className="itemName" title={item.name}>{item.name}</td>
                <td className="num">{item.qty} × {formatNGN(item.unitKobo)}</td>
                <td className="num">{formatNGN(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="receiptTotals">
        <div className="receiptTotalRow subtotal">
          <span className="label">Subtotal:</span>
          <span className="value">{formatNGN(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="receiptTotalRow">
            <span className="label">Discount:</span>
            <span className="value">-{formatNGN(discount)}</span>
          </div>
        )}

        {vat > 0 && (
          <div className="receiptTotalRow">
            <span className="label">VAT:</span>
            <span className="value">{formatNGN(vat)}</span>
          </div>
        )}

        <div className="receiptTotalRow total">
          <span className="label">TOTAL:</span>
          <span className="value">{formatNGN(total)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="receiptPayment">
        <div>
          <strong>Payment:</strong>
          <span className={`paymentBadge ${sale.paymentMethod || 'cash'}`}>
            {sale.paymentMethod || 'cash'}
          </span>
        </div>

        {sale.paymentMethod === 'credit' && (sale.credit || sale.dueDate) && (
          <div className="creditInfo">
            {sale.credit?.balanceKobo && (
              <div><strong>Balance Due:</strong> {formatNGN(sale.credit.balanceKobo)}</div>
            )}
            {sale.dueDate && (
              <div><strong>Due Date:</strong> {new Date(sale.dueDate).toLocaleDateString('en-GB')}</div>
            )}
          </div>
        )}
      </div>

      {/* Message to Customer - Not printed */}
      <div className="noteBox nonPrint">
        <div className="noteLabel">
          <label htmlFor="customerNote">Message to customer</label>
          <span className="noteCount" aria-live="polite">{charCount}/120</span>
        </div>
        <textarea
          id="customerNote"
          className="noteTextarea"
          placeholder="Add a personal message (optional)"
          value={customNote}
          onChange={handleNoteChange}
          maxLength={120}
          aria-describedby="noteCount"
        />
      </div>

      {/* Footer */}
      <div className="receiptFooter">
        <div className="thankYou">Thank you for your patronage!</div>
        <div className="powered">— Powered by Storehouse</div>
      </div>

      {/* Actions - Not printed */}
      <div className="rActions nonPrint">
        <button
          className="btnPrimary"
          onClick={handleShareWhatsApp}
          aria-label="Share receipt on WhatsApp"
        >
          📱 WhatsApp
        </button>
        <button
          className="btnGhost"
          onClick={handleCopyText}
          aria-label="Copy receipt text"
        >
          {copySuccess ? '✓ Copied!' : '📋 Copy'}
        </button>
        <button
          className="btnOutline"
          onClick={handleDownloadPDF}
          aria-label="Download as PDF"
        >
          📄 PDF
        </button>
        <button
          className="btnOutline"
          onClick={handleDownloadImage}
          aria-label="Download as Image"
        >
          🖼️ Image
        </button>
        <button
          className="btnOutline"
          onClick={handlePrint}
          aria-label="Print receipt"
        >
          🖨️ Print
        </button>
      </div>
    </div>
  );
};

export default ReceiptPreview;
