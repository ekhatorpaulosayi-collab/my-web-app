/**
 * MultiImageUpload Component
 *
 * Handles multiple image uploads per product with tier-based limits:
 * - Free: 1 image
 * - Starter: 3 images
 * - Pro: 5 images
 * - Business: 10 images
 *
 * EXIF library removed for mobile compatibility - ImageKit handles orientation.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import UpgradeModal from './UpgradeModal';

interface ProductImage {
  id?: string;
  url: string;
  position: number;
  isPrimary: boolean;
  file?: File;
  uploading?: boolean;
  uploadProgress?: number;
}

interface MultiImageUploadProps {
  productId?: string;  // If editing existing product
  initialImages?: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;  // Override tier limit (for testing)
}

export default function MultiImageUpload({
  productId,
  initialImages = [],
  onImagesChange,
  maxImages
}: MultiImageUploadProps) {
  const { currentUser } = useAuth();
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch tier information and limits
  useEffect(() => {
    if (currentUser && productId) {
      fetchTierInfo();
      fetchExistingImages();
    } else if (currentUser) {
      fetchTierInfo();
    }
  }, [currentUser, productId]);

  const fetchTierInfo = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .rpc('can_add_product_image', {
          p_user_id: currentUser.uid,
          p_product_id: productId || 'new'
        });

      if (!error && data) {
        setTierInfo(data);
      }
    } catch (error) {
      console.error('Error fetching tier info:', error);
    }
  };

  const fetchExistingImages = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (!error && data) {
        const existingImages = data.map(img => ({
          id: img.id,
          url: img.image_url,
          position: img.position,
          isPrimary: img.is_primary
        }));
        setImages(existingImages);
        onImagesChange(existingImages);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const imageLimit = maxImages || tierInfo?.limit || 1;
  const canAddMore = images.length < imageLimit;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('[MultiImageUpload] Files selected:', files.length);

    if (files.length === 0) {
      console.log('[MultiImageUpload] No files selected');
      return;
    }

    const remainingSlots = imageLimit - images.length;
    console.log('[MultiImageUpload] Image slots:', {
      current: images.length,
      limit: imageLimit,
      remaining: remainingSlots
    });

    const filesToUpload = files.slice(0, remainingSlots);
    console.log('[MultiImageUpload] Files to upload:', filesToUpload.length);

    if (files.length > remainingSlots) {
      setShowUpgradeModal(true);
      if (remainingSlots === 0) return; // Don't upload if at limit
    }

    // Add files to state immediately (with uploading status)
    const newImages = filesToUpload.map((file, index) => ({
      url: URL.createObjectURL(file),
      position: images.length + index,
      isPrimary: images.length === 0 && index === 0, // First image is primary
      file,
      uploading: true,
      uploadProgress: 0
    }));

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange(updatedImages);

    // Upload files to Firebase Storage
    for (let i = 0; i < newImages.length; i++) {
      await uploadImage(newImages[i], images.length + i);
    }
  };

  const uploadImage = async (image: ProductImage, index: number) => {
    if (!image.file || !currentUser) {
      console.error('Upload aborted: missing file or user');
      return;
    }

    console.log('[MultiImageUpload] Starting upload for image', index);

    try {
      // Update to show compressing state (33% progress)
      setImages(prev => prev.map((img, idx) =>
        idx === index ? { ...img, uploadProgress: 33 } : img
      ));

      // Compress image
      const compressed = await compressImage(image.file);
      console.log('[MultiImageUpload] Image compressed');

      // Update to show uploading state (66% progress)
      setImages(prev => prev.map((img, idx) =>
        idx === index ? { ...img, uploadProgress: 66 } : img
      ));

      // Generate unique filename
      const timestamp = Date.now();
      const safeProductId = productId || 'temp';
      const filename = `${currentUser.uid}/${safeProductId}/image-${timestamp}.jpg`;

      console.log('[MultiImageUpload] Uploading to Supabase:', filename);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('products')
        .upload(filename, compressed, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('[MultiImageUpload] Upload error:', error);
        alert(`Upload failed: ${error.message}\n\nPlease check:\n1. Supabase Storage bucket "products" exists\n2. Bucket is public\n3. Upload policies are configured`);
        // Remove failed image
        setImages(prev => prev.filter((_, idx) => idx !== index));
        return;
      }

      console.log('[MultiImageUpload] Upload successful:', data.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(data.path);

      console.log('[MultiImageUpload] Public URL:', publicUrl);

      // Update image with final URL (100% progress) using functional update to get latest state
      setImages(prev => {
        const updatedImages = prev.map((img, idx) =>
          idx === index
            ? { ...img, url: publicUrl, uploading: false, uploadProgress: 100, file: undefined }
            : img
        );
        console.log('[MultiImageUpload] Updated images state after upload:', updatedImages.length, 'images');

        // Notify parent component INSIDE the setState callback to ensure we have the correct state
        try {
          console.log('[MultiImageUpload] About to call onImagesChange with', updatedImages.length, 'images');
          onImagesChange(updatedImages);
          console.log('[MultiImageUpload] Successfully called onImagesChange');
        } catch (error) {
          console.error('[MultiImageUpload] ERROR calling onImagesChange:', error);
        }

        return updatedImages;
      });

      // Save to Supabase database if product exists
      if (productId) {
        console.log('[MultiImageUpload] Saving to database for product:', productId);
        await saveImageToDatabase(publicUrl, index, index === 0);
      } else {
        console.log('[MultiImageUpload] Skipping database save (no productId yet) - will be saved when product is created');
      }

      console.log('[MultiImageUpload] Upload complete!');
    } catch (error) {
      console.error('[MultiImageUpload] Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setImages(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  // Helper function to compress images (EXIF library removed for mobile compatibility - ImageKit handles orientation)
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: true });

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        img.onload = () => {
          let { width, height } = img;
          const maxSize = 1200;
          const quality = 0.85; // Optimized for web - ImageKit will handle variants

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

          // Set canvas size (no EXIF orientation handling - ImageKit will fix rotation)
          canvas.width = width;
          canvas.height = height;

          // Draw image with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

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

  const saveImageToDatabase = async (imageUrl: string, position: number, isPrimary: boolean) => {
    if (!currentUser || !productId) return;

    // ⚠️ CRITICAL FIX: Never save blob URLs to database (they expire!)
    if (imageUrl.startsWith('blob:')) {
      console.error('[MultiImageUpload] ❌ PREVENTED saving blob URL to database:', imageUrl);
      console.error('[MultiImageUpload] This would cause images to disappear after browser refresh!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          user_id: currentUser.uid,
          image_url: imageUrl,
          position,
          is_primary: isPrimary
        })
        .select()
        .single();

      if (!error && data) {
        // Update local state with database ID
        setImages(prev => prev.map(img =>
          img.url === imageUrl ? { ...img, id: data.id } : img
        ));
      }
    } catch (error) {
      console.error('Error saving image to database:', error);
    }
  };

  const handleDeleteImage = async (index: number) => {
    const imageToDelete = images[index];

    if (!confirm('Delete this image?')) return;

    // Delete from database if it exists
    if (imageToDelete.id) {
      try {
        await supabase
          .from('product_images')
          .delete()
          .eq('id', imageToDelete.id);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Remove from state
    const updatedImages = images.filter((_, idx) => idx !== index);

    // Re-index positions and ensure first image is primary
    const reindexed = updatedImages.map((img, idx) => ({
      ...img,
      position: idx,
      isPrimary: idx === 0
    }));

    setImages(reindexed);
    onImagesChange(reindexed);

    // Update positions in database
    if (productId) {
      await updateImagePositions(reindexed);
    }
  };

  const handleSetPrimary = async (index: number) => {
    const updatedImages = images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index
    }));

    setImages(updatedImages);
    onImagesChange(updatedImages);

    // Update in database
    if (productId) {
      await updatePrimaryImage(images[index].id!);
    }
  };

  const updatePrimaryImage = async (primaryId: string) => {
    if (!productId) return;

    try {
      // Remove primary from all images
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set new primary
      await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', primaryId);
    } catch (error) {
      console.error('Error updating primary image:', error);
    }
  };

  const updateImagePositions = async (updatedImages: ProductImage[]) => {
    if (!productId) return;

    try {
      for (const img of updatedImages) {
        if (img.id) {
          await supabase
            .from('product_images')
            .update({ position: img.position, is_primary: img.isPrimary })
            .eq('id', img.id);
        }
      }
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedImages = [...images];
    const draggedImage = updatedImages[draggedIndex];
    updatedImages.splice(draggedIndex, 1);
    updatedImages.splice(index, 0, draggedImage);

    // Re-index positions
    const reindexed = updatedImages.map((img, idx) => ({
      ...img,
      position: idx
    }));

    setImages(reindexed);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    onImagesChange(images);

    // Update positions in database
    if (productId) {
      await updateImagePositions(images);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading images...</div>;
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Image Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {images.map((image, index) => (
          <div
            key={index}
            draggable={!image.uploading}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '8px',
              overflow: 'hidden',
              border: image.isPrimary ? '3px solid #667eea' : '1px solid #e5e7eb',
              cursor: image.uploading ? 'default' : 'move',
              opacity: draggedIndex === index ? 0.5 : 1
            }}
          >
            {/* Image */}
            <img
              src={image.url}
              alt={`Product ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* Upload Progress */}
            {image.uploading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px'
              }}>
                {Math.round(image.uploadProgress || 0)}%
              </div>
            )}

            {/* Primary Badge */}
            {image.isPrimary && !image.uploading && (
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                background: '#667eea',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600
              }}>
                ★ PRIMARY
              </div>
            )}

            {/* Action Buttons */}
            {!image.uploading && (
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                display: 'flex',
                gap: '4px'
              }}>
                {!image.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(index)}
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Set as primary"
                  >
                    ★
                  </button>
                )}
                <button
                  onClick={() => handleDeleteImage(index)}
                  style={{
                    background: 'rgba(239,68,68,0.9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Image Button */}
        {canAddMore && (
          <label style={{
            aspectRatio: '1',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: '#f9fafb',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.background = '#f0f4ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.background = '#f9fafb';
          }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '32px', color: '#9ca3af', marginBottom: '4px' }}>+</div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Add Image</div>
          </label>
        )}
      </div>

      {/* Quota Info */}
      <div style={{
        fontSize: '13px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: '#f9fafb',
        borderRadius: '6px'
      }}>
        <span>
          {images.length} of {imageLimit} images used
          {tierInfo?.tier && ` (${tierInfo.tier.toUpperCase()} plan)`}
        </span>
        {!canAddMore && tierInfo?.tier === 'free' && (
          <span style={{ color: '#667eea', fontSize: '12px', fontWeight: 600 }}>
            Upgrade to Starter for 3 images!
          </span>
        )}
        {!canAddMore && tierInfo?.tier === 'starter' && (
          <span style={{ color: '#667eea', fontSize: '12px', fontWeight: 600 }}>
            Upgrade to Pro for 5 images!
          </span>
        )}
      </div>

      {/* Help Text */}
      <div style={{
        fontSize: '12px',
        color: '#9ca3af',
        marginTop: '8px'
      }}>
        💡 Drag images to reorder • First image is shown in listings • Click ★ to set as primary
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="images"
        currentTier={tierInfo?.tier_name || 'Free'}
        suggestedTier={tierInfo?.limit === 1 ? 'Starter' : tierInfo?.limit === 3 ? 'Pro' : 'Business'}
        currentCount={images.length}
        limit={tierInfo?.limit || 1}
        reason={`Your ${tierInfo?.tier_name || 'Free'} tier allows ${tierInfo?.limit || 1} images per product`}
      />
    </div>
  );
}
