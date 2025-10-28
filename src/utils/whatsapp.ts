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
