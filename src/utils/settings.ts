// Business Settings utilities

export type Settings = {
  businessName: string;
  ownerName: string;
  phoneNumber: string;
  quickSellEnabled: boolean;
  currency?: string;
  numberFormat?: string;
  theme?: 'light' | 'dark' | 'auto';
  receiptMessage?: string;
  eodTime?: string;
  backupEmail?: string;
  // Receipt flow settings
  autoOfferReceipt?: boolean;
  autoSendReceiptToSavedCustomers?: boolean;
  lowStockThreshold?: number;
  defaultHistoryRange?: 'today' | 'week' | 'month' | 'all';
  // Tax Calculator (Phase 1) - ALL OPTIONAL for backward compatibility
  enableTaxCalculator?: boolean;
  vatRate?: number;
  taxMode?: 'PER_PRODUCT' | 'EOD';
  priceMode?: 'VAT_INCLUSIVE' | 'VAT_EXCLUSIVE';
  claimInputVatFromPurchases?: boolean;
  claimInputVatFromExpenses?: boolean;
};

const STORAGE_KEY = 'storehouse-settings';

const DEFAULT_SETTINGS: Settings = {
  businessName: '',
  ownerName: '',
  phoneNumber: '',
  quickSellEnabled: false, // force default OFF
  currency: 'NGN',
  numberFormat: 'en-NG',
  theme: 'light',
  receiptMessage: '',
  eodTime: '18:00',
  backupEmail: '',
  // Receipt flow defaults
  autoOfferReceipt: true,
  autoSendReceiptToSavedCustomers: false,
  lowStockThreshold: 3,
  defaultHistoryRange: 'today'
};

/**
 * Get settings from localStorage with fallback to defaults
 */
export function getSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(saved);
    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('[getSettings] Error:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to localStorage and dispatch event
 */
export function saveSettings(next: Partial<Settings>): Settings {
  try {
    const current = getSettings();
    const updated = { ...current, ...next };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event for cross-component updates
    window.dispatchEvent(
      new CustomEvent('settings:saved', { detail: updated })
    );

    return updated;
  } catch (error) {
    console.error('[saveSettings] Error:', error);
    throw error;
  }
}

/**
 * Validate Nigerian phone number format
 * Accepts: 0[7-9][0-1]XXXXXXXX (11 digits starting with 070-091)
 */
export function validatePhoneNG(str: string): boolean {
  if (!str || str.trim() === '') return true; // Optional field

  // Remove whitespace
  const cleaned = str.replace(/\s/g, '');

  // Nigerian format: 0[7-9][0-1] followed by 8 digits = 11 total
  const regex = /^0[789][01]\d{8}$/;

  return regex.test(cleaned);
}
