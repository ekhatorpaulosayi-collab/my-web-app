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

    // Update inventory for each product/variant
    for (const item of items) {
      try {
        // If item has a variant, decrement variant quantity
        // Otherwise, decrement product quantity
        if (item.variantId) {
          const { error: variantError } = await supabase.rpc('decrement_variant_quantity', {
            p_variant_id: item.variantId,
            p_quantity: item.quantity,
          });

          if (variantError) {
            console.warn('[Online Store] Variant inventory update failed for', item.variantName, variantError);
          }
        } else {
          const { error: productError } = await supabase.rpc('decrement_product_quantity', {
            p_product_id: item.id,
            p_quantity: item.quantity,
          });

          if (productError) {
            console.warn('[Online Store] Product inventory update failed for', item.name, productError);
          }
        }
      } catch (err) {
        console.warn('[Online Store] Inventory update error:', err);
      }
    }

    // Save/update customer in customer database
    try {
      await supabase.rpc('upsert_customer', {
        p_user_id: storeUserId,
        p_customer_name: customer.name,
        p_customer_phone: customer.phone,
        p_customer_email: customer.email || null,
        p_order_amount: finalTotal,
        p_order_date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.warn('[Online Store] Customer save failed:', err);
      // Don't fail the order if customer save fails
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
