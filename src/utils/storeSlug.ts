/**
 * Store Slug Generation Utility
 *
 * Generates unique, URL-safe slugs from business names
 */

import { RESERVED_SUBDOMAINS, NUMERIC_ONLY_LABEL } from './reservedSubdomains';

const STORAGE_KEY = 'storehouse-store-slug';

export function normalizeSlug(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A slug already saved on the store is accepted as-is, including the
 * live slugs that are longer than 30 characters. A new choice is 3–30
 * characters and must not be a reserved label.
 */
export function validateStoreSlug(slug: string, existingSlug?: string | null): string | null {
  if (existingSlug && slug === existingSlug) return null;
  if (!slug || slug.length < 3) return 'Store URL must be at least 3 characters';
  if (slug.length > 30) return 'Store URL must be 30 characters or fewer';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
    return 'Store URL must start and end with a letter or number';
  }
  if (NUMERIC_ONLY_LABEL.test(slug)) {
    return 'Store URL cannot be all numbers — please include at least one letter';
  }
  if (RESERVED_SUBDOMAINS.has(slug)) {
    return 'That store URL is reserved. Pick another name.';
  }
  return null;
}

/** Short slug from a business name. No user-id suffix. Max 20 characters. */
export function shortSlugFromName(businessName: string): string {
  let base = normalizeSlug(businessName).slice(0, 20).replace(/-+$/g, '');
  if (base.length < 3) base = 'shop';
  if (NUMERIC_ONLY_LABEL.test(base) || RESERVED_SUBDOMAINS.has(base)) {
    base = `${base}-shop`.slice(0, 20).replace(/-+$/g, '');
  }
  return base;
}

/**
 * Generate a URL-safe slug from a business name
 * @param businessName - The business name to convert
 * @returns A URL-safe slug (lowercase, alphanumeric with hyphens)
 */
export function generateStoreSlug(businessName: string): string {
  if (!businessName || businessName.trim() === '') {
    return 'store';
  }
  return shortSlugFromName(businessName);
}

/**
 * Get the current store slug from localStorage
 */
export function getStoreSlug(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'store';
  } catch {
    return 'store';
  }
}

/**
 * Save store slug to localStorage
 */
export function saveStoreSlug(slug: string, userId?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, slug);

    // TODO: In production, also save to Firebase/database with userId
    if (userId) {
      console.log(`[Store Slug] Would save slug "${slug}" for user ${userId} to database`);
      // await saveSlugToDatabase(slug, userId);
    }
  } catch (error) {
    console.error('[Store Slug] Error saving slug:', error);
  }
}

/**
 * Check if a slug is available (not taken by another user)
 * For now, checks localStorage. In production, check against your database.
 */
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Reserved slugs that cannot be used
  const reservedSlugs = [
    'admin', 'api', 'app', 'store', 'shop', 'dashboard', 'login', 'signup',
    'settings', 'profile', 'account', 'help', 'support', 'contact',
    'about', 'terms', 'privacy', 'blog', 'home', 'index'
  ];

  if (reservedSlugs.includes(slug.toLowerCase())) {
    return false;
  }

  // Check if slug meets minimum requirements
  if (slug.length < 3) {
    return false;
  }

  // TODO: In production, check against your database
  // const existingSlug = await checkSlugInDatabase(slug);
  // return !existingSlug;

  // For now, simulate that most slugs are available
  // You can replace this with actual database check
  const takenSlugs = ['test', 'demo', 'sample', 'example', 'store123'];
  return !takenSlugs.includes(slug.toLowerCase());
}

/**
 * Get the full store URL for sharing
 */
export function getStoreUrl(): string {
  const slug = getStoreSlug();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/store/${slug}`;
}

/**
 * Check if slug will change and return both old and new slugs
 */
export function checkSlugChange(newBusinessName: string): {
  willChange: boolean;
  oldSlug: string;
  newSlug: string;
} {
  const oldSlug = getStoreSlug();
  const newSlug = generateStoreSlug(newBusinessName);

  return {
    willChange: oldSlug !== newSlug && oldSlug !== 'store',
    oldSlug,
    newSlug
  };
}
