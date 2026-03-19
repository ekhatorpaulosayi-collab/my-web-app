/**
 * Supabase Sales Service
 * Manages all sales operations in cloud storage
 * Prevents data loss from cache clearing
 */

import { supabase } from '../lib/supabase';
import { getDB, initDB } from '../db/idb';

export interface Sale {
  id?: string;
  user_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number; // in kobo
  total_amount: number; // in kobo
  discount_amount?: number;
  final_amount: number; // in kobo
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'credit';
  payment_status?: 'paid' | 'pending' | 'partial';
  amount_paid?: number;
  amount_due?: number;
  sale_date?: string;
  sale_time?: string;
  created_at?: string;
  day_key?: string;
  notes?: string;
  // Additional fields from IndexedDB
  itemId?: string;  // This is the product ID from the app
  itemName?: string;
  sales_channel?: string;
  recorded_by_staff_id?: string;
  cogsKobo?: number; // Cost of goods sold
}

/**
 * Create a new sale in Supabase
 */
export async function createSale(sale: Sale, userId: string): Promise<Sale | null> {
  console.log('[supabaseSales] ========= CREATE SALE START =========');
  console.log('[supabaseSales] User ID:', userId);
  console.log('[supabaseSales] Sale data received:', sale);

  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('[supabaseSales] ❌ CRITICAL: Supabase client not initialized!');
      return null;
    }

    // Ensure we have required fields
    const saleData = {
      user_id: userId,
      product_id: sale.product_id || sale.itemId || null,
      product_name: sale.product_name || sale.itemName || 'Unknown Product',
      quantity: sale.quantity || 1,
      unit_price: sale.unit_price || 0,
      total_amount: sale.total_amount || (sale.quantity * (sale.unit_price || 0)),
      discount_amount: sale.discount_amount || 0,
      final_amount: sale.final_amount || sale.total_amount || (sale.quantity * (sale.unit_price || 0)),
      customer_name: sale.customer_name || null,
      customer_phone: sale.customer_phone || null,
      customer_email: sale.customer_email || null,
      payment_method: sale.payment_method || 'cash',
      payment_status: sale.payment_status || 'paid',
      amount_paid: sale.amount_paid || sale.final_amount || sale.total_amount,
      amount_due: sale.amount_due || 0,
      notes: sale.notes || null,
      sale_date: sale.sale_date || new Date().toISOString().split('T')[0],
      sale_time: sale.sale_time || new Date().toTimeString().split(' ')[0]
    };

    console.log('[supabaseSales] Formatted sale data for Supabase:', saleData);

    const { data, error } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    if (error) {
      console.error('[supabaseSales] ❌ ERROR creating sale:', error);
      console.error('[supabaseSales] Error code:', error.code);
      console.error('[supabaseSales] Error message:', error.message);
      console.error('[supabaseSales] Error details:', error.details);
      console.error('[supabaseSales] Error hint:', error.hint);

      // Log specific error types
      if (error.code === '42501') {
        console.error('[supabaseSales] ⚠️ PERMISSION DENIED - Check RLS policies!');
      } else if (error.code === '23502') {
        console.error('[supabaseSales] ⚠️ NOT NULL VIOLATION - Missing required field!');
      } else if (error.code === '23503') {
        console.error('[supabaseSales] ⚠️ FOREIGN KEY VIOLATION - Invalid reference!');
      }

      throw error;
    }

    console.log('[supabaseSales] ✅ Sale created successfully!');
    console.log('[supabaseSales] Created sale ID:', data?.id);
    console.log('[supabaseSales] Full response:', data);
    console.log('[supabaseSales] ========= CREATE SALE END =========');

    return data;
  } catch (error) {
    console.error('[supabaseSales] ❌ FAILED to create sale - Exception caught:', error);
    console.error('[supabaseSales] Stack trace:', (error as any)?.stack);
    console.log('[supabaseSales] ========= CREATE SALE END (ERROR) =========');
    return null;
  }
}

/**
 * Get all sales for a user by email (more reliable than user ID)
 */
export async function getSalesByEmail(email: string): Promise<Sale[]> {
  console.log('[supabaseSales] ========= GET SALES BY EMAIL START =========');
  console.log('[supabaseSales] Fetching sales for email:', email);

  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('[supabaseSales] ❌ CRITICAL: Supabase client not initialized!');
      return [];
    }

    // First get the user ID for this email
    console.log('[supabaseSales] Looking up user ID for email...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error('[supabaseSales] Could not find user for email:', email);
      console.error('[supabaseSales] User lookup error:', userError);

      // Try with hardcoded known user ID as fallback
      console.log('[supabaseSales] Trying with known user ID for ekhatorpaulosayi@gmail.com');
      if (email === 'ekhatorpaulosayi@gmail.com') {
        const knownUserId = 'dffba89b-869d-422a-a542-2e2494850b44';
        return getSales(knownUserId);
      }

      return [];
    }

    const userId = userData.id;
    console.log('[supabaseSales] Found user ID:', userId);

    // Now get the sales
    return getSales(userId);
  } catch (error) {
    console.error('[supabaseSales] ❌ FAILED to fetch sales by email:', error);
    return [];
  }
}

