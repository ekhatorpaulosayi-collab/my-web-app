import { supabase } from '../lib/supabase';
import { canAddProduct } from './subscriptionService';

/**
 * Supabase Products Service
 * Manages products in Supabase with per-user isolation via RLS
 * Compatible API with firebaseProducts.js for easy migration
 */

const PRODUCTS_CACHE_KEY = 'storehouse:products:cache';

/**
 * Get all products for current user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of products
 */
export async function getProducts(userId) {
  try {
    console.debug('[SupabaseProducts] Fetching products for user:', userId);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;

    // Map Supabase fields to Firebase format for backward compatibility
    const products = data.map(product => ({
      ...product,
      // Keep Supabase field names
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      discount_price: product.discount_price,
      quantity: product.quantity,
      // Add Firebase field name aliases for backward compatibility
      sellKobo: product.selling_price,  // Already in kobo
      purchaseKobo: product.cost_price,  // Already in kobo
      qty: product.quantity,
      imageUrl: product.image_url,
      isPublic: product.is_public,
      isActive: product.is_active,
      isFeatured: product.is_featured,
      reorderLevel: product.low_stock_threshold,
    }));

    console.debug('[SupabaseProducts] Loaded', products.length, 'products');

    // Cache in localStorage for offline access
    try {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn('[SupabaseProducts] Failed to cache products:', e);
    }

    return products;
  } catch (error) {
    console.error('[SupabaseProducts] Error fetching products:', error);

    // Try to load from cache if Supabase fails
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (cached) {
        console.debug('[SupabaseProducts] Loaded from cache');
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[SupabaseProducts] Failed to load cache:', e);
    }

    throw error;
  }
}

/**
 * Subscribe to real-time product updates
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function(products, error)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToProducts(userId, callback) {
  console.debug('[SupabaseProducts] Subscribing to products for user:', userId);

  // Create realtime subscription
  const subscription = supabase
    .channel(`products:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        console.debug('[SupabaseProducts] Real-time event:', payload.eventType);

        // Refetch all products on any change
        try {
          const products = await getProducts(userId);
          callback(products);
        } catch (error) {
          console.error('[SupabaseProducts] Subscription error:', error);
          callback(null, error);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.debug('[SupabaseProducts] Unsubscribing from products');
    subscription.unsubscribe();
  };
}

/**
 * Add a new product
 * @param {string} userId - User ID
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export async function addProduct(userId, productData) {
  try {
    console.debug('[SupabaseProducts] Adding product:', productData.name);

    // Check tier limits before adding product
    const limitCheck = await canAddProduct(userId);
    if (!limitCheck.allowed) {
      const error = new Error(limitCheck.reason || 'Product limit reached');
      error.limitExceeded = true;
      error.limitInfo = limitCheck;
      throw error;
    }

    // Ensure prices are in kobo (integer cents)
    const priceInKobo = typeof productData.selling_price === 'number'
      ? Math.round(productData.selling_price * 100)
      : productData.selling_price;

    const costInKobo = productData.cost_price
      ? (typeof productData.cost_price === 'number'
        ? Math.round(productData.cost_price * 100)
        : productData.cost_price)
      : 0;

    const discountInKobo = productData.discount_price
      ? (typeof productData.discount_price === 'number'
        ? Math.round(productData.discount_price * 100)
        : productData.discount_price)
      : null;

    // ⚠️ SAFETY WARNING: Detect if someone is trying to create a private product
    if (productData.is_public === false) {
      console.warn('[⚠️  SupabaseProducts] Creating PRIVATE product:', productData.name || 'unknown');
      console.warn('This product will NOT be visible on public storefront.');
      console.warn('If this is unintentional, remove is_public: false from the product data.');
    }

    const newProduct = {
      user_id: userId,
      name: productData.name,
      sku: productData.sku || null,
      barcode: productData.barcode || null,
      category: productData.category || null,
      selling_price: priceInKobo,
      cost_price: costInKobo,
      discount_price: discountInKobo,
      quantity: productData.quantity || 0,
      low_stock_threshold: productData.low_stock_threshold || 5,
      unit: productData.unit || 'piece',
      image_url: productData.image_url || null,
      image_thumbnail: productData.image_thumbnail || null,
      image_sizes: productData.image_sizes || null,
      description: productData.description || null,
      tags: productData.tags || [],
      is_public: productData.is_public !== false,  // ✅ DEFAULT: Public unless explicitly set to false
      is_active: productData.is_active !== false,
      is_featured: productData.is_featured || false,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) throw error;

    console.debug('[SupabaseProducts] Product added with ID:', data.id);

    // Clear cache
    clearProductsCache();

    return data;
  } catch (error) {
    console.error('[SupabaseProducts] Error adding product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 */
export async function updateProduct(userId, productId, updates) {
  try {
    console.debug('[SupabaseProducts] Updating product:', productId);

    // Process price updates if present
    const processedUpdates = { ...updates };

    if ('selling_price' in updates && typeof updates.selling_price === 'number') {
      processedUpdates.selling_price = Math.round(updates.selling_price * 100);
    }

    if ('cost_price' in updates && typeof updates.cost_price === 'number') {
      processedUpdates.cost_price = Math.round(updates.cost_price * 100);
    }

    if ('discount_price' in updates && typeof updates.discount_price === 'number') {
      processedUpdates.discount_price = Math.round(updates.discount_price * 100);
    }

    const { data, error } = await supabase
      .from('products')
      .update(processedUpdates)
      .eq('id', productId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    console.debug('[SupabaseProducts] Product updated');

    // Clear cache
    clearProductsCache();

    return data;
  } catch (error) {
    console.error('[SupabaseProducts] Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(userId, productId) {
  try {
    console.debug('[SupabaseProducts] Deleting product:', productId);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', userId);

    if (error) throw error;

    console.debug('[SupabaseProducts] Product deleted');

    // Clear cache
    clearProductsCache();
  } catch (error) {
    console.error('[SupabaseProducts] Error deleting product:', error);
    throw error;
  }
}

/**
 * Check if a product with the same name exists
 * @param {string} userId - User ID
 * @param {string} productName - Product name to check
 * @param {string|null} excludeId - Product ID to exclude (for updates)
 * @returns {Promise<boolean>} True if product exists
 */
export async function productExists(userId, productName, excludeId = null) {
  try {
    let query = supabase
      .from('products')
      .select('id')
      .eq('user_id', userId)
      .eq('name', productName);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error('[SupabaseProducts] Error checking product existence:', error);
    return false;
  }
}

/**
 * Clear cached products
 */
export function clearProductsCache() {
  try {
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    console.debug('[SupabaseProducts] Cache cleared');
  } catch (e) {
    console.warn('[SupabaseProducts] Failed to clear cache:', e);
  }
}

/**
 * Get low stock products
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of low stock products
 */
export async function getLowStockProducts(userId) {
  try {
    console.debug('[SupabaseProducts] Fetching low stock products for user:', userId);

    const { data, error } = await supabase
      .rpc('get_low_stock_products', {
        p_user_id: userId,
      });

    if (error) throw error;

    console.debug('[SupabaseProducts] Found', data?.length || 0, 'low stock products');

    return data || [];
  } catch (error) {
    console.error('[SupabaseProducts] Error fetching low stock products:', error);
    throw error;
  }
}
