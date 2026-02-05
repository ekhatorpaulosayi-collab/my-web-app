/**
 * ImageKit Integration
 *
 * Provides image optimization and transformation utilities using ImageKit CDN.
 * Images are stored in Supabase Storage and served through ImageKit for:
 * - Automatic format conversion (WebP, AVIF)
 * - On-the-fly resizing and optimization
 * - Global CDN delivery (< 100ms load times)
 * - LQIP (Low Quality Image Placeholder) generation
 */

const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/onelove431212341234';
const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;

// Track logged warnings to prevent spam
const loggedWarnings = new Set<string>();

// Helper function to log only once per unique message
function logOnce(message: string, type: 'log' | 'warn' = 'warn') {
  if (!loggedWarnings.has(message)) {
    loggedWarnings.add(message);
    if (import.meta.env.DEV) {
      if (type === 'warn') {
        console.warn(message);
      } else {
        console.log(message);
      }
    }
  }
}

if (!IMAGEKIT_URL_ENDPOINT || !IMAGEKIT_PUBLIC_KEY) {
  if (import.meta.env.DEV) {
    console.warn('ImageKit configuration missing. Check .env.local file.');
  }
}

export interface ImageKitTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  blur?: number;
  aspectRatio?: string;
  crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max';
  focus?: 'auto' | 'face' | 'center';
}

/**
 * Generate ImageKit URL with transformations
 *
 * @param path - Path to image in Supabase Storage (e.g., "products/user123/image.jpg")
 * @param options - Transformation options
 * @returns Optimized ImageKit URL
 */
export function getImageKitUrl(path: string, options: ImageKitTransformOptions = {}): string {
  // CRITICAL: Validate path FIRST before any processing
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Trim whitespace
  path = path.trim();

  // Check for empty, undefined, null strings
  if (path === '' || path === '/' || path === 'undefined' || path === 'null' || path === 'null/null') {
    return '';
  }

  // Detect blob URLs early and return them as-is (can't be optimized)
  if (path.startsWith('blob:')) {
    logOnce('[ImageKit] Blob URL detected, skipping optimization (this is normal for image uploads/previews)');
    return path;
  }

  if (!IMAGEKIT_URL_ENDPOINT) {
    console.error('[ImageKit] CRITICAL: URL endpoint not configured! Check VITE_IMAGEKIT_URL_ENDPOINT environment variable.');
    console.error('[ImageKit] Attempted path:', path);
    // Return empty string to prevent broken relative URLs
    return '';
  }

  // If path is already a full Supabase URL, convert to ImageKit URL
  if (path.startsWith('http')) {
    // Extract the storage path from the full Supabase URL
    const urlObj = new URL(path);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);

    if (pathMatch) {
      const storagePath = pathMatch[1]; // e.g., "products/userId/productId/image.jpg"

      // Validate extracted storage path
      if (!storagePath || storagePath === '' || storagePath === 'undefined' || storagePath === 'null') {
        logOnce('[ImageKit] Extracted storage path is invalid from URL: ' + path);
        return path; // Return original URL as fallback
      }

      // Build transformation string
      const transformations: string[] = [];
      if (options.width) transformations.push(`w-${options.width}`);
      if (options.height) transformations.push(`h-${options.height}`);
      if (options.quality) transformations.push(`q-${options.quality}`);
      if (options.format) transformations.push(`f-${options.format}`);
      if (options.blur) transformations.push(`bl-${options.blur}`);
      if (options.aspectRatio) transformations.push(`ar-${options.aspectRatio}`);
      if (options.crop) transformations.push(`c-${options.crop}`);
      if (options.focus) transformations.push(`fo-${options.focus}`);

      const transformString = transformations.length > 0 ? `/tr:${transformations.join(',')}` : '';

      // ImageKit URL format: https://ik.imagekit.io/{urlEndpoint}/tr:transformations/storagePath
      const imagekitUrl = `${IMAGEKIT_URL_ENDPOINT}${transformString}/${storagePath}`;

      // Final validation: Ensure the URL is complete and valid
      if (!imagekitUrl.includes(storagePath)) {
        logOnce('[ImageKit] Generated URL does not contain storage path: ' + imagekitUrl);
        return path; // Return original URL as fallback
      }

      return imagekitUrl;
    }

    // If we can't parse the URL, return the original
    logOnce('[ImageKit] Could not extract storage path from URL, returning original: ' + path);
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Validate cleanPath is not empty after processing
  if (!cleanPath || cleanPath === '' || cleanPath === 'undefined' || cleanPath === 'null') {
    if (import.meta.env.DEV) {
      console.warn('[ImageKit] Empty path after cleaning:', path);
    }
    return '';
  }

  // Build transformation string
  const transformations: string[] = [];

  if (options.width) transformations.push(`w-${options.width}`);
  if (options.height) transformations.push(`h-${options.height}`);
  if (options.quality) transformations.push(`q-${options.quality}`);
  if (options.format) transformations.push(`f-${options.format}`);
  if (options.blur) transformations.push(`bl-${options.blur}`);
  if (options.aspectRatio) transformations.push(`ar-${options.aspectRatio}`);
  if (options.crop) transformations.push(`c-${options.crop}`);
  if (options.focus) transformations.push(`fo-${options.focus}`);

  // Construct ImageKit URL
  // Format: https://ik.imagekit.io/your_id/tr:w-400,h-300,q-90/path/to/image.jpg
  const transformString = transformations.length > 0 ? `/tr:${transformations.join(',')}` : '';

  // CRITICAL: Final safety check before constructing URL
  if (!cleanPath || cleanPath.trim() === '') {
    if (import.meta.env.DEV) {
      console.error('[ImageKit] CRITICAL: cleanPath is empty right before URL construction!', { originalPath: path, cleanPath });
    }
    return '';
  }

  return `${IMAGEKIT_URL_ENDPOINT}${transformString}/${cleanPath}`;
}

