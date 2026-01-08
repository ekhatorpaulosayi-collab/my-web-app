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
    return 'https://www.storehouse.ng/og-image.png'; // Fallback
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
      .select('id, user_id, business_name, description, logo_url, store_slug, about_us')
      .eq('store_slug', slug)
      .eq('is_public', true)
      .single();

    if (storeError || !store) {
      console.error('Store not found:', storeError);
      return res.status(404).send('Store not found');
    }

    let metaTitle, metaDescription, metaImage, metaUrl, productData;

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

        // Product-specific meta tags
        metaTitle = `${product.name} - ${formatNGN(product.selling_price)} | ${store.business_name}`;
        metaDescription = (product.description || `${product.name} available at ${store.business_name}`)
          .slice(0, 155);
        metaImage = product.image_url
          ? getImageKitSocialUrl(product.image_url)
          : (store.logo_url ? getImageKitSocialUrl(store.logo_url) : 'https://www.storehouse.ng/og-image.png');
        metaUrl = `https://www.storehouse.ng/store/${slug}?product=${productId}`;
      }
    }

    // Fallback to store-level meta tags if no product
    if (!metaTitle) {
      metaTitle = `${store.business_name} | Online Store`;
      metaDescription = (store.description || store.about_us || `Shop quality products at ${store.business_name}`)
        .slice(0, 155);
      metaImage = store.logo_url
        ? getImageKitSocialUrl(store.logo_url)
        : 'https://www.storehouse.ng/og-image.png';
      metaUrl = `https://www.storehouse.ng/store/${slug}`;
    }

    // Generate HTML with meta tags for social crawlers
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary Meta Tags -->
  <title>${metaTitle}</title>
  <meta name="title" content="${metaTitle}" />
  <meta name="description" content="${metaDescription}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${productData ? 'product' : 'website'}" />
  <meta property="og:url" content="${metaUrl}" />
  <meta property="og:title" content="${metaTitle}" />
  <meta property="og:description" content="${metaDescription}" />
  <meta property="og:image" content="${metaImage}" />
  <meta property="og:image:secure_url" content="${metaImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${productData ? productData.name : store.business_name}" />
  <meta property="og:site_name" content="${store.business_name}" />
  <meta property="og:locale" content="en_NG" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${metaUrl}" />
  <meta name="twitter:title" content="${metaTitle}" />
  <meta name="twitter:description" content="${metaDescription}" />
  <meta name="twitter:image" content="${metaImage}" />
  <meta name="twitter:image:alt" content="${productData ? productData.name : store.business_name}" />

  ${productData ? `
  <!-- Product-specific meta tags -->
  <meta property="product:price:amount" content="${(productData.selling_price / 100).toFixed(2)}" />
  <meta property="product:price:currency" content="NGN" />
  <meta property="product:availability" content="${productData.quantity > 0 ? 'in stock' : 'out of stock'}" />
  <meta property="product:condition" content="new" />
  ` : ''}

  <!-- Redirect to React app for regular users -->
  <meta http-equiv="refresh" content="0; url=/${req.url}" />
  <script>
    // Immediate redirect for browsers (meta refresh as fallback)
    window.location.href = '${req.url}';
  </script>
</head>
<body>
  <div style="
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  ">
    <div style="text-align: center;">
      <h2 style="font-size: 24px; margin-bottom: 16px;">Loading ${store.business_name}...</h2>
      <p style="font-size: 14px; opacity: 0.9;">If you're not redirected, <a href="${req.url}" style="color: white; text-decoration: underline;">click here</a>.</p>
    </div>
  </div>
</body>
</html>`;

    // Return HTML with proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200'); // Cache for 1-2 hours
    res.status(200).send(html);

  } catch (error) {
    console.error('Error in og-meta function:', error);

    // Return minimal fallback HTML
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="Storehouse - Online Store" />
  <meta property="og:description" content="Shop quality products" />
  <meta property="og:image" content="https://www.storehouse.ng/og-image.png" />
  <meta http-equiv="refresh" content="0; url=/${req.url}" />
</head>
<body>
  <p>Loading... <a href="${req.url}">Click here if not redirected</a></p>
</body>
</html>`);
  }
}
