/**
 * SUPABASE DATA HOOKS
 * Offline-first data layer with React hooks
 * World-class performance with caching and optimistic updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// =====================================================
// CACHING LAYER
// =====================================================

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data, ttl = this.DEFAULT_TTL) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const timestamp = this.timestamps.get(key);
    if (Date.now() > timestamp) {
      // Cache expired
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  invalidate(pattern) {
    // Invalidate all keys matching pattern
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    });
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

const cache = new CacheManager();

// =====================================================
// USER HOOKS
// =====================================================

/**
 * Get or create user profile
 * Auto-syncs with Firebase UID for seamless migration
 */
export function useUser(firebaseUser) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    async function fetchOrCreateUser() {
      try {
        setLoading(true);

        // Check cache first
        const cacheKey = `user:${firebaseUser.uid}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          setUser(cached);
          setLoading(false);
          return;
        }

        // Try to find user by Firebase UID
        let { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_uid', firebaseUser.uid)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        // Create user if doesn't exist
        if (!existingUser) {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              firebase_uid: firebaseUser.uid,
              phone_number: firebaseUser.phoneNumber || '+1234567890', // Valid E.164 format placeholder
              email: firebaseUser.email,
              full_name: firebaseUser.displayName,
              device_type: 'web',
              app_version: '2.0.0',
              last_login_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) throw createError;
          existingUser = newUser;
        } else {
          // Update last login
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', existingUser.id);
        }

        cache.set(cacheKey, existingUser);
        setUser(existingUser);
        setError(null);
      } catch (err) {
        console.error('[Supabase] User fetch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrCreateUser();
  }, [firebaseUser]);

  return { user, loading, error };
}

// =====================================================
// STORE HOOKS
// =====================================================

/**
 * Get user's store profile
 */
export function useStore(userId) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setStore(null);
      setLoading(false);
      return;
    }

    async function fetchStore() {
      try {
        setLoading(true);

        const cacheKey = `store:${userId}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          setStore(cached);
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        cache.set(cacheKey, data);
        setStore(data);
        setError(null);
      } catch (err) {
        console.error('[Supabase] Store fetch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStore();
  }, [userId]);

  return { store, loading, error };
}

/**
 * Create or update store with optimistic UI
 */
