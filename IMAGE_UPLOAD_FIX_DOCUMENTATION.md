# Image Upload & ImageKit Optimization Fix Documentation

**Date:** December 25, 2024
**Deployment URL:** https://smartstock-v2-hu3032tph-pauls-projects-cfe953d7.vercel.app

---

## Problem Summary

### Issue 1: Images Not Saving to Database
**Symptom:** When uploading 4-5 images, only 3 would save to the database and display on storefront.

**Root Cause:**
- Race condition in `MultiImageUpload.tsx`
- `onImagesChange` callback was being called BEFORE state update completed
- `productImages` state in `App.jsx` was empty `[]` when saving product
- Inline callback function recreated on every render causing stale closures

### Issue 2: ImageKit Optimization Not Working
**Symptom:** Images showing blur effect but not loading, or falling back to Supabase URLs

**Root Cause:**
- ImageKit external origin not properly configured
- OptimizedImage component not used in all display locations
- ImageKit URL generation working but images timing out

---

## Files Modified

### 1. `/home/ekhator1/smartstock-v2/src/App.jsx`

**Lines 318-321:** Added memoized callback for image changes

```javascript
// Memoized callback for image changes to prevent stale closures
const handleImagesChange = useCallback((images) => {
  console.log('[App] onImagesChange called with', images.length, 'images');
  setProductImages(images);
}, []);
```

**What this fixes:** Prevents callback from being recreated on every render, avoiding stale closure issues.

---

### 2. `/home/ekhator1/smartstock-v2/src/components/MultiImageUpload.tsx`

**Lines 204-223:** Fixed race condition by calling `onImagesChange` inside setState callback

**BEFORE (BROKEN):**
```javascript
setImages(prev => {
  const updatedImages = prev.map(...);
  return updatedImages;
});

// Called AFTER setState with stale/empty array
onImagesChange(updatedImages); // ❌ updatedImages is empty here!
```

**AFTER (FIXED):**
```javascript
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
    onImagesChange(updatedImages); // ✅ Called with correct state!
    console.log('[MultiImageUpload] Successfully called onImagesChange');
  } catch (error) {
    console.error('[MultiImageUpload] ERROR calling onImagesChange:', error);
  }

  return updatedImages;
});
```

**What this fixes:** Ensures parent component receives correct image array, not empty array from stale closure.

---

### 3. `/home/ekhator1/smartstock-v2/src/components/ProductImageGallery.tsx`

**Lines 11-13, 149-156, 273-279:** Added OptimizedImage component for ImageKit optimization

**Added Import:**
```javascript
import { OptimizedImage } from './OptimizedImage';
```

**Main Image (Lines 149-156):**
```javascript
<OptimizedImage
  src={currentImage.url}
  alt={`Product image ${currentIndex + 1}`}
  width={1200}
  height={1200}
  priority={currentIndex === 0}
  objectFit="cover"
/>
```

**Thumbnails (Lines 273-279):**
```javascript
<OptimizedImage
  src={image.url}
  alt={`Thumbnail ${index + 1}`}
  width={60}
  height={60}
  objectFit="cover"
/>
```

**What this fixes:** Enables ImageKit CDN optimization for all product images in gallery.

---

### 4. `/home/ekhator1/smartstock-v2/src/lib/imagekit.ts`

**Lines 49-85:** Updated ImageKit URL generation with better logging

**Changes:**
- Improved console logging for debugging
- Added explanation of how ImageKit fetches from origin
- Better handling of Supabase URL parsing

```javascript
// If path is already a full Supabase URL, convert to ImageKit URL
if (path.startsWith('http')) {
  console.log('[ImageKit] Path is already a full URL, converting to ImageKit:', path);

  // Extract the storage path from the full Supabase URL
  const urlObj = new URL(path);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);

  if (pathMatch) {
    const storagePath = pathMatch[1]; // e.g., "products/userId/productId/image.jpg"

    // Build transformation string
    const transformations: string[] = [];
    if (options.width) transformations.push(`w-${options.width}`);
    if (options.height) transformations.push(`h-${options.height}`);
    if (options.quality) transformations.push(`q-${options.quality}`);
    if (options.format) transformations.push(`f-${options.format}`);
    if (options.blur) transformations.push(`bl-${options.blur}`);
    if (options.aspectRatio) transformations.push(`ar-${options.aspectRatio}`);
    if (options.crop) transformations.push(`c-${options.crop}`);
    if (options.focus) transformations.push(`fo-${options.focus}`);

    const transformString = transformations.length > 0 ? `/tr:${transformations.join(',')}` : '';

    // ImageKit URL format: https://ik.imagekit.io/{urlEndpoint}/tr:transformations/storagePath
    // The storagePath will be appended to the ImageKit origin base URL automatically
    const imagekitUrl = `${IMAGEKIT_URL_ENDPOINT}${transformString}/${storagePath}`;
    console.log('[ImageKit] Generated URL:', imagekitUrl);
    console.log('[ImageKit] This will fetch from origin:', `https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/${storagePath}`);

    return imagekitUrl;
  }

  // If we can't parse the URL, return the original
  console.warn('[ImageKit] Could not extract storage path from URL, returning original');
  return path;
}
```

**What this fixes:** Provides better debugging information and confirms ImageKit URL generation is correct.

---

## ImageKit Configuration (MANUAL SETUP REQUIRED)

### ImageKit Dashboard Setup

**URL:** https://imagekit.io/dashboard

**Settings → Images → Origins → "Supabase Storage"**

**Configuration:**
- Origin Name: `Supabase Storage` (or any name)
- Origin Type: `Web Folder - HTTP(S) server`
- Base URL: `https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public`

