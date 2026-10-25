/**
 * Vercel Serverless Function for Dynamic Open Graph Meta Tags
 *
 * This function generates dynamic HTML with product-specific meta tags
 * for social media crawlers (Facebook, WhatsApp, Twitter, LinkedIn).
 *
 * Flow:
 * 1. Social crawler requests /store/{slug}?product={id}
 * 2. This function fetches product data from Supabase
 * 3. Generates optimized image URL via ImageKit
 * 4. Returns HTML with proper og:image and meta tags
 * 5. Crawler scrapes meta tags → Shows product image in preview
 * 6. Regular users get redirected to React app
 */

import { createClient } from '@supabase/supabase-js';
import { buildOgDocument, FALLBACK_IMAGE } from './ogHtml.js';

// Initialize Supabase client (serverless environment)
// Note: Vercel automatically exposes VITE_* vars to serverless functions
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// ImageKit configuration
const IMAGEKIT_ENDPOINT = process.env.VITE_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;

// Debug logging (only in development)
if (!supabase) {
  console.error('[OG Meta] Supabase client not initialized');
  console.error('[OG Meta] VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
  console.error('[OG Meta] SUPABASE_URL:', !!process.env.SUPABASE_URL);
}

/**
 * Generate ImageKit URL for social sharing
 * Matches the socialShare preset from imagekit.ts
 */
function getImageKitSocialUrl(imagePath) {
  if (!imagePath || !IMAGEKIT_ENDPOINT) {
    return FALLBACK_IMAGE;
  }

  // Clean path (remove leading slash if present)
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  // Remove Supabase URL prefix if it's a full URL
  let storagePath = cleanPath;
  if (cleanPath.includes('supabase.co')) {
    const match = cleanPath.match(/\/storage\/v1\/object\/public\/(.+)/);
    if (match) storagePath = match[1];
  }

  // ImageKit transformation for social media (1200x630, quality 90, JPG)
  const transform = 'tr:w-1200,h-630,q-90,f-jpg,c-maintain_ratio,fo-auto';

  return `${IMAGEKIT_ENDPOINT}/${transform}/${storagePath}`;
}

/**
 * Format price in Nigerian Naira
 */
function formatNGN(kobo) {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(naira);
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  try {
    // Extract slug and product ID from URL
    const { slug, product: productId } = req.query;

    if (!slug) {
      return res.status(400).send('Missing store slug');
    }

    // Fetch store data
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id, business_name, logo_url, store_slug, about_us')
      .eq('store_slug', slug)
      .eq('is_public', true)
      .single();

    if (storeError || !store) {
      console.error('Store not found:', storeError);
      return res.status(404).send('Store not found');
    }

    let metaTitle;
    let metaDescription;
    let metaImage;
    let metaUrl = `https://www.storehouse.ng/store/${encodeURIComponent(slug)}`;
    let productData;

    // If product ID provided, fetch product data
    if (productId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, description, selling_price, image_url, quantity')
        .eq('id', productId)
        .eq('user_id', store.user_id)
        .eq('is_public', true)
        .single();

      if (!productError && product) {
        productData = product;
        metaTitle = `${product.name} - ${formatNGN(product.selling_price)} | ${store.business_name}`;
        metaDescription = (product.description || `${product.name} available at ${store.business_name}`)
          .slice(0, 155);
        metaImage = product.image_url
          ? getImageKitSocialUrl(product.image_url)
          : (store.logo_url ? getImageKitSocialUrl(store.logo_url) : FALLBACK_IMAGE);
        metaUrl = `https://www.storehouse.ng/store/${encodeURIComponent(slug)}?product=${encodeURIComponent(productId)}`;
      }
    }

    if (!metaTitle) {
      metaTitle = `${store.business_name} | Online Store`;
      metaDescription = (store.about_us || `Shop quality products at ${store.business_name}`)
        .slice(0, 155);
      if (store.logo_url) {
        metaImage = getImageKitSocialUrl(store.logo_url);
      } else {
        const { data: firstProduct } = await supabase
          .from('products')
          .select('image_url')
          .eq('user_id', store.user_id)
          .eq('is_public', true)
          .not('image_url', 'is', null)
          .limit(1)
          .maybeSingle();
        metaImage = firstProduct?.image_url
          ? getImageKitSocialUrl(firstProduct.image_url)
          : FALLBACK_IMAGE;
      }
    }

    const html = buildOgDocument({
      title: metaTitle,
      description: metaDescription,
      image: metaImage,
      url: metaUrl,
      siteName: store.business_name,
      priceNaira: productData ? productData.selling_price / 100 : null,
      inStock: productData ? productData.quantity > 0 : undefined,
    });

    // Return HTML with proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200'); // Cache for 1-2 hours
    res.status(200).send(html);

  } catch (error) {
    console.error('Error in og-meta function:', error);

    // Return minimal fallback HTML
    res.status(500).send(buildOgDocument({
      title: 'Storehouse',
      description: 'Shop quality products',
      image: FALLBACK_IMAGE,
      url: 'https://www.storehouse.ng',
      siteName: 'Storehouse',
    }));
  }
}
