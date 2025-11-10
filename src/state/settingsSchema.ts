export type HistoryRange = "today" | "week" | "month" | "all";
export type Settings = {
  businessName?: string;
  ownerName?: string;
  businessPhone?: string;
  quickSellFromTable: boolean; // deprecated - always false
  autoOfferReceipt: boolean;
  autoSendReceiptToSavedCustomers: boolean;
  receiptMessage?: string; // <= 160 chars
  lowStockThreshold: number;
  defaultHistoryRange: HistoryRange;
  enableTaxEstimator?: boolean; // NEW: Show profit & tax panel
  taxRatePct?: number;          // NEW: Tax rate percentage (default 2%)
  showOnlineStoreHero?: boolean; // Show Online Store hero banner (default true)
};

export const SETTINGS_KEY = "storehouse.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  businessName: "",
  ownerName: "",
  businessPhone: "",
  quickSellFromTable: false, // keep for backward compat, but always false
  autoOfferReceipt: true,
  autoSendReceiptToSavedCustomers: false,
  receiptMessage: "",
  lowStockThreshold: 3,
  defaultHistoryRange: "today",
  enableTaxEstimator: false, // Default to FALSE (opt-in)
  taxRatePct: 2,             // Default 2%
  showOnlineStoreHero: true, // Show hero by default
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Force Quick-Sell OFF (feature removed)
    merged.quickSellFromTable = false;
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(next: Settings) {
  // Force Quick-Sell OFF before saving
  const toSave = { ...next, quickSellFromTable: false };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
}

/** Known-keys compare; trims strings to avoid false dirty states */
export function settingsEqual(a: Settings, b: Settings) {
  const keys = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
  for (const k of keys) {
    const av = a[k]; const bv = b[k];
    if (typeof av === "string" && typeof bv === "string") {
      if (av.trim() !== bv.trim()) return false;
    } else if (av !== bv) return false;
  }
  return true;
}
