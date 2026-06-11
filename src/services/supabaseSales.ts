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
  // OFF-01 idempotency key. Set ONLY by offline/manual paths (drain passes the
  // IndexedDB id; manual sale passes its saleId). NULL for checkout/hook/RPC rows.
  client_sale_id?: string;
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
export async function createSale(sale: Sale, userId?: string): Promise<Sale | null> {
  console.log('[supabaseSales] ========= CREATE SALE START =========');
  console.log('[supabaseSales] Sale data received:', sale);

  try {
    // ALWAYS get the authenticated user ID
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('[SALES_DEBUG] No authenticated user!', authError);
      return null;
    }

    // Always use auth user ID, ignore passed parameter
    const actualUserId = authUser.id;
    console.log('[SALES_DEBUG] Using auth UID:', actualUserId);
    console.log('[SALES_DEBUG] User email:', authUser.email);

    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('[supabaseSales] ❌ CRITICAL: Supabase client not initialized!');
      return null;
    }

    // Validate product_id is present
    const productId = sale.product_id || sale.itemId;
    if (!productId) {
      console.error('[supabaseSales] ❌ VALIDATION ERROR: Product ID is required for sales');
      console.error('[supabaseSales] Sale data that failed validation:', sale);
      throw new Error('Product selection is required to record a sale');
    }

    // Ensure we have required fields
    const saleData = {
      user_id: actualUserId,  // ALWAYS use auth user ID
      product_id: productId,  // Validated to be non-null
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
      sale_time: sale.sale_time || new Date().toTimeString().split(' ')[0],
      // OFF-01 idempotency key. Populated ONLY by the offline/manual paths.
      // Every other caller passes nothing => NULL => behaves exactly as before.
      client_sale_id: sale.client_sale_id ?? sale.id ?? null
    };

    console.log('[supabaseSales] Formatted sale data for Supabase:', saleData);

    // OFF-01: when a client_sale_id is present, use upsert with ignoreDuplicates so
    // a replayed offline sale (same client_sale_id) is a silent no-op at the DB
    // (INSERT ... ON CONFLICT (client_sale_id) DO NOTHING) instead of a second row.
    // supabase-js@2.81.1: .upsert(payload, { onConflict, ignoreDuplicates: true }).
    // Binds to the FULL unique index sales_client_sale_id_uniq (migration 20260611b).
    // With NO client_sale_id, fall back to a plain insert so behaviour is unchanged.
    const hasClientId = saleData.client_sale_id != null;
    const { data, error } = hasClientId
      ? await supabase
          .from('sales')
          .upsert([saleData], { onConflict: 'client_sale_id', ignoreDuplicates: true })
          .select()
          .maybeSingle()
      : await supabase
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

    // CONFIRMED-PERSISTED guard.
    // Plain insert: a row MUST come back, else it didn't persist -> failure.
    // OFF-01 dedup upsert (ignoreDuplicates): a CONFLICT returns NO row even though
    // the sale IS already persisted (a prior run inserted it). That is SUCCESS, not
    // failure -> re-select by client_sale_id and return the existing row so the
    // caller can mark it synced. Only treat as failure if it's truly absent.
    if (!data || !data.id) {
      if (hasClientId) {
        const { data: existing } = await supabase
          .from('sales')
          .select()
          .eq('client_sale_id', saleData.client_sale_id as string)
          .maybeSingle();
        if (existing && existing.id) {
          console.log('[supabaseSales] ✅ Idempotent no-op: sale already persisted (client_sale_id match).');
          return existing;
        }
      }
      throw new Error('Sale insert returned no row (not persisted)');
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

    // Skip profiles table lookup (it doesn't exist) and use auth user directly
    console.log('[supabaseSales] Getting current auth user for email:', email);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authUser && authUser.email === email) {
      console.log('[supabaseSales] Using auth user ID:', authUser.id);
      return getSales(authUser.id);
    }

    // Use authenticated user ID if available
    console.log('[supabaseSales] Auth user not found or email mismatch, checking auth state');
    if (authUser) {
      console.log('[supabaseSales] Using authenticated user ID for email:', email);
      return getSales(authUser.id);
    }

    console.error('[supabaseSales] Could not determine user ID for email:', email);
    return [];
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

  // DEBUG: Check current auth user
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log('[SALES_DEBUG] Current auth user:', {
      authUID: authUser?.id,
      email: authUser?.email,
      providedUserId: userId,
      match: authUser?.id === userId
    });

    // DEBUG: Check what user_id values exist in sales table
    const { data: sampleSales, error: sampleError } = await supabase
      .from('sales')
      .select('user_id, id')
      .limit(5);

    console.log('[SALES_DEBUG] Sample user_ids in sales table:', sampleSales?.map(s => s.user_id));

    if (authError) {
      console.error('[SALES_DEBUG] Auth error:', authError);
    }
  } catch (e) {
    console.error('[SALES_DEBUG] Failed to get debug info:', e);
  }

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
          sale_date: idbSale.date ||
            (typeof idbSale.createdAt === 'string'
              ? idbSale.createdAt.split('T')[0]
              : typeof idbSale.createdAt === 'number'
                ? new Date(idbSale.createdAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]),
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
 * Result of an offline-sales sync run.
 * - synced:  rows successfully inserted into Supabase this run
 * - failed:  rows that errored (network / RLS / server) — left unsynced, will retry
 * - skipped: rows that cannot be synced as-is (e.g. legacy non-UUID product id) —
 *            flagged with syncError, left unsynced, NOT retried blindly each time
 */
