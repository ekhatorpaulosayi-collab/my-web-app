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

  if (isLocalOrPreview) {
    return args.storeSlug ? `${origin}/store/${args.storeSlug}` : origin;
  }

  if (args.subdomain) {
    return `https://${args.subdomain}.storehouse.ng`;
  }
  if (args.storeSlug) {
    return `https://storehouse.ng/store/${args.storeSlug}`;
  }
  return 'https://storehouse.ng';
}

/**
 * Human-readable host shown next to a slug input (no protocol, no path).
 *   - subdomain set         → "{slug}.storehouse.ng"
 *   - subdomain null/empty  → "storehouse.ng/store/" (the grandfather case
 *                              or while typing a yet-unsaved numeric slug)
 *
 * For the live merchant edit-buffer case where `subdomain` from the DB
 * row is stale, pass the in-progress slug for the subdomain arg too —
 * the live preview matches what the merchant will see once they save.
 */
export function storefrontUrlPrefix(args: {
  subdomain?: string | null;
  storeSlug?: string | null;
}): string {
  if (args.subdomain) {
    return `${args.subdomain}.storehouse.ng`;
  }
  if (args.storeSlug && !/^\d+$/.test(args.storeSlug)) {
    return `${args.storeSlug}.storehouse.ng`;
  }
  return 'storehouse.ng/store/';
}
