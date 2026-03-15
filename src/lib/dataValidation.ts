/**
 * Data Validation Utilities
 *
 * Comprehensive validation to prevent data quality issues that cause:
 * - Image loading errors
 * - Console warnings
 * - Puppeteer screenshot failures
 * - Browser srcset parsing errors
 *
 * USAGE:
 * - Import and use before saving data to database
 * - Use in form validation
 * - Use in API endpoints
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Image URL Validation
 *
 * Ensures image URLs are valid and won't cause runtime errors
 */
export function validateImageUrl(url: string | null | undefined): ValidationResult {
  // Null/undefined is OK (product can have no image)
  if (url === null || url === undefined) {
    return { valid: true, sanitized: null as any };
  }

  // Must be string
  if (typeof url !== 'string') {
    return {
      valid: false,
      error: 'Image URL must be a string'
    };
  }

  // Trim whitespace
  const trimmed = url.trim();

  // Empty string should be null
  if (trimmed === '') {
    return { valid: true, sanitized: null as any };
  }

  // Reject literal "undefined" or "null" strings
  if (trimmed === 'undefined' || trimmed === 'null') {
    return {
      valid: false,
      error: 'Image URL cannot be the string "undefined" or "null"'
    };
  }

  // Reject blob URLs (temporary client-side URLs)
  if (trimmed.startsWith('blob:')) {
    return {
      valid: false,
      error: 'Blob URLs are temporary and cannot be saved. Please upload the image first.'
    };
  }

  // Reject data URLs (base64 encoded images)
  if (trimmed.startsWith('data:')) {
    return {
      valid: false,
      error: 'Data URLs are not supported. Please upload the image to storage first.'
    };
  }

  // Must be reasonable length
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: 'Image URL is too short to be valid'
    };
  }

  if (trimmed.length > 2000) {
    return {
      valid: false,
      error: 'Image URL is too long (max 2000 characters)'
    };
  }

  // Must be either full URL or valid storage path
  const isFullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
  const isStoragePath = trimmed.includes('/') && (
    trimmed.includes('products/') ||
    trimmed.includes('stores/') ||
    trimmed.includes('users/')
  );

  if (!isFullUrl && !isStoragePath) {
    return {
      valid: false,
      error: 'Image URL must be a valid HTTP(S) URL or storage path'
    };
  }

  // Validate URL format if it's a full URL
  if (isFullUrl) {
    try {
      const urlObj = new URL(trimmed);

      // Must use http or https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Image URL must use http:// or https:// protocol'
        };
      }
    } catch (e) {
      return {
        valid: false,
        error: 'Invalid URL format'
      };
    }
  }

  // All checks passed
  return { valid: true, sanitized: trimmed };
}

/**
 * Product Data Validation
 *
 * Validates entire product object before saving
 */
export function validateProduct(product: any): ValidationResult {
  // Required fields
  if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
    return { valid: false, error: 'Product name is required' };
  }

  if (!product.user_id || typeof product.user_id !== 'string') {
    return { valid: false, error: 'User ID is required' };
  }

  // Validate prices (must be non-negative numbers)
  if (product.selling_price !== undefined) {
    if (typeof product.selling_price !== 'number' || product.selling_price < 0) {
      return { valid: false, error: 'Selling price must be a non-negative number' };
    }
  }

  if (product.cost_price !== undefined && product.cost_price !== null) {
    if (typeof product.cost_price !== 'number' || product.cost_price < 0) {
      return { valid: false, error: 'Cost price must be a non-negative number' };
    }
  }

  // Validate quantity
  if (product.quantity !== undefined) {
    if (typeof product.quantity !== 'number' || product.quantity < 0) {
      return { valid: false, error: 'Quantity must be a non-negative number' };
    }
  }

  // Validate image URL
  if (product.image_url !== undefined) {
    const imageValidation = validateImageUrl(product.image_url);
    if (!imageValidation.valid) {
      return { valid: false, error: `Image URL invalid: ${imageValidation.error}` };
    }
  }

  // Validate thumbnail
  if (product.image_thumbnail !== undefined) {
    const thumbValidation = validateImageUrl(product.image_thumbnail);
    if (!thumbValidation.valid) {
      return { valid: false, error: `Thumbnail URL invalid: ${thumbValidation.error}` };
    }
  }

  return { valid: true };
}

/**
 * Sanitize product data before saving
 *
 * Cleans up common issues automatically
 */
export function sanitizeProduct(product: any): any {
  const sanitized = { ...product };

  // Trim strings
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim();
  }

  if (sanitized.description) {
    sanitized.description = sanitized.description.trim();
  }

  if (sanitized.category) {
    sanitized.category = sanitized.category.trim();
  }

  // Sanitize image URLs
  if (sanitized.image_url) {
    const validation = validateImageUrl(sanitized.image_url);
    sanitized.image_url = validation.sanitized;
  }

  if (sanitized.image_thumbnail) {
    const validation = validateImageUrl(sanitized.image_thumbnail);
    sanitized.image_thumbnail = validation.sanitized;
  }

  // Convert empty strings to null
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '') {
      sanitized[key] = null;
    }
  });

  // Ensure numeric fields are actually numbers
  if (sanitized.selling_price !== null && sanitized.selling_price !== undefined) {
    sanitized.selling_price = Number(sanitized.selling_price);
  }

  if (sanitized.cost_price !== null && sanitized.cost_price !== undefined) {
    sanitized.cost_price = Number(sanitized.cost_price);
  }

  if (sanitized.quantity !== null && sanitized.quantity !== undefined) {
    sanitized.quantity = Number(sanitized.quantity);
  }

  return sanitized;
}

/**
 * Store Profile Validation
 */
export function validateStore(store: any): ValidationResult {
  if (!store.store_slug || typeof store.store_slug !== 'string' || store.store_slug.trim() === '') {
    return { valid: false, error: 'Store slug is required' };
  }

  if (!store.user_id || typeof store.user_id !== 'string') {
    return { valid: false, error: 'User ID is required' };
  }

  // Validate logo
  if (store.logo_url !== undefined) {
    const logoValidation = validateImageUrl(store.logo_url);
    if (!logoValidation.valid) {
      return { valid: false, error: `Logo URL invalid: ${logoValidation.error}` };
    }
  }

  // Validate WhatsApp number format (optional but if present should be valid)
  if (store.whatsapp_number && typeof store.whatsapp_number === 'string') {
    const cleaned = store.whatsapp_number.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length < 10 || cleaned.length > 15) {
      return { valid: false, error: 'WhatsApp number must be 10-15 digits' };
    }
  }

  return { valid: true };
}

/**
 * Batch validation helper
 *
 * Validates multiple items and returns all errors
 */
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult
): { valid: boolean; errors: Array<{ index: number; error: string }> } {
  const errors: Array<{ index: number; error: string }> = [];

  items.forEach((item, index) => {
    const result = validator(item);
    if (!result.valid && result.error) {
      errors.push({ index, error: result.error });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Image file validation (before upload)
 */
export function validateImageFile(file: File): ValidationResult {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const VALID_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!VALID_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, WebP, or HEIC images.'
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.'
    };
  }

  return { valid: true };
}

/**
 * Runtime assertion helper
 *
 * Throws error if validation fails (use in development/debugging)
 */
export function assertValid(
  data: any,
  validator: (data: any) => ValidationResult,
  context?: string
): void {
  const result = validator(data);

  if (!result.valid) {
    const message = context
      ? `Validation failed in ${context}: ${result.error}`
      : `Validation failed: ${result.error}`;

    throw new Error(message);
  }
}