export interface SyncResult {
  synced: number;
  failed: number;
  skipped: number;
}

// A Supabase products.id is a UUID. Legacy pre-Supabase offline sales may carry a
// numeric/local itemId that has no cloud product — those cannot satisfy the sales
// FK and must be skipped-and-flagged, never thrown or silently dropped.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build a productId(UUID) -> productName map from the products cache that
 * supabaseProducts.getProducts() maintains in localStorage. Works offline.
 */
function loadProductNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const cached = localStorage.getItem('storehouse:products:cache');
    if (cached) {
      const products = JSON.parse(cached);
      if (Array.isArray(products)) {
        for (const p of products) {
          if (p && p.id != null) map.set(String(p.id), p.name);
        }
      }
    }
  } catch (e) {
    console.warn('[supabaseSales] Could not read products cache for name lookup:', e);
  }
  return map;
}

/**
 * Sync offline sales to Supabase.
 * Handles sales recorded while offline (or whose live cloud write failed).
 * Idempotent: only rows with syncedToCloud falsy are considered, and each
 * successful insert flips syncedToCloud=true so it never re-inserts.
 */
export async function syncOfflineSales(userId: string): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, skipped: 0 };
  try {
    // Get pending offline sales from IndexedDB
    await initDB();
    const db = await getDB();

    const tx = db.transaction(['sales'], 'readwrite');
    const salesStore = tx.objectStore('sales');
    const getAllRequest = salesStore.getAll();

    const offlineSales = await new Promise<any[]>((resolve, reject) => {
      getAllRequest.onsuccess = () => {
        // Idempotency: never reconsider already-synced sales, and skip rows we
        // already flagged as unsyncable so they don't churn on every run.
        const sales = getAllRequest.result.filter(s => !s.syncedToCloud && !s.syncError);
        resolve(sales);
      };
      getAllRequest.onerror = () => reject(new Error('Failed to fetch offline sales'));
    });

    if (offlineSales.length === 0) {
      return result;
    }

    console.log(`[supabaseSales] Syncing ${offlineSales.length} offline sales...`);

    // Resolve product names from the cloud-UUID products cache (offline-safe).
    const productNames = loadProductNameMap();

    for (const sale of offlineSales) {
      // The offline record stores the cloud product UUID as `itemId`
      // (items come from supabaseProducts.getProducts → Supabase products.id).
      const productId = sale.itemId != null ? String(sale.itemId) : '';

      // Guard: legacy non-UUID itemId cannot reference a cloud product → skip & flag.
      if (!UUID_RE.test(productId)) {
        console.warn('[supabaseSales] Skipping sale with non-UUID product id (legacy):', sale.id, sale.itemId);
        try {
          sale.syncError = 'legacy_non_uuid_product_id';
          const flagTx = db.transaction(['sales'], 'readwrite');
          flagTx.objectStore('sales').put(sale);
        } catch (flagErr) {
          console.warn('[supabaseSales] Could not flag skipped sale:', flagErr);
        }
        result.skipped++;
        continue;
      }

      // Canonical units are KOBO (migration 20260530; createSale expects kobo).
      const unitKobo = Number(sale.sellKobo ?? sale.unitPrice ?? 0);
      const qty = Number(sale.qty ?? sale.quantity ?? 1);
      const totalKobo = unitKobo * qty;
      const productName = productNames.get(productId) || sale.itemName || 'Unknown Product';

      try {
        const cloudSale = await createSale({
          // OFF-01: carry the IndexedDB UUID so a replay of THIS sale dedupes
          // server-side (the prior insert's client_sale_id collides -> no-op).
          client_sale_id: sale.id,
          product_id: productId,
          product_name: productName,
          quantity: qty,
          unit_price: unitKobo,
          total_amount: totalKobo,
          final_amount: totalKobo,
          customer_name: sale.customerName,
          customer_phone: sale.phone,
          payment_method: mapPaymentMethod(sale.paymentMethod || sale.payment),
          notes: sale.note
        }, userId);

        if (cloudSale) {
          // Mark as synced in IndexedDB so it never re-inserts (idempotency).
          sale.syncedToCloud = true;
          sale.cloudId = cloudSale.id;

          const updateTx = db.transaction(['sales'], 'readwrite');
          updateTx.objectStore('sales').put(sale);

          result.synced++;
        } else {
          // createSale returned null (auth missing / insert rejected) — leave
          // unsynced for retry; do NOT flag (transient).
          result.failed++;
        }
      } catch (error) {
        console.error('[supabaseSales] Error syncing sale:', error, sale);
        result.failed++;
      }
    }

    console.log(
      `[supabaseSales] Sync run: ${result.synced} synced, ${result.failed} failed, ${result.skipped} skipped`
    );
    return result;
  } catch (error) {
    console.error('[supabaseSales] Sync failed:', error);
    return result;
  }
}