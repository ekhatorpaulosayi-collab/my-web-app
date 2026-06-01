/**
 * Subdomain labels that must NOT resolve to a merchant storefront.
 *
 * Used by:
 *   - src/pages/StorefrontPage.tsx — skip subdomain lookup for these labels
 *   - src/components/StoreSettings.tsx — block these as future slug choices
 *
 * "234" is grandfathered in (existing public store, path-style only).
 * Numeric-only labels are blocked separately via NUMERIC_ONLY_LABEL.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  'www', 'admin', 'api', 'app', 'dashboard', 'mail', 'ftp', 'accounts',
  'auth', 'login', 'signup', 'register', 'oauth', 'cart', 'checkout',
  'pay', 'paystack', 'order', 'orders', 'billing', 'payments', 'webhooks',
  'account', 'me', 'my', 'blog', 'support', 'help', 'docs', 'status',
  'news', 'about', 'dev', 'staging', 'test', 'demo', 'beta', 'preview',
  'local', 'cdn', 'assets', 'static', 'media', 'img', 'images',
  'storehouse', 'email', 'unsubscribe', 'notify', 'hello', 'info',
  'contact', 'new', 'edit', 'settings', 'search',
  '234', // grandfathered: existing path-style-only store
]);

export const NUMERIC_ONLY_LABEL = /^\d+$/;
