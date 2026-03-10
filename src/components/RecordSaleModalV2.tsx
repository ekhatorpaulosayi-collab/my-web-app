import React, { useState, useEffect, useRef } from 'react';
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
import { formatNGPhone, validateInternationalPhone } from '../utils/phone';
import { openWhatsApp } from '../utils/whatsapp';
import { ReceiptOptionsModal } from './ReceiptOptionsModal';
import {
  isPaystackEnabled,
  getActivePublicKey,
  getPaystackConfig,
  loadPaystackScript,
  type PaymentMethod,
  type PaymentData
} from '../utils/paystackSettings';
import { getProductVariants } from '../lib/supabase-variants';
import type { ProductVariant } from '../types/variants';

/**
 * Generate UUID with fallback for non-secure contexts
 * crypto.randomUUID() requires HTTPS or localhost on newer browsers
 */
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback
    }
  }
  // Fallback for non-secure contexts or older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  onShowToast
}: RecordSaleModalV2Props) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Variant state
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariant[]>>({});
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<ItemOption | null>(null);

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
  const [salesChannel, setSalesChannel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('storehouse:lastSalesChannel:v1');
      return saved || 'in-store';
    } catch {
      return 'in-store';
    }
  });
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneValidation, setPhoneValidation] = useState({ valid: true, message: '' });
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showMorePayments, setShowMorePayments] = useState(false);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const showingReceiptRef = useRef(false); // Track receipt state to prevent race condition

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

  // Persist sales channel
  useEffect(() => {
    try {
      localStorage.setItem('storehouse:lastSalesChannel:v1', salesChannel);
    } catch (err) {
      console.warn('[Sales Channel] Failed to persist:', err);
    }
  }, [salesChannel]);

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

  // Fetch variants for all products
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const fetchVariants = async () => {
        const variantsMap: Record<string, ProductVariant[]> = {};

        for (const item of items) {
          try {
            const variants = await getProductVariants(item.id.toString());
            if (variants.length > 0) {
              variantsMap[item.id.toString()] = variants;
            }
          } catch (error) {
            console.error(`Failed to fetch variants for product ${item.id}:`, error);
          }
        }

        setProductVariants(variantsMap);
      };

      fetchVariants();
    }
  }, [isOpen, items]);

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
  // IMPORTANT: Don't reset if we just completed a sale and are showing receipt
  useEffect(() => {
    console.log('[RecordSale] useEffect triggered - isOpen:', isOpen, 'showReceiptModal:', showReceiptModal, 'receiptData:', !!receiptData, 'showingReceiptRef:', showingReceiptRef.current);
    if (!isOpen) {
      // If receipt modal is showing or has data, DON'T reset yet
      // User is still interacting with the receipt
      // Check ref first (prevents race condition), then state
      if (showingReceiptRef.current || showReceiptModal || receiptData) {
        console.log('[RecordSale] Modal closed but receipt is showing - NOT resetting state');
        return;
      }

      console.log('[RecordSale] Modal is CLOSED, resetting ALL state including receipt modal');
      setCart([]);
      setCartDrawerOpen(false);
      setIsCredit(false);
      // Don't reset paymentMethod and salesChannel - persist last selection
      setCustomerName('');
      setPhone('');
      setPhoneDisplay('');
      setPhoneValidation({ valid: true, message: '' });
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setDueDate(today.toISOString().split('T')[0]);
      setMessage('');
      setCustomerEmail('');
      setShowMorePayments(false);
      setPaymentData(null);
      setCollectingPayment(false);
      setIsProcessing(false);
      setError('');
      setReceiptData(null);
      showingReceiptRef.current = false;
      console.log('[RecordSale] All state reset');
    } else {
      console.log('[RecordSale] Modal is OPEN');
    }
  }, [isOpen, showReceiptModal, receiptData]);

  // Pre-fill cart with calculator items
  useEffect(() => {
    if (isOpen && calculatorItems && calculatorItems.lines.length > 0) {
      console.log('[V2] Pre-filling cart with calculator items:', calculatorItems);

      const cartItems: CartItem[] = calculatorItems.lines.map(line => {
        const item = items.find(i => i.id.toString() === line.itemId || i.name === line.name);
        return {
          id: generateUUID(),
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

  // Pre-fill cart with preselected item (or show variant picker if has variants)
  useEffect(() => {
    if (isOpen && preselectedItem) {
      console.log('[V2] Processing preselected item:', preselectedItem);

      // Check if product has variants
      const variants = productVariants[preselectedItem.id.toString()];
      if (variants && variants.length > 0) {
        console.log('[V2] Preselected item has variants, showing picker:', variants);
        // Show variant picker instead of auto-adding
        const itemOption: ItemOption = {
          id: preselectedItem.id.toString(),
          name: preselectedItem.name,
          category: preselectedItem.category || '',
          price: Math.round((preselectedItem.sellKobo ?? preselectedItem.sellingPrice ?? preselectedItem.sellPrice ?? 0) / 100),
          stock: preselectedItem.qty || preselectedItem.quantity || 0
        };
        setSelectedProductForVariant(itemOption);
        setShowVariantPicker(true);
        return;
      }

      // No variants - auto-add to cart
      console.log('[V2] Auto-adding preselected item to cart (no variants)');
      const sellKobo = preselectedItem.sellKobo ?? preselectedItem.sellingPrice ?? preselectedItem.sellPrice ?? 0;
      const sellNaira = Math.round(sellKobo / 100);

      const cartItem: CartItem = {
        id: generateUUID(),
        itemId: preselectedItem.id.toString(),
        name: preselectedItem.name,
        quantity: 1,
        price: sellNaira,
        stockAvailable: preselectedItem.qty || preselectedItem.quantity || 0
      };

      setCart([cartItem]);
    }
  }, [isOpen, preselectedItem, productVariants]);

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

    // Check if product has variants
    const variants = productVariants[item.id];
    if (variants && variants.length > 0) {
      console.log('[V2 handleSelectItem] Product has variants, showing picker:', variants);
      setSelectedProductForVariant(item);
      setShowVariantPicker(true);
      return;
    }

    // Check stock availability
    const existingCartItem = cart.find(ci => ci.itemId === item.id && !ci.variantId);
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
        ci.itemId === item.id && !ci.variantId
          ? { ...ci, quantity: newQty }
          : ci
      ));
      onShowToast?.(`🛒 Updated ${item.name} (qty: ${newQty})`, 2000);
    } else {
      const cartItem: CartItem = {
        id: generateUUID(),
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

  // Handle variant selection
  const handleVariantSelected = (variant: ProductVariant) => {
    if (!selectedProductForVariant) return;

    console.log('[V2 handleVariantSelected] Variant selected:', variant);
    setError('');

    // Check if variant has stock
    if (variant.quantity <= 0) {
      setError(`${variant.variant_name} is out of stock`);
      onShowToast?.(`⚠️ ${variant.variant_name} is out of stock`, 3000);
      return;
    }

    // Check if this specific variant is already in cart
    const existingCartItem = cart.find(ci => ci.variantId === variant.id);
    const totalQtyInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (totalQtyInCart >= variant.quantity) {
      setError(`All ${variant.quantity} units of ${variant.variant_name} are already in cart`);
      onShowToast?.(`⚠️ All stock already in cart for ${variant.variant_name}`, 3000);
      return;
    }

    // Get price (variant price override or product base price)
    const variantPrice = variant.price_override
      ? Math.round(variant.price_override / 100)
      : selectedProductForVariant.price;

    // Merge if already in cart, otherwise add new
    if (existingCartItem) {
      const newQty = existingCartItem.quantity + 1;
      console.log('[V2 handleVariantSelected] Updating existing variant, new qty:', newQty);
      setCart(prev => prev.map(ci =>
        ci.variantId === variant.id
          ? { ...ci, quantity: newQty }
          : ci
      ));
      onShowToast?.(`🛒 Updated ${selectedProductForVariant.name} - ${variant.variant_name} (qty: ${newQty})`, 2000);
    } else {
      const cartItem: CartItem = {
        id: generateUUID(),
        itemId: selectedProductForVariant.id,
        variantId: variant.id,
        name: `${selectedProductForVariant.name} - ${variant.variant_name}`,
        quantity: 1,
        price: variantPrice,
        stockAvailable: variant.quantity
      };
      console.log('[V2 handleVariantSelected] Adding new variant to cart:', cartItem);
      setCart(prev => [...prev, cartItem]);
      onShowToast?.(`🛒 Added ${cartItem.name} to cart`, 2000);
    }

    // Close variant picker
    setShowVariantPicker(false);
    setSelectedProductForVariant(null);

    // Log analytics
    logSaleEvent('sale_started', {
      item_id: selectedProductForVariant.id,
      variant_id: variant.id,
      payment_method: paymentMethod,
      amount: variantPrice
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
    // Keep + sign and digits only, remove other characters
    const cleanValue = value.replace(/[^\d+]/g, '');
    // Extract digits for validation (remove + for validation logic)
    const digitsOnly = cleanValue.replace(/\+/g, '');

    setPhone(digitsOnly);
    setPhoneDisplay(cleanValue); // Show the + sign in the input

    const validation = validateInternationalPhone(digitsOnly);
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
            paymentMethod: paymentMethod,
            paymentReference: paymentData?.reference || undefined,
            paymentEmail: paymentData?.email || undefined,
            salesChannel: salesChannel
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
          paymentMethod: paymentMethod,
          paymentReference: paymentData?.reference || undefined,
          paymentEmail: paymentData?.email || undefined,
          salesChannel: salesChannel
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

      // Log analytics
      logSaleEvent('sale_completed', {
        item_count: cart.length,
        amount: cartTotals.totalAmount,
        payment_method: paymentMethod,
        is_credit: isCredit
      });

      // Prepare receipt data for modal
      const businessName = profile.businessName || 'Storehouse';
      console.log('[RecordSale] Preparing receipt data');
      console.log('[RecordSale] phone:', phone);
      console.log('[RecordSale] phoneValidation:', phoneValidation);
      console.log('[RecordSale] phone && phoneValidation.valid:', phone && phoneValidation.valid);

      const receipt = {
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: cartTotals.totalAmount,
        paymentMethod: isCredit ? 'Credit' : paymentMethod,
        isCredit,
        dueDate: isCredit ? dueDate : undefined,
        customerName: isCredit ? customerName : customerEmail,
        customerPhone: phone && phoneValidation.valid ? phone : undefined,
        businessName,
        timestamp: new Date()
      };

      console.log('[RecordSale] Receipt data created:', receipt);

      // Success toast
      const itemCount = cart.length;
      const itemWord = itemCount === 1 ? 'item' : 'items';
      const formattedTotal = formatNGN(cartTotals.totalAmount);

      let toastMessage = '';
      if (isCredit) {
        toastMessage = `✅ Sale recorded!\n💰 ${itemCount} ${itemWord} sold for ${formattedTotal}`;
      } else {
        toastMessage = `✅ Sale recorded!\n💰 ${itemCount} ${itemWord} sold for ${formattedTotal}`;
      }

      onShowToast?.(toastMessage, 4500);

      // Clear form
      setCart([]);
      setCartDrawerOpen(false);
      setIsProcessing(false);

      // Show receipt options modal (keep sale modal open in background)
      console.log('[RecordSale] ✅ Sale saved, showing receipt modal');
      console.log('[RecordSale] Receipt data:', receipt);
      console.log('[RecordSale] About to set receipt state...');

      // Set ref FIRST to prevent race condition with useEffect
      showingReceiptRef.current = true;
      console.log('[RecordSale] showingReceiptRef set to TRUE');

      setReceiptData(receipt);
      console.log('[RecordSale] receiptData state set');
      setShowReceiptModal(true);
      console.log('[RecordSale] showReceiptModal set to TRUE');

      // Log state in next tick to verify it was set
      setTimeout(() => {
        console.log('[RecordSale] State after 100ms:');
        console.log('[RecordSale] - isOpen:', isOpen);
        console.log('[RecordSale] - showReceiptModal should be true');
        console.log('[RecordSale] - receiptData should exist');
        console.log('[RecordSale] - showingReceiptRef:', showingReceiptRef.current);
      }, 100);

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
            paymentMethod: paymentMethod,
            salesChannel: salesChannel
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

  // Don't return null if showing receipt modal - we need to keep component mounted
  if (!isOpen && !showReceiptModal && !receiptData) return null;

  return (
    <>
      {/* Show sales modal only when parent says isOpen */}
      {isOpen && (
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

              {/* Sales Channel Selector */}
              <div className="rs-field">
                <label htmlFor="sales-channel" className="sales-label">
                  Sales Channel
                </label>
                <select
                  id="sales-channel"
                  className="combobox-input"
                  value={salesChannel}
                  onChange={e => setSalesChannel(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '15px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="in-store">🏪 In-Store / Walk-in</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="instagram">📷 Instagram</option>
                  <option value="facebook">📘 Facebook</option>
                  <option value="website">🌐 Online Store</option>
                  <option value="tiktok">🎵 TikTok</option>
                  <option value="referral">👥 Referral</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>

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

              {/* Customer Contact Info */}
              <div className="sales-section">
                <div className="rs-field">
                  <label htmlFor="customer-phone" className="sales-label">
                    Customer Phone Number (optional)
                  </label>
                  <input
                    id="customer-phone"
                    type="text"
                    className="combobox-input"
                    value={phoneDisplay}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="+234 801 234 5678 or 080 1234 5678"
                  />
                  {phone && phoneValidation.message && (
                    <small className={phoneValidation.valid ? 'rs-help' : 'rs-error'}>
                      {phoneValidation.message}
                    </small>
                  )}
                  <small className="rs-help" style={{ display: 'block', marginTop: '4px' }}>
                    You'll be able to send a receipt after completing the sale
                  </small>
                </div>
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
            className={`rs-cart-bar ${cart.length > 0 ? 'clickable' : ''}`}
            onClick={() => cart.length > 0 && setCartDrawerOpen(true)}
            role={cart.length > 0 ? "button" : undefined}
            tabIndex={cart.length > 0 ? 0 : undefined}
          >
            <div className="rs-cart-summary">
              <div className="rs-cart-icon">🛒</div>
              <div className="rs-cart-info">
                <div className="rs-cart-count">
                  {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'item' : 'items'}
                </div>
                <div className="rs-cart-total">{formatNGN(cartTotals.totalAmount)}</div>
              </div>
            </div>
            {cart.length > 0 && <div style={{ opacity: 0.8, fontSize: '12px' }}>View →</div>}
          </div>

          {/* Footer */}
          <div className="rs-footer">
            <button
              type="button"
              className="rs-primary"
              onClick={handleCompleteSale}
              disabled={
                isProcessing ||
                collectingPayment ||
                cart.length === 0 ||
                (isCredit && (!customerName.trim() || !dueDate))
              }
            >
              {collectingPayment ? 'Processing Payment...' : isProcessing ? 'Processing...' : `Complete Sale (${cart.length})`}
            </button>
            <button type="button" className="rs-link" onClick={onClose} disabled={isProcessing}>
              Cancel
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

      {/* Variant Picker Modal */}
      {showVariantPicker && selectedProductForVariant && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => {
            setShowVariantPicker(false);
            setSelectedProductForVariant(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '70vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '18px', fontWeight: 700 }}>
                Select Variant
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                {selectedProductForVariant.name}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {productVariants[selectedProductForVariant.id]?.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelected(variant)}
                  disabled={variant.quantity <= 0}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: variant.quantity > 0 ? 'white' : '#f9fafb',
                    cursor: variant.quantity > 0 ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    opacity: variant.quantity > 0 ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (variant.quantity > 0) {
                      e.currentTarget.style.borderColor = '#00894F';
                      e.currentTarget.style.background = '#f0fdf4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (variant.quantity > 0) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                      {variant.variant_name}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#00894F' }}>
                      ₦{((variant.price_override || selectedProductForVariant.price * 100) / 100).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: variant.quantity > 0 ? '#16a34a' : '#ef4444' }}>
                    {variant.quantity > 0 ? `${variant.quantity} in stock` : 'Out of stock'}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowVariantPicker(false);
                setSelectedProductForVariant(null);
              }}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      )}

      {/* Receipt Options Modal - Always render if we have receipt data, regardless of parent isOpen */}
      {console.log('[RecordSale] RENDER - showReceiptModal:', showReceiptModal, 'receiptData:', !!receiptData)}
      {showReceiptModal && receiptData ? (
        <>
          {console.log('[RecordSale] RENDERING ReceiptOptionsModal')}
          <ReceiptOptionsModal
            isOpen={showReceiptModal}
            onClose={() => {
              console.log('[RecordSale] Receipt modal closing');
              showingReceiptRef.current = false; // Clear ref when receipt closes
              setShowReceiptModal(false);
              setReceiptData(null);
              // Now close the parent sales modal too
              onClose();
            }}
            receiptData={receiptData}
          />
        </>
      ) : (
        console.log('[RecordSale] NOT rendering receipt modal - showReceiptModal:', showReceiptModal, 'receiptData:', !!receiptData)
      )}
    </>
  );
}