**URL Endpoint Configuration:**
- URL Endpoint: `https://ik.imagekit.io/onelove431212341234/`
- Origin Preference:
  - 1st: ImageKit Media Library (will skip - no images there)
  - 2nd: Supabase Storage (will fetch from here) ✅

---

## Environment Variables

**File:** `.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://yzlniqwzqlsftxrtapdl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ

# ImageKit
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/onelove431212341234
VITE_IMAGEKIT_PUBLIC_KEY=public_QdLLjPTKH/+dRHxXqo0lSiOs310=
VITE_IMAGEKIT_PRIVATE_KEY=private_3aE43Ff8Wh96MBV47ri3Jp2zsIA=
```

**Note:** These must also be set in Vercel environment variables for production.

---

## How The System Works Now

### Upload Flow:
1. User selects images in MultiImageUpload component
2. Images compressed client-side (1200px max, 92% quality JPEG)
3. Uploaded to Supabase Storage bucket `products`
4. Supabase returns public URL: `https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/products/...`
5. `onImagesChange` callback called INSIDE setState to pass images to parent
6. Parent (App.jsx) updates `productImages` state
7. On save, images saved to both:
   - `products` table (`image_url` field for first image)
   - `product_images` table (all images with position, isPrimary)

### Display Flow:
1. ProductImageGallery fetches from `product_images` table
2. Gets Supabase URLs
3. OptimizedImage component converts to ImageKit URLs:
   - Original: `https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/products/abc/image.jpg`
   - ImageKit: `https://ik.imagekit.io/onelove431212341234/tr:w-1200,q-85,f-auto/products/abc/image.jpg`
4. Browser requests ImageKit URL
5. ImageKit fetches from Supabase origin (first time)
6. ImageKit caches and serves optimized image (WebP/AVIF auto-conversion)

---

## Testing & Verification

### Test Image Upload:
1. Add new product with 5 images
2. Check console logs:
   ```
   [MultiImageUpload] About to call onImagesChange with 5 images
   [App] onImagesChange called with 5 images
   [handleSave] ✅ Using image from MultiImageUpload: https://yzlniqwzqlsftxrtapdl...
   [handleSave] ✅ 5/5 images saved to product_images table
   ```
3. Check database:
   ```bash
   node check-product.js
   ```
   Should show 5 images in `product_images` table

### Test ImageKit Optimization:
1. Go to storefront
2. Right-click on product image → "Inspect"
3. Check `src` attribute - should be ImageKit URL:
   ```
   https://ik.imagekit.io/onelove431212341234/tr:w-1200,q-85,f-auto/products/...
   ```
4. Open ImageKit URL directly in browser - should show optimized image
5. Check Network tab - response should be WebP or AVIF format (auto-conversion)

### Verify Database:
```javascript
// Run: node check-product.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yzlniqwzqlsftxrtapdl.supabase.co',
  'ANON_KEY'
);

const { data } = await supabase
  .from('product_images')
  .select('*')
  .eq('product_id', 'PRODUCT_ID')
  .order('position');

console.log('Images:', data);
```

---

## Common Issues & Solutions

### Issue: Images showing blob URLs on storefront
**Cause:** Browser cache showing old data
**Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Issue: Images staying blurry (LQIP blur effect)
**Cause:** ImageKit URLs timing out or failing to load
**Solution:**
1. Check ImageKit origin is configured correctly
2. Verify Supabase bucket is public
3. Check browser console for errors
4. Test ImageKit URL directly in browser

### Issue: Only some images saving
**Cause:** Race condition (should be fixed by this update)
**Solution:**
1. Verify using latest code with `useCallback` in App.jsx
2. Verify `onImagesChange` called inside `setImages` callback in MultiImageUpload.tsx
3. Check console logs for `[App] onImagesChange called with X images`

### Issue: ImageKit showing 404 or errors
**Cause:** ImageKit can't fetch from Supabase origin
**Solution:**
1. Verify ImageKit origin base URL: `https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public`
2. Verify origin is attached to URL endpoint
3. Test Supabase URL directly - should be publicly accessible

---

## Rollback Instructions

If this fix causes issues, rollback by:

1. **Revert App.jsx changes:**
   - Remove `useCallback` wrapper from `handleImagesChange`
   - Use inline function instead

2. **Revert MultiImageUpload.tsx:**
   - Move `onImagesChange` call outside `setImages` callback

3. **Disable ImageKit (emergency):**
   - In StorefrontPage.tsx, replace `<OptimizedImage>` with `<img>` tag
   - In ProductImageGallery.tsx, replace `<OptimizedImage>` with `<img>` tag

4. **Redeploy:**
   ```bash
   npm run build
   vercel --prod
   ```

---

## Deployment Commands

```bash
# Build production
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment
vercel ls

# View logs
vercel logs [deployment-url]
```

---

## Contact & Support

**Developer:** Claude (Anthropic)
**Deployment Date:** December 25, 2024
**Production URL:** https://smartstock-v2-hu3032tph-pauls-projects-cfe953d7.vercel.app
**GitHub Issues:** https://github.com/anthropics/claude-code/issues (for Claude Code issues)

---

## Additional Notes

### Database Schema:

**products table:**
- `image_url` (text) - First/primary image URL
- `image_thumbnail` (text) - Optional thumbnail

**product_images table:**
- `id` (uuid)
- `product_id` (uuid) - Foreign key to products
- `image_url` (text) - Full Supabase storage URL
- `position` (integer) - Display order (0-based)
- `is_primary` (boolean) - First image is primary
- `created_at` (timestamp)

### Tier Limits (Free Plan):
- Max images per product: 10
- Storage: Supabase (unlimited for now)
- Bandwidth: ImageKit free tier (25GB/month)

---

**End of Documentation**
