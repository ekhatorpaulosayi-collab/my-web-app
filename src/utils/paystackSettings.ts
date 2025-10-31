/**
 * Paystack Integration Settings
 *
 * Manages Paystack configuration and payment processing
 */

export interface PaystackConfig {
  enabled: boolean;
  publicKeyTest: string;
  publicKeyLive: string;
  testMode: boolean;
}

const STORAGE_KEY = 'storehouse-paystack-config';

const DEFAULT_CONFIG: PaystackConfig = {
  enabled: false,
  publicKeyTest: '',
  publicKeyLive: '',
  testMode: true
};

/**
 * Get Paystack configuration from localStorage
 */
export function getPaystackConfig(): PaystackConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all required fields exist
      return {
        enabled: parsed.enabled ?? DEFAULT_CONFIG.enabled,
        publicKeyTest: parsed.publicKeyTest ?? DEFAULT_CONFIG.publicKeyTest,
        publicKeyLive: parsed.publicKeyLive ?? DEFAULT_CONFIG.publicKeyLive,
        testMode: parsed.testMode ?? DEFAULT_CONFIG.testMode
      };
    }
  } catch (error) {
    console.error('[Paystack Settings] Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save Paystack configuration to localStorage
 */
export function savePaystackConfig(config: PaystackConfig): boolean {
  try {
    // Validate before saving
    if (config.enabled) {
      const keyToValidate = config.testMode ? config.publicKeyTest : config.publicKeyLive;
      if (!keyToValidate || !keyToValidate.startsWith('pk_')) {
        console.error('[Paystack Settings] Invalid public key format');
        return false;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('[Paystack Settings] Error saving config:', error);
    return false;
  }
}

/**
 * Get the active public key based on test mode
 */
export function getActivePublicKey(): string | null {
  const config = getPaystackConfig();
  if (!config.enabled) return null;

  return config.testMode ? config.publicKeyTest : config.publicKeyLive;
}

/**
 * Check if Paystack is properly configured and enabled
 */
export function isPaystackEnabled(): boolean {
  const config = getPaystackConfig();
  if (!config.enabled) return false;

  const key = getActivePublicKey();
  return !!key && key.startsWith('pk_');
}

/**
 * Validate a Paystack public key format
 */
export function validatePublicKey(key: string): { valid: boolean; message: string } {
  if (!key || key.trim() === '') {
    return { valid: true, message: '' }; // Empty is valid (optional)
  }

  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
    return {
      valid: false,
      message: 'Key must start with pk_test_ or pk_live_'
    };
  }

  if (key.length < 20) {
    return {
      valid: false,
      message: 'Key appears to be incomplete'
    };
  }

  return { valid: true, message: '✓ Valid format' };
}

/**
 * Payment method types
 */
export type PaymentMethod = 'Cash' | 'Card' | 'Transfer' | 'POS';

/**
 * Payment status types
 */
export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED';

/**
 * Payment data structure
 */
export interface PaymentData {
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;       // Paystack payment reference
  paystackData?: any;       // Full Paystack response data
  paidAt?: string;          // ISO timestamp
  amount?: number;          // Amount paid
}

/**
 * Initialize Paystack script
 */
export function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if already loaded
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }

    // Create script tag
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;

    script.onload = () => {
      console.log('[Paystack] Script loaded successfully');
      resolve(true);
    };

    script.onerror = () => {
      console.error('[Paystack] Failed to load script');
      resolve(false);
    };

    document.head.appendChild(script);
  });
}
