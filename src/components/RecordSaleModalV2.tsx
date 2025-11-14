import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Settings } from 'lucide-react';
import '../styles/sales.css';
import './record-sale.css';
import { ItemCombobox, type ItemOption } from './sales/ItemCombobox';
import { CartDrawer, type CartItem } from './sales/CartDrawer';
import { useBarcode } from '../hooks/useBarcode';
import { useHotkeys } from '../hooks/useHotkeys';
import { useBusinessProfile } from '../contexts/BusinessProfile';
import { formatNGN, parseMoney } from '../utils/currency';
import { ensureQty, ensurePrice } from '../utils/validators';
import { enqueueSale, getQueue, removeFromQueue } from '../utils/offlineQueue';
import { logSaleEvent } from '../utils/analytics';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { formatNGPhone, validateNGPhone } from '../utils/phone';
import { openWhatsApp } from '../utils/whatsapp';
import {
  isPaystackEnabled,
  getActivePublicKey,
  getPaystackConfig,
  loadPaystackScript,
  type PaymentMethod,
  type PaymentData
} from '../utils/paystackSettings';

interface RecordSaleModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  calculatorItems?: { lines: any[]; subtotal: number } | null;
  preselectedItem?: any | null;
  onSaveSale: (saleData: any) => Promise<void>;
  onCreateDebt?: (debtData: any) => void;
  showSalesData?: boolean;
  onShowToast?: (message: string, duration?: number) => void;
  onOpenCalculator?: () => void;
  onOpenSettings?: () => void;
}

