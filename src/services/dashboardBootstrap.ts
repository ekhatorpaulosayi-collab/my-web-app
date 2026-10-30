import { supabase } from '../lib/supabase';

const UNAVAILABLE = 'storehouse:dashboard_bootstrap_unavailable';

export type BootstrapProduct = {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  qty: number;
  selling_price: number;
  cost_price: number;
  sellKobo: number;
  purchaseKobo: number;
  image_url?: string;
  imageUrl?: string;
  is_public?: boolean;
  isPublic?: boolean;
  is_active?: boolean;
  isActive?: boolean;
  low_stock_threshold?: number;
  reorderLevel?: number;
  barcode?: string;
};

/**
 * One round trip for products + recent sales + store.
 * Returns null when the RPC is not installed yet (Paul runs migration 08).
 * A missing function is remembered for the tab so we do not add a failed call on every visit.
 */
export async function fetchDashboardBootstrap(): Promise<{ products: BootstrapProduct[]; salesRaw: any[]; store: any } | null> {
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(UNAVAILABLE) === '1') {
      return null;
    }
    const { data, error } = await supabase.rpc('dashboard_bootstrap');
    if (error) {
      const missing = error.code === 'PGRST202' || error.code === '42883' || /does not exist|could not find the function/i.test(error.message || '');
      if (missing && typeof sessionStorage !== 'undefined') sessionStorage.setItem(UNAVAILABLE, '1');
      return null;
    }
    const payload = data || {};
    const products = (payload.products || []).map((product: any) => ({
      ...product,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      quantity: product.quantity,
      sellKobo: product.selling_price,
      purchaseKobo: product.cost_price,
      qty: product.quantity,
      imageUrl: product.image_url,
      isPublic: product.is_public,
      isActive: product.is_active,
      reorderLevel: product.low_stock_threshold,
    }));
    return {
      products,
      salesRaw: payload.sales || [],
      store: payload.store || null,
    };
  } catch {
    return null;
  }
}
