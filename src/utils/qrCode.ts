/**
 * QR Code Generation Utilities
 *
 * Generate QR codes for store URLs to make sharing easier
 */

/**
 * Generate QR code image URL using a public API
 *
 * Uses the QR Server API (https://goqr.me/api/)
 * @param data - The text/URL to encode in the QR code
 * @param size - Size in pixels (default: 300)
 * @returns URL to QR code image
 */
export function generateQRCodeUrl(data: string, size: number = 300): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

/**
 * Download QR code as image
 *
 * @param data - The text/URL to encode
 * @param filename - Filename for download (default: 'qr-code.png')
 */
export async function downloadQRCode(data: string, filename: string = 'qr-code.png'): Promise<void> {
  try {
    const qrUrl = generateQRCodeUrl(data, 500); // Larger size for download

    // Fetch the image
    const response = await fetch(qrUrl);
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw new Error('Failed to download QR code');
  }
}

/**
 * Generate store QR code URL
 *
 * @param storeSlug - The store's URL slug
 * @param size - Size in pixels
 * @returns QR code image URL
 */
export function generateStoreQRCode(storeSlug: string, size: number = 300): string {
  const storeUrl = `${window.location.origin}/store/${storeSlug}`;
  return generateQRCodeUrl(storeUrl, size);
}

/**
 * Copy QR code to clipboard as image
 *
 * Note: This requires the Clipboard API with image support
 * Falls back to copying the URL if not supported
 */
export async function copyQRCodeToClipboard(data: string): Promise<void> {
  try {
    const qrUrl = generateQRCodeUrl(data, 500);

    // Try to copy image if supported
    if (navigator.clipboard && 'write' in navigator.clipboard) {
      const response = await fetch(qrUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
    } else {
      // Fallback: copy the data URL
      await navigator.clipboard.writeText(data);
    }
  } catch (error) {
    console.error('Error copying QR code:', error);
    // Final fallback: just copy the text
    await navigator.clipboard.writeText(data);
  }
}
