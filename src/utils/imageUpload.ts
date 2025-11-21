import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

// High-quality image compression with smart resizing
// Preserves aspect ratio and uses high quality settings
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
      // This preserves original quality for smaller images
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

      // Draw image with high quality
      ctx.drawImage(img, 0, 0, width, height);

      // Use high quality JPEG compression
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

export const uploadStoreLogo = async (
  file: File,
  userId: string,
  oldLogoUrl?: string
): Promise<string> => {
  // Delete old logo if exists
  if (oldLogoUrl) {
    try {
      const oldRef = ref(storage, oldLogoUrl);
      await deleteObject(oldRef);
    } catch (error) {
      console.log('No old logo to delete');
    }
  }

  // HIGH QUALITY: 1200px, 95% quality for ultra-crisp logos
  const compressed = await compressImage(file, 1200, 0.95);
  const logoRef = ref(storage, `stores/${userId}/logo-${Date.now()}.jpg`);
  const snapshot = await uploadBytes(logoRef, compressed);
  return getDownloadURL(snapshot.ref);
};

export const uploadProductImage = async (
  file: File,
  userId: string,
  productId: string,
  oldImageUrl?: string
): Promise<string> => {
  // Delete old image if exists
  if (oldImageUrl) {
    try {
      const oldRef = ref(storage, oldImageUrl);
      await deleteObject(oldRef);
    } catch (error) {
      console.log('No old image to delete');
    }
  }

  // PREMIUM QUALITY: 1200px, 92% quality for stunning product photos
  // This will look crisp on all devices including retina displays
  const compressed = await compressImage(file, 1200, 0.92);
  const imageRef = ref(storage, `products/${userId}/${productId}/image-${Date.now()}.jpg`);
  const snapshot = await uploadBytes(imageRef, compressed);
  return getDownloadURL(snapshot.ref);
};
