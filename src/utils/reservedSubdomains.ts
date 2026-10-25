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
export { RESERVED_SUBDOMAINS, NUMERIC_ONLY_LABEL } from './canonicalStoreUrl.js';
