/**
 * Receipt Generation Utilities
 *
 * Builds formatted receipt text for WhatsApp and other channels
 */

import { formatNaira } from "./money";
import { RECEIPT_SENDING_ENABLED } from "../config";

export type ReceiptArgs = {
  business: string;
  receiptId: string;
  createdAt: Date;
  payment: "cash" | "transfer" | "card" | "credit";
  items: { name: string; qty: number; priceKobo: number }[];
  totalKobo: number;
  customerName?: string;
  customerPhoneE164?: string;
  dueDate?: string; // yyyy-mm-dd
  note?: string;
};

/**
 * Build a formatted receipt text for WhatsApp/SMS
 *
 * Format matches reference artboard exactly:
 * - Business name at top
 * - Receipt type and ID
 * - Date/time and payment method
 * - Line items with quantities and prices
 * - Total (or Amount Due for credit)
 * - Customer details (for credit sales)
 * - Optional note
 * - Footer with branding
 */
export function buildReceiptText(args: ReceiptArgs): string {
  if (!RECEIPT_SENDING_ENABLED) return "";
  const dt = args.createdAt.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

  const lines: string[] = [];

  // Header
  lines.push(`${args.business}`);
  lines.push(
    `${args.payment === "credit" ? "CREDIT RECEIPT" : "RECEIPT"} #${args.receiptId}`
  );
  lines.push(`Date: ${dt} • ${capitalize(args.payment)}`);
  lines.push("");

  // Line items
  if (args.items.length === 1) {
    // Single item: show more detail on one line
    const item = args.items[0];
    lines.push(
      `${item.name} × ${item.qty} @ ${formatNaira(item.priceKobo)} = ${formatNaira(
        item.priceKobo * item.qty
      )}`
    );
  } else {
    // Multiple items: one line per item
    args.items.forEach((item) => {
      lines.push(
        `${item.name} × ${item.qty} = ${formatNaira(item.priceKobo * item.qty)}`
      );
    });
  }
  lines.push("");

  // Total section
  if (args.payment === "credit") {
    lines.push(`Amount Due: ${formatNaira(args.totalKobo)}`);
    if (args.dueDate) {
      lines.push(`Due Date: ${prettyDate(args.dueDate)}`);
    }
    if (args.customerName) {
      const customerLine = args.customerPhoneE164
        ? `Customer: ${args.customerName} (${args.customerPhoneE164})`
        : `Customer: ${args.customerName}`;
      lines.push(customerLine);
    }
  } else {
    lines.push(`Total Paid: ${formatNaira(args.totalKobo)}`);
  }

  // Optional note
  if (args.note) {
    lines.push("");
    lines.push(args.note);
  }

  // Footer
  lines.push("");
  lines.push("Thank you! — Powered by Storehouse");

  return lines.join("\n");
}

/**
 * Generate a WhatsApp link with receipt text
 *
 * @param text - Receipt text to send
 * @param phoneE164 - Optional phone number in E.164 format (+234...)
 * @returns WhatsApp URL (wa.me/...)
 */
export function waLink(text: string, phoneE164?: string): string {
  if (!RECEIPT_SENDING_ENABLED) return "";
  const encoded = encodeURIComponent(text);

  if (phoneE164) {
    // Direct message to specific number
    const digits = phoneE164.replace("+", "");
    return `https://wa.me/${digits}?text=${encoded}`;
  }

  // Open WhatsApp with text, let user choose recipient
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Format ISO date string to human-readable format
 * @example prettyDate("2025-12-25") // "25 Dec"
 */
function prettyDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Capitalize first letter of string
 * @example capitalize("cash") // "Cash"
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
