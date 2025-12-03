/**
 * Cart Sidebar Component
 * Shows cart items and checkout
 */

import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2, Phone, CreditCard, Tag, Copy, Check } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { currencyNGN } from '../utils/format';
import type { StoreProfile, PaymentMethod } from '../types';
import { getDisplayFields, formatAttributeValue, getAttributeIcon } from '../config/categoryAttributes';
import { supabase } from '../lib/supabase';
import { saveOnlineStoreOrder } from '../utils/onlineStoreSales';
import '../styles/cart.css';

// Payment method provider configurations
const PAYMENT_PROVIDERS: Record<string, { name: string; icon: string; color: string }> = {
  opay: { name: 'OPay', icon: '🟢', color: '#00C087' },
  moniepoint: { name: 'Moniepoint', icon: '🔵', color: '#0066FF' },
  palmpay: { name: 'PalmPay', icon: '🟣', color: '#8B5CF6' },
  kuda: { name: 'Kuda Bank', icon: '🟣', color: '#8B5CF6' },
  bank: { name: 'Bank Account', icon: '🏦', color: '#3B82F6' },
  other: { name: 'Other', icon: '💳', color: '#6B7280' }
};

interface CartProps {
  store: StoreProfile;
}

export function Cart({ store }: CartProps) {
  const { items, itemCount, totalPrice, updateQuantity, removeItem, clearCart, isCartOpen, closeCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'whatsapp' | string>('whatsapp');
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<PaymentMethod | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Check if Paystack is enabled
  const paystackEnabled = store.paystackEnabled && store.paystackPublicKey;

  // Get available payment methods (multi-payment + legacy)
  const availablePaymentMethods = store.payment_methods?.filter(m => m.enabled) || [];

  // Calculate discount and final total
  const discount = appliedPromo
    ? appliedPromo.discount_type === 'percentage'
      ? Math.round((totalPrice * appliedPromo.discount_value) / 100)
      : appliedPromo.discount_value * 100 // Convert NGN to kobo
    : 0;
  const finalTotal = Math.max(0, totalPrice - discount);

  // Load Paystack script when checkout opens with Paystack option
  useEffect(() => {
    if (isCheckingOut && paystackEnabled && paymentMethod === 'paystack') {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        // Cleanup: remove script when component unmounts or checkout closes
        const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, [isCheckingOut, paystackEnabled, paymentMethod]);

  if (!isCartOpen) return null;

  // Validate and apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    setCheckingPromo(true);
    setPromoError('');

    try {
      // Get store owner's user ID from store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('user_id')
        .eq('id', store.id)
        .single();

      if (storeError || !storeData) {
        setPromoError('Unable to verify promo code');
        return;
      }

      // Validate promo code
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('user_id', storeData.user_id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setPromoError('Invalid promo code');
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('This promo code has expired');
        return;
      }

      // Check if max uses reached
      if (data.max_uses && data.used_count >= data.max_uses) {
        setPromoError('This promo code has reached its usage limit');
        return;
      }

      // Apply the promo
      setAppliedPromo(data);
      setPromoError('');
      alert(`✅ Promo applied! You saved ${data.discount_type === 'percentage' ? `${data.discount_value}%` : currencyNGN(data.discount_value * 100)}`);
    } catch (error) {
      console.error('Error applying promo:', error);
      setPromoError('Failed to apply promo code');
    } finally {
      setCheckingPromo(false);
    }
  };

  // Remove promo code
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  const handlePaystackPayment = () => {
    if (!customerName || !customerPhone) {
      alert('Please enter your name and phone number');
      return;
    }

    if (!paystackEnabled || !store.paystackPublicKey) {
      alert('Payment system not configured');
      return;
    }

    setProcessingPayment(true);

    try {
      // @ts-ignore - Paystack script loaded dynamically
      const handler = window.PaystackPop.setup({
        key: store.paystackPublicKey,
        email: customerPhone + '@customer.store', // Use phone as email fallback
        amount: finalTotal, // Amount in kobo (Paystack uses smallest currency unit) - includes discount
        currency: 'NGN',
        ref: 'STORE_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        metadata: {
          custom_fields: [
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: customerName
            },
            {
              display_name: 'Phone Number',
              variable_name: 'phone_number',
              value: customerPhone
            },
            {
              display_name: 'Delivery Address',
              variable_name: 'delivery_address',
              value: customerAddress || 'N/A'
            },
            {
              display_name: 'Store',
              variable_name: 'store',
              value: store.businessName
            }
          ]
        },
        onClose: function() {
          setProcessingPayment(false);
          alert('Payment cancelled');
        },
        callback: async function(response: any) {
          setProcessingPayment(false);

          // Payment successful
          alert('✅ Payment successful! Reference: ' + response.reference);

          // Save order to sales database
          if (store.user_id) {
            try {
              const orderResult = await saveOnlineStoreOrder({
                storeUserId: store.user_id,
                items: items,
                customer: {
                  name: customerName,
                  phone: customerPhone,
                  email: undefined,
                  address: customerAddress || undefined,
                },
                subtotal: totalPrice,
                discount: discount,
                finalTotal: finalTotal,
                paymentMethod: 'paystack',
                paymentReference: response.reference,
                promoCode: appliedPromo?.code,
              });

              if (orderResult.success) {
                console.log('✅ Order saved to database');
              } else {
                console.error('⚠️ Order save failed:', orderResult.error);
                // Don't fail checkout, merchant still got paid
              }
            } catch (error) {
              console.error('⚠️ Order save error:', error);
              // Don't fail checkout
            }
          }

          // Track promo code usage if applied
          if (appliedPromo) {
            try {
              // Record usage in promo_code_usage table
              await supabase.from('promo_code_usage').insert([{
                promo_code_id: appliedPromo.id,
                order_total: totalPrice,
                discount_amount: discount,
                final_total: finalTotal,
                customer_name: customerName,
                customer_phone: customerPhone,
              }]);

              // Increment used_count in promo_codes table
              await supabase
                .from('promo_codes')
                .update({ used_count: appliedPromo.used_count + 1 })
                .eq('id', appliedPromo.id);
            } catch (error) {
              console.error('Error tracking promo usage:', error);
              // Don't fail the checkout if tracking fails
            }
          }

          // Send order confirmation via WhatsApp if number is available
          if (store.whatsappNumber) {
            let phone = store.whatsappNumber.replace(/\D/g, '');
            if (phone.startsWith('0')) {
              phone = '234' + phone.substring(1);
            } else if (!phone.startsWith('234')) {
              phone = '234' + phone;
            }

            const orderItems = items.map(item =>
              `\n• ${item.name} (x${item.quantity}) - ${currencyNGN(item.price * item.quantity)}`
            ).join('');

            const message = `✅ *PAID ORDER - ${store.businessName}*\n\n` +
              `👤 Customer: ${customerName}\n` +
              `📱 Phone: ${customerPhone}` +
              (customerAddress ? `\n📍 Address: ${customerAddress}` : '') +
              `\n\n📦 *Order Details:*${orderItems}\n\n` +
              `💰 *Subtotal: ${currencyNGN(totalPrice)}*\n` +
              (appliedPromo ? `🎁 *Discount (${appliedPromo.code}): -${currencyNGN(discount)}*\n` : '') +
              `💵 *Total Paid: ${currencyNGN(finalTotal)}*\n\n` +
              `✅ *Payment Status: PAID*\n` +
              `🔖 *Reference: ${response.reference}*`;

            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
          }

          // Clear cart and close
          clearCart();
          setCustomerName('');
          setCustomerPhone('');
          setCustomerAddress('');
          setAppliedPromo(null);
          setPromoCode('');
          setPromoError('');
          setIsCheckingOut(false);
          closeCart();
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Paystack payment error:', error);
      alert('Failed to initiate payment. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handleWhatsAppCheckout = async () => {
    if (!store.whatsappNumber) {
      alert('WhatsApp number not available');
      return;
    }

    if (!customerName || !customerPhone) {
      alert('Please enter your name and phone number');
      return;
    }

    // Save order to database first
    if (store.user_id) {
      try {
        const orderResult = await saveOnlineStoreOrder({
          storeUserId: store.user_id,
          items: items,
          customer: {
            name: customerName,
            phone: customerPhone,
            email: undefined,
            address: customerAddress || undefined,
          },
          subtotal: totalPrice,
          discount: discount,
          finalTotal: finalTotal,
          paymentMethod: 'whatsapp',
          paymentReference: undefined,
          promoCode: appliedPromo?.code,
        });

        if (orderResult.success) {
          console.log('✅ WhatsApp order saved to database');
        } else {
          console.error('⚠️ WhatsApp order save failed:', orderResult.error);
          // Continue anyway - merchant will get the message
        }
      } catch (error) {
        console.error('⚠️ WhatsApp order save error:', error);
        // Continue anyway
      }
    }

    // Format phone number
    let phone = store.whatsappNumber.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '234' + phone.substring(1);
    } else if (!phone.startsWith('234')) {
      phone = '234' + phone;
    }

    // Build order message
    const orderItems = items.map(item => {
      const variantInfo = item.variantName ? ` - ${item.variantName}` : '';
      return `\n• ${item.name}${variantInfo} (x${item.quantity}) - ${currencyNGN(item.price * item.quantity)}`;
    }).join('');

    // Payment method info for message
    let paymentInfo = '';
    if (selectedPaymentDetails) {
      const provider = PAYMENT_PROVIDERS[selectedPaymentDetails.type];
      const displayName = selectedPaymentDetails.label || provider?.name || selectedPaymentDetails.type;
      paymentInfo = `\n\n💳 *Payment Method: ${displayName}*\n` +
        (selectedPaymentDetails.bank_name ? `Bank: ${selectedPaymentDetails.bank_name}\n` : '') +
        `Account: ${selectedPaymentDetails.account_number}\n` +
        `Name: ${selectedPaymentDetails.account_name}` +
        (selectedPaymentDetails.instructions ? `\n\n📝 ${selectedPaymentDetails.instructions}` : '');
    }

    const message = `🛒 *New Order from ${store.businessName}*\n\n` +
      `👤 Customer: ${customerName}\n` +
      `📱 Phone: ${customerPhone}` +
      (customerAddress ? `\n📍 Address: ${customerAddress}` : '') +
      `\n\n📦 *Order Details:*${orderItems}\n\n` +
      `💰 *Subtotal: ${currencyNGN(totalPrice)}*\n` +
      (appliedPromo ? `🎁 *Discount (${appliedPromo.code}): -${currencyNGN(discount)}*\n` : '') +
      `💵 *Total: ${currencyNGN(finalTotal)}*` +
      paymentInfo;

    // Open WhatsApp
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

    // Clear cart and close
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
    setIsCheckingOut(false);
    closeCart();
  };

  const handleCheckout = () => {
    if (paymentMethod === 'paystack') {
      handlePaystackPayment();
    } else {
      handleWhatsAppCheckout();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="cart-overlay" onClick={closeCart} />

      {/* Cart Sidebar */}
      <div className="cart-sidebar">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <ShoppingCart size={24} />
            <h2>Your Cart</h2>
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </div>
          <button onClick={closeCart} className="cart-close-btn">
            <X size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Cart Content */}
        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart size={64} strokeWidth={1} />
            <h3>Your cart is empty</h3>
            <p>Add some products to get started!</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="cart-items">
              {items.map(item => (
                <div key={`${item.id}-${item.variantId || 'base'}`} className="cart-item">
                  {/* Item Image */}
                  <div className="cart-item-image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} />
                    ) : (
                      <div className="cart-item-no-image">
                        <ShoppingCart size={24} />
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="cart-item-details">
                    <h4>{item.name}</h4>
                    {item.variantName && (
                      <span style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#6b7280',
                        fontWeight: 500,
                        marginTop: '2px',
                        marginBottom: '4px'
                      }}>
                        {item.variantName}
                      </span>
                    )}
                    {item.category && <span className="cart-item-category">{item.category}</span>}

                    {/* Key Attributes */}
                    {item.attributes && Object.keys(item.attributes).length > 0 && (() => {
                      const displayFieldKeys = getDisplayFields(item.category);
                      const attributesToShow = displayFieldKeys
                        .map(key => ({
                          key,
                          value: item.attributes?.[key],
                          icon: getAttributeIcon(item.category, key)
                        }))
                        .filter(attr => attr.value)
                        .slice(0, 2); // Show only top 2 attributes in cart

                      if (attributesToShow.length === 0) return null;

                      return (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          marginTop: '4px',
                          marginBottom: '4px'
                        }}>
                          {attributesToShow.map(attr => (
                            <span
                              key={attr.key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                background: '#f3f4f6',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                color: '#6b7280'
                              }}
                            >
                              <span style={{ fontSize: '12px' }}>{attr.icon}</span>
                              <span>{formatAttributeValue(attr.key, attr.value)}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="cart-item-price">{currencyNGN(item.price)}</div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="cart-item-actions">
                    <div className="cart-quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                        className="cart-qty-btn"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={32} strokeWidth={2.5} />
                      </button>
                      <span className="cart-qty-display">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                        className="cart-qty-btn"
                        disabled={item.quantity >= item.maxQty}
                        aria-label="Increase quantity"
                      >
                        <Plus size={32} strokeWidth={2.5} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id, item.variantId)}
                      className="cart-remove-btn"
                      aria-label="Remove item"
                      style={{
                        minWidth: '40px',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={22} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className="cart-footer">
              {/* Total */}
              <div className="cart-total">
                {appliedPromo ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                      <span>Subtotal:</span>
                      <span>{currencyNGN(totalPrice)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>
                      <span>Discount ({appliedPromo.code}):</span>
                      <span>-{currencyNGN(discount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                      <span>Total:</span>
                      <span>{currencyNGN(finalTotal)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span>Total:</span>
                    <span className="cart-total-price">{currencyNGN(totalPrice)}</span>
                  </>
                )}
              </div>

              {/* Promo Code Section */}
              {!isCheckingOut && (
                appliedPromo ? (
                  <div style={{
                    padding: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 600, fontSize: '14px' }}>
                        <Tag size={16} />
                        <span>{appliedPromo.code} applied</span>
                        <span style={{ color: '#6b7280', fontWeight: 400 }}>
                          ({appliedPromo.discount_type === 'percentage'
                            ? `${appliedPromo.discount_value}% OFF`
                            : `${currencyNGN(appliedPromo.discount_value * 100)} OFF`})
                        </span>
                      </div>
                      <button
                        onClick={handleRemovePromo}
                        style={{
                          padding: '4px 8px',
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                      Have a promo code?
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoError('');
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleApplyPromo();
                          }
                        }}
                        placeholder="ENTER CODE"
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          border: `2px solid ${promoError ? '#ef4444' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          textTransform: 'uppercase',
                          backgroundColor: '#ffffff',
                          color: '#1f2937',
                          fontWeight: 500
                        }}
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={checkingPromo || !promoCode.trim()}
                        style={{
                          padding: '10px 16px',
                          background: checkingPromo || !promoCode.trim() ? '#9ca3af' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: checkingPromo || !promoCode.trim() ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {checkingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
                        {promoError}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Checkout Form */}
              {isCheckingOut ? (
                <div className="cart-checkout-form">
                  <h3>Checkout Details</h3>

                  {/* Payment Method Selection - Multi-Payment Support */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
                      Select Payment Method
                    </label>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {/* Paystack Option */}
                      {paystackEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('paystack');
                            setSelectedPaymentDetails(null);
                          }}
                          style={{
                            padding: '14px 16px',
                            background: paymentMethod === 'paystack' ? '#3b82f6' : 'white',
                            color: paymentMethod === 'paystack' ? 'white' : '#1e293b',
                            border: `2px solid ${paymentMethod === 'paystack' ? '#3b82f6' : '#e5e7eb'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                          }}
                        >
                          <CreditCard size={20} />
                          <div style={{ flex: 1 }}>
                            <div>Pay with Card (Paystack)</div>
                            <div style={{
                              fontSize: '11px',
                              opacity: 0.8,
                              marginTop: '2px',
                              fontWeight: 400
                            }}>
                              Instant payment - Card, Transfer, USSD
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Multi-Payment Methods (OPay, Moniepoint, etc.) */}
                      {availablePaymentMethods.map(method => {
                        const provider = PAYMENT_PROVIDERS[method.type];
                        const displayName = method.label || provider?.name || method.type;
                        const isSelected = paymentMethod === method.id;

                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(method.id);
                              setSelectedPaymentDetails(method);
                            }}
                            style={{
                              padding: '14px 16px',
                              background: isSelected ? `${provider?.color}15` : 'white',
                              color: '#1e293b',
                              border: `2px solid ${isSelected ? provider?.color : '#e5e7eb'}`,
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.2s',
                              textAlign: 'left'
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{provider?.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div>{displayName}</div>
                              <div style={{
                                fontSize: '11px',
                                color: '#6b7280',
                                marginTop: '2px',
                                fontWeight: 400,
                                fontFamily: 'monospace'
                              }}>
                                {method.account_number}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {/* WhatsApp Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('whatsapp');
                          setSelectedPaymentDetails(null);
                        }}
                        style={{
                          padding: '14px 16px',
                          background: paymentMethod === 'whatsapp' ? '#25d36615' : 'white',
                          color: '#1e293b',
                          border: `2px solid ${paymentMethod === 'whatsapp' ? '#25d366' : '#e5e7eb'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s',
                          textAlign: 'left'
                        }}
                      >
                        <Phone size={20} />
                        <div style={{ flex: 1 }}>
                          <div>Order via WhatsApp</div>
                          <div style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            marginTop: '2px',
                            fontWeight: 400
                          }}>
                            Chat with store owner to arrange payment
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Show Selected Payment Method Details */}
                    {selectedPaymentDetails && (
                      <div style={{
                        marginTop: '12px',
                        padding: '14px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1f2937',
                          marginBottom: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          💰 Payment Details
                        </div>
                        {selectedPaymentDetails.bank_name && (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Bank Name</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                              {selectedPaymentDetails.bank_name}
                            </div>
                          </div>
                        )}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Account Number</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              letterSpacing: '1px',
                              color: '#1f2937'
                            }}>
                              {selectedPaymentDetails.account_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedPaymentDetails.account_number);
                                setCopiedAccountId(selectedPaymentDetails.id);
                                setTimeout(() => setCopiedAccountId(null), 2000);
                              }}
                              style={{
                                padding: '6px',
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {copiedAccountId === selectedPaymentDetails.id ? (
                                <Check size={14} color="#10b981" />
                              ) : (
                                <Copy size={14} color="#6b7280" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Account Name</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                            {selectedPaymentDetails.account_name}
                          </div>
                        </div>
                        {selectedPaymentDetails.instructions && (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: '#fef3c7',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#78350f',
                            lineHeight: 1.5
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px' }}>📝 Instructions:</div>
                            {selectedPaymentDetails.instructions}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Method Info */}
                    {paymentMethod === 'paystack' && store.paystackTestMode && (
                      <p style={{ fontSize: '12px', color: '#d97706', marginTop: '10px', textAlign: 'center' }}>
                        ⚠️ Test mode - No real payment will be charged
                      </p>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Your name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="cart-input"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Your phone number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="cart-input"
                    required
                  />
                  <textarea
                    placeholder="Delivery address (optional)"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="cart-textarea"
                    rows={3}
                  />

                  <div className="cart-checkout-actions">
                    <button
                      onClick={() => setIsCheckingOut(false)}
                      className="cart-btn-secondary"
                      disabled={processingPayment}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="cart-btn-primary"
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <>Processing...</>
                      ) : paymentMethod === 'paystack' ? (
                        <>
                          <CreditCard size={18} />
                          Pay {currencyNGN(finalTotal)}
                        </>
                      ) : paymentMethod === 'whatsapp' ? (
                        <>
                          <Phone size={18} />
                          Send Order
                        </>
                      ) : (
                        <>
                          Complete Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cart-actions">
                  <button onClick={clearCart} className="cart-btn-secondary">
                    Clear Cart
                  </button>
                  <button onClick={() => setIsCheckingOut(true)} className="cart-btn-primary">
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
