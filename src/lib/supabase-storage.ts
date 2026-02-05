/**
 * Supabase Storage Upload Utilities
 *
 * Handles image uploads to Supabase Storage with client-side compression.
 * Images are then served through ImageKit CDN for optimization.
 * EXIF library removed to fix mobile upload crashes - ImageKit handles orientation.
 */

import { supabase } from './supabase';

/**
 * Get EXIF orientation from image file (DISABLED for mobile compatibility)
 * Always returns 1 (normal orientation) - ImageKit will handle rotation
 */
const getOrientation = (file: File): Promise<number> => {
  return Promise.resolve(1);
};

/**
 * Detect if device is mobile
 * Aggressively detects mobile devices to prevent upload freeze
 */
const isMobile = (): boolean => {
  const ua = navigator.userAgent;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
  console.log('[Mobile Detection]', { ua: ua.substring(0, 50), isMobileUA, isTouchDevice, isSmallScreen, mobile });

  return mobile;
};

/**
 * Compress image before upload with EXIF orientation correction
 * Preserves aspect ratio and uses high quality settings
 * Automatically fixes rotated mobile photos
 * Uses lighter processing on mobile devices for better performance
 */
const compressImage = async (
  file: File,
  maxSize: number = 1200,
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      // On mobile, skip compression entirely to avoid freeze
      const mobile = isMobile();
      console.log('[Upload] Starting compression check - Mobile:', mobile, 'File size:', file.size);

      // MOBILE FIX: Skip ALL compression on mobile to prevent 33% freeze
      // ImageKit will handle optimization after upload
      if (mobile) {
        console.log('[Mobile Upload] ✅ SKIPPING COMPRESSION - Using original file');
        console.log('[Mobile Upload] File will be optimized by ImageKit after upload');
        resolve(file);
        return;
      }

      console.log('[Desktop Upload] Compressing image...');

      // EXIF processing disabled - ImageKit will handle orientation automatically
      const orientation = 1;

      // Use smaller dimensions on mobile to reduce memory usage
      const mobileMaxSize = mobile ? 600 : maxSize; // Even smaller for mobile
      const mobileQuality = mobile ? 0.7 : quality; // Lower quality for speed

      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set a timeout for mobile to prevent hanging
      let timeoutId: NodeJS.Timeout | null = null;
      if (mobile) {
        timeoutId = setTimeout(() => {
          console.log('[Mobile Upload] Timeout - using original file');
          resolve(file);
        }, 5000); // 5 second timeout on mobile
      }

      img.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);

        let { width, height } = img;

        // Only resize if image is larger than maxSize (use mobile-optimized size on mobile)
        const targetMaxSize = mobile ? mobileMaxSize : maxSize;
        if (width > targetMaxSize || height > targetMaxSize) {
          if (width > height) {
            height = Math.round((height * targetMaxSize) / width);
            width = targetMaxSize;
          } else {
            width = Math.round((width * targetMaxSize) / height);
            height = targetMaxSize;
          }
        }

        // Set canvas size (no EXIF orientation handling - ImageKit will fix rotation)
        canvas.width = width;
        canvas.height = height;

        // Use medium-quality smoothing on mobile, high on desktop
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = mobile ? 'medium' : 'high';

        // Draw image with proper orientation
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with optimized quality (lighter on mobile)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`[Image Compression] Success - Size: ${(blob.size / 1024).toFixed(0)}KB, Mobile: ${mobile}`);
              resolve(blob);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          mobile ? mobileQuality : quality
        );
      };

      img.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId);
        // On mobile, if image load fails, just use original file
        if (mobile) {
          console.log('[Mobile Upload] Image load failed, using original file');
          resolve(file);
        } else {
          reject(new Error('Image load failed'));
        }
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Upload store logo to Supabase Storage
 *
 * @param file - Image file to upload
 * @param userId - User ID (for organizing files)
 * @param oldLogoPath - Optional old logo path to delete
 * @returns Public URL of uploaded image
 */
export const uploadStoreLogo = async (
  file: File,
  userId: string,
  oldLogoPath?: string
): Promise<string> => {
  // Delete old logo if exists
  if (oldLogoPath) {
    try {
      const path = oldLogoPath.replace(/.*\/storage\/v1\/object\/public\//, '');
      await supabase.storage.from('stores').remove([path]);
    } catch (error) {
      console.log('No old logo to delete or deletion failed:', error);
    }
  }

  // Compress image (1000px, 75% quality - optimized for speed and quality balance)
  const compressed = await compressImage(file, 1000, 0.75);

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${userId}/logo-${timestamp}.jpg`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('stores')
    .upload(filename, compressed, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Return optimized public URL with Supabase transformation
  const { data: { publicUrl } } = supabase.storage
    .from('stores')
    .getPublicUrl(data.path, {
      transform: {
        width: 600,
        height: 600,
        quality: 85,
        resize: 'contain'
      }
    });

  console.log('[uploadStoreLogo] ✅ Upload successful with optimization');
  return publicUrl;
};

/**
 * Upload product image to Supabase Storage
 *
 * @param file - Image file to upload
 * @param userId - User ID (for organizing files)
 * @param productId - Product ID (for organizing files)
 * @param oldImagePath - Optional old image path to delete
 * @returns Public URL of uploaded image
 */
export const uploadProductImage = async (
  file: File,
  userId: string,
  productId: string,
  oldImagePath?: string
): Promise<string> => {
  // Delete old image if exists
  if (oldImagePath) {
    try {
      const path = oldImagePath.replace(/.*\/storage\/v1\/object\/public\//, '');
      await supabase.storage.from('products').remove([path]);
    } catch (error) {
      console.log('No old image to delete or deletion failed:', error);
    }
  }

  // Compress image (1000px, 75% quality - optimized for speed and quality balance)
  const compressed = await compressImage(file, 1000, 0.75);

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${userId}/${productId}/image-${timestamp}.jpg`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('products')
    .upload(filename, compressed, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Return optimized public URL with Supabase transformation
  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(data.path, {
      transform: {
        width: 1000,
        height: 1000,
        quality: 80,
        resize: 'contain'
      }
    });

  console.log('[uploadProductImage] ✅ Upload successful with optimization:', {
    filename,
    path: data.path,
    publicUrl,
    optimization: 'width: 1000px, quality: 80%'
  });

  return publicUrl;
};

/**
 * Delete image from Supabase Storage
 *
 * @param bucket - Storage bucket name ('stores' or 'products')
 * @param path - Path to the file or full URL
 */
export const deleteImage = async (bucket: 'stores' | 'products', path: string): Promise<void> => {
  try {
    // Extract path from full URL if needed
    const cleanPath = path.replace(/.*\/storage\/v1\/object\/public\/[^/]+\//, '');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([cleanPath]);

    if (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete image:', error);
    throw error;
  }
};

/**
 * Get public URL for a file in Supabase Storage
 *
 * @param bucket - Storage bucket name
 * @param path - Path to the file
 * @returns Public URL
 */
export const getPublicUrl = (bucket: 'stores' | 'products', path: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};