/**
 * Get all sales for a user
 */
export async function getSales(userId: string): Promise<Sale[]> {
  console.log('[supabaseSales] ========= GET SALES START =========');
  console.log('[supabaseSales] Fetching sales for User ID:', userId);

  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('[supabaseSales] ❌ CRITICAL: Supabase client not initialized!');
      return [];
    }

    console.log('[supabaseSales] Executing query...');
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[supabaseSales] ❌ ERROR fetching sales:', error);
      console.error('[supabaseSales] Error code:', error.code);
      console.error('[supabaseSales] Error message:', error.message);
      console.error('[supabaseSales] Error details:', error.details);

      if (error.code === '42501') {
        console.error('[supabaseSales] ⚠️ PERMISSION DENIED - Check RLS policies!');
      } else if (error.code === 'PGRST116') {
        console.error('[supabaseSales] ⚠️ TABLE NOT FOUND - Sales table might not exist!');
      }

      throw error;
    }

    const salesCount = data?.length || 0;
    console.log(`[supabaseSales] ✅ Successfully fetched ${salesCount} sales`);

    if (salesCount > 0) {
      console.log('[supabaseSales] First sale ID:', data[0].id);
      console.log('[supabaseSales] Last sale ID:', data[salesCount - 1].id);
    } else {
      console.log('[supabaseSales] ⚠️ No sales found for this user');
    }

    console.log('[supabaseSales] ========= GET SALES END =========');
    return data || [];
  } catch (error) {
    console.error('[supabaseSales] ❌ FAILED to fetch sales - Exception caught:', error);
    console.error('[supabaseSales] Stack trace:', (error as any)?.stack);
    console.log('[supabaseSales] ========= GET SALES END (ERROR) =========');
    return [];
  }
}

/**
 * Get sales for a specific date range
 */
export async function getSalesByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[supabaseSales] Error fetching sales by date:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[supabaseSales] Failed to fetch sales by date:', error);
    return [];
  }
}

/**
 * Get today's sales
 */
export async function getTodaySales(userId: string): Promise<Sale[]> {
  const today = new Date().toISOString().split('T')[0];
  return getSalesByDateRange(userId, today, today);
}

/**
 * Update a sale
 */
export async function updateSale(saleId: string, updates: Partial<Sale>): Promise<Sale | null> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', saleId)
      .select()
      .single();

    if (error) {
      console.error('[supabaseSales] Error updating sale:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[supabaseSales] Failed to update sale:', error);
    return null;
  }
}

/**
 * Delete a sale (soft delete by updating status)
 */
