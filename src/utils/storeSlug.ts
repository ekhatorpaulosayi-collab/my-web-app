/**
 * Store Slug Generation Utility
 *
 * Generates unique, URL-safe slugs from business names
 */

const STORAGE_KEY = 'storehouse-store-slug';

/**
 * Generate a URL-safe slug from a business name
 * @param businessName - The business name to convert
 * @returns A URL-safe slug (lowercase, alphanumeric with hyphens)
 */
export function generateStoreSlug(businessName: string): string {
  if (!businessName || businessName.trim() === '') {
    return 'store'; // Default if no name
  }

  return businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars (!@#$%^&*()+=[]{}|;:'",.<>?/)
    .replace(/\s+/g, '-')           // Convert spaces to hyphens
    .replace(/-+/g, '-')            // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')        // Remove leading/trailing hyphens
    .slice(0, 50);                  // Maximum 50 characters
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
