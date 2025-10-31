import React, { useState, useEffect, useRef } from 'react';
import './record-sale.css';
import AfterSaleSheet from './AfterSaleSheet';
import { buildTextFromSale, waLink, shouldAutoSend, shouldShowSheet } from '../modules/sales/attachReceiptFlow';
import { useBusinessProfile } from '../contexts/BusinessProfile';
import { getSettings } from '../utils/settings';
import { RECEIPT_SETTINGS_ENABLED } from '../config';
import { formatNGPhone, validateNGPhone } from '../utils/phone';
import { getStockIndicator } from '../utils/stockSettings';
import {
  isPaystackEnabled,
  getActivePublicKey,
  getPaystackConfig,
  loadPaystackScript,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentData
} from '../utils/paystackSettings';
import { openWhatsApp, formatPhoneForWhatsApp } from '../utils/whatsapp';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSaveSale: (saleData: any) => Promise<void>;
  onCreateDebt?: (debtData: any) => void;
  showSalesData?: boolean;
  onShowToast?: (message: string, duration?: number) => void;
}

export default function RecordSaleModal({
  isOpen,
  onClose,
  items,
  onSaveSale,
  onCreateDebt,
  showSalesData = true,
  onShowToast
}: RecordSaleModalProps) {
  // Controlled state for all form fields
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneValidation, setPhoneValidation] = useState({ valid: true, message: '' });
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  // Payment state
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const paystackEnabled = isPaystackEnabled();

  // Shopping cart state
  const [cart, setCart] = useState<Array<{
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    price: number;
    stockAvailable: number;
  }>>([]);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cartError, setCartError] = useState('');

  // Receipt sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [receiptPhone, setReceiptPhone] = useState<string | undefined>();

  const customerNameRef = useRef<HTMLInputElement>(null);
  const { profile } = useBusinessProfile();

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

  // Reset form when modal closes (GUARDRAIL 4: Clear cart on cancel)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedItemId('');
      setPrice('');
      setQty('1');
      setIsCredit(false);
      setCustomerName('');
      setPhone('');
      setPhoneDisplay('');
      setPhoneValidation({ valid: true, message: '' });
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setDueDate(today.toISOString().split('T')[0]);
      setMessage('');
      setSendWhatsApp(false);
      setHasConsent(false);
      setPaymentMethod('Cash');  // Reset to default
      setCart([]);  // Clear cart when modal closes
      setCartExpanded(false);
      setCartError('');
      setIsProcessing(false);
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

  // Form validation
  const isFormValid =
    selectedItemId &&
    qty &&
    parseInt(qty) > 0 &&
    price &&
    parseFloat(price.replace(/,/g, '')) > 0 &&
    (!isCredit || (customerName.trim() && dueDate)) &&
    (!sendWhatsApp || (phone && (!isCredit || hasConsent))) &&
    phoneValidation.valid;

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

  // Handle phone input with auto-formatting and validation
  const handlePhoneChange = (value: string) => {
    // Extract only digits for storage
    const digitsOnly = value.replace(/\D/g, '');
    setPhone(digitsOnly);

    // Format for display
    const formatted = formatNGPhone(digitsOnly);
    setPhoneDisplay(formatted);

    // Validate
    const validation = validateNGPhone(digitsOnly);
    setPhoneValidation(validation);
  };

  // ==================== SHOPPING CART FUNCTIONS ====================

  // Calculate cart totals (GUARDRAIL 10: Price recalculation)
  const cartTotals = {
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  // Add item to cart (GUARDRAIL 1, 3, 7)
  const handleAddToCart = () => {
    try {
      setCartError('');

      // Validation
      if (!selectedItemId || !price || !qty) {
        setCartError('Please select an item, enter price and quantity');
        return;
      }

      const qtyNum = parseInt(qty);
      const priceNum = parseFloat(price.replace(/,/g, ''));

      if (qtyNum <= 0 || priceNum <= 0) {
        setCartError('Price and quantity must be greater than zero');
        return;
      }

      if (!selectedItem) {
        setCartError('Selected item not found');
        return;
      }

      // GUARDRAIL 1: Stock validation
      const existingCartItem = cart.find(item => item.itemId === selectedItemId);
      const totalQtyInCart = existingCartItem ? existingCartItem.quantity : 0;
      const newTotalQty = totalQtyInCart + qtyNum;

      if (newTotalQty > selectedItem.qty) {
        setCartError(`Cannot add ${qtyNum} more. Only ${selectedItem.qty - totalQtyInCart} available (${totalQtyInCart} already in cart)`);
        return;
      }

      // GUARDRAIL 3: Duplicate item handling - merge quantities
      if (existingCartItem) {
        setCart(prev => prev.map(item =>
          item.itemId === selectedItemId
            ? { ...item, quantity: item.quantity + qtyNum }
            : item
        ));
      } else {
        // Add new item to cart
        const cartItem = {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemId: selectedItemId,
          name: selectedItem.name,
          quantity: qtyNum,
          price: priceNum,
          stockAvailable: selectedItem.qty
        };
        setCart(prev => [...prev, cartItem]);
      }

      // Reset item selection form
      setSelectedItemId('');
      setPrice('');
      setQty('1');
      setSearchTerm('');

      // Success feedback with toast
      setCartError('');

      if (onShowToast) {
        const successMsg = existingCartItem
          ? `🛒 Updated ${selectedItem.name}\nQuantity: ${newTotalQty} (${formatCurrency(priceNum * newTotalQty)})`
          : `🛒 Added ${selectedItem.name} to cart\n${qtyNum} × ${formatCurrency(priceNum)} = ${formatCurrency(priceNum * qtyNum)}`;
        onShowToast(successMsg, 2500);
      }

    } catch (error) {
      console.error('[Cart] Error adding item:', error);
      setCartError('Failed to add item to cart');
    }
  };

  // Update cart item quantity (GUARDRAIL 1, 7, 10)
  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    try {
      setCartError('');

      const cartItem = cart.find(item => item.id === cartItemId);
      if (!cartItem) return;

      if (newQty <= 0) {
        setCartError('Quantity must be greater than zero');
        return;
      }

      // GUARDRAIL 1: Stock validation
      if (newQty > cartItem.stockAvailable) {
        setCartError(`Only ${cartItem.stockAvailable} units available`);
        return;
      }

      // GUARDRAIL 10: Auto-update total
      setCart(prev => prev.map(item =>
        item.id === cartItemId
          ? { ...item, quantity: newQty }
          : item
      ));
    } catch (error) {
      console.error('[Cart] Error updating quantity:', error);
      setCartError('Failed to update quantity');
    }
  };

  // Remove item from cart (GUARDRAIL 7, 9)
  const handleRemoveFromCart = (cartItemId: string) => {
    try {
      const cartItem = cart.find(item => item.id === cartItemId);
      if (!cartItem) return;

      // GUARDRAIL 9: Confirmation prompt
      const confirmed = window.confirm(`Remove ${cartItem.name} from cart?`);
      if (!confirmed) return;

      setCart(prev => prev.filter(item => item.id !== cartItemId));
      setCartError('');

      if (onShowToast) {
        onShowToast(`🗑️ Removed ${cartItem.name} from cart`, 2000);
      }
    } catch (error) {
      console.error('[Cart] Error removing item:', error);
      setCartError('Failed to remove item');
    }
  };

  // Handle save - Process cart items or single item (GUARDRAIL 2, 5, 6, 7, 8, 12)
  const handleSave = async () => {
    // GUARDRAIL 12: Fall back to single-item if cart is empty
    if (cart.length === 0 && !isFormValid) return;

    // GUARDRAIL 2: Empty cart prevention
    if (cart.length === 0) {
      setCartError('Please add items to cart first');
      return;
    }

    try {
      // GUARDRAIL 8: Loading state
      setIsProcessing(true);
      setCartError('');

      // Debug: Log the sale type
      console.log('[Cart Save] Sale type:', isCredit ? 'CREDIT' : 'CASH');
      console.log('[Cart Save] isCredit value:', isCredit);
      console.log('[Cart Save] Cart items:', cart.length);

      // Process all cart items
      for (const cartItem of cart) {
        const saleData = {
          itemId: cartItem.itemId,
          quantity: cartItem.quantity.toString(),
          sellPrice: cartItem.price.toString(),
          isCreditSale: isCredit,  // Explicitly use the isCredit state
          customerName: isCredit ? customerName : '',
          phone: phone,
          dueDate: isCredit ? new Date(dueDate).toISOString() : '',
          note: isCredit ? message : '',
          sendWhatsApp: false,  // GUARDRAIL 11: Single WhatsApp for entire cart (sent later)
          hasConsent: isCredit ? hasConsent : false,
          paymentMethod: paymentMethod  // Include payment method
        };

        console.log('[Cart Save] Processing item:', cartItem.name, 'isCreditSale:', saleData.isCreditSale);
        await onSaveSale(saleData);

        // Create debt if credit sale
        if (isCredit && onCreateDebt) {
          try {
            onCreateDebt({
              customerName,
              phone,
              dueDate: new Date(dueDate).toISOString(),
              amount: cartItem.price * cartItem.quantity,
              itemId: cartItem.itemId,
              qty: cartItem.quantity,
              createdAt: new Date().toISOString()
            });
          } catch (error) {
            console.error('[Debt Creation] Error:', error);
            // Don't throw - allow sale to complete
          }
        }
      }

      // GUARDRAIL 11: Single WhatsApp for entire cart
      if (sendWhatsApp && phone && phoneValidation.valid) {
        try {
          console.log('[WhatsApp Cart] Preparing to send receipt...');
          console.log('[WhatsApp Cart] Phone:', phone);
          console.log('[WhatsApp Cart] Cart items:', cart.length);

          const businessName = profile.businessName || 'Storehouse';
          const customerDisplayName = isCredit ? customerName : 'Customer';

          // Build multi-item receipt text with improved formatting
          const formattedDate = new Date().toLocaleDateString('en-NG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          let itemsSection = '';
          if (cart.length > 0) {
            const itemLines = cart.map((item, index) => {
              const itemNum = cart.length > 1 ? `${index + 1}. ` : '• ';
              const itemTotal = item.price * item.quantity;
              return `${itemNum}${item.name}\n   ${item.quantity} × ₦${item.price.toLocaleString()} = ₦${itemTotal.toLocaleString()}`;
            }).join('\n\n');
            itemsSection = itemLines;
          }

          // Improved receipt with cleaner structure
          const receipt = `
━━━━━━━━━━━━━━━━━━━
🧾 SALES RECEIPT
━━━━━━━━━━━━━━━━━━━

📍 ${businessName}
👤 ${customerDisplayName}

📦 ITEMS
${itemsSection}

━━━━━━━━━━━━━━━━━━━
💰 TOTAL: ₦${cartTotals.totalAmount.toLocaleString()}
${isCredit ? '💳 Payment: CREDIT (Due ' + new Date(dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ')' : '✅ Payment: PAID'}
━━━━━━━━━━━━━━━━━━━

📅 ${formattedDate}

Thank you for your business! 🙏

━━━━━━━━━━━━━━━━━━━
Powered by Storehouse
          `.trim();

          console.log('[WhatsApp Cart] Receipt built, length:', receipt.length);

          // Open WhatsApp with device-appropriate link
          const success = await openWhatsApp(phone, receipt);

          if (success) {
            console.log('[WhatsApp Cart] ✅ WhatsApp opened successfully');
          } else {
            console.log('[WhatsApp Cart] ⚠️ WhatsApp may not have opened properly');
          }

        } catch (error) {
          console.error('[WhatsApp Cart] ❌ Error sending cart receipt:', error);
          // Non-blocking - don't fail the sale
        }
      } else {
        if (sendWhatsApp) {
          console.log('[WhatsApp Cart] Skipped - validation failed. Phone:', phone, 'Valid:', phoneValidation.valid);
        }
      }

      // GUARDRAIL 5: Clear cart after successful save
      setCart([]);
      setCartExpanded(false);
      setIsProcessing(false);

      // Show success toast with specific sale details
      if (onShowToast) {
        const itemCount = cart.length;
        const itemWord = itemCount === 1 ? 'item' : 'items';
        const formattedTotal = `₦${cartTotals.totalAmount.toLocaleString()}`;

        let toastMessage = '';

        if (isCredit) {
          // Credit sale messages
          if (sendWhatsApp && phone && phoneValidation.valid) {
            // Get last 4 digits of phone for privacy
            const phoneDigits = phone.replace(/\D/g, '');
            const lastFour = phoneDigits.slice(-4);
            toastMessage = `✅ Credit sale recorded for ${customerName}\n💳 ${itemCount} ${itemWord} • ${formattedTotal}\n📱 WhatsApp receipt sent to ...${lastFour}`;
          } else {
            toastMessage = `✅ Credit sale recorded for ${customerName}\n💳 ${itemCount} ${itemWord} • ${formattedTotal}`;
          }
        } else {
          // Cash sale messages
          if (sendWhatsApp && phone && phoneValidation.valid) {
            // Get last 4 digits of phone for privacy
            const phoneDigits = phone.replace(/\D/g, '');
            const lastFour = phoneDigits.slice(-4);
            toastMessage = `✅ Sale recorded! WhatsApp receipt sent to ...${lastFour}\n💰 ${itemCount} ${itemWord} sold for ${formattedTotal}`;
          } else {
            toastMessage = `✅ Sale recorded! ${itemCount} ${itemWord} sold for ${formattedTotal}`;
          }
        }

        onShowToast(toastMessage, 4500);
      }

      // Close modal
      onClose();

    } catch (error) {
      // GUARDRAIL 7: Error handling
      console.error('[Save Cart] Error:', error);
      setCartError('Failed to complete sale. Please try again.');
      setIsProcessing(false);
      // Modal stays open on error
    }
  };

  // Keyboard shortcuts (ENHANCEMENT 3: Power user shortcuts)
  // Placed here after all dependencies are declared
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC key: Close modal (with confirmation if data entered)
      if (event.key === 'Escape') {
        event.preventDefault();

        // Check if there's unsaved data
        const hasData = cart.length > 0 || selectedItemId || customerName || phone;

        if (hasData) {
          const confirmed = window.confirm('Close without saving? All entered data will be lost.');
          if (!confirmed) return;
        }

        onClose();
        return;
      }

      // ENTER key: Submit form (if valid and not typing in textarea)
      if (event.key === 'Enter' && !event.shiftKey) {
        // Don't submit if user is typing in textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'TEXTAREA') return;

        // Don't submit if user is in search field (let them select item first)
        if (target.id === 'rs-search') return;

        // Check if cart has items (primary flow)
        if (cart.length > 0) {
          event.preventDefault();
          handleSave();
          return;
        }

        // Legacy single-item flow validation
        if (isFormValid && !isProcessing) {
          event.preventDefault();
          handleSave();
        }
      }
    };

    // Attach event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, cart, selectedItemId, customerName, phone, isFormValid, isProcessing, onClose, handleSave]); // Dependencies for shortcut logic

  // Handle save (LEGACY - kept for backwards compatibility)
  const handleSaveSingle = async () => {
    if (!isFormValid) return;

    const saleData = {
      itemId: selectedItemId,
      quantity: qty,
      sellPrice: price,
      isCreditSale: isCredit,
      customerName: isCredit ? customerName : '',
      phone: phone,  // Include phone for both cash and credit sales
      dueDate: isCredit ? new Date(dueDate).toISOString() : '',
      note: isCredit ? message : '',
      sendWhatsApp: sendWhatsApp,  // Include sendWhatsApp for both cash and credit sales
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

      // Build receipt text for the new flow
      const settings = getSettings();
      const priceInKobo = Math.round(parseFloat(price.replace(/,/g, '')) * 100);
      const saleRecord = {
        id: Date.now().toString(),
        itemName: selectedItem?.name || 'Item',
        qty: parseInt(qty),
        sellKobo: priceInKobo,
        payment: isCredit ? ('credit' as const) : ('cash' as const),
        createdAt: Date.now(),
        dueDate: isCredit ? dueDate : undefined,
        customerId: undefined, // Could be enhanced with customer ID lookup
      };

      const businessName = profile.businessName || 'Storehouse';
      const receiptNote = settings.receiptMessage || message || undefined;
      const { text, phone: phoneE164 } = buildTextFromSale(
        saleRecord,
        businessName,
        undefined, // No customer lookup yet
        receiptNote
      );

      setReceiptText(text);
      setReceiptPhone(phoneE164);

      // Check settings to decide flow (only if receipt feature is enabled)
      if (RECEIPT_SETTINGS_ENABLED) {
        if (shouldAutoSend(settings, phoneE164)) {
          // Auto-send to saved customer with phone
          try {
            const url = waLink(text, phoneE164);
            window.location.href = url;
          } catch (error) {
            console.error('[Auto-send] Error:', error);
          }
          onClose();
        } else if (shouldShowSheet(settings)) {
          // Show the receipt sheet for user to decide
          setSheetOpen(true);
        } else {
          // Settings disabled receipt offering
          onClose();
        }
      } else {
        // Receipt feature disabled - just close
        onClose();
      }
    } catch (error) {
      console.error('[Save Sale] Error:', error);
      // Modal stays open on error
    }
  };

  // Handle sending receipt via WhatsApp
  const handleSendReceipt = () => {
    try {
      const url = waLink(receiptText, receiptPhone);
      window.location.href = url;
      setSheetOpen(false);
      onClose();
    } catch (error) {
      console.error('[Send Receipt] Error:', error);
      // Fallback: copy to clipboard
      try {
        navigator.clipboard.writeText(receiptText);
        alert('Receipt copied to clipboard. Please paste in WhatsApp.');
      } catch (clipError) {
        console.error('[Clipboard] Error:', clipError);
      }
      setSheetOpen(false);
      onClose();
    }
  };

  // Handle skipping receipt
  const handleSkipReceipt = () => {
    setSheetOpen(false);
    onClose();
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
    <>
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
                          Stock: {getStockIndicator(item.qty).emoji} {item.qty} | {formatCurrency((item.sellKobo ?? 0) / 100)}
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
                    onClick={() => {
                      const newValue = !isCredit;
                      console.log('[Toggle] Sell on Credit:', newValue ? 'ON (CREDIT)' : 'OFF (CASH)');
                      setIsCredit(newValue);
                    }}
                    aria-pressed={isCredit}
                  >
                    <span className="rs-pill">
                      <span className="rs-thumb" />
                    </span>
                    <span className="rs-toggle-label">Sell on Credit</span>
                  </button>
                  {/* Debug indicator */}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: isCredit ? '#dc2626' : '#059669', fontWeight: 600 }}>
                    {isCredit ? '🔴 CREDIT SALE' : '🟢 CASH SALE'}
                  </div>
                </div>

                {/* Payment Method Selector - Only show for cash sales */}
                {!isCredit && (
                  <div className="rs-field" style={{ marginTop: '16px' }}>
                    <label className="rs-label" style={{ marginBottom: '8px', display: 'block' }}>
                      Payment Method
                    </label>
                    <div className="rs-payment-methods">
                      {/* Cash and POS always available */}
                      {(['Cash', 'POS'] as const).map((method) => (
                        <label key={method} className="rs-payment-method">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                      {/* Card and Transfer only if Paystack enabled */}
                      {paystackEnabled && (['Card', 'Transfer'] as const).map((method) => (
                        <label key={method} className="rs-payment-method">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
                    {paystackEnabled && getPaystackConfig().testMode && (
                      <p className="bs-help" style={{ marginTop: '8px', color: '#f59e0b' }}>
                        ⚠️ Paystack test mode active
                      </p>
                    )}
                  </div>
                )}

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
                  </div>
                )}

                {/* WhatsApp Receipt Section - Always visible for entire cart */}
                <div className="rs-field" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <label className="rs-label" style={{ marginBottom: '12px', display: 'block', fontWeight: 600 }}>
                    📱 WhatsApp Receipt (Optional)
                  </label>

                  {/* Phone Input */}
                  <div className="rs-field">
                    <label htmlFor="rs-whatsapp-phone" className="rs-label" style={{ fontSize: '14px' }}>
                      Customer Phone
                    </label>
                    <input
                      id="rs-whatsapp-phone"
                      type="tel"
                      inputMode="tel"
                      className="rs-input"
                      value={phoneDisplay}
                      onChange={e => handlePhoneChange(e.target.value)}
                      placeholder="080 1234 5678"
                    />
                    {phone && phoneValidation.message && (
                      <small className={phoneValidation.valid ? 'rs-help' : 'rs-error'} style={{ marginTop: '4px', display: 'block' }}>
                        {phoneValidation.message}
                      </small>
                    )}
                  </div>

                  {/* WhatsApp Checkbox */}
                  {phone && phoneValidation.valid && (
                    <div className="rs-field" style={{ marginTop: '12px' }}>
                      <label className="rs-checkbox">
                        <input
                          type="checkbox"
                          checked={sendWhatsApp}
                          onChange={e => setSendWhatsApp(e.target.checked)}
                        />
                        <span>Send WhatsApp receipt for entire order</span>
                      </label>
                    </div>
                  )}

                  {/* Consent for Credit Sales */}
                  {sendWhatsApp && isCredit && (
                    <div className="rs-field" style={{ marginTop: '8px' }}>
                      <label className="rs-checkbox">
                        <input
                          type="checkbox"
                          checked={hasConsent}
                          onChange={e => setHasConsent(e.target.checked)}
                          required
                        />
                        <span className="rs-consent-text" style={{ fontSize: '13px' }}>
                          I have customer's consent to receive WhatsApp messages *
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shopping Cart Error */}
        {cartError && (
          <div className="rs-cart-error">
            {cartError}
          </div>
        )}

        {/* Shopping Cart - Bottom Sticky Bar with Expandable View */}
        <div className="rs-cart-bar-wrapper">
          {/* Expandable Cart View - Render BEFORE cart bar so it appears above */}
          {cartExpanded && cart.length > 0 && (
            <div className="rs-cart-expanded">
              <div className="rs-cart-header">
                <h3>Cart Items</h3>
                <button className="rs-cart-close" onClick={(e) => { e.stopPropagation(); setCartExpanded(false); }}>×</button>
              </div>
              <div className="rs-cart-items">
                {cart.map((cartItem) => (
                  <div key={cartItem.id} className="rs-cart-item">
                    <div className="rs-cart-item-info">
                      <div className="rs-cart-item-name">{cartItem.name}</div>
                      <div className="rs-cart-item-price">{formatCurrency(cartItem.price)} each</div>
                    </div>
                    <div className="rs-cart-item-controls">
                      <div className="rs-cart-qty-controls">
                        <button
                          className="rs-cart-qty-btn"
                          onClick={() => handleUpdateCartQuantity(cartItem.id, cartItem.quantity - 1)}
                          disabled={cartItem.quantity <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className="rs-cart-qty-input"
                          value={cartItem.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            handleUpdateCartQuantity(cartItem.id, val);
                          }}
                          min="1"
                          max={cartItem.stockAvailable}
                        />
                        <button
                          className="rs-cart-qty-btn"
                          onClick={() => handleUpdateCartQuantity(cartItem.id, cartItem.quantity + 1)}
                          disabled={cartItem.quantity >= cartItem.stockAvailable}
                        >
                          +
                        </button>
                      </div>
                      <div className="rs-cart-item-subtotal">{formatCurrency(cartItem.price * cartItem.quantity)}</div>
                      <button
                        className="rs-cart-remove-btn"
                        onClick={() => handleRemoveFromCart(cartItem.id)}
                        title="Remove from cart"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart Bar */}
          <div
            className={`rs-cart-bar ${cart.length > 0 ? 'clickable' : ''} ${cartExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              if (cart.length > 0) {
                console.log('[Cart Bar] Clicked! Current state:', cartExpanded ? 'expanded' : 'collapsed');
                setCartExpanded(!cartExpanded);
                console.log('[Cart Bar] New state:', !cartExpanded ? 'expanded' : 'collapsed');
              }
            }}
            role={cart.length > 0 ? "button" : undefined}
            aria-label={cart.length > 0 ? (cartExpanded ? "Collapse cart" : "Expand cart") : undefined}
            tabIndex={cart.length > 0 ? 0 : undefined}
          >
            <div className="rs-cart-summary">
              <div className="rs-cart-icon">🛒</div>
              <div className="rs-cart-info">
                <div className="rs-cart-count">
                  {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'item' : 'items'}
                  {cart.length > 0 && <span style={{ marginLeft: '8px', opacity: 0.7 }}>• Tap to {cartExpanded ? 'close' : 'view'}</span>}
                </div>
                <div className="rs-cart-total">{formatCurrency(cartTotals.totalAmount)}</div>
              </div>
            </div>
            {cart.length > 0 && (
              <div className="rs-cart-expand-icon">
                {cartExpanded ? '▼' : '▲'}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Add to Cart and Complete Sale buttons */}
        <div className="rs-footer">
          {selectedItemId && price && qty && (
            <button
              type="button"
              className="rs-secondary"
              onClick={handleAddToCart}
              disabled={isProcessing}
            >
              Add to Cart
            </button>
          )}
          <button
            type="button"
            className="rs-primary"
            onClick={handleSave}
            disabled={cart.length === 0 || isProcessing || (isCredit && (!customerName.trim() || !dueDate)) || (sendWhatsApp && (!phone || !phoneValidation.valid || (isCredit && !hasConsent)))}
          >
            {isProcessing ? 'Processing...' : `Complete Sale${cart.length > 0 ? ` (${cart.length})` : ''}`}
          </button>
          <button type="button" className="rs-link" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
        </div>
      </div>
    </div>

      {/* Receipt Sheet - appears after sale is saved */}
      <AfterSaleSheet
        open={sheetOpen}
        receiptText={receiptText}
        onSend={handleSendReceipt}
        onSkip={handleSkipReceipt}
      />
    </>
  );
}
