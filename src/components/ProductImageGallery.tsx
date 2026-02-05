/**
 * ProductImageGallery Component
 *
 * Displays product images in a gallery format on public storefront
 * - Main image with thumbnails below
 * - Swipeable on mobile
 * - Click thumbnails to change main image
 * - Lightbox view on click
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OptimizedImage } from './OptimizedImage';

interface ProductImage {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
}

interface ProductImageGalleryProps {
  productId: string;
  fallbackImage?: string;  // Show this if no images exist
}

export default function ProductImageGallery({ productId, fallbackImage }: ProductImageGalleryProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (!error && data && data.length > 0) {
        const formattedImages = data.map(img => ({
          id: img.id,
          url: img.image_url,
          position: img.position,
          isPrimary: img.is_primary
        }));

        setImages(formattedImages);

        // Set current index to primary image if exists
        const primaryIndex = formattedImages.findIndex(img => img.isPrimary);
        if (primaryIndex !== -1) {
          setCurrentIndex(primaryIndex);
        }
      } else if (fallbackImage) {
        // Use fallback image if no images in database
        setImages([{
          id: 'fallback',
          url: fallbackImage,
          position: 0,
          isPrimary: true
        }]);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      if (fallbackImage) {
        setImages([{
          id: 'fallback',
          url: fallbackImage,
          position: 0,
          isPrimary: true
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  // Helper to convert relative paths to full Supabase Storage URLs
  // Add cache-busting parameter for lightbox to force loading uncropped version
  const getFullImageUrl = (url: string, bustCache: boolean = false): string => {
    if (url.startsWith('blob:')) {
      return url; // Blob URLs can't be modified
    }

    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      // Remove leading slash if present
      const cleanPath = url.startsWith('/') ? url.slice(1) : url;
      fullUrl = `https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/${cleanPath}`;
    }

    // Add cache-busting parameter for lightbox
    if (bustCache) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${separator}view=full&t=${Date.now()}`;
    }

    return fullUrl;
  };

  // Add debug message helper
  const addDebug = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-4), `[${timestamp}] ${msg}`]); // Keep last 5 messages
    console.log('[ProductImageGallery]', msg);
  };

  // Preload full image when lightbox opens
  useEffect(() => {
    if (lightboxOpen && images.length > 0) {
      setLightboxImageLoaded(false);
      const currentImg = images[currentIndex];
      const fullUrl = getFullImageUrl(currentImg.url, true); // Cache-busting enabled
      addDebug(`Preloading image: ${fullUrl.substring(0, 80)}...`);
      const img = new Image();
      img.onload = () => {
        addDebug('✓ Image loaded successfully');
        setLightboxImageLoaded(true);
      };
      img.onerror = (e) => {
        addDebug('✗ Image failed to load');
        console.error('[ProductImageGallery] Lightbox image failed to load', e);
        setLightboxImageLoaded(true); // Show even on error
      };
      img.src = fullUrl;
    } else if (!lightboxOpen) {
      // Reset when lightbox closes
      setLightboxImageLoaded(false);
    }
  }, [lightboxOpen, currentIndex, images]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: '#f3f4f6',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af'
      }}>
        Loading...
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: '#f3f4f6',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: '14px'
      }}>
        No image available
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Debug Overlay - visible on mobile */}
      {debugInfo.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: '#0f0',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 99999,
          maxHeight: '120px',
          overflow: 'auto'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#fff' }}>
            🐛 Debug Log (tap to close)
          </div>
          {debugInfo.map((msg, i) => (
            <div key={i} style={{ marginBottom: '2px' }}>{msg}</div>
          ))}
          <button
            onClick={() => setDebugInfo([])}
            style={{
              marginTop: '4px',
              padding: '4px 8px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '2px',
              fontSize: '10px'
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Image */}
      <div
        style={{
          position: 'relative',
          marginBottom: '12px',
          display: lightboxOpen ? 'none' : 'block'
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addDebug('📱 Touch on background-image, opening lightbox...');
          setLightboxOpen(true);
        }}
        onClick={(e) => {
          // Only fire on non-touch devices (desktop)
          if (!('ontouchstart' in window)) {
            e.preventDefault();
            e.stopPropagation();
            addDebug('🖱️ Mouse click on background-image, opening lightbox...');
            setLightboxOpen(true);
          }
        }}
      >
        {/* Use CSS background-image instead of <img> to avoid iOS native image handling */}
        <div
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundImage: `url(${currentImage.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'none'
          }}
          role="button"
          aria-label={`View product image ${currentIndex + 1}`}
        />

        {/* Navigation Arrows (only if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
            >
              ›
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails (only if multiple images) */}
      {images.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {images.map((image, index) => (
            <div
              key={image.id}
              onClick={() => handleThumbnailClick(index)}
              style={{
                minWidth: '60px',
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === currentIndex ? '3px solid #667eea' : '2px solid #e5e7eb',
                opacity: index === currentIndex ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.opacity = '0.6';
                }
              }}
            >
              <img
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px 20px 20px', // Extra top padding for close button
            cursor: 'zoom-out',
            overflow: 'hidden' // Prevent scrolling
          }}
        >
          {!lightboxImageLoaded ? (
            <div style={{
              color: 'white',
              fontSize: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '40px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div>Loading image...</div>
            </div>
          ) : (
            <img
              key={`lightbox-${currentIndex}-${currentImage.url}`}
              src={getFullImageUrl(currentImage.url, true)}
              alt="Full size product image"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px',
                display: 'block',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            />
          )}

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              cursor: 'pointer',
              fontSize: '24px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>

          {/* Navigation in Lightbox */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