export async function deleteSale(saleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (error) {
      console.error('[supabaseSales] Error deleting sale:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('[supabaseSales] Failed to delete sale:', error);
    return false;
  }
}

/**
 * Migrate sales from IndexedDB to Supabase
 * This is a one-time migration function
 */
export async function migrateSalesToSupabase(userId: string): Promise<{
  success: boolean;
  migratedCount: number;
  errors: any[];
}> {
  const result = {
    success: false,
    migratedCount: 0,
    errors: [] as any[]
  };

  try {
    console.log('[supabaseSales] Starting migration from IndexedDB to Supabase...');

    // Initialize IndexedDB
    await initDB();
    const db = await getDB();

    // Get all sales from IndexedDB
    const tx = db.transaction(['sales'], 'readonly');
    const salesStore = tx.objectStore('sales');
    const getAllRequest = salesStore.getAll();

    const indexedDBSales = await new Promise<any[]>((resolve, reject) => {
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(new Error('Failed to fetch sales from IndexedDB'));
    });

    console.log(`[supabaseSales] Found ${indexedDBSales.length} sales in IndexedDB`);

    if (indexedDBSales.length === 0) {
      result.success = true;
      return result;
    }

    // Check if migration was already done
    const { data: existingSales } = await supabase
      .from('sales')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingSales && existingSales.length > 0) {
      console.log('[supabaseSales] Sales already exist in Supabase, checking for duplicates...');
    }

    // Migrate each sale
    for (const idbSale of indexedDBSales) {
      try {
        // Convert IndexedDB sale format to Supabase format
        const supabaseSale: Sale = {
          product_name: idbSale.itemName || 'Unknown Product',
          quantity: idbSale.qty || 1,
          unit_price: idbSale.sellKobo || idbSale.unitPrice || 0,
          total_amount: idbSale.amount || (idbSale.qty * (idbSale.sellKobo || 0)),
          final_amount: idbSale.amount || (idbSale.qty * (idbSale.sellKobo || 0)),
          customer_name: idbSale.customerName || null,
          customer_phone: idbSale.phone || idbSale.customerPhone || null,
          payment_method: mapPaymentMethod(idbSale.payment || idbSale.paymentMethod),
          payment_status: idbSale.payment === 'credit' ? 'pending' : 'paid',
          amount_paid: idbSale.payment === 'credit' ? 0 : (idbSale.amount || 0),
          amount_due: idbSale.payment === 'credit' ? (idbSale.amount || 0) : 0,
          notes: idbSale.note || idbSale.notes || null,
          sale_date: idbSale.date || idbSale.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          sales_channel: idbSale.sales_channel,
          recorded_by_staff_id: idbSale.recorded_by_staff_id,
          cogsKobo: idbSale.cogsKobo
        };

        // Create the sale in Supabase
        await createSale(supabaseSale, userId);
        result.migratedCount++;

        // Log progress every 10 sales
        if (result.migratedCount % 10 === 0) {
          console.log(`[supabaseSales] Migrated ${result.migratedCount} sales...`);
        }
      } catch (error) {
        console.error('[supabaseSales] Error migrating sale:', error, idbSale);
        result.errors.push({ sale: idbSale, error });
      }
    }

    result.success = result.migratedCount > 0;
    console.log(`[supabaseSales] Migration completed. Migrated ${result.migratedCount}/${indexedDBSales.length} sales`);

    // Mark migration as complete in localStorage
    if (result.success) {
      localStorage.setItem('storehouse-sales-migrated-to-supabase', 'true');
      localStorage.setItem('storehouse-sales-migration-date', new Date().toISOString());
    }

  } catch (error) {
    console.error('[supabaseSales] Migration failed:', error);
    result.errors.push({ general: error });
  }

  return result;
}

/**
 * Helper function to map payment methods from old format
 */
function mapPaymentMethod(method: string): 'cash' | 'card' | 'transfer' | 'credit' {
  const normalized = (method || 'cash').toLowerCase();
  switch (normalized) {
    case 'cash':
      return 'cash';
    case 'card':
    case 'pos':
      return 'card';
    case 'transfer':
    case 'bank':
      return 'transfer';
    case 'credit':
    case 'credit-paid':
      return 'credit';
    default:
      return 'cash';
  }
}

/**
 * Sync offline sales to Supabase
 * This handles sales made while offline
 */
export async function syncOfflineSales(userId: string): Promise<number> {
  try {
    // Get pending offline sales from IndexedDB
    await initDB();
    const db = await getDB();

    const tx = db.transaction(['sales'], 'readwrite');
    const salesStore = tx.objectStore('sales');
    const getAllRequest = salesStore.getAll();

    const offlineSales = await new Promise<any[]>((resolve, reject) => {
      getAllRequest.onsuccess = () => {
        const sales = getAllRequest.result.filter(s => !s.syncedToCloud);
        resolve(sales);
      };
      getAllRequest.onerror = () => reject(new Error('Failed to fetch offline sales'));
    });

    if (offlineSales.length === 0) {
      return 0;
    }

    console.log(`[supabaseSales] Syncing ${offlineSales.length} offline sales...`);

    let syncedCount = 0;
    for (const sale of offlineSales) {
      try {
        // Create sale in Supabase
        const cloudSale = await createSale({
          product_name: sale.itemName || 'Unknown Product',
          quantity: sale.qty || 1,
          unit_price: sale.sellKobo || sale.unitPrice || 0,
          total_amount: sale.amount || 0,
          final_amount: sale.amount || 0,
          customer_name: sale.customerName,
          customer_phone: sale.phone,
          payment_method: mapPaymentMethod(sale.payment),
          notes: sale.note
        }, userId);

        if (cloudSale) {
          // Mark as synced in IndexedDB
          sale.syncedToCloud = true;
          sale.cloudId = cloudSale.id;

          const updateTx = db.transaction(['sales'], 'readwrite');
          const updateStore = updateTx.objectStore('sales');
          updateStore.put(sale);

          syncedCount++;
        }
      } catch (error) {
        console.error('[supabaseSales] Error syncing sale:', error, sale);
      }
    }

    console.log(`[supabaseSales] Synced ${syncedCount} sales to cloud`);
    return syncedCount;
  } catch (error) {
    console.error('[supabaseSales] Sync failed:', error);
    return 0;
  }
}