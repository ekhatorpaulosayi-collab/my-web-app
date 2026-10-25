/**
 * Vercel Edge Middleware.
 * Crawlers (WhatsApp, facebookexternalhit, and the other link-preview
 * bots) receive escaped Open Graph HTML for a store subdomain or
 * /store/:slug, with or without a trailing slash. They do not run JS.
 * Any other path the SPA does not render is a real 404.
 */
import { buildOgDocument, FALLBACK_IMAGE, productPreviewDescription } from './api/ogHtml.js';
import { isKnownAppPath } from './src/utils/appPaths.js';
import { canonicalStoreUrl, RESERVED_SUBDOMAINS, NUMERIC_ONLY_LABEL } from './src/utils/canonicalStoreUrl.js';
import { CRAWLER_UA } from './src/utils/crawlerUa.js';

const CRAWLER = CRAWLER_UA;

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!assets/|api/|.*\\..*).*)'],
};

function supabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  return { url: url.replace(/\/$/, ''), key };
}

async function rest(path, options = {}) {
  const { url, key } = supabaseEnv();
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body,
  });
  if (!response.ok) return null;
  return response.json();
}

function storeSlugFromRequest(request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const pathMatch = path.match(/^\/store\/([^/]+)$/);
  if (pathMatch) return { slug: decodeURIComponent(pathMatch[1]), path, host, search: url.searchParams };
  if (host.endsWith('.storehouse.ng') && host !== 'storehouse.ng' && host !== 'www.storehouse.ng') {
    const label = host.split('.')[0];
    if (label && !RESERVED_SUBDOMAINS.has(label) && !NUMERIC_ONLY_LABEL.test(label)) {
      return { slug: label, path, host, search: url.searchParams, subdomain: true };
    }
  }
  return null;
}

async function loadStore(slug) {
  const rows = await rest(
    `stores?store_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,user_id,business_name,logo_url,store_slug,about_us&limit=1`,
  );
  if (rows?.[0]) return rows[0];
  const storeId = await rest('rpc/resolve_store_redirect', {
    method: 'POST',
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!storeId) return null;
  const followed = await rest(
    `stores?id=eq.${encodeURIComponent(storeId)}&is_public=eq.true&select=id,user_id,business_name,logo_url,store_slug,about_us&limit=1`,
  );
  return followed?.[0] || null;
}

function usableImage(url) {
  const text = typeof url === 'string' ? url.trim() : '';
  return text || '';
}

async function previewImage(store, productId) {
  const logo = usableImage(store.logo_url);
  if (productId) {
    const products = await rest(
      `products?id=eq.${encodeURIComponent(productId)}&user_id=eq.${encodeURIComponent(store.user_id)}&is_public=eq.true&select=name,description,selling_price,image_url,quantity&limit=1`,
    );
    if (products?.[0]) {
      return { product: products[0], image: usableImage(products[0].image_url) || logo || FALLBACK_IMAGE };
    }
  }
  if (logo) return { product: null, image: logo };
  const products = await rest(
    `products?user_id=eq.${encodeURIComponent(store.user_id)}&is_public=eq.true&image_url=not.is.null&select=image_url&order=name.asc&limit=1`,
  );
  return { product: null, image: usableImage(products?.[0]?.image_url) || FALLBACK_IMAGE };
}

function htmlResponse(html, status) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const target = storeSlugFromRequest(request);
  const crawler = CRAWLER.test(request.headers.get('user-agent') || '');

  const host = url.hostname.toLowerCase();
  const label = host.split('.')[0];
  const reservedHost = host.endsWith('.storehouse.ng')
    && host !== 'www.storehouse.ng'
    && host !== 'storehouse.ng'
    && (RESERVED_SUBDOMAINS.has(label) || NUMERIC_ONLY_LABEL.test(label));
  if (crawler && reservedHost) {
    return htmlResponse(buildOgDocument({
      title: 'Store not found',
      description: 'This Storehouse address is not a live shop. Start your own store at storehouse.ng.',
      image: FALLBACK_IMAGE,
      url: 'https://www.storehouse.ng/signup',
      siteName: 'Storehouse',
    }), 404);
  }

  if (crawler && target?.slug) {
    const store = await loadStore(target.slug);
    if (!store) {
      return htmlResponse(buildOgDocument({
        title: 'Store not found',
        description: 'This Storehouse link does not match a live store.',
        image: FALLBACK_IMAGE,
        url: 'https://www.storehouse.ng/signup',
        siteName: 'Storehouse',
      }), 404);
    }
    const productId = target.search.get('product');
    const preview = await previewImage(store, productId);
    const canonical = canonicalStoreUrl(store.store_slug, productId);
    const title = preview.product
      ? `${preview.product.name} | ${store.business_name}`
      : `${store.business_name} | Online Store`;
    const description = preview.product
      ? productPreviewDescription({
        priceKobo: preview.product.selling_price,
        description: preview.product.description,
        name: preview.product.name,
      })
      : (store.about_us || `Shop at ${store.business_name}`);
    return htmlResponse(buildOgDocument({
      title,
      description,
      image: preview.image,
      url: canonical,
      siteName: store.business_name,
      priceNaira: preview.product ? Number(preview.product.selling_price) / 100 : null,
      inStock: preview.product ? Number(preview.product.quantity) > 0 : undefined,
    }), 200);
  }

  if (!isKnownAppPath(url.pathname)) {
    const indexUrl = new URL('/index.html', request.url);
    const index = await fetch(indexUrl);
    const body = index.ok ? await index.text() : '<!DOCTYPE html><title>Page not found</title><h1>We can’t find that page</h1>';
    return new Response(body, {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
