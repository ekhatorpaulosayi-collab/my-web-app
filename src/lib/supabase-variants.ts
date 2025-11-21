/**
 * Supabase Variant Operations
 * CRUD operations for product variants
 */

import { supabase } from './supabase';
import type { ProductVariant } from '../types/variants';

/**
 * Get all variants for a product
 */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('variant_name', { ascending: true });

    if (error) {
      console.error('[Variants] Error fetching variants:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[Variants] Failed to get variants:', error);
    throw error;
  }
}

/**
 * Get all variants for a user (across all products)
 */
export async function getUserVariants(userId: string): Promise<ProductVariant[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Variants] Error fetching user variants:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[Variants] Failed to get user variants:', error);
    throw error;
  }
}

/**
 * Get single variant by ID
 */
export async function getVariantById(variantId: string): Promise<ProductVariant | null> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('id', variantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('[Variants] Error fetching variant:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Variants] Failed to get variant:', error);
    throw error;
  }
}

/**
 * Create variants for a product (bulk insert)
 */
export async function createVariants(
  productId: string,
  userId: string,
  variants: Omit<ProductVariant, 'id' | 'product_id' | 'user_id' | 'created_at' | 'updated_at'>[]
): Promise<ProductVariant[]> {
  try {
    const variantsToInsert = variants.map((v) => ({
      product_id: productId,
      user_id: userId,
      ...v,
    }));

    const { data, error } = await supabase
      .from('product_variants')
      .insert(variantsToInsert)
      .select();

    if (error) {
      console.error('[Variants] Error creating variants:', error);
      throw error;
    }

    console.log('[Variants] Created variants:', data?.length);
    return data || [];
  } catch (error) {
    console.error('[Variants] Failed to create variants:', error);
    throw error;
  }
}

/**
 * Update a variant
 */
export async function updateVariant(
  variantId: string,
  updates: Partial<ProductVariant>
): Promise<ProductVariant> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .update(updates)
      .eq('id', variantId)
      .select()
      .single();

    if (error) {
      console.error('[Variants] Error updating variant:', error);
      throw error;
    }

    console.log('[Variants] Updated variant:', variantId);
    return data;
  } catch (error) {
    console.error('[Variants] Failed to update variant:', error);
    throw error;
  }
}

/**
 * Update variant quantity (for sales/restocking)
 */
export async function updateVariantQuantity(
  variantId: string,
  newQuantity: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .update({ quantity: Math.max(0, newQuantity) })
      .eq('id', variantId);

    if (error) {
      console.error('[Variants] Error updating quantity:', error);
      throw error;
    }

    console.log('[Variants] Updated quantity for variant:', variantId, 'to', newQuantity);
  } catch (error) {
    console.error('[Variants] Failed to update quantity:', error);
    throw error;
  }
}

/**
 * Decrement variant quantity (when sold)
 */
export async function decrementVariantQuantity(
  variantId: string,
  quantitySold: number
): Promise<void> {
  try {
    const { error } = await supabase.rpc('decrement_variant_quantity', {
      p_variant_id: variantId,
      p_quantity: quantitySold,
    });

    if (error) {
      console.error('[Variants] Error decrementing quantity:', error);
      throw error;
    }

    console.log('[Variants] Decremented quantity for variant:', variantId, 'by', quantitySold);
  } catch (error) {
    console.error('[Variants] Failed to decrement quantity:', error);
    throw error;
  }
}

/**
 * Delete a variant
 */
export async function deleteVariant(variantId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId);

    if (error) {
      console.error('[Variants] Error deleting variant:', error);
      throw error;
    }

    console.log('[Variants] Deleted variant:', variantId);
  } catch (error) {
    console.error('[Variants] Failed to delete variant:', error);
    throw error;
  }
}

/**
 * Delete all variants for a product
 */
export async function deleteProductVariants(productId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId);

    if (error) {
      console.error('[Variants] Error deleting product variants:', error);
      throw error;
    }

    console.log('[Variants] Deleted all variants for product:', productId);
  } catch (error) {
    console.error('[Variants] Failed to delete product variants:', error);
    throw error;
  }
}

/**
 * Get effective price for a variant (with override handling)
 */
export async function getVariantEffectivePrice(variantId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_variant_price', {
      p_variant_id: variantId,
    });

    if (error) {
      console.error('[Variants] Error getting effective price:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('[Variants] Failed to get effective price:', error);
    throw error;
  }
}

/**
 * Check if a product has variants
 */
export async function productHasVariants(productId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) {
      console.error('[Variants] Error checking variants:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('[Variants] Failed to check variants:', error);
    return false;
  }
}

/**
 * Get low stock variants for a user
 */
export async function getLowStockVariants(userId: string): Promise<ProductVariant[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('quantity', supabase.raw('low_stock_threshold'))
      .order('quantity', { ascending: true });

    if (error) {
      console.error('[Variants] Error getting low stock variants:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[Variants] Failed to get low stock variants:', error);
    throw error;
  }
}
