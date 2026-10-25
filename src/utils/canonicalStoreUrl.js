/**
 * Legal shop labels use https://{slug}.storehouse.ng.
 * Reserved and number-only labels stay on the path URL.
 * The block list matches src/utils/reservedSubdomains.ts.
 */
export const NUMERIC_ONLY_LABEL = /^\d+$/;

export const STORE_SUBDOMAIN_BLOCKLIST = [
  'www', 'admin', 'api', 'app', 'dashboard', 'mail', 'ftp', 'accounts',
  'auth', 'login', 'signup', 'register', 'oauth', 'cart', 'checkout',
  'pay', 'paystack', 'order', 'orders', 'billing', 'payments', 'webhooks',
  'account', 'me', 'my', 'blog', 'support', 'help', 'docs', 'status',
  'news', 'about', 'dev', 'staging', 'test', 'demo', 'beta', 'preview',
  'local', 'cdn', 'assets', 'static', 'media', 'img', 'images',
  'storehouse', 'email', 'unsubscribe', 'notify', 'hello', 'info',
  'contact', 'new', 'edit', 'settings', 'search',
  '234',
];

export const RESERVED_SUBDOMAINS = new Set(STORE_SUBDOMAIN_BLOCKLIST);
const BLOCKED = RESERVED_SUBDOMAINS;

export function isLegalStoreSubdomain(slug) {
  const label = String(slug || '').toLowerCase();
  if (!label || BLOCKED.has(label) || NUMERIC_ONLY_LABEL.test(label)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label);
}

export function canonicalStoreUrl(slug, productId) {
  const product = productId ? `?product=${encodeURIComponent(productId)}` : '';
  if (isLegalStoreSubdomain(slug)) {
    return `https://${String(slug).toLowerCase()}.storehouse.ng${product}`;
  }
  return `https://www.storehouse.ng/store/${encodeURIComponent(slug || '')}${product}`;
}