/**
 * Generate responsive srcset for different screen sizes
 *
 * @param path - Path to image in Supabase Storage
 * @param widths - Array of widths for srcset
 * @param options - Additional transformation options
 * @returns srcset string
 */
export function buildImageKitSrcSet(
  path: string,
  widths: number[] = [400, 800, 1200, 1600],
  options: Omit<ImageKitTransformOptions, 'width'> = {}
): string {
  // Early validation - if path is invalid, return empty string immediately
  if (!path || typeof path !== 'string' || path.trim() === '' || path === 'undefined' || path === 'null') {
    if (import.meta.env.DEV) {
      console.warn('[ImageKit] buildImageKitSrcSet received invalid path:', path);
    }
    return '';
  }

  const srcSetParts = widths
    .map(width => {
      const url = getImageKitUrl(path, { ...options, width });

      // Debug logging to identify incomplete URLs
      if (import.meta.env.DEV && url && !url.includes('/products/') && !url.includes('/stores/')) {
        console.warn('[ImageKit] Potentially incomplete URL generated:', { url, path, width });
      }

      return url ? `${url} ${width}w` : ''; // Only include if URL is valid
    })
    .filter(entry => entry !== ''); // Filter out empty entries

  // If all entries are empty, return empty string (don't set srcset at all)
  if (srcSetParts.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('[ImageKit] buildImageKitSrcSet generated no valid URLs for path:', path);
    }
    return '';
  }

  const finalSrcSet = srcSetParts.join(', ');

  // Additional validation: Check if srcset contains proper descriptors
  if (import.meta.env.DEV && finalSrcSet) {
    const hasProperDescriptors = srcSetParts.every(part => part.includes(' ') && part.endsWith('w'));
    if (!hasProperDescriptors) {
      console.error('[ImageKit] Invalid srcset format detected:', finalSrcSet);
    }
  }

  return finalSrcSet;
}

/**
 * Generate LQIP (Low Quality Image Placeholder) URL
 *
 * @param path - Path to image in Supabase Storage
 * @returns Blurred, low-quality image URL for placeholder
 */
export function getLQIP(path: string): string {
  return getImageKitUrl(path, {
    width: 20,
    quality: 10,
    blur: 10,
    format: 'auto'
  });
}

/**
 * Get optimized image for specific use case
 */
export const ImagePresets = {
  /**
   * Product thumbnail (small, grid view)
   */
  productThumbnail: (path: string) => getImageKitUrl(path, {
    width: 300,
    height: 300,
    quality: 80,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'auto'
  }),

  /**
   * Product grid (mobile-optimized for listings)
   */
  productGrid: (path: string) => getImageKitUrl(path, {
    width: 320,
    height: 320,
    quality: 75,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'auto'
  }),

  /**
   * Product card (medium size for cards/tiles)
   */
  productCard: (path: string) => getImageKitUrl(path, {
    width: 640,
    height: 640,
    quality: 80,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'auto'
  }),

  /**
   * Product mobile (optimized for mobile detail view)
   */
  productMobile: (path: string) => getImageKitUrl(path, {
    width: 800,
    quality: 85,
    format: 'auto',
    focus: 'auto'
  }),

  /**
   * Product detail (large, single view)
   */
  productDetail: (path: string) => getImageKitUrl(path, {
    width: 1200,
    quality: 85,
    format: 'auto',
    focus: 'auto'
  }),

  /**
   * Store logo (optimized for clarity)
   */
  storeLogo: (path: string) => getImageKitUrl(path, {
    width: 400,
    height: 400,
    quality: 90,
    format: 'auto',
    crop: 'maintain_ratio'
  }),

  /**
   * Avatar/profile picture
   */
  avatar: (path: string) => getImageKitUrl(path, {
    width: 200,
    height: 200,
    quality: 85,
    format: 'auto',
    crop: 'force',
    focus: 'face'
  }),

  /**
   * Storefront banner
   */
  banner: (path: string) => getImageKitUrl(path, {
    width: 1920,
    height: 600,
    quality: 80,
    format: 'auto',
    crop: 'maintain_ratio'
  }),

  /**
   * Social media sharing (Facebook, WhatsApp, Twitter)
   * Optimized for Open Graph previews
   */
  socialShare: (path: string) => getImageKitUrl(path, {
    width: 1200,
    height: 630,
    quality: 90,
    format: 'jpg',  // JPG for maximum compatibility
    crop: 'maintain_ratio',
    focus: 'auto'
  })
};

/**
 * Extract Supabase Storage path from full URL
 *
 * @param url - Full Supabase Storage URL
 * @returns Path portion for ImageKit
 */
export function extractStoragePath(url: string): string {
  // Check for blob URLs (temporary client-side URLs)
  if (url.startsWith('blob:')) {
    logOnce('[ImageKit] Blob URL detected in extractStoragePath (normal for uploads)');
    return url; // Return as-is, will be handled by fallback logic
  }

  try {
    // Handle full Supabase URLs
    // Example: https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/products/image.jpg
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);

    if (pathMatch) {
      return pathMatch[1];
    }

    // If already a path, return as-is
    return url;
  } catch {
    // Not a URL, assume it's already a path
    return url;
  }
}

/**
 * Get authentication parameters for ImageKit uploads (frontend)
 */
export function getImageKitAuthParams() {
  return {
    publicKey: IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT
  };
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

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
