/**
 * Social Media Sharing Utilities
 * Deep-link sharing for Instagram, WhatsApp, Facebook, TikTok
 * No API required - uses native sharing and deep links
 */

import { formatNGN } from './currency';
import { isMobileDevice } from './whatsapp';

export interface ProductShareData {
  name: string;
  price: number; // in Naira
  description?: string;
  imageUrl?: string;
  storeUrl?: string;
  whatsappNumber?: string;
  instagramHandle?: string;
  facebookPage?: string;
  storeName?: string; // Store name for Instagram card generation
}

export interface SocialHandles {
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

/**
 * Check if Web Share API is available
 */
export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Share using native Web Share API (works on mobile)
 */
export async function shareViaWebShare(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (!canUseWebShare()) {
    return false;
  }

  try {
    await navigator.share(data);
    console.log('[WebShare] Shared successfully');
    return true;
  } catch (error) {
    // User cancelled or error occurred
    if ((error as Error).name === 'AbortError') {
      console.log('[WebShare] User cancelled share');
    } else {
      console.error('[WebShare] Error:', error);
    }
    return false;
  }
}

/**
 * Format product for Instagram Stories
 * Instagram doesn't have URL scheme for sharing, so we copy text to clipboard
 */
export function formatForInstagram(product: ProductShareData): string {
  const lines: string[] = [];

  // Product name with emoji
  lines.push(`✨ ${product.name.toUpperCase()}`);
  lines.push('');

  // Price
  lines.push(`💰 ${formatNGN(product.price)}`);
  lines.push('');

  // Description (if available)
  if (product.description) {
    lines.push(product.description);
    lines.push('');
  }

  // Call to action
  lines.push('📲 DM to order or click link in bio');
  lines.push('');

  // Instagram handle
  if (product.instagramHandle) {
    const handle = product.instagramHandle.startsWith('@')
      ? product.instagramHandle
      : `@${product.instagramHandle}`;
    lines.push(handle);
  }

  // Store URL
  if (product.storeUrl) {
    lines.push(`🔗 ${product.storeUrl}`);
  }

  // Hashtags
  lines.push('');
  lines.push('#NigerianBusiness #ShopNigeria #NaijaStore #OnlineShopping');

  return lines.join('\n');
}

/**
 * Download image to device (helps user save product photo before posting)
 */
async function downloadProductImage(imageUrl: string, productName: string): Promise<boolean> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('[Image Download] Error:', error);
    return false;
  }
}

/**
 * Share product to Instagram with improved UX
 * Downloads image (optional) + copies caption + opens Instagram
 */
export async function shareToInstagram(product: ProductShareData): Promise<{
  success: boolean;
  message: string;
}> {
  // Format product caption
  const caption = formatForInstagram(product);

  try {
    // Copy caption to clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(caption);
    }

    // Optionally download product image to make it easier to post
    let imageDownloaded = false;
    if (product.imageUrl) {
      imageDownloaded = await downloadProductImage(product.imageUrl, product.name);
    }

    // On mobile, try to open Instagram
    if (isMobileDevice()) {
      // Instagram deep link (opens app if installed)
      // Use setTimeout to allow clipboard operation to complete
      setTimeout(() => {
        window.location.href = 'instagram://camera';
      }, 100);

      return {
        success: true,
        message: imageDownloaded
          ? '✅ Image downloaded & caption copied!\n\nNext steps:\n1. Select the downloaded image\n2. Tap "Next"\n3. Long-press caption area & paste\n4. Post!'
          : '📋 Caption copied! Opening Instagram...\n\nNext steps:\n1. Select your product photo\n2. Tap "Next"\n3. Long-press caption area & paste\n4. Post!'
      };
    } else {
      // On desktop
      return {
        success: true,
        message: imageDownloaded
          ? '✅ Image downloaded & caption copied!\n\nNext steps:\n1. Transfer image to phone (AirDrop/Google Photos)\n2. Open Instagram app\n3. Tap + → Select downloaded image\n4. Paste caption & post!'
          : '📋 Instagram caption copied to clipboard!\n\nNext steps:\n1. Save your product photo to phone\n2. Open Instagram app\n3. Tap + → Select photo\n4. Paste caption (long-press & paste)\n5. Add hashtags & post!'
      };
    }
  } catch (error) {
    console.error('[Instagram Share] Error:', error);
    return {
      success: false,
      message: '❌ Failed to prepare Instagram share'
    };
  }
}

