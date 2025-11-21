// src/utils/whatsapp.ts
// WhatsApp deep-link utilities for sending reminders and receipts

/**
 * Format Nigerian phone number for WhatsApp
 * Accepts: 08012345678, +2348012345678, 2348012345678
 * Returns: 2348012345678
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 0, replace with 234
  if (digits.startsWith('0')) {
    return '234' + digits.slice(1);
  }

  // If starts with 234, keep as is
  if (digits.startsWith('234')) {
    return digits;
  }

  // Otherwise assume it's missing country code
  return '234' + digits;
}

/**
 * Create WhatsApp deep-link for payment reminder
 */
export function createDebtReminderLink(
  customerName: string,
  amount: number,
  dueDate: string,
  businessName: string = 'Storehouse',
  phone?: string
): string {
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);

  const message = `Hi ${customerName},\n\nThis is a friendly reminder about your outstanding balance of ${formattedAmount} due on ${dueDate}.\n\nPlease make payment at your earliest convenience.\n\nThank you!\n— ${businessName}`;

  const encodedMessage = encodeURIComponent(message);

  if (phone) {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  // No phone, open WhatsApp with message ready to send
  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Create WhatsApp deep-link for sale receipt
 */
export function createReceiptLink(
  customerName: string,
  itemName: string,
  quantity: number,
  amount: number,
  businessName: string = 'Storehouse',
  phone?: string
): string {
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);

  const message = `Hi ${customerName},\n\nThank you for your purchase!\n\n*Receipt*\nItem: ${itemName}\nQty: ${quantity}\nTotal: ${formattedAmount}\n\nWe appreciate your business!\n— ${businessName}`;

  const encodedMessage = encodeURIComponent(message);

  if (phone) {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Validate Nigerian phone number
 */
export function isValidNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  // Must be 11 digits starting with 0, or 13 digits starting with 234
  if (digits.length === 11 && digits.startsWith('0')) {
    return true;
  }

  if (digits.length === 13 && digits.startsWith('234')) {
    return true;
  }

  return false;
}

/**
 * Format Nigerian phone number for display
 * Example: 08012345678 → 0801 234 5678
 */
export function formatPhoneDisplay(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with 234, convert to 0 format
  let localFormat = digits;
  if (digits.startsWith('234') && digits.length === 13) {
    localFormat = '0' + digits.slice(3);
  }

  // Format as: 0801 234 5678
  if (localFormat.length === 11 && localFormat.startsWith('0')) {
    return `${localFormat.slice(0, 4)} ${localFormat.slice(4, 7)} ${localFormat.slice(7)}`;
  }

  // Return as-is if doesn't match expected format
  return phone;
}

/**
 * Detect if user is on a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Mobile device patterns
  const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check screen width (common mobile breakpoint)
  const isSmallScreen = window.innerWidth <= 768;

  return mobilePatterns.test(userAgent) || (hasTouch && isSmallScreen);
}

/**
 * Generate WhatsApp URL based on device type
 *
 * @param phone - Phone number in format: 2348012345678 (country code + number, no +)
 * @param message - Message text to send
 * @returns WhatsApp URL (deep link for mobile, web link for desktop)
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  // Ensure phone number is properly formatted (no + or spaces)
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // URL encode the message
  const encodedMessage = encodeURIComponent(message);

  // Detect device and use appropriate URL format
  const isMobile = isMobileDevice();

  if (isMobile) {
    // Mobile: Use whatsapp:// deep link (opens WhatsApp app directly)
    // Format: whatsapp://send?phone=2348012345678&text=message
    console.log('[WhatsApp] Using mobile deep link');
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
  } else {
    // Desktop: Use wa.me web link (opens WhatsApp Web)
    // Format: https://wa.me/2348012345678?text=message
    console.log('[WhatsApp] Using desktop web link');
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }
}

/**
 * Open WhatsApp with a message
 *
 * @param phone - Phone number (will be cleaned and formatted)
 * @param message - Message text
 * @returns Promise that resolves to true if opened successfully
 */
export function openWhatsApp(phone: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const formattedPhone = formatPhoneForWhatsApp(phone);
      const url = getWhatsAppUrl(formattedPhone, message);
      const isMobile = isMobileDevice();

      console.log(`[WhatsApp] Opening on ${isMobile ? 'mobile' : 'desktop'}`);
      console.log(`[WhatsApp] URL:`, url.substring(0, 100) + '...');

      if (isMobile) {
        // On mobile, use location.href to trigger the app
        window.location.href = url;

        // Give it a moment to open
        setTimeout(() => resolve(true), 500);
      } else {
        // On desktop, open in new tab
        const opened = window.open(url, '_blank');
        resolve(!!opened);
      }
    } catch (error) {
      console.error('[WhatsApp] Error opening:', error);
      resolve(false);
    }
  });
}
