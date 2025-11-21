/**
 * PIN Service - Abstracted interface for PIN protection
 *
 * This service provides PIN verification for sensitive data (costs/profits).
 * Currently uses localStorage, but can easily be swapped to API backend.
 */

// ============================================================
// INTERFACE - This stays the same regardless of implementation
// ============================================================

export interface PinService {
  /**
   * Check if a PIN has been set
   */
  hasPinSet(): Promise<boolean>;

  /**
   * Verify if the provided PIN is correct
   */
  verifyPin(pin: string): Promise<boolean>;

  /**
   * Set a new PIN (or update existing)
   */
  setPin(pin: string): Promise<void>;

  /**
   * Clear the PIN (remove protection)
   */
  clearPin(): Promise<void>;

  /**
   * Check if currently unlocked in this session
   */
  isUnlocked(): boolean;

  /**
   * Mark as unlocked for this session
   */
  unlock(): void;

  /**
   * Lock again (requires PIN re-entry)
   */
  lock(): void;
}

// ============================================================
// LOCALSTORAGE IMPLEMENTATION - Current implementation
// ============================================================

class LocalStoragePinService implements PinService {
  private static readonly PIN_KEY = 'storehouse:pin:hash';
  private static readonly UNLOCK_KEY = 'storehouse:pin:unlocked';

  /**
   * Simple hash function for PIN storage
   * In production, use bcrypt or similar on backend
   */
  private hashPin(pin: string): string {
    // Basic hash - good enough for localStorage
    // When moving to backend, replace with bcrypt/scrypt
    let hash = 0;
    const str = `${pin}_salt_storehouse_2024`; // Add salt
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  async hasPinSet(): Promise<boolean> {
    return localStorage.getItem(LocalStoragePinService.PIN_KEY) !== null;
  }

  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = localStorage.getItem(LocalStoragePinService.PIN_KEY);
    if (!storedHash) return false;

    const inputHash = this.hashPin(pin);
    return inputHash === storedHash;
  }

  async setPin(pin: string): Promise<void> {
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 digits');
    }

    const hash = this.hashPin(pin);
    localStorage.setItem(LocalStoragePinService.PIN_KEY, hash);
  }

  async clearPin(): Promise<void> {
    localStorage.removeItem(LocalStoragePinService.PIN_KEY);
    localStorage.removeItem(LocalStoragePinService.UNLOCK_KEY);
  }

  isUnlocked(): boolean {
    // Check session unlock status
    return sessionStorage.getItem(LocalStoragePinService.UNLOCK_KEY) === 'true';
  }

  unlock(): void {
    sessionStorage.setItem(LocalStoragePinService.UNLOCK_KEY, 'true');
  }

  lock(): void {
    sessionStorage.removeItem(LocalStoragePinService.UNLOCK_KEY);
  }
}

// ============================================================
// API IMPLEMENTATION - Future implementation (not used yet)
// ============================================================

class ApiPinService implements PinService {
  private unlocked = false;

  async hasPinSet(): Promise<boolean> {
    // Future: GET /api/pin/status
    const response = await fetch('/api/pin/status');
    const data = await response.json();
    return data.hasPin;
  }

  async verifyPin(pin: string): Promise<boolean> {
    // Future: POST /api/pin/verify
    const response = await fetch('/api/pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await response.json();
    return data.valid;
  }

  async setPin(pin: string): Promise<void> {
    // Future: POST /api/pin/set
    const response = await fetch('/api/pin/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!response.ok) throw new Error('Failed to set PIN');
  }

  async clearPin(): Promise<void> {
    // Future: DELETE /api/pin
    const response = await fetch('/api/pin', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to clear PIN');
    this.unlocked = false;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  unlock(): void {
    this.unlocked = true;
  }

  lock(): void {
    this.unlocked = false;
  }
}

// ============================================================
// FACTORY - Switch between implementations here
// ============================================================

/**
 * Get the PIN service instance
 * To switch to API: change to `new ApiPinService()`
 */
export function getPinService(): PinService {
  // Current: localStorage implementation
  return new LocalStoragePinService();

  // Future: Uncomment to use API
  // return new ApiPinService();
}

// ============================================================
// CONVENIENCE FUNCTIONS - Use these in components
// ============================================================

const service = getPinService();

export const hasPinSet = () => service.hasPinSet();
export const verifyPin = (pin: string) => service.verifyPin(pin);
export const setPin = (pin: string) => service.setPin(pin);
export const clearPin = () => service.clearPin();
export const isUnlocked = () => service.isUnlocked();
export const unlock = () => service.unlock();
export const lock = () => service.lock();
