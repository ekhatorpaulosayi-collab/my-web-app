/**
 * Configuration for Storehouse Advanced Image Processing Pipeline
 *
 * These settings control the quality, performance, and visual characteristics
 * of the image enhancement and optimization system.
 */

export const IMAGE_CONFIG = {
  // Target output widths for responsive images
  TARGET_WIDTHS: [400, 800, 1200, 1600, 2000, 2400],

  // Quality settings for each format
  QUALITY: {
    avifQ: 50,      // AVIF quality (45-55 recommended)
    avifSpeed: 6,   // AVIF encoding speed (0-10, higher = faster but less compression)
    webpQ: 82,      // WebP quality (80-85 recommended)
    jpegQ: 86,      // JPEG quality (82-88 recommended)
    pngCompression: 9  // PNG compression level (0-9)
  },

  // Sharpening settings (applied after resize)
  SHARPEN: {
    amountBase: 0.6,    // Base sharpening amount (will scale with downscale ratio)
    radius: 0.8,        // Sharpening radius in pixels
    threshold: 2        // Minimum brightness change to sharpen (reduces noise amplification)
  },

  // Denoising settings (subtle, chroma only by default)
  DENOISE: {
    chroma: 0.2,   // Chroma noise reduction (color noise)
    luma: 0.0      // Luma noise reduction (brightness noise) - disabled by default
  },

  // Tone and color enhancement (modern, realistic look)
  TONE: {
    filmic: true,           // Apply filmic tone curve for natural roll-off
    midContrast: 0.08,      // Midtone contrast enhancement (clarity)
    shadowLift: 0.06,       // Lift shadows slightly (0-1)
    highlightProtect: 0.08, // Protect highlights from clipping
    vibrance: 0.06,         // Micro-vibrance boost (affects muted colors more)
    dehaze: 0.05,           // Subtle dehaze/clarity
    saturation: 1.0         // Global saturation multiplier
  },

  // File size and dimension limits
  LIMITS: {
    maxPixels: 75_000_000,    // 75 megapixels max
    maxBytes: 60_000_000,     // 60 MB max file size
    takeFirstFrame: true      // For animated images, take first frame only
  },

  // Storage paths
  PATHS: {
    originalsPrefix: 'products/',           // Where original uploads go
    variantsPrefix: 'products/variants/'    // Where processed variants go
  },

  // Caching and CDN settings
  CACHE: {
    maxAge: 31536000,      // 1 year in seconds
    immutable: true        // Set immutable cache header
  },

  // Processing options
  PROCESSING: {
    stripMetadata: false,    // Keep essential EXIF (camera, lens, datetime)
    stripGPS: true,          // Always remove GPS data for privacy
    autoRotate: true,        // Apply EXIF orientation
    colorSpace: 'srgb',      // Force sRGB color space
    formats: {
      avif: true,           // Generate AVIF variants
      webp: true,           // Generate WebP variants
      jpeg: true,           // Generate JPEG variants
      png: 'alpha-only'     // Generate PNG only for images with transparency
    }
  }
};

export type ImageConfig = typeof IMAGE_CONFIG;
