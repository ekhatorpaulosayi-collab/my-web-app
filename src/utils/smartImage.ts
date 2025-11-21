/**
 * Smart Image Utilities
 * Handles fetching and selecting optimal image variants
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Compute SHA-256 hash (client-side version)
 * Used to generate content hash before upload
 */
export async function computeHash(buffer: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

export interface ImageVariant {
  url: string;
  width: number;
  format: 'avif' | 'webp' | 'jpeg' | 'png';
}

export interface ImageCache {
  contentHash: string;
  originalWidth: number;
  originalHeight: number;
  lqip: string;
  variants: { [key: string]: string }; // e.g., "800w.avif": "https://..."
  widths: number[];
  formats: string[];
}

/**
 * Fetch image cache data from Firestore
 */
export async function getImageCache(contentHash: string): Promise<ImageCache | null> {
  try {
    const cacheDoc = await getDoc(doc(db, 'image_cache', contentHash));
    if (cacheDoc.exists()) {
      return cacheDoc.data() as ImageCache;
    }
    return null;
  } catch (error) {
    console.error('Error fetching image cache:', error);
    return null;
  }
}

/**
 * Parse variant key to extract width and format
 */
function parseVariantKey(key: string): { width: number; format: string } {
  const [widthPart, format] = key.split('.');
  const width = parseInt(widthPart.replace('w', ''));
  return { width, format };
}

/**
 * Build srcset string for a specific format
 */
export function buildSrcSet(cache: ImageCache, format: 'avif' | 'webp' | 'jpeg' | 'png'): string {
  const entries: string[] = [];

  for (const [key, url] of Object.entries(cache.variants)) {
    const { width, format: variantFormat } = parseVariantKey(key);
    if (variantFormat === format) {
      entries.push(`${url} ${width}w`);
    }
  }

  return entries.join(', ');
}

/**
 * Get fallback image URL (largest JPEG)
 */
export function getFallbackUrl(cache: ImageCache): string {
  let largestJpeg: { url: string; width: number } | null = null;

  for (const [key, url] of Object.entries(cache.variants)) {
    const { width, format } = parseVariantKey(key);
    if (format === 'jpeg') {
      if (!largestJpeg || width > largestJpeg.width) {
        largestJpeg = { url, width };
      }
    }
  }

  return largestJpeg?.url || Object.values(cache.variants)[0];
}

/**
 * Pick best single source for a given display width
 * (for simple img src, not srcset)
 */
export function getBestVariant(
  cache: ImageCache,
  displayWidth: number,
  preferredFormat: 'avif' | 'webp' | 'jpeg' = 'webp',
  dpr: number = 1
): string {
  const targetWidth = displayWidth * dpr;

  // Find the smallest variant that's >= targetWidth
  let bestMatch: { url: string; width: number; format: string } | null = null;

  for (const [key, url] of Object.entries(cache.variants)) {
    const { width, format } = parseVariantKey(key);

    // Prefer the requested format
    if (format !== preferredFormat) continue;

    if (width >= targetWidth) {
      if (!bestMatch || width < bestMatch.width) {
        bestMatch = { url, width, format };
      }
    }
  }

  // If no match >= targetWidth, use the largest available
  if (!bestMatch) {
    for (const [key, url] of Object.entries(cache.variants)) {
      const { width, format } = parseVariantKey(key);
      if (format !== preferredFormat) continue;

      if (!bestMatch || width > bestMatch.width) {
        bestMatch = { url, width, format };
      }
    }
  }

  return bestMatch?.url || getFallbackUrl(cache);
}

/**
 * Calculate aspect ratio for layout shift prevention
 */
export function getAspectRatio(cache: ImageCache): number {
  return cache.originalWidth / cache.originalHeight;
}

/**
 * Get intrinsic dimensions for the image element
 */
export function getIntrinsicDimensions(cache: ImageCache): { width: number; height: number } {
  // Return the original dimensions
  return {
    width: cache.originalWidth,
    height: cache.originalHeight
  };
}