/**
 * Format product for WhatsApp
 */
export function formatForWhatsApp(product: ProductShareData): string {
  const lines: string[] = [];

  lines.push(`*${product.name}*`);
  lines.push('');
  lines.push(`💰 Price: *${formatNGN(product.price)}*`);

  if (product.description) {
    lines.push('');
    lines.push(`📝 ${product.description}`);
  }

  if (product.storeUrl) {
    lines.push('');
    lines.push(`🔗 Order here: ${product.storeUrl}`);
  }

  lines.push('');
  lines.push('✅ Available now!');

  return lines.join('\n');
}

/**
 * Share product to WhatsApp Status or Chat
 */
export function shareToWhatsApp(product: ProductShareData): {
  success: boolean;
  message: string;
  url?: string;
} {
  const text = formatForWhatsApp(product);
  const encodedText = encodeURIComponent(text);

  // WhatsApp URL scheme
  let url: string;

  if (product.whatsappNumber) {
    // Share to specific number
    const cleanNumber = product.whatsappNumber.replace(/\D/g, '');
    url = `https://wa.me/${cleanNumber}?text=${encodedText}`;
  } else {
    // Open WhatsApp with text ready to share
    url = `https://wa.me/?text=${encodedText}`;
  }

  // Open WhatsApp
  window.open(url, '_blank');

  return {
    success: true,
    message: '✅ Opening WhatsApp...',
    url
  };
}

/**
 * Format product for Facebook
 */
export function formatForFacebook(product: ProductShareData): string {
  const lines: string[] = [];

  // Product name with emoji
  lines.push(`✨ ${product.name.toUpperCase()}`);
  lines.push('');

  // Price
  lines.push(`💰 Price: ${formatNGN(product.price)}`);
  lines.push('');

  // Description (if available)
  if (product.description) {
    lines.push(product.description);
    lines.push('');
  }

  // Call to action
  lines.push('📲 Send us a message to order!');
  lines.push('');

  // Store URL
  if (product.storeUrl) {
    lines.push(`🔗 Shop here: ${product.storeUrl}`);
    lines.push('');
  }

  // Availability
  lines.push('✅ Available now!');
  lines.push('');

  // Hashtags for better reach
  lines.push('#NigerianBusiness #ShopNigeria #NaijaStore #OnlineShopping #ShopLocal');

  return lines.join('\n');
}

/**
 * Share product to Facebook using Share Dialog
 * Uses Facebook's official sharer.php - auto-includes product image via Open Graph
 */
