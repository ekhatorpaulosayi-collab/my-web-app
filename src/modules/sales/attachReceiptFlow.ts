/**
 * Receipt Flow Integration
 *
 * Bridges sale data with receipt generation
 * Handles customer lookup and receipt ID generation
 */

import { buildReceiptText, waLink } from "../../utils/receipt";
import { normalizeNGPhone } from "../../utils/phone";

/**
 * Sale record structure (matches current schema)
 */
export type SaleRecord = {
  id: string;
  itemName: string;
  qty: number;
  sellKobo: number;
  payment: "cash" | "transfer" | "card" | "credit";
  createdAt: number; // epoch ms
  dueDate?: string; // yyyy-mm-dd
  customerId?: string;
};

/**
 * Customer structure
 */
export type Customer = {
  id: string;
  name?: string;
  phone?: string;
};

/**
 * Build receipt text from a sale record
 *
 * @param sale - Sale record from the database
 * @param businessName - Business name from profile
 * @param getCustomer - Optional function to lookup customer by ID
 * @param note - Optional custom note to append
 * @returns Object with receipt text and customer phone (if available)
 */
export function buildTextFromSale(
  sale: SaleRecord,
  businessName: string,
  getCustomer?: (id?: string) => Customer | undefined,
  note?: string
): { text: string; phone?: string } {
  // Lookup customer if ID is provided
  const customer = sale.customerId ? getCustomer?.(sale.customerId) : undefined;

  // Normalize phone number to E.164 format
  const phone = customer?.phone
    ? normalizeNGPhone(customer.phone) ?? undefined
    : undefined;

  // Build receipt text
  const text = buildReceiptText({
    business: businessName,
    receiptId: generateReceiptId(),
    createdAt: new Date(sale.createdAt),
    payment: sale.payment,
    items: [
      {
        name: sale.itemName,
        qty: sale.qty,
        priceKobo: sale.sellKobo,
      },
    ],
    totalKobo: sale.qty * sale.sellKobo,
    customerName: customer?.name,
    customerPhoneE164: phone,
    dueDate: sale.payment === "credit" ? sale.dueDate : undefined,
    note,
  });

  return { text, phone };
}

/**
 * Generate WhatsApp link for receipt
 *
 * @param receiptText - Formatted receipt text
 * @param phone - Optional phone number in E.164 format
 * @returns WhatsApp URL
 */
export { waLink };

/**
 * Receipt ID Generator
 *
 * Format: RCP-MMDD-XXX
 * - MMDD: Month and day (e.g., 1028 for Oct 28)
 * - XXX: Auto-incrementing counter (base-36) that resets daily
 *
 * Examples:
 * - RCP-1028-0
 * - RCP-1028-1
 * - RCP-1028-A (after 9)
 */
let dayKeyCache = "";
let counter = 0;

function generateReceiptId(): string {
  const now = new Date();

  // Generate day key: YYMMDD format, then extract MMDD
  const yearKey = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const key = yearKey.slice(2, 6); // MMDD

  // Reset counter if day has changed
  if (key !== dayKeyCache) {
    dayKeyCache = key;
    counter = 0;
  }

  // Generate receipt ID
  const counterStr = (counter++).toString(36).toUpperCase();
  return `RCP-${key}-${counterStr}`;
}

/**
 * Check if auto-send is enabled and customer has phone
 *
 * @param settings - App settings
 * @param phone - Customer phone number (if available)
 * @returns True if should auto-send to WhatsApp
 */
export function shouldAutoSend(
  settings: { autoSendReceiptToSavedCustomers?: boolean },
  phone?: string
): boolean {
  return !!(settings.autoSendReceiptToSavedCustomers && phone);
}

/**
 * Check if should show receipt sheet
 *
 * @param settings - App settings
 * @returns True if should show sheet
 */
export function shouldShowSheet(
  settings: { autoOfferReceipt?: boolean }
): boolean {
  return settings.autoOfferReceipt !== false;
}
