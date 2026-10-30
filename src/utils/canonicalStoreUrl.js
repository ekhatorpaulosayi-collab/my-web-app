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
  if (!label || label.length > 63 || label.startsWith('xn--')) return false;
  if (BLOCKED.has(label) || NUMERIC_ONLY_LABEL.test(label)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label);
}

export function withProductQuery(baseUrl, productId) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  if (!productId) return base;
  return `${base}/?product=${encodeURIComponent(productId)}`;
}

export function historicHostTarget(currentLabel, resolvedSlug, productId) {
  const current = String(currentLabel || '').trim().toLowerCase();
  const next = String(resolvedSlug || '').trim().toLowerCase();
  if (!next || next === current) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(next)) return null;
  return canonicalStoreUrl(next, productId || undefined);
}

export function canonicalStoreUrl(slug, productId) {
  if (isLegalStoreSubdomain(slug)) {
    return withProductQuery(`https://${String(slug).toLowerCase()}.storehouse.ng`, productId);
  }
  return withProductQuery(`https://www.storehouse.ng/store/${encodeURIComponent(slug || '')}`, productId);
}
