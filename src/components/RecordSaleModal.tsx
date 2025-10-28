import React, { useState, useEffect, useRef } from 'react';
import './record-sale.css';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSaveSale: (saleData: any) => Promise<void>;
  onCreateDebt?: (debtData: any) => void;
  showSalesData?: boolean;
}

export default function RecordSaleModal({
  isOpen,
  onClose,
  items,
  onSaveSale,
  onCreateDebt,
  showSalesData = true
}: RecordSaleModalProps) {
  // Controlled state for all form fields
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const customerNameRef = useRef<HTMLInputElement>(null);

  // Initialize due date to today + 7 days
  useEffect(() => {
    if (isOpen && !dueDate) {
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setDueDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen, dueDate]);

  // Auto-focus customer name when credit mode is enabled
  useEffect(() => {
    if (isCredit && customerNameRef.current) {
      setTimeout(() => customerNameRef.current?.focus(), 100);
    }
  }, [isCredit]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedItemId('');
      setPrice('');
      setQty('1');
      setIsCredit(false);
      setCustomerName('');
      setPhone('');
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setDueDate(today.toISOString().split('T')[0]);
      setMessage('');
      setSendWhatsApp(false);
      setHasConsent(false);
    }
  }, [isOpen]);

  // Filter items based on search term
  const filteredItems = items.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return item.name.toLowerCase().includes(term);
  });

  const selectedItem = items.find(i => i.id.toString() === selectedItemId);

  // Calculate total
  const total = selectedItem && price && qty
    ? parseFloat(price.replace(/,/g, '')) * parseInt(qty || '0')
    : 0;

  // Format currency
  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0
      }).format(value).replace('NGN', '₦');
    } catch {
      return `₦${value.toLocaleString()}`;
    }
  };

  // Phone validation
  const isPhoneValid = phone === '' || /^[0-9]{10,14}$/.test(phone);

  // Form validation
  const isFormValid =
    selectedItemId &&
    qty &&
    parseInt(qty) > 0 &&
    price &&
    parseFloat(price.replace(/,/g, '')) > 0 &&
    (!isCredit || (customerName.trim() && dueDate)) &&
    (!sendWhatsApp || (phone && hasConsent)) &&
    isPhoneValid;

  // Handle item selection from dropdown
  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = items.find(i => i.id.toString() === itemId);
    if (item) {
      const sellKobo = item.sellKobo ?? item.sellingPrice ?? item.sellPrice ?? 0;
      const sellNaira = Math.round(sellKobo / 100);
      if (sellNaira > 0) {
        setPrice(sellNaira.toString());
      }
    }
  };

  // Handle item selection from search results
  const handleSelectFromSearch = (item: any) => {
    handleSelectItem(item.id.toString());
    setSearchTerm('');
  };

  // Handle quantity stepper
  const handleQtyChange = (delta: number) => {
    const currentQty = parseInt(qty) || 0;
    const newQty = Math.max(1, currentQty + delta);
    const maxQty = selectedItem?.qty || 999;
    setQty(Math.min(newQty, maxQty).toString());
  };

  // Handle price input with comma formatting
  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setPrice('');
      return;
    }
    const number = parseInt(cleaned);
    setPrice(number.toLocaleString());
  };

  // Handle save
  const handleSave = async () => {
    if (!isFormValid) return;

    const saleData = {
      itemId: selectedItemId,
      quantity: qty,
      sellPrice: price,
      isCreditSale: isCredit,
      customerName: isCredit ? customerName : '',
      phone: isCredit ? phone : '',
      dueDate: isCredit ? new Date(dueDate).toISOString() : '',
      note: isCredit ? message : '',
      sendWhatsApp: isCredit ? sendWhatsApp : false,
      hasConsent: isCredit ? hasConsent : false
    };

    try {
      await onSaveSale(saleData);

      // Create debt if credit sale and callback is provided
      if (isCredit && onCreateDebt) {
        try {
          onCreateDebt({
            customerName,
            phone,
            dueDate: new Date(dueDate).toISOString(),
            amount: total,
            itemId: selectedItemId,
            qty: parseInt(qty),
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('[Debt Creation] Error:', error);
          // Don't throw - allow sale to complete
        }
      }

      onClose();
    } catch (error) {
      console.error('[Save Sale] Error:', error);
      // Modal stays open on error
    }
  };

  // Format due date for display
  const formatDueDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-NG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rs-overlay" onClick={onClose}>
      <div className="rs-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="rs-header">
          <h2>Record Sale</h2>
          <button className="rs-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="rs-body">
          <div className="rs-grid">
            {/* Left Column - Inputs */}
            <div className="rs-left">
              {/* Search Item */}
              <div className="rs-field">
                <label htmlFor="rs-search" className="rs-label">
                  Search Item
                </label>
                <input
                  id="rs-search"
                  type="text"
                  className="rs-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Type to search items..."
                  autoComplete="off"
                />
                {/* Search Results Dropdown */}
                {searchTerm && filteredItems.length > 0 && (
                  <div className="rs-dropdown">
                    {filteredItems.slice(0, 5).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className="rs-dropdown-item"
                        onClick={() => handleSelectFromSearch(item)}
                      >
                        <div className="rs-item-name">{item.name}</div>
                        <div className="rs-item-meta">
                          Stock: {item.qty} | {formatCurrency((item.sellKobo ?? 0) / 100)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Select Item */}
              <div className="rs-field">
                <label htmlFor="rs-select" className="rs-label">
                  Select Item
                </label>
                <select
                  id="rs-select"
                  className="rs-input rs-select"
                  value={selectedItemId}
                  onChange={e => handleSelectItem(e.target.value)}
                >
                  <option value="">Choose an item...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Stock: {item.qty})
                    </option>
                  ))}
                </select>
              </div>

              {selectedItemId && (
                <>
                  {/* Price */}
                  <div className="rs-field">
                    <label htmlFor="rs-price" className="rs-label">
                      Your Price (₦)
                    </label>
                    <input
                      id="rs-price"
                      type="text"
                      inputMode="decimal"
                      className="rs-input"
                      value={price}
                      onChange={e => handlePriceChange(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  {/* Quantity with Stepper */}
                  <div className="rs-field">
                    <label htmlFor="rs-qty" className="rs-label">
                      Quantity
                    </label>
                    <div className="rs-stepper">
                      <button
                        type="button"
                        className="rs-stepper-btn"
                        onClick={() => handleQtyChange(-1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        id="rs-qty"
                        type="text"
                        inputMode="numeric"
                        className="rs-input rs-stepper-input"
                        value={qty}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setQty(val || '1');
                        }}
                      />
                      <button
                        type="button"
                        className="rs-stepper-btn"
                        onClick={() => handleQtyChange(1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {selectedItem && (
                      <small className="rs-help">Stock left: {selectedItem.qty}</small>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Summary */}
            <div className="rs-right">
              <div className="rs-summary">
                {/* Total Amount */}
                <div className="rs-total-section">
                  <div className="rs-total-label">Total Amount</div>
                  <div className="rs-total">
                    {showSalesData ? formatCurrency(total) : '₦—'}
                  </div>
                </div>

                {/* Credit Toggle */}
                <div className="rs-field" style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className={`rs-toggle ${isCredit ? 'on' : ''}`}
                    onClick={() => setIsCredit(!isCredit)}
                    aria-pressed={isCredit}
                  >
                    <span className="rs-pill">
                      <span className="rs-thumb" />
                    </span>
                    <span className="rs-toggle-label">Sell on Credit</span>
                  </button>
                </div>

                {/* Credit Fields */}
                {isCredit && (
                  <div className="rs-credit-panel">
                    {/* Customer Name */}
                    <div className="rs-field">
                      <label htmlFor="rs-customer" className="rs-label">
                        Customer Name *
                      </label>
                      <input
                        id="rs-customer"
                        ref={customerNameRef}
                        type="text"
                        className="rs-input"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="rs-field">
                      <label htmlFor="rs-phone" className="rs-label">
                        Phone (optional)
                      </label>
                      <input
                        id="rs-phone"
                        type="tel"
                        inputMode="tel"
                        className="rs-input"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="080..."
                      />
                      {phone && !isPhoneValid && (
                        <small className="rs-error">Enter 10-14 digits</small>
                      )}
                    </div>

                    {/* Due Date */}
                    <div className="rs-field">
                      <label htmlFor="rs-due" className="rs-label">
                        Due Date *
                      </label>
                      <input
                        id="rs-due"
                        type="date"
                        className="rs-input"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      {dueDate && (
                        <small className="rs-help">Payment due: {formatDueDate(dueDate)}</small>
                      )}
                    </div>

                    {/* Message */}
                    <div className="rs-field">
                      <label htmlFor="rs-msg" className="rs-label">
                        Message (optional)
                      </label>
                      <textarea
                        id="rs-msg"
                        className="rs-input rs-text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="e.g. Thank you"
                        rows={2}
                        maxLength={120}
                      />
                    </div>

                    {/* WhatsApp Receipt */}
                    <div className="rs-field">
                      <label className="rs-checkbox">
                        <input
                          type="checkbox"
                          checked={sendWhatsApp}
                          onChange={e => setSendWhatsApp(e.target.checked)}
                          disabled={!phone}
                        />
                        <span>Send WhatsApp receipt</span>
                      </label>
                    </div>

                    {/* Consent Checkbox */}
                    {sendWhatsApp && (
                      <div className="rs-field">
                        <label className="rs-checkbox">
                          <input
                            type="checkbox"
                            checked={hasConsent}
                            onChange={e => setHasConsent(e.target.checked)}
                            required
                          />
                          <span className="rs-consent-text">
                            I have customer's consent to receive WhatsApp messages *
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="rs-footer">
          <button
            type="button"
            className="rs-primary"
            onClick={handleSave}
            disabled={!isFormValid}
          >
            Complete Sale
          </button>
          <button type="button" className="rs-link" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
