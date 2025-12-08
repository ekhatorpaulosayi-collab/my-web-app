/**
 * Instagram Share Card Generator
 *
 * Generates beautiful, branded product cards for Instagram sharing
 * Works entirely client-side using Canvas API - NO server costs!
 *
 * Features:
 * - Professional design with Storehouse branding
 * - Product image + details in one shareable card
 * - Auto-downloads ready-to-post image
 * - Optimized for Instagram feed & stories
 */

import { formatNGN } from './currency';

export interface InstagramCardOptions {
  productName: string;
  price: number;
  productImage?: string;
  storeName?: string;
  storeUrl?: string;
  instagramHandle?: string;
  logoUrl?: string;
}

/**
 * Load an image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for external images
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  return lines;
}

/**
 * Generate Instagram share card
 * Returns a data URL that can be downloaded
 */
export async function generateInstagramCard(
  options: InstagramCardOptions
): Promise<string> {
  const {
    productName,
    price,
    productImage,
    storeName,
    storeUrl,
    instagramHandle
  } = options;

  // Canvas dimensions optimized for Instagram (1080x1080 for feed)
  const width = 1080;
  const height = 1080;
  const padding = 60;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background gradient (Storehouse brand colors)
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Product image section (top 60% of card)
  const imageHeight = height * 0.6;
  const imageY = padding;

  if (productImage) {
    try {
      const img = await loadImage(productImage);

      // Calculate dimensions to fit and center the image
      const imageMaxWidth = width - (padding * 2);
      const imageMaxHeight = imageHeight - (padding * 2);

      let drawWidth = img.width;
      let drawHeight = img.height;

      // Scale down if needed
      if (drawWidth > imageMaxWidth || drawHeight > imageMaxHeight) {
        const scale = Math.min(
          imageMaxWidth / drawWidth,
          imageMaxHeight / drawHeight
        );
        drawWidth *= scale;
        drawHeight *= scale;
      }

      // Center the image
      const imageX = (width - drawWidth) / 2;
      const imageYCentered = imageY + (imageMaxHeight - drawHeight) / 2;

      // Draw white background for image
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(padding, imageY, imageMaxWidth, imageMaxHeight);

      // Draw product image
      ctx.drawImage(img, imageX, imageYCentered, drawWidth, drawHeight);

      // Subtle shadow under image
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
    } catch (error) {
      console.warn('[Instagram Card] Failed to load product image:', error);

      // Fallback: Show placeholder
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(padding, imageY, width - (padding * 2), imageMaxHeight);

      // Placeholder icon
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📦', width / 2, imageY + imageMaxHeight / 2 + 40);
    }
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Product details section (bottom 40%)
  const detailsY = imageHeight + padding * 2;
  const detailsHeight = height - detailsY - padding;

  // Product name
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';

  // Wrap product name if too long
  const maxNameWidth = width - (padding * 4);
  const nameLines = wrapText(ctx, productName.toUpperCase(), maxNameWidth);

  let currentY = detailsY;
  nameLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, currentY + (index * 60));
  });

  currentY += nameLines.length * 60 + 20;

  // Price (prominent)
  ctx.fillStyle = '#2063F0'; // Storehouse brand blue
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(formatNGN(price), width / 2, currentY + 50);

  currentY += 100;

  // Divider line
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding * 3, currentY);
  ctx.lineTo(width - padding * 3, currentY);
  ctx.stroke();

  currentY += 40;

  // Call to action
  ctx.fillStyle = '#64748B';
  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('📲 DM to order or click link in bio', width / 2, currentY);

  currentY += 60;

  // Store name or Instagram handle
  if (instagramHandle) {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const handle = instagramHandle.startsWith('@') ? instagramHandle : `@${instagramHandle}`;
    ctx.fillText(handle, width / 2, currentY);
  } else if (storeName) {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(storeName, width / 2, currentY);
  }

  currentY += 60;

  // Store URL (if available and space permits)
  if (storeUrl && currentY < height - padding - 40) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const displayUrl = storeUrl.replace(/^https?:\/\//, ''); // Remove protocol
    ctx.fillText(`🔗 ${displayUrl}`, width / 2, currentY);
  }

  // Storehouse branding (subtle, bottom-right corner)
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Made with Storehouse', width - padding, height - padding / 2);

  // Convert canvas to data URL
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Download the generated image card
 */
export function downloadInstagramCard(dataUrl: string, productName: string): void {
  const link = document.createElement('a');

  // Clean filename
  const filename = `${productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)}-instagram.png`;

  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate and download Instagram card (all-in-one)
 */
export async function generateAndDownloadInstagramCard(
  options: InstagramCardOptions
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[Instagram Card] Generating card...');

    const dataUrl = await generateInstagramCard(options);

    console.log('[Instagram Card] Card generated, downloading...');

    downloadInstagramCard(dataUrl, options.productName);

    return {
      success: true,
      message: '✅ Instagram card downloaded! Open Instagram and post the image.'
    };
  } catch (error) {
    console.error('[Instagram Card] Error:', error);
    return {
      success: false,
      message: '❌ Failed to generate Instagram card. Please try again.'
    };
  }
}
