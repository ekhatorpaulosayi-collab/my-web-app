/**
 * WhatsApp Share Utilities
 * Generate beautiful shareable messages for WhatsApp Status and chats
 */

import { currencyNGN } from './format';

/**
 * Share product to WhatsApp (Status or Chat)
 * Opens WhatsApp with pre-filled message
 */
export function shareProductToWhatsApp(product, storeUrl) {
  // Build compelling message with Nigerian flair
  const message = `🔥 *${product.name}*\n\n` +
    `💰 ${currencyNGN(product.selling_price || product.price)}\n` +
    (product.description ? `\n📝 ${product.description}\n` : '') +
    (product.category ? `\n📦 Category: ${product.category}\n` : '') +
    (product.quantity > 0
      ? `\n✅ In Stock - Order Now!\n`
      : `\n⚠️ Limited Stock!\n`) +
    `\n👉 Shop here: ${storeUrl}\n\n` +
    `🛒 Click link to order via WhatsApp!`;

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);

  // Open WhatsApp with message
  // On mobile: Opens WhatsApp app
  // On desktop: Opens WhatsApp Web
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

  // Open in new tab/app
  window.open(whatsappUrl, '_blank');
}

/**
 * Share store to WhatsApp
 * For merchants to promote their entire store
 */
export function shareStoreToWhatsApp(storeName, storeUrl, productCount) {
  const message = `🏪 *${storeName}*\n\n` +
    `🛍️ Shop ${productCount}+ amazing products!\n\n` +
    `✨ Easy ordering via WhatsApp\n` +
    `💳 Pay with card or bank transfer\n` +
    `📦 Fast delivery across Nigeria\n\n` +
    `👉 Visit store: ${storeUrl}\n\n` +
    `🔥 Start shopping now!`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}

/**
 * Copy product link to clipboard (fallback)
 */
export function copyProductLink(productUrl) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(productUrl).then(() => {
      alert('✅ Link copied! Paste it anywhere to share.');
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopyToClipboard(productUrl);
    });
  } else {
    fallbackCopyToClipboard(productUrl);
  }
}

/**
 * Fallback clipboard copy for older browsers
 */
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    alert('✅ Link copied! Paste it anywhere to share.');
  } catch (err) {
    alert('❌ Could not copy link. Please copy manually: ' + text);
  }

  document.body.removeChild(textArea);
}
