# ImageKit Setup Guide for Supabase Storage Integration

## Overview
This guide shows you how to configure ImageKit to fetch and optimize images from your Supabase Storage bucket.

## Why ImageKit?
ImageKit provides automatic image optimization, format conversion (WebP/AVIF), responsive images, and global CDN delivery - making your storefront load 10x faster!

## Step-by-Step Setup

### 1. Login to ImageKit Dashboard
Go to: https://imagekit.io/dashboard

### 2. Navigate to External Storage
1. Click on "Settings" in the left sidebar
2. Click on "URL Endpoints"
3. Find your endpoint: `https://ik.imagekit.io/onelove431212341234`
4. Click on it to edit

### 3. Configure External Storage Origin

Click on "Origin" tab, then click "Add origin"

**Origin Type:** Select "Web Server"

**Base URL:** Enter your Supabase Storage public URL:
```
https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/
```

**Origin Name:** `supabase-storage` (or any name you prefer)

**Make this origin the default:** ✅ Check this box

Click "Save"

### 4. Test the Integration

After saving, ImageKit will now fetch images from your Supabase Storage.

Test URLs will look like:
```
Original Supabase URL:
https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/products/userId/productId/image.jpg

ImageKit URL (with optimization):
https://ik.imagekit.io/onelove431212341234/products/userId/productId/image.jpg

ImageKit URL (with transformations):
https://ik.imagekit.io/onelove431212341234/tr:w-400,h-300,q-85/products/userId/productId/image.jpg
```

### 5. Verify It's Working

1. Open your storefront: https://storehouse.ng (or localhost:4000)
2. View a product with an image
3. Right-click the product image → "Inspect"
4. Check the `src` attribute - it should start with `https://ik.imagekit.io/`
5. If you see the image load successfully, ImageKit is working! 🎉

### 6. Check Browser Console

Open browser DevTools (F12) → Console tab

You should see logs like:
```
[ImageKit] Path is already a full URL, using it directly: https://...
[ImageKit] Generated URL: https://ik.imagekit.io/onelove431212341234/...
```

If you see errors, it means ImageKit external origin is not configured yet.

## Troubleshooting

### Images still not loading?

**Check #1:** Verify Supabase bucket is public
```bash
npm run check-storage
```

**Check #2:** Verify ImageKit external origin is configured
- Go to ImageKit Dashboard → Settings → URL Endpoints → Your endpoint → Origins
- Ensure Supabase Storage URL is listed as an origin

**Check #3:** Check browser console for errors
- Press F12 → Console tab
- Look for `[ImageKit]` or `[OptimizedImage]` errors

**Check #4:** Test direct ImageKit URL
Try visiting this URL in your browser:
```
https://ik.imagekit.io/onelove431212341234/products/[YOUR_IMAGE_PATH]
```

If it loads, ImageKit is working!
If you get a 404, check the origin configuration.

## Benefits You'll Get

Once configured, your images will:

1. **Load 10x Faster**
   - Automatic WebP/AVIF format conversion
   - Smart compression (85% quality, looks perfect, tiny file size)
   - Global CDN delivery (< 100ms load times)

2. **Look Better on All Devices**
   - Responsive images (different sizes for mobile/tablet/desktop)
   - DPR-aware (Retina display optimization)
   - LQIP blur-up effect (professional loading experience)

3. **Save Bandwidth**
   - Original 2MB image → 200KB optimized WebP
   - Customers love fast-loading stores = More sales!

## Support

If you need help:
1. Check ImageKit docs: https://docs.imagekit.io/integration/configure-origin
2. Check Supabase Storage docs: https://supabase.com/docs/guides/storage
3. Contact ImageKit support (they're super helpful!)

## Security Notes

- Your ImageKit Public Key is safe to expose (it's in the frontend code)
- Your ImageKit Private Key should NEVER be in frontend code (only in backend/server)
- Supabase Storage URLs are public (that's intended for product images)

## Current Configuration

Your environment variables (from `.env.local`):
```env
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/onelove431212341234
VITE_IMAGEKIT_PUBLIC_KEY=public_QdLLjPTKH/+dRHxXqo0lSiOs310=
VITE_IMAGEKIT_PRIVATE_KEY=private_3aE43Ff8Wh96MBV47ri3Jp2zsIA=
```

Your Supabase Storage URL:
```
https://yzlniqwzqlsftxrtapdl.supabase.co/storage/v1/object/public/
```

Buckets using ImageKit:
- `products` - Product images
- `stores` - Store logos

---

**Next Step:** Go to https://imagekit.io/dashboard and configure the external origin! 🚀