export function shareToFacebook(product: ProductShareData): {
  success: boolean;
  message: string;
  url?: string;
} {
  try {
    // If product has a store URL, use Facebook Share Dialog
    // This automatically pulls image and details from Open Graph meta tags
    if (product.storeUrl) {
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(product.storeUrl)}`;

      // Open Facebook Share Dialog in popup (better UX than new tab)
      const width = 600;
      const height = 400;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        shareUrl,
        'facebook-share-dialog',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      return {
        success: true,
        message: '✅ Opening Facebook Share...\n\nProduct image and details will auto-load from your store!',
        url: shareUrl
      };
    }

    // Fallback: If no store URL, use old method (copy text)
    const text = formatForFacebook(product);

    // Copy text to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }

    // Open Facebook
    if (isMobileDevice()) {
      // On mobile, try to open Facebook app
      window.location.href = 'fb://facewebmodal/f?href=https://www.facebook.com';

      // Fallback to web if app not installed
      setTimeout(() => {
        window.open('https://www.facebook.com', '_blank');
      }, 500);

      return {
        success: true,
        message: '📋 Product details copied! Opening Facebook...\n\nNext steps:\n1. Tap "What\'s on your mind?"\n2. Paste product details\n3. Tap "Photo" to upload product image\n4. Post!'
      };
    } else {
      // On desktop, open Facebook in new tab
      window.open('https://www.facebook.com', '_blank');

      return {
        success: true,
        message: '📋 Product details copied to clipboard!\n\nNext steps:\n1. Click "What\'s on your mind?"\n2. Paste product details (Ctrl+V)\n3. Click "Photo/Video" to upload image\n4. Post!'
      };
    }
  } catch (error) {
    console.error('[Facebook Share] Error:', error);
    return {
      success: false,
      message: '❌ Failed to prepare Facebook share'
    };
  }
}

/**
 * Share product to TikTok
 * Note: TikTok doesn't have URL scheme for sharing, so we copy caption
 */
export function shareToTikTok(product: ProductShareData): {
  success: boolean;
  message: string;
} {
  const caption = `${product.name} - ${formatNGN(product.price)}${product.description ? `\n\n${product.description}` : ''}\n\n#TikTokShop #NaijaStore #ShopTikTok`;

  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(caption);
    }

    // Open TikTok (mobile only)
    if (isMobileDevice()) {
      window.location.href = 'tiktok://';

      return {
        success: true,
        message: '📋 Caption copied! Opening TikTok...\nPaste when creating your video.'
      };
    } else {
      return {
        success: true,
        message: '📋 TikTok caption copied to clipboard!\nOpen TikTok app and paste when posting.'
      };
    }
  } catch (error) {
    console.error('[TikTok Share] Error:', error);
    return {
      success: false,
      message: '❌ Failed to prepare TikTok share'
    };
  }
}

/**
 * Universal share function - uses native share on mobile, fallback on desktop
 */
export async function shareProduct(
  product: ProductShareData,
  platform?: 'whatsapp' | 'instagram' | 'facebook' | 'tiktok'
): Promise<{ success: boolean; message: string }> {
  // Platform-specific sharing
  if (platform === 'whatsapp') {
    return shareToWhatsApp(product);
  } else if (platform === 'instagram') {
    return await shareToInstagram(product);
  } else if (platform === 'facebook') {
    return shareToFacebook(product);
  } else if (platform === 'tiktok') {
    return shareToTikTok(product);
  }

  // Try native Web Share API first (mobile)
  if (canUseWebShare()) {
    const title = product.name;
    const text = formatForWhatsApp(product);

    const shared = await shareViaWebShare({
      title,
      text,
      url: product.storeUrl
    });

    if (shared) {
      return {
        success: true,
        message: '✅ Shared successfully!'
      };
    }
  }

  // Fallback: Copy to clipboard
  try {
    const text = formatForWhatsApp(product);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return {
        success: true,
        message: '📋 Product details copied to clipboard!'
      };
    }
  } catch (error) {
    console.error('[Share] Error:', error);
  }

  return {
    success: false,
    message: '❌ Unable to share product'
  };
}

/**
 * Generate shareable product link
 */
