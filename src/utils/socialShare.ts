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
 * Share product to Instagram
 * On mobile: Opens Instagram app
 * On desktop: Copies caption to clipboard
 */
export async function shareToInstagram(product: ProductShareData): Promise<{
  success: boolean;
  message: string;
}> {
  const caption = formatForInstagram(product);

  try {
    // Copy caption to clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(caption);
    }

    // On mobile, try to open Instagram
    if (isMobileDevice()) {
      // Instagram deep link (opens app if installed)
      // Note: Can't pre-fill post, but opens camera/library
      window.location.href = 'instagram://camera';

      return {
        success: true,
        message: '📋 Caption copied! Opening Instagram...\nPaste the caption when posting your photo.'
      };
    } else {
      // On desktop, just copy caption
      return {
        success: true,
        message: '📋 Instagram caption copied to clipboard!\nOpen Instagram and paste when posting.'
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

  lines.push(product.name);
  lines.push('');
  lines.push(`Price: ${formatNGN(product.price)}`);

  if (product.description) {
    lines.push('');
    lines.push(product.description);
  }

  if (product.storeUrl) {
    lines.push('');
    lines.push(product.storeUrl);
  }

  return lines.join('\n');
}

/**
 * Share product to Facebook
 */
export function shareToFacebook(product: ProductShareData): {
  success: boolean;
  message: string;
  url?: string;
} {
  // Facebook sharing options
  if (product.storeUrl) {
    // Share a link (opens Facebook sharer)
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(product.storeUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');

    return {
      success: true,
      message: '✅ Opening Facebook...',
      url
    };
  } else {
    // No URL to share - copy text to clipboard
    const text = formatForFacebook(product);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);

      // Open Facebook in new tab
      window.open('https://www.facebook.com', '_blank');

      return {
        success: true,
        message: '📋 Text copied! Opening Facebook...\nPaste when creating your post.'
      };
    } else {
      return {
        success: false,
        message: '❌ Unable to copy text'
      };
    }
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
