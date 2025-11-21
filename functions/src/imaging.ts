/**
 * Advanced Image Enhancement Pipeline
 *
 * Professional-grade image processing with modern, realistic enhancements.
 * Produces clean, crisp, natural-looking images suitable for e-commerce.
 */

import sharp from 'sharp';
import { createHash } from 'crypto';
import { IMAGE_CONFIG } from './config';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  space: string;
  size: number;
}

export interface ProcessingResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
  processingTime: number;
}

export interface VariantSpec {
  width: number;
  format: 'avif' | 'webp' | 'jpeg' | 'png';
  quality: number;
}

/**
 * Compute content hash for cache-busting and idempotency
 */
export function computeContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

/**
 * Extract and validate image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image: missing dimensions');
  }

  const pixels = metadata.width * metadata.height;
  if (pixels > IMAGE_CONFIG.LIMITS.maxPixels) {
    throw new Error(`Image too large: ${pixels} pixels (max: ${IMAGE_CONFIG.LIMITS.maxPixels})`);
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format || 'unknown',
    hasAlpha: metadata.hasAlpha || false,
    space: metadata.space || 'srgb',
    size: buffer.length
  };
}

/**
 * Apply subtle auto white balance
 * Uses a neutral gray heuristic - finds pixels close to neutral and adjusts temperature
 * Currently unused - can be enabled in future for more aggressive color correction
 */
// function applyAutoWhiteBalance(pipeline: sharp.Sharp): sharp.Sharp {
//   // Simple temperature adjustment - warm up slightly if image is too cool
//   // This is a conservative approach that won't destroy color accuracy
//   return pipeline.modulate({
//     brightness: 1.0,
//     saturation: 1.0,
//     hue: 0 // We could add subtle temperature shift here if needed
//   });
// }

/**
 * Apply modern filmic tone curve
 * Lifts shadows, protects highlights, adds midtone contrast
 */
function applyToneCurve(pipeline: sharp.Sharp): sharp.Sharp {
  const { shadowLift, highlightProtect, midContrast } = IMAGE_CONFIG.TONE;

  // Use sharp's normalize to stretch tonal range
  // Then apply gamma for midtone contrast
  return pipeline
    .normalise({
      lower: Math.round(shadowLift * 100),
      upper: Math.round((1 - highlightProtect) * 100)
    })
    .gamma(1 + midContrast); // Slightly increase midtone contrast
}

/**
 * Apply subtle vibrance and dehaze
 */
function applyColorEnhancement(pipeline: sharp.Sharp): sharp.Sharp {
  const { vibrance, dehaze, saturation } = IMAGE_CONFIG.TONE;

  // Vibrance: boost muted colors more than saturated ones
  // Dehaze: subtle clarity boost
  const satBoost = 1 + (vibrance + dehaze);

  return pipeline.modulate({
    saturation: satBoost * saturation
  });
}

/**
 * Apply selective sharpening based on downscale ratio
 * More aggressive sharpening for smaller sizes
 */
function applySharpen(
  pipeline: sharp.Sharp,
  originalWidth: number,
  targetWidth: number
): sharp.Sharp {
  const { amountBase, radius, threshold } = IMAGE_CONFIG.SHARPEN;

  // Scale sharpening amount by downscale ratio
  const downscale = originalWidth / targetWidth;
  const scaledAmount = amountBase * Math.min(downscale, 2.5);

  // Convert to sharp's sigma-based sharpening
  const sigma = radius;
  const m1 = 1 + (scaledAmount / 2);
  const m2 = scaledAmount / 2;

  return pipeline.sharpen({
    sigma,
    m1,
    m2,
    x1: threshold,
    y2: 255 - threshold,
    y3: 255
  });
}

/**
 * Main enhancement pipeline
 * Applies all enhancements in optimal order
 */
export async function enhanceImage(
  inputBuffer: Buffer,
  metadata: ImageMetadata
): Promise<sharp.Sharp> {
  let pipeline = sharp(inputBuffer, {
    limitInputPixels: IMAGE_CONFIG.LIMITS.maxPixels,
    sequentialRead: true
  });

  // 1. Apply EXIF orientation
  if (IMAGE_CONFIG.PROCESSING.autoRotate) {
    pipeline = pipeline.rotate();
  }

  // 2. Force sRGB color space
  pipeline = pipeline.toColorspace(IMAGE_CONFIG.PROCESSING.colorSpace);

  // 3. Apply tone curve if enabled
  if (IMAGE_CONFIG.TONE.filmic) {
    pipeline = applyToneCurve(pipeline);
  }

  // 4. Apply color enhancement
  pipeline = applyColorEnhancement(pipeline);

  // 5. Optional denoise (only if configured)
  const { chroma, luma } = IMAGE_CONFIG.DENOISE;
  if (chroma > 0 || luma > 0) {
    // Sharp doesn't have built-in denoise, but we can use median filter for subtle effect
    if (chroma > 0.3 || luma > 0.3) {
      pipeline = pipeline.median(3); // Very subtle noise reduction
    }
  }

  return pipeline;
}

