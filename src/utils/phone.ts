/**
 * Phone Number Utilities for Nigerian Numbers
 *
 * Normalizes phone numbers to E.164 format (+234...)
 * Provides auto-formatting and validation
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

/**
 * Format Nigerian phone number for display (e.g., "080 1234 5678")
 *
 * @param input - Raw phone input
 * @returns Formatted phone string
 *
 * @example
 * formatNGPhone("08012345678") // "080 1234 5678"
 * formatNGPhone("2348012345678") // "+234 801 234 5678"
 */
export function formatNGPhone(input: string): string {
  if (!input) return '';

  // Extract only digits
  const digits = input.replace(/\D/g, '');

  // Handle different formats
  if (digits.startsWith('234')) {
    // International format: +234 801 234 5678
    const countryCode = digits.slice(0, 3);
    const part1 = digits.slice(3, 6);
    const part2 = digits.slice(6, 9);
    const part3 = digits.slice(9, 13);

    let formatted = `+${countryCode}`;
    if (part1) formatted += ` ${part1}`;
    if (part2) formatted += ` ${part2}`;
    if (part3) formatted += ` ${part3}`;
    return formatted;
  } else if (digits.startsWith('0')) {
    // Local format: 080 1234 5678
    const part1 = digits.slice(0, 4);
    const part2 = digits.slice(4, 8);
    const part3 = digits.slice(8, 11);

    let formatted = part1;
    if (part2) formatted += ` ${part2}`;
    if (part3) formatted += ` ${part3}`;
    return formatted;
  } else if (digits.length >= 10) {
    // Assume it's without leading 0: 8012345678 -> 080 1234 5678
    const withZero = '0' + digits;
    return formatNGPhone(withZero);
  }

  // Return as-is if doesn't match patterns
  return digits;
}

/**
 * Validate Nigerian phone number
 *
 * @param input - Phone number to validate
 * @returns Validation result with status and message
 *
 * @example
 * validateNGPhone("08012345678") // { valid: true, message: "" }
 * validateNGPhone("080") // { valid: false, message: "Too short - need 11 digits" }
 */
export function validateNGPhone(input: string): { valid: boolean; message: string } {
  if (!input || input.trim() === '') {
    return { valid: true, message: '' }; // Empty is valid (optional field)
  }

  const digits = input.replace(/\D/g, '');

  // Too short
  if (digits.length < 10) {
    return { valid: false, message: `Need ${10 - digits.length} more digit${10 - digits.length > 1 ? 's' : ''}` };
  }

  // Local format (starts with 0)
  if (digits.startsWith('0')) {
    if (digits.length === 11) {
      // Check if it starts with valid Nigerian prefixes
      const prefix = digits.slice(0, 4);
      const validPrefixes = ['0701', '0702', '0703', '0704', '0705', '0706', '0708', '0802', '0803', '0804', '0805', '0806', '0807', '0808', '0809', '0810', '0811', '0812', '0813', '0814', '0815', '0816', '0817', '0818', '0901', '0902', '0903', '0904', '0905', '0906', '0907', '0908', '0909', '0913', '0914', '0915', '0916', '0917', '0918'];

      if (validPrefixes.includes(prefix)) {
        return { valid: true, message: '✓ Valid' };
      } else {
        return { valid: false, message: 'Invalid network prefix' };
      }
    } else if (digits.length > 11) {
      return { valid: false, message: `Remove ${digits.length - 11} digit${digits.length - 11 > 1 ? 's' : ''}` };
    }
  }

  // International format (starts with 234)
  if (digits.startsWith('234')) {
    if (digits.length === 13) {
      return { valid: true, message: '✓ Valid' };
    } else if (digits.length > 13) {
      return { valid: false, message: `Remove ${digits.length - 13} digit${digits.length - 13 > 1 ? 's' : ''}` };
    } else {
      return { valid: false, message: `Need ${13 - digits.length} more digit${13 - digits.length > 1 ? 's' : ''}` };
    }
  }

  // 10 digits without prefix (assume missing leading 0)
  if (digits.length === 10) {
    return { valid: true, message: '✓ Valid (will add 0)' };
  }

  // Other cases
  if (digits.length > 13) {
    return { valid: false, message: 'Too many digits' };
  }

  return { valid: false, message: 'Invalid format' };
}
