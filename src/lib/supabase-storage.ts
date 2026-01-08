/**
 * Supabase Storage Upload Utilities
 *
 * Handles image uploads to Supabase Storage with client-side compression.
 * Images are then served through ImageKit CDN for optimization.
 * Includes EXIF orientation correction for mobile photos.
 */

import { supabase } from './supabase';
import EXIF from 'exif-js';

/**
 * Get EXIF orientation from image file
 * Returns orientation value (1-8) where 1 is normal
 */
const getOrientation = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    EXIF.getData(file as any, function(this: any) {
      const orientation = EXIF.getTag(this, 'Orientation');
      resolve(orientation || 1);
    });
  });
};

/**
 * Compress image before upload with EXIF orientation correction
 * Preserves aspect ratio and uses high quality settings
 * Automatically fixes rotated mobile photos
 */
const compressImage = async (
  file: File,
  maxSize: number = 1200,
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get EXIF orientation
      const orientation = await getOrientation(file);

      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        let { width, height } = img;

        // Only resize if image is larger than maxSize
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        // Adjust canvas size based on EXIF orientation
        // Orientations 5-8 require width/height swap
        if (orientation >= 5 && orientation <= 8) {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        // Apply EXIF orientation transformation
        switch (orientation) {
          case 2:
            // Horizontal flip
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
          case 3:
            // 180° rotation
            ctx.transform(-1, 0, 0, -1, width, height);
            break;
          case 4:
            // Vertical flip
            ctx.transform(1, 0, 0, -1, 0, height);
            break;
          case 5:
            // Vertical flip + 90° rotation
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
          case 6:
            // 90° rotation
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
          case 7:
            // Horizontal flip + 90° rotation
            ctx.transform(0, -1, -1, 0, height, width);
            break;
          case 8:
            // 270° rotation
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
          default:
            // Normal orientation (1)
            break;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image with proper orientation
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with optimized quality
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
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

  // Compress image (1200px, 85% quality - optimized for web)
  const compressed = await compressImage(file, 1200, 0.85);

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

  // Return public URL
  const { data: { publicUrl } } = supabase.storage
    .from('stores')
    .getPublicUrl(data.path);

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

  // Compress image (1200px, 85% quality - optimized for web, ImageKit will handle variants)
  const compressed = await compressImage(file, 1200, 0.85);

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

  // Return public URL
  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(data.path);

  console.log('[uploadProductImage] ✅ Upload successful:', {
    filename,
    path: data.path,
    publicUrl
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
