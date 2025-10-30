/**
 * Phone Number Utilities for Nigerian Numbers
 *
 * Normalizes phone numbers to E.164 format (+234...)
 */

/**
 * Normalize a Nigerian phone number to E.164 format
 *
 * @param input - Phone number in various formats
 * @returns E.164 formatted number (+234...) or null if invalid
 *
 * @example
 * normalizeNGPhone("08012345678") // "+2348012345678"
 * normalizeNGPhone("2348012345678") // "+2348012345678"
 * normalizeNGPhone("8012345678") // "+2348012345678"
 */
export function normalizeNGPhone(input: string): string | null {
  if (!input) return null;

  // Extract only digits
  const digits = input.replace(/\D/g, "");

  // Already starts with 234 (country code)
  if (digits.startsWith("234")) {
    return `+${digits}`;
  }

  // Starts with 0 and has 11 digits (e.g., 08012345678)
  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }

  // Has 10 digits (e.g., 8012345678)
  if (digits.length === 10) {
    return `+234${digits}`;
  }

  // If already has + prefix, return as is
  if (input.startsWith("+")) {
    return input;
  }

  // Otherwise, prepend + and return
  return `+${digits}`;
}
