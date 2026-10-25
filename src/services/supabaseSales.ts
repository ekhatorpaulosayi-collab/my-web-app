/**
 * Supabase Sales Service
 * Manages all sales operations in cloud storage
 * Prevents data loss from cache clearing
 */

import { supabase } from '../lib/supabase';
import { getDB, initDB, localDayKey } from '../db/idb';
import { isPermanentSaleError } from '../utils/saleSync';

function missingSaleRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /does not exist|could not find the function/i.test(error.message || '');
}

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
  // DB sale_channel (CHECK: in-person | online-store | wholesale | social-media |
  // offline-sync). Only included in the insert when the caller sets it — omitted,
  // the DB default 'in-person' applies, so existing callers are unchanged.
  sale_channel?: string;
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
export async function createSale(sale: Sale, _userId?: string): Promise<Sale | null> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      console.error('[SALES_DEBUG] No authenticated user!', authError);
      return null;
    }
    if (!supabase) {
      console.error('[supabaseSales] Supabase client not initialized');
      return null;
    }

    const productId = sale.product_id || sale.itemId;
    if (!productId) {
      const validation = new Error('Product selection is required to record a sale') as Error & { permanent?: boolean; code?: string };
      validation.permanent = true;
      validation.code = '23502';
      throw validation;
    }

    const quantity = sale.quantity || 1;
    const unitPrice = sale.unit_price || 0;
    const discount = sale.discount_amount || 0;
    const total = sale.total_amount || quantity * unitPrice;
    const finalAmount = sale.final_amount || sale.total_amount || (quantity * unitPrice - discount);
    const clientSaleId = sale.client_sale_id ?? sale.id ?? null;
    const saleData = {
      user_id: authUser.id,
      product_id: productId,
      product_name: sale.product_name || sale.itemName || 'Unknown Product',
      quantity,
      unit_price: unitPrice,
      total_amount: total,
      discount_amount: discount,
      final_amount: finalAmount,
      customer_name: sale.customer_name || null,
      customer_phone: sale.customer_phone || null,
      customer_email: sale.customer_email || null,
      payment_method: sale.payment_method || 'cash',
      payment_status: sale.payment_status || 'paid',
      amount_paid: sale.amount_paid || finalAmount,
      amount_due: sale.amount_due || 0,
      notes: sale.notes || null,
      sale_date: sale.sale_date || new Date().toLocaleDateString('en-CA'),
      sale_time: sale.sale_time || new Date().toTimeString().split(' ')[0],
      client_sale_id: clientSaleId,
      ...(sale.sale_channel ? { sale_channel: sale.sale_channel } : {}),
    };

    // record_sale (migration 12) inserts the line, decrements stock, and
    // returns the id. The client must not SELECT the row or UPDATE products:
    // migration 09 blocks both for a cashier session.
    const { data, error } = await supabase.rpc('record_sale', {
      p_product_id: saleData.product_id,
      p_product_name: saleData.product_name,
      p_quantity: saleData.quantity,
      p_unit_price: saleData.unit_price,
      p_discount_amount: saleData.discount_amount,
      p_client_sale_id: saleData.client_sale_id,
      p_payment_method: saleData.payment_method,
      p_payment_status: saleData.payment_status,
      p_customer_name: saleData.customer_name,
      p_customer_phone: saleData.customer_phone,
      p_customer_email: saleData.customer_email,
      p_notes: saleData.notes,
      p_sale_date: saleData.sale_date,
      p_sale_time: saleData.sale_time,
      p_sale_channel: sale.sale_channel || null,
      p_amount_paid: saleData.amount_paid,
      p_amount_due: saleData.amount_due,
    });

    if (error && missingSaleRpc(error)) {
      return insertSaleWithoutReadback(saleData);
    }
    if (error) throw error;

    const row = data as { id?: string; client_sale_id?: string; already_recorded?: boolean } | null;
    if (!row?.id) {
      throw new Error('Sale was not recorded');
    }
    return { ...saleData, id: row.id, client_sale_id: row.client_sale_id || saleData.client_sale_id || undefined };
  } catch (error) {
    console.error('[supabaseSales] Failed to create sale:', (error as { code?: string; message?: string })?.code || (error as Error)?.message);
    if (isPermanentSaleError(error as { code?: string; message?: string; permanent?: boolean })) {
      throw error;
    }
    return null;
  }
}

/**
 * Used only when record_sale is not installed yet. No .select() and no
 * product update. Stock does not move on the server until migration 12 runs,
 * so deploy that file before this frontend (see DEPLOY_ORDER.md).
 */
