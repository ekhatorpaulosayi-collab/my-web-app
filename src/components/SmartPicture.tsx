/**
 * SmartPicture Component
 *
 * Responsive image component with:
 * - Multi-format support (AVIF, WebP, JPEG)
 * - LQIP blur-up effect
 * - DPR-aware srcset
 * - Lazy loading
 * - Layout shift prevention
 */

import { useEffect, useState } from 'react';
import { getImageCache, buildSrcSet, getFallbackUrl, getAspectRatio, type ImageCache } from '../utils/smartImage';

interface SmartPictureProps {
  contentHash: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
}

export function SmartPicture({
  contentHash,
  alt,
  width,
  height,
  className = '',
  sizes = '100vw',
  priority = false,
  onLoad
}: SmartPictureProps) {
  const [cache, setCache] = useState<ImageCache | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCache() {
      try {
        const imageCache = await getImageCache(contentHash);
        if (isMounted) {
          if (imageCache) {
            setCache(imageCache);
          } else {
            setIsError(true);
          }
        }
      } catch (error) {
        console.error('Error loading image cache:', error);
        if (isMounted) {
          setIsError(true);
        }
      }
    }

    loadCache();

    return () => {
      isMounted = false;
    };
  }, [contentHash]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Show error state
  if (isError) {
    return (
      <div
        className={`smart-picture-error ${className}`}
        style={{
          width: width || '100%',
          height: height || 'auto',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280'
        }}
      >
        Image unavailable
      </div>
    );
  }

  // Show loading state
  if (!cache) {
    return (
      <div
        className={`smart-picture-loading ${className}`}
        style={{
          width: width || '100%',
          height: height || 'auto',
          backgroundColor: '#f3f4f6',
          aspectRatio: width && height ? `${width} / ${height}` : undefined
        }}
      />
    );
  }

  const aspectRatio = getAspectRatio(cache);
  const fallbackUrl = getFallbackUrl(cache);

  // Build srcsets for each format
  const avifSrcSet = buildSrcSet(cache, 'avif');
  const webpSrcSet = buildSrcSet(cache, 'webp');
  const jpegSrcSet = buildSrcSet(cache, 'jpeg');

  // Container style with aspect ratio for layout shift prevention
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width || '100%',
    aspectRatio: aspectRatio.toString(),
    overflow: 'hidden'
  };

  // LQIP blur background style
  const lqipStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: `url(${cache.lqip})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(20px)',
    transform: 'scale(1.1)',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-out',
    pointerEvents: 'none'
  };

  // Main image style
  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-out'
  };

  return (
    <div className={`smart-picture-container ${className}`} style={containerStyle}>
      {/* LQIP blur placeholder */}
      <div className="smart-picture-lqip" style={lqipStyle} aria-hidden="true" />

      {/* Main responsive picture element */}
      <picture>
        {/* AVIF source (best compression) */}
        {avifSrcSet && (
          <source
            type="image/avif"
            srcSet={avifSrcSet}
            sizes={sizes}
          />
        )}

        {/* WebP source (good compression + wide support) */}
        {webpSrcSet && (
          <source
            type="image/webp"
            srcSet={webpSrcSet}
            sizes={sizes}
          />
        )}

        {/* JPEG source (universal fallback) */}
        {jpegSrcSet && (
          <source
            type="image/jpeg"
            srcSet={jpegSrcSet}
            sizes={sizes}
          />
        )}

        {/* Fallback img tag */}
        <img
          src={fallbackUrl}
          alt={alt}
          width={width || cache.originalWidth}
          height={height || cache.originalHeight}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          style={imageStyle}
        />
      </picture>
    </div>
  );
}

// Optional: Export a simplified version for simple use cases
export function SmartImage({
  contentHash,
  alt,
  className = '',
  width,
  height
}: Omit<SmartPictureProps, 'sizes' | 'priority'>) {
  return (
    <SmartPicture
      contentHash={contentHash}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes="100vw"
      priority={false}
    />
  );
}