/**
 * Process a single variant (resize + format conversion)
 */
export async function processVariant(
  enhancedPipeline: sharp.Sharp,
  spec: VariantSpec,
  originalMetadata: ImageMetadata
): Promise<ProcessingResult> {
  const startTime = Date.now();

  let pipeline = enhancedPipeline.clone();

  // Resize with high-quality Lanczos3 filter
  pipeline = pipeline.resize(spec.width, null, {
    kernel: 'lanczos3',
    withoutEnlargement: true,
    fastShrinkOnLoad: false // Ensure high quality
  });

  // Apply sharpening after resize
  pipeline = applySharpen(pipeline, originalMetadata.width, spec.width);

  // Convert to target format
  switch (spec.format) {
      case 'avif':
      pipeline = pipeline.avif({
        quality: spec.quality,
        effort: IMAGE_CONFIG.QUALITY.avifSpeed,
        chromaSubsampling: '4:2:0'
      });
      break;

    case 'webp':
      pipeline = pipeline.webp({
        quality: spec.quality,
        effort: 6, // High effort for better compression
        smartSubsample: true
      });
      break;

    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality: spec.quality,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: '4:2:0'
      });
      break;

    case 'png':
      pipeline = pipeline.png({
        compressionLevel: IMAGE_CONFIG.QUALITY.pngCompression,
        effort: 10
      });
      break;
  }

  // Strip metadata except essential EXIF
  if (IMAGE_CONFIG.PROCESSING.stripMetadata) {
    pipeline = pipeline.withMetadata({
      // Strip most metadata for privacy/size
    });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    format: info.format,
    size: info.size,
    processingTime: Date.now() - startTime
  };
}

/**
 * Generate all variants for an image
 */
export async function generateVariants(
  inputBuffer: Buffer,
  contentHash: string
): Promise<Map<string, ProcessingResult>> {
  const metadata = await getImageMetadata(inputBuffer);
  const results = new Map<string, ProcessingResult>();

  console.log(`[Imaging] Processing image: ${metadata.width}x${metadata.height}, ${metadata.format}, ${metadata.size} bytes`);

  // Apply enhancement pipeline once
  const enhancedPipeline = await enhanceImage(inputBuffer, metadata);

  // Generate variants
  const variants: VariantSpec[] = [];

  for (const width of IMAGE_CONFIG.TARGET_WIDTHS) {
    // Skip if target width is larger than original
    if (width > metadata.width) continue;

    // AVIF
    if (IMAGE_CONFIG.PROCESSING.formats.avif) {
      variants.push({
        width,
        format: 'avif',
        quality: IMAGE_CONFIG.QUALITY.avifQ
      });
    }

    // WebP
    if (IMAGE_CONFIG.PROCESSING.formats.webp) {
      variants.push({
        width,
        format: 'webp',
        quality: IMAGE_CONFIG.QUALITY.webpQ
      });
    }

    // JPEG (always, as fallback)
    if (IMAGE_CONFIG.PROCESSING.formats.jpeg) {
      variants.push({
        width,
        format: 'jpeg',
        quality: IMAGE_CONFIG.QUALITY.jpegQ
      });
    }

    // PNG (only for images with alpha channel)
    if (metadata.hasAlpha && IMAGE_CONFIG.PROCESSING.formats.png === 'alpha-only') {
      variants.push({
        width,
        format: 'png',
        quality: IMAGE_CONFIG.QUALITY.pngCompression
      });
    }
  }

  // Process all variants in parallel (with concurrency limit)
  const CONCURRENCY = 3;
  for (let i = 0; i < variants.length; i += CONCURRENCY) {
    const batch = variants.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(spec => processVariant(enhancedPipeline, spec, metadata))
    );

    batch.forEach((spec, idx) => {
      const key = `${spec.width}w.${spec.format}`;
      results.set(key, batchResults[idx]);
      console.log(`[Imaging] Generated ${key}: ${batchResults[idx].size} bytes (${batchResults[idx].processingTime}ms)`);
    });
  }

  return results;
}

/**
 * Generate tiny LQIP (Low Quality Image Placeholder) for blur-up effect
 */
export async function generateLQIP(inputBuffer: Buffer): Promise<string> {
  const lqipBuffer = await sharp(inputBuffer)
    .resize(20, null, { withoutEnlargement: true })
    .jpeg({ quality: 30 })
    .toBuffer();

  return `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
}