async function insertSaleWithoutReadback(saleData: {
  client_sale_id: string | null;
  [key: string]: unknown;
}): Promise<Sale> {
  const hasClientId = saleData.client_sale_id != null;
  const { error } = hasClientId
    ? await supabase.from('sales').upsert([saleData], { onConflict: 'client_sale_id', ignoreDuplicates: true })
    : await supabase.from('sales').insert([saleData]);
  if (error) throw error;
  return { ...(saleData as unknown as Sale), id: saleData.client_sale_id || undefined };
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
  const today = new Date().toLocaleDateString('en-CA');
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
 * DEPRECATED / NEUTRALIZED (2026-07-30, shared-device sale-ownership fix).
 *
 * This one-time IndexedDB→Supabase migration read the WHOLE shared per-origin
 * sales store and uploaded every row under whichever account was logged in,
 * guarded only by a GLOBAL localStorage flag. On a shared browser that is
 * cross-account data transfer (it seeded the March 2026 wrong-owner rows), and
 * a re-run (flag loss) would mass-duplicate rows because these inserts carried
 * no client_sale_id. Every active user is cloud-native now — the migration's
 * job is done. Kept as a no-op so the App.jsx call site stays harmless (same
 * pattern as utils/offlineQueue.ts).
 */
export async function migrateSalesToSupabase(_userId: string): Promise<{
  success: boolean;
  migratedCount: number;
  errors: any[];
}> {
  console.warn('[supabaseSales] migrateSalesToSupabase is neutralized (shared-device ownership fix). No-op.');
  // Persist the done-flag the old body only set on success: it gates the App.jsx
  // call site, and leaving it unset would re-run the full-store upload on every
  // device if the old body were ever resurrected (merge/revert accident).
  try {
    localStorage.setItem('storehouse-sales-migrated-to-supabase', 'true');
  } catch {
    /* ignore */
  }
  return { success: true, migratedCount: 0, errors: [] };
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
      // OFF-05: a slow drain can span an account switch, and createSale binds
      // user_id to the LIVE auth user — not our userId parameter. If the live
      // session no longer matches the account this drain started for, stop:
      // continuing would insert the remaining rows under the wrong account.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id !== userId) {
        console.warn('[supabaseSales] Auth user changed mid-drain — aborting remaining sync.');
        break;
      }

      // OFF-05 ownership guard: the IndexedDB sales store is per-device and shared
      // across logins, so never drain a row another account recorded — its owner's
      // own drain will take it. Legacy rows with no ownerUid are grandfathered:
      // they sync under the draining account (the pre-OFF-05 behaviour, so no
      // merchant's pending pre-deploy sale is ever stranded) and get ownership
      // stamped on success below, closing the legacy window after one drain.
      if (sale.ownerUid && sale.ownerUid !== userId) {
        continue;
      }

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

      // OFF-05: preserve the ORIGINAL recorded date/time. Without these, createSale
      // stamps drain-time defaults and a late-synced sale materializes dated the
      // drain day (the "phantom ₦8,000 sale", 2026-07-30). Replays exactly what the
      // live path would have stamped at record time on this device (dayKey via
      // localDayKey; time device-local, same shape as handleSaveSale's direct write).
      const rawCreatedAt = sale.createdAt;
      const recordedAtMs =
        typeof rawCreatedAt === 'string'
          ? /^\d+$/.test(rawCreatedAt)
            ? Number(rawCreatedAt) // numeric epoch serialized as a string
            : Date.parse(rawCreatedAt) // ISO string (oldest records)
          : Number(rawCreatedAt);
      const hasRecordedAt = Number.isFinite(recordedAtMs) && recordedAtMs > 0;
      const originalSaleDate =
        sale.dayKey || (hasRecordedAt ? localDayKey(new Date(recordedAtMs)) : undefined);
      // With a known day but unknown time, use a visible 00:00:00 sentinel rather
      // than the drain-moment clock (a time that never happened on that day).
      const originalSaleTime = hasRecordedAt
        ? new Date(recordedAtMs).toTimeString().split(' ')[0]
        : originalSaleDate
          ? '00:00:00'
          : undefined;

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
          notes: sale.note,
          sale_date: originalSaleDate,
          sale_time: originalSaleTime,
          // OFF-05: visible provenance — the vendor SEES the sale arrived via late
          // offline sync (needs the extended valid_sale_channel CHECK, migration
          // 20260730_off05).
          sale_channel: 'offline-sync'
        }, userId);

        if (cloudSale && cloudSale.id) {
          // Mark as synced in IndexedDB so it never re-inserts (idempotency).
          sale.syncedToCloud = true;
          sale.cloudId = cloudSale.id;
          // OFF-05: stamp ownership on grandfathered legacy rows — they synced
          // under this account, so they belong to it from here on.
          sale.ownerUid = sale.ownerUid || userId;

          // Await the put: losing it would drop syncedToCloud AND the ownership
          // stamp, letting a different account's drain grandfather this row later
          // (its recovery re-select would then dead-end behind RLS).
          const updateTx = db.transaction(['sales'], 'readwrite');
          updateTx.objectStore('sales').put(sale);
          await new Promise<void>((resolve) => {
            updateTx.oncomplete = () => resolve();
            updateTx.onerror = () => resolve(); // best-effort: OFF-01 dedup covers a lost flag
          });

          result.synced++;
        } else {
          // null with no throw: auth missing or a network failure. Retry later.
          result.failed++;
        }
      } catch (error) {
        const coded = error as { code?: string; message?: string; permanent?: boolean };
        if (isPermanentSaleError(coded)) {
          console.error('[supabaseSales] Permanent sync error, will not retry:', coded.code || coded.message);
          try {
            sale.syncError = coded.code || 'permanent';
            const flagTx = db.transaction(['sales'], 'readwrite');
            flagTx.objectStore('sales').put(sale);
          } catch (flagErr) {
            console.warn('[supabaseSales] Could not flag permanent sync error:', flagErr);
          }
          result.skipped++;
        } else {
          console.error('[supabaseSales] Transient sync error, will retry:', coded?.message || error);
          result.failed++;
        }
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