export default function RecordSaleModalV2({
  isOpen,
  onClose,
  items,
  calculatorItems,
  preselectedItem,
  onSaveSale,
  onCreateDebt,
  showSalesData = true,
  onShowToast,
  onOpenCalculator,
  onOpenSettings
}: RecordSaleModalV2Props) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Payment & customer state
  const [isCredit, setIsCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    try {
      const saved = localStorage.getItem('storehouse:lastPayMethod:v1');
      return (saved as PaymentMethod) || 'Cash';
    } catch {
      return 'Cash';
    }
  });
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneValidation, setPhoneValidation] = useState({ valid: true, message: '' });
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [showMorePayments, setShowMorePayments] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState('');

  // Offline state
  const [offline, setOffline] = useState(!navigator.onLine);

  // Paystack state
  const [paystackScriptLoaded, setPaystackScriptLoaded] = useState(false);
  const paystackEnabled = isPaystackEnabled();

  // Refs
  const modalRef = useFocusTrap(isOpen);
  const comboboxRef = useRef<HTMLInputElement>(null);
  const { profile } = useBusinessProfile();

  // Initialize due date
  useEffect(() => {
    if (isOpen && !dueDate) {
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setDueDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen, dueDate]);

  // Load Paystack script
  useEffect(() => {
    if (isOpen && paystackEnabled && !paystackScriptLoaded) {
      loadPaystackScript().then(loaded => {
        setPaystackScriptLoaded(loaded);
      });
    }
  }, [isOpen, paystackEnabled, paystackScriptLoaded]);

  // Persist payment method
  useEffect(() => {
    try {
      localStorage.setItem('storehouse:lastPayMethod:v1', paymentMethod);
    } catch (err) {
      console.warn('[Payment Method] Failed to persist:', err);
    }
  }, [paymentMethod]);

  // Monitor online/offline
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      processOfflineQueue();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process offline queue
  const processOfflineQueue = async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    console.info('[OfflineQueue] Processing', queue.length, 'pending sales...');
    onShowToast?.(`📡 Syncing ${queue.length} offline sale(s)...`);

    for (const queuedSale of queue) {
      try {
        await onSaveSale(queuedSale.payload);
        removeFromQueue(queuedSale.id);
        console.info('[OfflineQueue] Synced:', queuedSale.id);
      } catch (err) {
        console.error('[OfflineQueue] Failed to sync:', queuedSale.id, err);
        break;
      }
    }

    const remaining = getQueue().length;
    if (remaining === 0) {
      onShowToast?.('✅ All offline sales synced!');
    } else {
      onShowToast?.(`⚠️ ${remaining} sale(s) still pending`);
    }
  };

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setCart([]);
      setCartDrawerOpen(false);
      setIsCredit(false);
      setPaymentMethod('Cash');
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
      setCustomerEmail('');
      setShowMorePayments(false);
      setPaymentData(null);
      setCollectingPayment(false);
      setIsProcessing(false);
      setError('');
    }
  }, [isOpen]);

  // Pre-fill cart with calculator items
  useEffect(() => {
    if (isOpen && calculatorItems && calculatorItems.lines.length > 0) {
      console.log('[V2] Pre-filling cart with calculator items:', calculatorItems);

      const cartItems: CartItem[] = calculatorItems.lines.map(line => {
        const item = items.find(i => i.id.toString() === line.itemId || i.name === line.name);
        return {
          id: crypto.randomUUID(),
          itemId: line.itemId,
          name: line.name,
          quantity: line.qty,
          price: line.priceNaira,
          stockAvailable: item?.qty || item?.quantity || 0
        };
      });

      setCart(cartItems);
      onShowToast?.(`Added ${cartItems.length} items from calculator`);
    }
  }, [isOpen, calculatorItems, items, onShowToast]);

  // Pre-fill cart with preselected item
  useEffect(() => {
    if (isOpen && preselectedItem) {
      console.log('[V2] Auto-adding preselected item to cart:', preselectedItem);

      const sellKobo = preselectedItem.sellKobo ?? preselectedItem.sellingPrice ?? preselectedItem.sellPrice ?? 0;
      const sellNaira = Math.round(sellKobo / 100);

      const cartItem: CartItem = {
        id: crypto.randomUUID(),
        itemId: preselectedItem.id.toString(),
        name: preselectedItem.name,
        quantity: 1,
        price: sellNaira,
        stockAvailable: preselectedItem.qty || preselectedItem.quantity || 0
      };

      setCart([cartItem]);
    }
  }, [isOpen, preselectedItem]);

  // Transform items for ItemCombobox
  const itemOptions: ItemOption[] = items.map(item => ({
    id: item.id.toString(),
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    price: Math.round((item.sellKobo ?? item.sellingPrice ?? item.sellPrice ?? 0) / 100),
    stock: item.qty || item.quantity || 0,
    thumbnailUrl: item.thumbnailUrl
  }));

  // Calculate cart totals
  const cartTotals = {
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  // Handle item selection from combobox
  const handleSelectItem = (item: ItemOption) => {
    console.log('[V2 handleSelectItem] Item selected:', item);
    setError('');

    // Check stock availability
    const existingCartItem = cart.find(ci => ci.itemId === item.id);
    const totalQtyInCart = existingCartItem ? existingCartItem.quantity : 0;

    console.log('[V2 handleSelectItem] Existing cart item:', existingCartItem);
    console.log('[V2 handleSelectItem] Total qty in cart:', totalQtyInCart);

    if (totalQtyInCart >= item.stock) {
      console.warn('[V2 handleSelectItem] Stock limit reached');
      setError(`All ${item.stock} units of ${item.name} are already in cart`);
      onShowToast?.(`⚠️ All stock already in cart for ${item.name}`, 3000);
      return;
    }

    // Merge if already in cart, otherwise add new
    if (existingCartItem) {
      const newQty = existingCartItem.quantity + 1;
      console.log('[V2 handleSelectItem] Updating existing item, new qty:', newQty);
      setCart(prev => prev.map(ci =>
        ci.itemId === item.id
          ? { ...ci, quantity: newQty }
          : ci
      ));
      onShowToast?.(`🛒 Updated ${item.name} (qty: ${newQty})`, 2000);
    } else {
      const cartItem: CartItem = {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
        stockAvailable: item.stock
      };
      console.log('[V2 handleSelectItem] Adding new item to cart:', cartItem);
      setCart(prev => {
        const newCart = [...prev, cartItem];
        console.log('[V2 handleSelectItem] New cart state:', newCart);
        return newCart;
      });
      onShowToast?.(`🛒 Added ${item.name} to cart`, 2000);
    }

    // Log analytics
    logSaleEvent('sale_started', {
      item_id: item.id,
      payment_method: paymentMethod,
      amount: item.price
    });
  };

  // Barcode scanning
  useBarcode({
    onScan: (barcode) => {
      console.log('[Barcode] Scanned:', barcode);
      const item = itemOptions.find(i => i.barcode === barcode);
      if (item) {
        handleSelectItem(item);
      } else {
        onShowToast?.(`⚠️ No item found for barcode: ${barcode}`, 3000);
      }
    },
    maxDelay: 50,
    minLength: 3
  });

  // Keyboard shortcuts
  useHotkeys({
    onFocusSearch: () => {
      comboboxRef.current?.focus();
    },
    onCompleteSale: () => {
      if (cart.length > 0 && !isProcessing) {
        handleCompleteSale();
      }
    },
    onIncrementLast: () => {
      if (cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        if (lastItem.quantity < lastItem.stockAvailable) {
          handleUpdateCartQty(lastItem.id, lastItem.quantity + 1);
          onShowToast?.(`📈 ${lastItem.name} qty → ${lastItem.quantity + 1}`, 1500);
        }
      }
    }
  }, isOpen);

  // Handle cart quantity update
  const handleUpdateCartQty = (cartItemId: string, newQty: number) => {
    const cartItem = cart.find(ci => ci.id === cartItemId);
    if (!cartItem) return;

    const validation = ensureQty(newQty, cartItem.stockAvailable);
    if (!validation.ok) {
      setError(validation.msg || 'Invalid quantity');
      return;
    }

    setCart(prev => prev.map(ci =>
      ci.id === cartItemId ? { ...ci, quantity: newQty } : ci
    ));
    setError('');
  };

  // Handle cart item removal
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(ci => ci.id !== cartItemId));
    setError('');
  };

  // Handle phone input
  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    setPhone(digitsOnly);

    const formatted = formatNGPhone(digitsOnly);
    setPhoneDisplay(formatted);

    const validation = validateNGPhone(digitsOnly);
    setPhoneValidation(validation);
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle Paystack payment
  const handlePaystackPayment = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const config = getPaystackConfig();
        const publicKey = getActivePublicKey();

        if (!publicKey) {
          setError('❌ Paystack not configured. Please configure in Business Settings.');
          resolve(false);
          return;
        }

        if (!customerEmail || !validateEmail(customerEmail)) {
          setError('❌ Please enter a valid customer email for card payment');
          resolve(false);
          return;
        }

        if (!paystackScriptLoaded || !(window as any).PaystackPop) {
          setError('❌ Payment system not loaded. Please refresh and try again.');
          resolve(false);
          return;
        }

        const reference = 'SH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const amountInKobo = Math.round(cartTotals.totalAmount * 100);

        const handler = (window as any).PaystackPop.setup({
          key: publicKey,
          email: customerEmail,
          amount: amountInKobo,
          currency: 'NGN',
          ref: reference,
          callback: function(response: any) {
            console.log('✅ Payment successful:', response);
            setPaymentData({
              reference: response.reference,
              amount: cartTotals.totalAmount,
              email: customerEmail,
              status: 'success',
              method: 'Card'
            });
            setCollectingPayment(false);
            resolve(true);
          },
          onClose: function() {
            console.log('⚠️ Payment cancelled by user');
            setError('Payment cancelled. Please try again.');
            setCollectingPayment(false);
            resolve(false);
          }
        });

        setCollectingPayment(true);
        handler.openIframe();
      } catch (error) {
        console.error('❌ Paystack error:', error);
        setError('Failed to open payment window. Please try again.');
        setCollectingPayment(false);
        resolve(false);
      }
    });
  };

  // Complete sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items first.');
      return;
    }

    // Validate credit fields
    if (isCredit && (!customerName.trim() || !dueDate)) {
      setError('Please enter customer name and due date for credit sales');
      return;
    }

    // Validate Card payment email
    if (paymentMethod === 'Card' && !isCredit && (!customerEmail || !validateEmail(customerEmail))) {
      setError('Please enter a valid customer email for card payment');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Handle Paystack payment if Card method selected
      if (paymentMethod === 'Card' && !isCredit) {
        const paymentSuccess = await handlePaystackPayment();
        if (!paymentSuccess) {
          setIsProcessing(false);
          return;
        }
      }

      // Check if offline and queue sale
      if (offline || !navigator.onLine) {
        console.info('[V2] Offline detected - queuing sale');

        for (const cartItem of cart) {
          const saleData = {
            itemId: cartItem.itemId,
            quantity: cartItem.quantity.toString(),
            sellPrice: cartItem.price.toString(),
            isCreditSale: isCredit,
            customerName: isCredit ? customerName : (customerEmail || ''),
            phone: phone,
            dueDate: isCredit ? new Date(dueDate).toISOString() : '',
            note: isCredit ? message : '',
            sendWhatsApp: false,
            hasConsent: isCredit ? hasConsent : false,
            paymentMethod: paymentMethod,
            paymentReference: paymentData?.reference || undefined,
            paymentEmail: paymentData?.email || undefined
          };

          enqueueSale(saleData);
        }

        logSaleEvent('sale_completed', {
          item_count: cart.length,
          amount: cartTotals.totalAmount,
          payment_method: paymentMethod,
          is_credit: isCredit
        });

        onShowToast?.('📴 Offline - Sale queued. Will sync automatically.', 5000);

        setCart([]);
        setCartDrawerOpen(false);
        setIsProcessing(false);
        onClose();
        return;
      }

      // Process all cart items
      for (const cartItem of cart) {
        const saleData = {
          itemId: cartItem.itemId,
          quantity: cartItem.quantity.toString(),
          sellPrice: cartItem.price.toString(),
          isCreditSale: isCredit,
          customerName: isCredit ? customerName : (customerEmail || ''),
          phone: phone,
          dueDate: isCredit ? new Date(dueDate).toISOString() : '',
          note: isCredit ? message : '',
          sendWhatsApp: false,
          hasConsent: isCredit ? hasConsent : false,
          paymentMethod: paymentMethod,
          paymentReference: paymentData?.reference || undefined,
          paymentEmail: paymentData?.email || undefined
        };

        console.log('[V2] Processing item:', cartItem.name, 'isCreditSale:', saleData.isCreditSale);
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
          }
        }
      }

      // Send WhatsApp receipt for entire cart
      if (sendWhatsApp && phone && phoneValidation.valid) {
        try {
          const businessName = profile.businessName || 'Storehouse';
          const customerDisplayName = isCredit ? customerName : 'Customer';

          const formattedDate = new Date().toLocaleDateString('en-NG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const itemsSection = cart.map((item, index) => {
            const itemNum = cart.length > 1 ? `${index + 1}. ` : '• ';
            const itemTotal = item.price * item.quantity;
            return `${itemNum}${item.name}\n   ${item.quantity} × ₦${item.price.toLocaleString()} = ₦${itemTotal.toLocaleString()}`;
          }).join('\n\n');

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

          await openWhatsApp(phone, receipt);
        } catch (error) {
          console.error('[WhatsApp] Error sending cart receipt:', error);
        }
      }

      // Log analytics
      logSaleEvent('sale_completed', {
        item_count: cart.length,
        amount: cartTotals.totalAmount,
        payment_method: paymentMethod,
        is_credit: isCredit
      });

      // Success toast
      const itemCount = cart.length;
      const itemWord = itemCount === 1 ? 'item' : 'items';
      const formattedTotal = formatNGN(cartTotals.totalAmount);

      let toastMessage = '';
      if (isCredit) {
        if (sendWhatsApp && phone && phoneValidation.valid) {
          const lastFour = phone.slice(-4);
          toastMessage = `✅ Credit sale recorded for ${customerName}\n💳 ${itemCount} ${itemWord} • ${formattedTotal}\n📱 WhatsApp receipt sent to ...${lastFour}`;
        } else {
          toastMessage = `✅ Credit sale recorded for ${customerName}\n💳 ${itemCount} ${itemWord} • ${formattedTotal}`;
        }
      } else {
        if (sendWhatsApp && phone && phoneValidation.valid) {
          const lastFour = phone.slice(-4);
          toastMessage = `✅ Sale recorded! WhatsApp receipt sent to ...${lastFour}\n💰 ${itemCount} ${itemWord} sold for ${formattedTotal}`;
        } else {
          toastMessage = `✅ Sale recorded! ${itemCount} ${itemWord} sold for ${formattedTotal}`;
        }
      }

      onShowToast?.(toastMessage, 4500);

      setCart([]);
      setCartDrawerOpen(false);
      setIsProcessing(false);
      onClose();

    } catch (error) {
      console.error('[V2 Save] Error:', error);

      logSaleEvent('sale_failed', {
        item_count: cart.length,
        amount: cartTotals.totalAmount,
        payment_method: paymentMethod,
        error: String(error)
      });

      // Check if network error - queue if offline
      const isNetworkError = error instanceof Error &&
        (error.message.includes('network') ||
         error.message.includes('offline') ||
         error.message.includes('fetch'));

      if (isNetworkError) {
        console.info('[V2 Save] Network error detected - queuing sale');
        for (const cartItem of cart) {
          const saleData = {
            itemId: cartItem.itemId,
            quantity: cartItem.quantity.toString(),
            sellPrice: cartItem.price.toString(),
            isCreditSale: isCredit,
            customerName: isCredit ? customerName : (customerEmail || ''),
            phone: phone,
            dueDate: isCredit ? new Date(dueDate).toISOString() : '',
            note: isCredit ? message : '',
            sendWhatsApp: false,
            hasConsent: isCredit ? hasConsent : false,
            paymentMethod: paymentMethod
          };
          enqueueSale(saleData);
        }

        onShowToast?.('📴 Network error - Sale queued for sync.', 5000);
        setCart([]);
        setCartDrawerOpen(false);
        setIsProcessing(false);
        onClose();
      } else {
        onShowToast?.('❌ Couldn\'t save. Please try again.', 4000);
        setError('Failed to complete sale. Please try again.');
        setIsProcessing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="rs-overlay" onClick={onClose}>
        <div
          ref={modalRef}
          className="rs-modal"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rs-modal-title-v2"
        >
          {/* Header */}
          <div className="rs-header">
            <h2 id="rs-modal-title-v2">Record Sale</h2>
            <button className="rs-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {/* Offline banner */}
          {offline && (
            <div className="rs-offline-banner" role="alert">
              📴 You're offline. Sales will be queued and synced automatically when back online.
            </div>
          )}

          {/* Body */}
          <div className="rs-body">
            {/* Item Combobox */}
            <ItemCombobox
              items={itemOptions}
              onSelect={handleSelectItem}
              autoFocus
              disabled={isProcessing}
            />

            {/* Payment & Customer Section */}
            <div className="sales-section">
              {/* Credit Toggle */}
              <div className="rs-field">
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

              {/* Payment Method - Only show for cash sales */}
              {!isCredit && (
                <div className="payment-selector">
                  {/* Primary payment method */}
                  <div className="payment-primary">
                    <label className="payment-radio">
                      <input
                        type="radio"
                        name="payment"
                        value={paymentMethod}
                        checked
                        onChange={() => {}}
                      />
                      <span>{paymentMethod}</span>
                    </label>
                  </div>

                  {/* More methods button */}
                  {!showMorePayments && (
                    <button
                      type="button"
                      className="payment-more-btn"
                      onClick={() => setShowMorePayments(true)}
                    >
                      More payment methods...
                    </button>
                  )}

                  {/* Expanded payment options */}
                  {showMorePayments && (
                    <div className="payment-options">
                      {(['Cash', 'POS', 'Card', 'Transfer'] as const).map((method) => (
                        <label key={method} className="payment-radio">
                          <input
                            type="radio"
                            name="payment"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value as PaymentMethod);
                              setShowMorePayments(false);
                            }}
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                      {/* Paystack note for Card/Transfer if not enabled */}
                      {!paystackEnabled && (paymentMethod === 'Card' || paymentMethod === 'Transfer') && (
                        <div style={{
                          fontSize: '12px',
                          color: '#f59e0b',
                          padding: '8px',
                          background: '#fef3c7',
                          borderRadius: '6px',
                          marginTop: '8px'
                        }}>
                          💳 Card/Transfer requires Paystack setup in Settings
                        </div>
                      )}
                      {false && paystackEnabled && (['Card', 'Transfer'] as const).map((method) => (
                        <label key={method} className="payment-radio">
                          <input
                            type="radio"
                            name="payment"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value as PaymentMethod);
                              setShowMorePayments(false);
                            }}
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Email - Card payment */}
              {!isCredit && paymentMethod === 'Card' && (
                <div className="rs-field">
                  <label htmlFor="customer-email" className="sales-label">
                    Customer Email *
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    className="combobox-input"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                  {customerEmail && !validateEmail(customerEmail) && (
                    <small className="rs-error">❌ Please enter a valid email</small>
                  )}
                </div>
              )}

              {/* Credit Fields */}
              {isCredit && (
                <div className="sales-section">
                  <div className="rs-field">
                    <label htmlFor="customer-name" className="sales-label">
                      Customer Name *
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      className="combobox-input"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  <div className="rs-field">
                    <label htmlFor="due-date" className="sales-label">
                      Due Date *
                    </label>
                    <input
                      id="due-date"
                      type="date"
                      className="combobox-input"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="rs-field">
                    <label htmlFor="message" className="sales-label">
                      Message (optional)
                    </label>
                    <textarea
                      id="message"
                      className="combobox-input"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="e.g. Thank you"
                      rows={2}
                      maxLength={120}
                    />
                  </div>
                </div>
              )}

              {/* WhatsApp Receipt */}
              <div className="sales-section">
                <div className="rs-field">
                  <label htmlFor="whatsapp-phone" className="sales-label">
                    Customer Phone (Optional)
                  </label>
                  <input
                    id="whatsapp-phone"
                    type="tel"
                    className="combobox-input"
                    value={phoneDisplay}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="080 1234 5678"
                  />
                  {phone && phoneValidation.message && (
                    <small className={phoneValidation.valid ? 'rs-help' : 'rs-error'}>
                      {phoneValidation.message}
                    </small>
                  )}
                </div>

                {phone && phoneValidation.valid && (
                  <div className="rs-field">
                    <label className="rs-checkbox">
                      <input
                        type="checkbox"
                        checked={sendWhatsApp}
                        onChange={e => setSendWhatsApp(e.target.checked)}
                      />
                      <span>Send WhatsApp receipt</span>
                    </label>
                  </div>
                )}

                {sendWhatsApp && isCredit && (
                  <div className="rs-field">
                    <label className="rs-checkbox">
                      <input
                        type="checkbox"
                        checked={hasConsent}
                        onChange={e => setHasConsent(e.target.checked)}
                        required
                      />
                      <span style={{ fontSize: '13px' }}>
                        I have customer's consent to receive WhatsApp messages *
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="rs-cart-error">
              {error}
            </div>
          )}

          {/* Sticky Cart Bar */}
          <div
            className="sticky-cart-bar"
            onClick={() => cart.length > 0 && setCartDrawerOpen(true)}
            role={cart.length > 0 ? "button" : undefined}
            tabIndex={cart.length > 0 ? 0 : undefined}
          >
            <div className="cart-bar-icon">🛒</div>
            <div className="cart-bar-info">
              <div className="cart-bar-count">
                {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'item' : 'items'}
              </div>
              <div className="cart-bar-total">{formatNGN(cartTotals.totalAmount)}</div>
            </div>
            {cart.length > 0 && <div style={{ opacity: 0.8, fontSize: '12px' }}>View →</div>}
          </div>

          {/* Bottom Action Bar */}
          <div className="rs-bottom-bar">
            <button
              type="button"
              className="rs-bottom-btn"
              onClick={onOpenCalculator}
              disabled={isProcessing}
            >
              <Calculator size={20} strokeWidth={2} />
              <span>Calculator</span>
            </button>
            <button
              type="button"
              className="rs-bottom-btn"
              onClick={onOpenSettings}
              disabled={isProcessing}
            >
              <Settings size={20} strokeWidth={2} />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className="rs-bottom-btn rs-bottom-btn-primary"
              onClick={handleCompleteSale}
              disabled={
                isProcessing ||
                collectingPayment ||
                cart.length === 0 ||
                (isCredit && (!customerName.trim() || !dueDate))
              }
            >
              <span>{collectingPayment ? 'Processing...' : isProcessing ? 'Processing...' : `Complete (${cart.length})`}</span>
            </button>
            <button
              type="button"
              className="rs-bottom-btn"
              onClick={onClose}
              disabled={isProcessing}
            >
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cart Drawer Overlay */}
      {cartDrawerOpen && (
        <div className="cart-drawer-overlay" onClick={() => setCartDrawerOpen(false)}>
          <div className="cart-drawer-wrapper" onClick={e => e.stopPropagation()}>
            <CartDrawer
              items={cart}
              onChangeQty={handleUpdateCartQty}
              onRemove={handleRemoveFromCart}
              onClose={() => setCartDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
