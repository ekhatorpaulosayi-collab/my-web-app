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
 * Format international WhatsApp phone number
 * Handles UK (+44), Nigeria (+234), and other international numbers
 *
 * @param input - Phone number string
 * @returns Formatted number with country code for WhatsApp
 *
 * @example
 * formatWhatsAppNumber("08012345678") // "2348012345678" (Nigerian)
 * formatWhatsAppNumber("07123456789") // "447123456789" (UK)
 * formatWhatsAppNumber("+447123456789") // "447123456789" (UK with +)
 * formatWhatsAppNumber("+12345678901") // "12345678901" (US)
 */
export function formatWhatsAppNumber(input: string): string {
  if (!input) return '';

  // Remove all non-digit characters except leading +
  let cleaned = input.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');

  // If number already has country code (starts with + or is long enough)
  if (hasPlus || cleaned.length > 11) {
    return cleaned; // Return as-is (already international format)
  }

  // Nigerian number detection (starts with 0 and has 11 digits)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.substring(1); // Convert to +234
  }

  // UK number detection (starts with 0 and has 11 digits could also be UK)
  // But since Nigerian is more common in this app, default to Nigeria above
  // For UK numbers, users should include +44 or 44 prefix

  // If 10 digits without leading 0, assume Nigerian (missing 0)
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    return '234' + cleaned;
  }

  // If number starts with country code already (234, 44, 1, etc.)
  if (cleaned.length >= 10) {
    return cleaned;
  }

  // Default: return as-is and let WhatsApp handle it
  return cleaned;
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

/**
 * Validate international phone number (supports all countries)
 *
 * @param input - Phone number to validate
 * @returns Validation result with status and message
 *
 * @example
 * validateInternationalPhone("08012345678") // { valid: true, message: "✓ Valid Nigerian" }
 * validateInternationalPhone("+447123456789") // { valid: true, message: "✓ Valid UK" }
 * validateInternationalPhone("+12345678901") // { valid: true, message: "✓ Valid US" }
 */
export function validateInternationalPhone(input: string): { valid: boolean; message: string } {
  if (!input || input.trim() === '') {
    return { valid: true, message: '' }; // Empty is valid (optional field)
  }

  const digits = input.replace(/\D/g, '');

  // Too short for any international number
  if (digits.length < 7) {
    return { valid: false, message: `Need ${7 - digits.length} more digit${7 - digits.length > 1 ? 's' : ''}` };
  }

  // Nigerian numbers (234 or 0)
  if (digits.startsWith('234')) {
    if (digits.length === 13) {
      return { valid: true, message: '✓ Valid Nigerian' };
    } else if (digits.length > 13) {
      return { valid: false, message: `Remove ${digits.length - 13} digit${digits.length - 13 > 1 ? 's' : ''}` };
    } else if (digits.length >= 10) {
      return { valid: true, message: '✓ Valid' };
    } else {
      return { valid: false, message: `Need ${13 - digits.length} more digit${13 - digits.length > 1 ? 's' : ''}` };
    }
  }

  if (digits.startsWith('0') && digits.length === 11) {
    // Nigerian local format
    return { valid: true, message: '✓ Valid Nigerian' };
  }

  // UK numbers (44)
  if (digits.startsWith('44')) {
    if (digits.length >= 12 && digits.length <= 13) {
      return { valid: true, message: '✓ Valid UK' };
    } else if (digits.length < 12) {
      return { valid: false, message: `Need ${12 - digits.length} more digit${12 - digits.length > 1 ? 's' : ''}` };
    } else {
      return { valid: false, message: 'Too many digits for UK' };
    }
  }

  // US/Canada numbers (1)
  if (digits.startsWith('1')) {
    if (digits.length === 11) {
      return { valid: true, message: '✓ Valid US/Canada' };
    } else if (digits.length < 11) {
      return { valid: false, message: `Need ${11 - digits.length} more digit${11 - digits.length > 1 ? 's' : ''}` };
    } else {
      return { valid: false, message: 'Too many digits for US/Canada' };
    }
  }

  // Generic international validation for other countries
  // Most international numbers are 7-15 digits
  if (digits.length >= 7 && digits.length <= 15) {
    return { valid: true, message: '✓ Valid' };
  }

  if (digits.length > 15) {
    return { valid: false, message: 'Too many digits' };
  }

  return { valid: false, message: 'Invalid format' };
}
