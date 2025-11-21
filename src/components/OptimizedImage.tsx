/**
 * OptimizedImage Component
 *
 * Responsive image component powered by ImageKit CDN with:
 * - Automatic format conversion (AVIF, WebP, JPEG)
 * - LQIP blur-up effect
 * - DPR-aware srcset
 * - Lazy loading
 * - Layout shift prevention
 * - On-the-fly optimization (no pre-processing needed!)
 */

import { useState, useEffect } from 'react';
import { getImageKitUrl, buildImageKitSrcSet, getLQIP, extractStoragePath } from '../lib/imagekit';

interface OptimizedImageProps {
  src: string; // Supabase Storage URL or path
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * Optimized image component with automatic CDN optimization
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  sizes = '100vw',
  priority = false,
  onLoad,
  objectFit = 'cover'
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  // Extract storage path from full URL
  const imagePath = extractStoragePath(src);

  // Generate LQIP for blur placeholder
  const lqipUrl = getLQIP(imagePath);

  // Generate responsive srcsets
  const srcSet = buildImageKitSrcSet(imagePath, [400, 800, 1200, 1600], {
    quality: 85,
    format: 'auto'
  });

  // Fallback URL (optimized)
  const fallbackUrl = getImageKitUrl(imagePath, {
    width: 1200,
    quality: 85,
    format: 'auto'
  });

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('[OptimizedImage] Failed to load image:', fallbackUrl);
    console.log('[OptimizedImage] Attempting fallback to original URL:', src);

    // Try original URL as last resort
    const img = e.currentTarget;
    if (img.src !== src && src) {
      img.src = src;
      img.srcset = '';
    } else {
      setHasError(true);
    }
  };

  // Fallback: Force show image after 2 seconds if not loaded (for slow networks/mobile)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded && !hasError) {
        console.warn('[OptimizedImage] Image taking too long to load, forcing visibility');
        setForceShow(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoaded, hasError]);

  // Preload critical images
  useEffect(() => {
    if (priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = fallbackUrl;
      link.imageSrcset = srcSet;
      link.imageSizes = sizes;
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, fallbackUrl, srcSet, sizes]);

  // Show error state
  if (hasError) {
    return (
      <div
        className={`optimized-image-error ${className}`}
        style={{
          width: width || '100%',
          height: height || 'auto',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}
      >
        Image unavailable
      </div>
    );
  }

  // Container style with aspect ratio for layout shift prevention
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width || '100%',
    height: height || 'auto',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6'
  };

  // LQIP blur background style
  const lqipStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: `url(${lqipUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(20px)',
    transform: 'scale(1.1)',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.4s ease-out',
    pointerEvents: 'none'
  };

  // Main image style
  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    opacity: isLoaded || forceShow ? 1 : 0,
    transition: 'opacity 0.4s ease-out'
  };

  return (
    <div className={`optimized-image-container ${className}`} style={containerStyle}>
      {/* LQIP blur placeholder */}
      <div className="optimized-image-lqip" style={lqipStyle} aria-hidden="true" />

      {/* Main optimized image */}
      <img
        src={fallbackUrl}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        style={imageStyle}
        width={width}
        height={height}
      />
    </div>
  );
}

/**
 * Simple optimized image (no srcset, single size)
 * Useful for fixed-size images like avatars, icons
 */
export function SimpleImage({
  src,
  alt,
  width = 400,
  height,
  className = '',
  objectFit = 'cover'
}: Omit<OptimizedImageProps, 'sizes' | 'priority' | 'onLoad'>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const imagePath = extractStoragePath(src);

  const imageUrl = getImageKitUrl(imagePath, {
    width,
    height,
    quality: 85,
    format: 'auto',
    crop: 'maintain_ratio'
  });

  if (hasError) {
    return (
      <div
        className={`simple-image-error ${className}`}
        style={{
          width,
          height: height || width,
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280'
        }}
      >
        ✕
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
      style={{
        objectFit,
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-out'
      }}
    />
  );
}