export function generateProductLink(
  storeSlug: string,
  productId: string,
  productName: string
): string {
  const baseUrl = 'https://storehouse.ng'; // Update when you have custom domain
  const slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${baseUrl}/${storeSlug}/p/${productId}/${slug}`;
}

/**
 * Copy text to clipboard (fallback method)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('[Clipboard] Error:', error);
    return false;
  }
}

/**
 * TikTok URL Validation & Normalization
 *
 * TikTok username rules:
 * - 2-24 characters
 * - Letters, numbers, underscores, periods
 * - Cannot start with period
 *
 * Valid formats:
 * - @username
 * - username
 * - https://tiktok.com/@username
 * - https://www.tiktok.com/@username
 * - http://tiktok.com/@username (rare)
 */

// TikTok handle pattern (without @)
const TIKTOK_HANDLE_REGEX = /^[a-z0-9_](?:[a-z0-9_.]{0,22}[a-z0-9_])?$/i;

// TikTok profile URL pattern
const TIKTOK_URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-z0-9_](?:[a-z0-9_.]{0,22}[a-z0-9_])?)(?:\/.*)?$/i;

export interface TikTokValidationResult {
  valid: boolean;
  normalized: string; // Full URL: https://tiktok.com/@username
  handle: string;     // Just username (no @)
  error?: string;
}

/**
 * Validate and normalize TikTok URL or handle
 *
 * @param input - Can be: @username, username, or full TikTok URL
 * @returns Validation result with normalized URL and handle
 *
 * @example
 * validateTikTokUrl('@mystore')
 * // { valid: true, normalized: 'https://tiktok.com/@mystore', handle: 'mystore' }
 *
 * validateTikTokUrl('https://tiktok.com/@mystore')
 * // { valid: true, normalized: 'https://tiktok.com/@mystore', handle: 'mystore' }
 *
 * validateTikTokUrl('https://tiktok.com/@mystore/video/123456')
 * // { valid: false, error: 'Please use profile URL, not video URL' }
 */
export function validateTikTokUrl(input: string): TikTokValidationResult {
  // Empty is valid (optional field)
  if (!input || input.trim() === '') {
    return {
      valid: true,
      normalized: '',
      handle: ''
    };
  }

  const trimmed = input.trim();

  // Check for video URLs (not allowed - want profile URLs only)
  if (trimmed.includes('/video/') || /\/\d{10,}/.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      handle: '',
      error: 'Please use your profile URL, not a video URL'
    };
  }

  // Check for invalid domains
  if (trimmed.includes('://') && !trimmed.match(/^https?:\/\/(?:www\.)?tiktok\.com/i)) {
    return {
      valid: false,
      normalized: '',
      handle: '',
      error: 'Invalid TikTok URL. Must be tiktok.com'
    };
  }

  // Try to match as full URL
  const urlMatch = trimmed.match(TIKTOK_URL_REGEX);
  if (urlMatch) {
    const handle = urlMatch[1];
    return {
      valid: true,
      normalized: `https://tiktok.com/@${handle}`,
      handle: handle
    };
  }

  // Try to match as handle (with or without @)
  const handleInput = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // Check if it looks like a URL but didn't match (partial URL, wrong format, etc)
  if (handleInput.includes('/') || handleInput.includes('.com')) {
    return {
      valid: false,
      normalized: '',
      handle: '',
      error: 'Invalid TikTok URL format. Use: https://tiktok.com/@username'
    };
  }

  // Validate as handle
  if (TIKTOK_HANDLE_REGEX.test(handleInput)) {
    return {
      valid: true,
      normalized: `https://tiktok.com/@${handleInput}`,
      handle: handleInput
    };
  }

  // Invalid handle format
  return {
    valid: false,
    normalized: '',
    handle: '',
    error: 'Invalid TikTok username. Use 2-24 characters (letters, numbers, _, .)'
  };
}

/**
 * Check if TikTok URL/handle is valid (simple boolean check)
 */
export function isValidTikTokUrl(input: string): boolean {
  return validateTikTokUrl(input).valid;
}

/**
 * Normalize TikTok input to full URL
 * Returns empty string if invalid
 */
export function normalizeTikTokUrl(input: string): string {
  const result = validateTikTokUrl(input);
  return result.valid ? result.normalized : '';
}

/**
 * Extract TikTok handle from URL or @handle
 * Returns empty string if invalid
 */
export function extractTikTokHandle(input: string): string {
  const result = validateTikTokUrl(input);
  return result.valid ? result.handle : '';
}
