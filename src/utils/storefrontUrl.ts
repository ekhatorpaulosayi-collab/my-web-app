/**
 * Build the canonical customer-facing storefront URL for a store.
 *
 * Format rules:
 *   - subdomain set → https://{subdomain}.storehouse.ng
 *   - subdomain null/undefined (the grandfathered "234" case)
 *                    → https://storehouse.ng/store/{slug}
 *   - On localhost / 127.0.0.1 / *.vercel.app, always emit a path-style
 *     URL on the current origin so dev + preview deploys work without
 *     a *.storehouse.ng subdomain.
 *
 * Inputs come from the store DB row — never hardcode merchant identifiers.
 */
import { canonicalStoreUrl, isLegalStoreSubdomain } from './canonicalStoreUrl.js';

/**
 * Customer-facing store link. A legal name is always
 * https://<name>.storehouse.ng. Localhost and Vercel previews keep a
 * path on the current origin so the preview can open.
 */
export function buildStorefrontUrl(args: {
  subdomain?: string | null;
  storeSlug?: string | null;
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalOrPreview =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app');
  const label = String(args.subdomain || args.storeSlug || '').trim().toLowerCase();

  if (isLocalOrPreview) {
    return label ? `${origin}/store/${encodeURIComponent(label)}` : origin;
  }
  if (!label) return 'https://www.storehouse.ng';
  return canonicalStoreUrl(label);
}

/** The host shown beside a slug field: name.storehouse.ng */
export function storefrontUrlPrefix(args: {
  subdomain?: string | null;
  storeSlug?: string | null;
}): string {
  const label = String(args.subdomain || args.storeSlug || '').trim().toLowerCase();
  if (isLegalStoreSubdomain(label)) return `${label}.storehouse.ng`;
  return 'your-store.storehouse.ng';
}

