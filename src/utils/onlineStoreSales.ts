/**
 * Online Store Sales Tracking
 * Saves online store orders to sales database and updates inventory
 */

import { supabase } from '../lib/supabase';

interface CartItem {
  id: string;
  name: string;
  price: number; // in kobo
  quantity: number;
  maxQty: number;
  imageUrl?: string;
  category?: string;
  attributes?: Record<string, any>;
  variantId?: string; // Selected variant ID (if product has variants)
  variantName?: string; // Selected variant name for display
}

interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface OnlineOrderData {
  storeUserId: string;
  items: CartItem[];
  customer: CustomerInfo;
  subtotal: number; // in kobo
  discount: number; // in kobo
  finalTotal: number; // in kobo
  paymentMethod: 'paystack' | 'whatsapp';
  paymentReference?: string;
  promoCode?: string;
  promoCodeId?: string;
}

/**
 * Save online store order to sales database
 * Creates one sale record per product in cart
 */
export async function saveOnlineStoreOrder(orderData: OnlineOrderData) {
  const {
    storeUserId,
    items,
    customer,
    subtotal,
    discount,
    finalTotal,
    paymentMethod,
    paymentReference,
    promoCode,
    promoCodeId,
  } = orderData;

  try {
    console.log('[Online Store] Saving order:', { itemCount: items.length, customer: customer.name });

    // Calculate discount per item (proportional distribution)
    const discountPerKobo = discount / subtotal;

    // Prepare sale records - one per product
    const saleRecords = items.map((item) => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = Math.round(itemTotal * discountPerKobo);
      const itemFinal = itemTotal - itemDiscount;

      // Build product name with variant info if applicable
      const productNameWithVariant = item.variantName
        ? `${item.name} (${item.variantName})`
        : item.name;

      return {
        user_id: storeUserId,
        product_id: item.id,
        variant_id: item.variantId || null, // Track which variant was sold
        product_name: productNameWithVariant,
        quantity: item.quantity,
        unit_price: item.price, // already in kobo
        total_amount: itemTotal,
        discount_amount: itemDiscount,
        final_amount: itemFinal,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        payment_method: paymentMethod === 'paystack' ? 'card' : 'transfer',
        payment_status: paymentMethod === 'paystack' ? 'paid' : 'pending',
        amount_paid: paymentMethod === 'paystack' ? itemFinal : 0,
        amount_due: paymentMethod === 'paystack' ? 0 : itemFinal,
        sale_channel: 'online-store',
        notes: [
          promoCode ? `Promo: ${promoCode}` : null,
          paymentReference ? `Ref: ${paymentReference}` : null,
          customer.address ? `Address: ${customer.address}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      };
    });

    // Insert all sales in one batch
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .insert(saleRecords)
      .select();

    if (salesError) {
      console.error('[Online Store] Error saving sales:', salesError);
      throw salesError;
    }

    console.log('[Online Store] Sales saved:', salesData?.length);

    // B6: stock, customer and promo are written by complete-storefront-order
    // after Paystack confirms the reference. No browser fallback — a missing
    // function leaves stock unchanged rather than using the anon RPCs.
    // ord_ payments are fulfilled by the webhook instead.
    if (paymentReference && paymentMethod === 'paystack' && !paymentReference.startsWith('ord_')) {
      const { error: fulfillError } = await supabase.functions.invoke('complete-storefront-order', {
        body: {
          reference: paymentReference,
          promo_code_id: promoCodeId || null,
          customer,
          items: items.map((item) => ({
            product_id: item.id,
            variant_id: item.variantId || null,
            quantity: item.quantity,
            unit_price_kobo: item.price,
          })),
        },
      });
      if (fulfillError) {
        console.warn('[Online Store] Server fulfillment failed:', fulfillError);
      }
    }

    return {
      success: true,
      salesIds: salesData?.map((s) => s.id) || [],
    };
  } catch (error) {
    console.error('[Online Store] Order save failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save order',
    };
  }
}
