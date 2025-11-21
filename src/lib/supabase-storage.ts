/**
 * Supabase Storage Upload Utilities
 *
 * Handles image uploads to Supabase Storage with client-side compression.
 * Images are then served through ImageKit CDN for optimization.
 */

import { supabase } from './supabase';

/**
 * Compress image before upload
 * Preserves aspect ratio and uses high quality settings
 */
const compressImage = async (
  file: File,
  maxSize: number = 1200,
  quality: number = 0.92
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
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

      canvas.width = width;
      canvas.height = height;

      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with high quality
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
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

  // Compress image (1200px, 95% quality for crisp logos)
  const compressed = await compressImage(file, 1200, 0.95);

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

  // Compress image (1200px, 92% quality for stunning product photos)
  const compressed = await compressImage(file, 1200, 0.92);

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
