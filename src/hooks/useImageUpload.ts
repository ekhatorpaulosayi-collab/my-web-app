/**
 * useImageUpload Hook
 *
 * Provides utilities for uploading images to Supabase Storage with progress tracking.
 * Images are automatically optimized and served through ImageKit CDN.
 */

import { useState } from 'react';
import { uploadProductImage, uploadStoreLogo } from '../lib/supabase-storage';
import { validateImageFile } from '../lib/imagekit';

export interface UploadProgress {
  percentage: number;
  status: 'idle' | 'uploading' | 'compressing' | 'complete' | 'error';
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress;
  error: Error | null;
  imageUrl: string | null;
}

/**
 * Hook for uploading images with progress tracking
 */
export function useImageUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: {
      percentage: 0,
      status: 'idle'
    },
    error: null,
    imageUrl: null
  });

  /**
   * Upload product image to Supabase Storage
   *
   * @param file - Image file to upload
   * @param userId - User ID
   * @param productId - Product ID
   * @param oldImageUrl - Optional URL of old image to replace
   * @returns Public URL of uploaded image
   */
  const uploadProduct = async (
    file: File,
    userId: string,
    productId: string,
    oldImageUrl?: string
  ): Promise<string | null> => {
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Reset state
      setUploadState({
        isUploading: true,
        progress: { percentage: 0, status: 'compressing' },
        error: null,
        imageUrl: null
      });

      // Simulate compression progress
      setUploadState(prev => ({
        ...prev,
        progress: { percentage: 30, status: 'compressing' }
      }));

      // Update to uploading state
      setUploadState(prev => ({
        ...prev,
        progress: { percentage: 50, status: 'uploading' }
      }));

      // Upload image
      const imageUrl = await uploadProductImage(file, userId, productId, oldImageUrl);

      // Complete
      setUploadState({
        isUploading: false,
        progress: { percentage: 100, status: 'complete' },
        error: null,
        imageUrl
      });

      return imageUrl;
    } catch (error) {
      const err = error as Error;
      console.error('Upload error:', err);

      setUploadState({
        isUploading: false,
        progress: { percentage: 0, status: 'error' },
        error: err,
        imageUrl: null
      });

      return null;
    }
  };

  /**
   * Upload store logo to Supabase Storage
   *
   * @param file - Image file to upload
   * @param userId - User ID
   * @param oldLogoUrl - Optional URL of old logo to replace
   * @returns Public URL of uploaded image
   */
  const uploadLogo = async (
    file: File,
    userId: string,
    oldLogoUrl?: string
  ): Promise<string | null> => {
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Reset state
      setUploadState({
        isUploading: true,
        progress: { percentage: 0, status: 'compressing' },
        error: null,
        imageUrl: null
      });

      // Simulate compression progress
      setUploadState(prev => ({
        ...prev,
        progress: { percentage: 30, status: 'compressing' }
      }));

      // Update to uploading state
      setUploadState(prev => ({
        ...prev,
        progress: { percentage: 50, status: 'uploading' }
      }));

      // Upload logo
      const imageUrl = await uploadStoreLogo(file, userId, oldLogoUrl);

      // Complete
      setUploadState({
        isUploading: false,
        progress: { percentage: 100, status: 'complete' },
        error: null,
        imageUrl
      });

      return imageUrl;
    } catch (error) {
      const err = error as Error;
      console.error('Logo upload error:', err);

      setUploadState({
        isUploading: false,
        progress: { percentage: 0, status: 'error' },
        error: err,
        imageUrl: null
      });

      return null;
    }
  };

  /**
   * Reset upload state
   */
  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      progress: { percentage: 0, status: 'idle' },
      error: null,
      imageUrl: null
    });
  };

  return {
    uploadProduct,
    uploadLogo,
    resetUpload,
    ...uploadState
  };
}
