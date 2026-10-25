/** First path segments the SPA actually renders. Anything else is a 404. */
const KNOWN_ROOTS = new Set([
  'login', 'signup', 'forgot-password', 'auth', 'update-password',
  'settings', 'customers', 'conversations', 'debug', 'staff', 'referrals',
  'upgrade', 'affiliate', 'admin', 'sentry-test', 'whatsapp-ai', 'help',
  'debug-center', 'dashboard', 'invoices', 'reviews', 'image-test',
  'direct-test', 'all-variants', 'test-variants', 'dev', 'store-setup',
  'quick-setup', 'setup-complete', 'online-store', 'store-settings',
  'config', 'preferences', 'business-settings', 'account', 'profile',
  'submit-testimonial', 'landing', 'store', 'terms', 'privacy', 'invoice', 'a',
]);

export function isKnownAppPath(pathname) {
  const path = String(pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return true;
  const head = path.split('/').filter(Boolean)[0];
  return KNOWN_ROOTS.has(head);
}
