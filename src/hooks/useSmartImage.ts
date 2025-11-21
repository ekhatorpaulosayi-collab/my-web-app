/**
 * useSmartImage Hook
 *
 * Provides utilities for uploading and managing smart images.
 * Handles uploading to the correct Storage path and computing content hashes.
 */

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { computeHash } from '../utils/smartImage';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: Error | null;
  contentHash: string | null;
  originalUrl: string | null;
}

/**
 * Hook for uploading images to Smart Image pipeline
 */
export function useSmartImage() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    contentHash: null,
    originalUrl: null
  });

  /**
   * Upload an image file to the products/ folder
   * Cloud Function will automatically process it
   */
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Reset state
      setUploadState({
        isUploading: true,
        progress: null,
        error: null,
        contentHash: null,
        originalUrl: null
      });

      // Read file as ArrayBuffer to compute hash
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Compute content hash
      const hash = await computeHash(buffer);

      // Generate unique filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${sanitizedName}`;

      // Upload to products/ folder (triggers Cloud Function)
      const storageRef = ref(storage, `products/${filename}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            // Update progress
            const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadState(prev => ({
              ...prev,
              progress: {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                percentage
              }
            }));
          },
          (error) => {
            // Handle error
            console.error('Upload error:', error);
            setUploadState({
              isUploading: false,
              progress: null,
              error,
              contentHash: null,
              originalUrl: null
            });
            reject(error);
          },
          async () => {
            // Upload complete
            const originalUrl = await getDownloadURL(uploadTask.snapshot.ref);

            setUploadState({
              isUploading: false,
              progress: {
                bytesTransferred: uploadTask.snapshot.totalBytes,
                totalBytes: uploadTask.snapshot.totalBytes,
                percentage: 100
              },
              error: null,
              contentHash: hash,
              originalUrl
            });

            // Return content hash for use with SmartPicture component
            resolve(hash);
          }
        );
      });
    } catch (error) {
      const err = error as Error;
      console.error('Upload preparation error:', err);
      setUploadState({
        isUploading: false,
        progress: null,
        error: err,
        contentHash: null,
        originalUrl: null
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
      progress: null,
      error: null,
      contentHash: null,
      originalUrl: null
    });
  };

  return {
    uploadImage,
    resetUpload,
    ...uploadState
  };
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 60 * 1024 * 1024; // 60 MB (matches Cloud Function limit)
  const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  if (!VALID_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, WebP, or HEIC images.'
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.'
    };
  }

  return { valid: true };
}