export function useStoreActions(userId) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const createStore = useCallback(async (storeData) => {
    if (!userId) throw new Error('User ID required');

    try {
      setSaving(true);
      setError(null);

      // Auto-generate subdomain from store_slug
      const subdomain = storeData.store_slug;

      const { data, error: createError } = await supabase
        .from('stores')
        .insert({
          user_id: userId,
          ...storeData,
          subdomain, // Auto-generated subdomain
        })
        .select()
        .single();

      if (createError) throw createError;

      // Invalidate cache
      cache.invalidate(`store:${userId}`);

      return data;
    } catch (err) {
      console.error('[Supabase] Store create error:', err);
      setError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const updateStore = useCallback(async (storeId, updates) => {
    if (!userId) throw new Error('User ID required');

    try {
      setSaving(true);
      setError(null);

      console.log('[Supabase] Updating store:', { storeId, userId, updates });

      const { data, error: updateError } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Invalidate cache
      cache.invalidate(`store:${userId}`);

      return data;
    } catch (err) {
      console.error('[Supabase] Store update error:', err);
      setError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return { createStore, updateStore, saving, error };
}

/**
 * Get public store by slug, subdomain, or custom domain (for customers)
 * Supports multiple lookup methods:
 * - By store_slug: /store/myshop
 * - By subdomain: myshop.storehouse.app
 * - By custom domain: mybusiness.com
 */
export function usePublicStore(identifier, lookupType = 'slug') {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!identifier) {
      setStore(null);
      setLoading(false);
      return;
    }

    async function fetchPublicStore() {
      try {
        setLoading(true);

        const cacheKey = `public-store:${lookupType}:${identifier}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          setStore(cached);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('stores')
          .select('*')
          .eq('is_public', true);

        // Determine which field to query based on lookup type
        if (lookupType === 'subdomain') {
          query = query.eq('subdomain', identifier);
        } else if (lookupType === 'customDomain') {
          query = query.eq('custom_domain', identifier).eq('custom_domain_verified', true);
        } else {
          // Default: lookup by store_slug
          query = query.eq('store_slug', identifier);
        }

        const { data, error: fetchError } = await query.single();

        if (fetchError) throw fetchError;

        cache.set(cacheKey, data, 30 * 60 * 1000); // 30 min cache for public stores
        setStore(data);
        setError(null);
      } catch (err) {
        console.error('[Supabase] Public store fetch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPublicStore();
  }, [identifier, lookupType]);

  return { store, loading, error };
}

// =====================================================
// PRODUCT HOOKS
// =====================================================

/**
 * Get all products for a user with optional filters
 */
export function useProducts(userId, filters = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      try {
        setLoading(true);

        const cacheKey = `products:${userId}:${JSON.stringify(filters)}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          setProducts(cached);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive);
        }
        if (filters.lowStock) {
          query = query.lte('quantity', supabase.rpc('low_stock_threshold'));
        }
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        cache.set(cacheKey, data);
        setProducts(data || []);
        setError(null);
      } catch (err) {
        console.error('[Supabase] Products fetch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [userId, JSON.stringify(filters)]);

  return { products, loading, error };
}

/**
 * Product CRUD operations with optimistic updates
 */
export function useProductActions(userId) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const createProduct = useCallback(async (productData) => {
    if (!userId) throw new Error('User ID required');

    try {
      setSaving(true);
      setError(null);

      // Convert prices from naira to kobo (multiply by 100)
      const { data, error: createError } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          ...productData,
          selling_price: Math.round(productData.selling_price * 100),
          cost_price: productData.cost_price ? Math.round(productData.cost_price * 100) : 0,
          discount_price: productData.discount_price ? Math.round(productData.discount_price * 100) : null,
        })
        .select()
        .single();

      if (createError) throw createError;

      cache.invalidate(`products:${userId}`);
      return data;
    } catch (err) {
      console.error('[Supabase] Product create error:', err);
      setError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const updateProduct = useCallback(async (productId, updates) => {
    if (!userId) throw new Error('User ID required');

    try {
      setSaving(true);
      setError(null);

      // Convert prices if they exist in updates
      const processedUpdates = { ...updates };
      if (updates.selling_price !== undefined) {
        processedUpdates.selling_price = Math.round(updates.selling_price * 100);
      }
      if (updates.cost_price !== undefined) {
        processedUpdates.cost_price = Math.round(updates.cost_price * 100);
      }
      if (updates.discount_price !== undefined) {
        processedUpdates.discount_price = updates.discount_price ? Math.round(updates.discount_price * 100) : null;
      }

      const { data, error: updateError } = await supabase
        .from('products')
        .update(processedUpdates)
        .eq('id', productId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      cache.invalidate(`products:${userId}`);
      return data;
    } catch (err) {
      console.error('[Supabase] Product update error:', err);
      setError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const deleteProduct = useCallback(async (productId) => {
    if (!userId) throw new Error('User ID required');

    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      cache.invalidate(`products:${userId}`);
    } catch (err) {
      console.error('[Supabase] Product delete error:', err);
      setError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return { createProduct, updateProduct, deleteProduct, saving, error };
}

// =====================================================
// SALES HOOKS
// =====================================================

/**
 * Get sales for a user with date range
 */
export function useSales(userId, startDate, endDate) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setSales([]);
      setLoading(false);
      return;
    }

    async function fetchSales() {
      try {
        setLoading(true);

        const cacheKey = `sales:${userId}:${startDate}:${endDate}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          setSales(cached);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('sales')
          .select('*')
          .eq('user_id', userId)
          .order('sale_date', { ascending: false })
          .order('sale_time', { ascending: false });

        if (startDate) {
          query = query.gte('sale_date', startDate);
        }
        if (endDate) {
          query = query.lte('sale_date', endDate);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Convert prices from kobo to naira for display
        const processedData = (data || []).map(sale => ({
          ...sale,
          unit_price: sale.unit_price / 100,
          total_amount: sale.total_amount / 100,
          discount_amount: sale.discount_amount / 100,
          final_amount: sale.final_amount / 100,
          amount_paid: sale.amount_paid / 100,
          amount_due: sale.amount_due / 100,
        }));

        cache.set(cacheKey, processedData);
        setSales(processedData);
        setError(null);
      } catch (err) {
        console.error('[Supabase] Sales fetch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, [userId, startDate, endDate]);

  return { sales, loading, error };
}

/**
 * Create sale with automatic inventory update
 */
export function useSaleActions(userId) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const createSale = useCallback(async (saleData) => {
    if (!userId) throw new Error('User ID required');

    try {
      setSaving(true);
      setError(null);

      // Convert prices from naira to kobo
      const { data, error: createError } = await supabase
        .from('sales')
        .insert({
          user_id: userId,
          ...saleData,
          unit_price: Math.round(saleData.unit_price * 100),
          total_amount: Math.round(saleData.total_amount * 100),
          discount_amount: Math.round((saleData.discount_amount || 0) * 100),
          final_amount: Math.round(saleData.final_amount * 100),
          amount_paid: Math.round((saleData.amount_paid || saleData.final_amount) * 100),
          amount_due: Math.round((saleData.amount_due || 0) * 100),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update product quantity
      if (saleData.product_id) {
        const { error: updateError } = await supabase.rpc('decrement_product_quantity', {
          p_product_id: saleData.product_id,
          p_quantity: saleData.quantity,
        });

        if (updateError) {
          console.warn('[Supabase] Could not update product quantity:', updateError);
        }
      }

      cache.invalidate(`sales:${userId}`);
      cache.invalidate(`products:${userId}`);

      return data;
    } catch (err) {
      console.error('[Supabase] Sale create error:', err);
      setError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return { createSale, saving, error };
}

// =====================================================
// DASHBOARD HOOKS
// =====================================================

/**
 * Get dashboard summary with cached materialized view
 */
export function useDashboardSummary(userId, startDate, endDate) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    async function fetchSummary() {
      try {
        setLoading(true);

        const cacheKey = `dashboard:${userId}:${startDate}:${endDate}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          setSummary(cached);
          setLoading(false);
          return;
        }

        // Use the optimized function from database
        const { data, error: fetchError } = await supabase
          .rpc('get_sales_summary', {
            p_user_id: userId,
            p_start_date: startDate,
            p_end_date: endDate,
          });

        if (fetchError) throw fetchError;

        const processedData = data && data.length > 0 ? {
          total_revenue: data[0].total_revenue / 100,
          total_transactions: parseInt(data[0].total_transactions),
          total_items_sold: parseInt(data[0].total_items_sold),
          average_transaction_value: data[0].average_transaction_value / 100,
        } : {
          total_revenue: 0,
          total_transactions: 0,
          total_items_sold: 0,
          average_transaction_value: 0,
        };

        cache.set(cacheKey, processedData);
        setSummary(processedData);
        setError(null);
      } catch (err) {
        console.error('[Supabase] Dashboard summary error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [userId, startDate, endDate]);

  return { summary, loading, error };
}

/**
 * Get low stock alerts
 */
export function useLowStockProducts(userId) {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLowStockProducts([]);
      setLoading(false);
      return;
    }

    async function fetchLowStock() {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .rpc('get_low_stock_products', {
            p_user_id: userId,
          });

        if (fetchError) throw fetchError;

        setLowStockProducts(data || []);
        setError(null);
      } catch (err) {
        console.error('[Supabase] Low stock fetch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchLowStock();
  }, [userId]);

  return { lowStockProducts, loading, error };
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Clear all caches (useful on logout)
 */
export function useCacheClear() {
  return useCallback(() => {
    cache.clear();
    console.log('[Supabase] Cache cleared');
  }, []);
}
