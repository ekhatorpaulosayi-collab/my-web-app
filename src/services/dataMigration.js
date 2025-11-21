import { getItems } from '../db/idb';
import { addProduct, getProducts } from './supabaseProducts';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Data Migration Service
 * Migrates data from localStorage/IndexedDB to Firestore on first login
 */

const MIGRATION_STATUS_KEY = 'storehouse:migration:completed';

/**
 * Check if migration has been completed for this user
 */
async function checkMigrationStatus(userId) {
  try {
    const migrationDoc = await getDoc(doc(db, 'users', userId, 'metadata', 'migration'));

    if (migrationDoc.exists()) {
      return migrationDoc.data().completed || false;
    }

    return false;
  } catch (error) {
    console.error('[Migration] Error checking migration status:', error);
    return false;
  }
}

/**
 * Mark migration as completed
 */
async function markMigrationCompleted(userId) {
  try {
    await setDoc(doc(db, 'users', userId, 'metadata', 'migration'), {
      completed: true,
      completedAt: new Date().toISOString(),
      version: 1
    });

    // Also mark in localStorage for quick check
    localStorage.setItem(MIGRATION_STATUS_KEY, 'true');

    console.debug('[Migration] Marked as completed');
  } catch (error) {
    console.error('[Migration] Error marking migration complete:', error);
  }
}

/**
 * Migrate products from IndexedDB to Firestore
 */
async function migrateProducts(userId) {
  try {
    console.debug('[Migration] Starting products migration');

    // Get products from IndexedDB
    const localProducts = await getItems();

    if (!localProducts || localProducts.length === 0) {
      console.debug('[Migration] No local products to migrate');
      return {
        migrated: 0,
        skipped: 0,
        failed: 0
      };
    }

    console.debug('[Migration] Found', localProducts.length, 'local products');

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // Migrate each product
    for (const product of localProducts) {
      try {
        // Convert IndexedDB product format to Firestore format
        const productData = {
          name: product.name,
          qty: product.qty || 0,
          cost: product.cost || 0,
          price: product.price || 0,
          reorderLevel: product.reorderLevel || 0,
          // Preserve any additional fields
          ...(product.description && { description: product.description }),
          ...(product.category && { category: product.category }),
          ...(product.barcode && { barcode: product.barcode })
        };

        await addProduct(userId, productData);
        migrated++;

        console.debug('[Migration] Migrated product:', product.name);
      } catch (error) {
        console.error('[Migration] Failed to migrate product:', product.name, error);
        failed++;
      }
    }

    console.debug('[Migration] Products migration complete:', {
      total: localProducts.length,
      migrated,
      skipped,
      failed
    });

    return {
      migrated,
      skipped,
      failed
    };
  } catch (error) {
    console.error('[Migration] Error during products migration:', error);
    throw error;
  }
}

/**
 * Main migration function
 * Call this after user logs in for the first time
 */
export async function migrateUserData(userId) {
  try {
    console.debug('[Migration] Checking migration status for user:', userId);

    // Check if already migrated
    const alreadyMigrated = await checkMigrationStatus(userId);

    if (alreadyMigrated) {
      console.debug('[Migration] User data already migrated');
      return {
        status: 'already_migrated',
        message: 'Data migration was already completed'
      };
    }

    console.debug('[Migration] Starting data migration...');

    // Check if user has any products in Firestore already
    const existingProducts = await getProducts(userId);

    if (existingProducts.length > 0) {
      console.debug('[Migration] User already has', existingProducts.length, 'products in Firestore');

      // Mark as migrated to avoid future checks
      await markMigrationCompleted(userId);

      return {
        status: 'already_has_data',
        message: 'User already has products in Firestore',
        productsCount: existingProducts.length
      };
    }

    // Perform migration
    const productsResult = await migrateProducts(userId);

    // Mark migration as completed
    await markMigrationCompleted(userId);

    console.debug('[Migration] Migration completed successfully');

    return {
      status: 'success',
      message: 'Data migration completed',
      products: productsResult
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);

    return {
      status: 'error',
      message: error.message || 'Migration failed',
      error
    };
  }
}

/**
 * Check if migration should be triggered
 * Call this to determine if migration UI should be shown
 */
export async function shouldMigrate(userId) {
  try {
    // Check local storage first (fast check)
    const localCheck = localStorage.getItem(MIGRATION_STATUS_KEY);
    if (localCheck === 'true') {
      return false;
    }

    // Check Firestore
    const migrated = await checkMigrationStatus(userId);
    return !migrated;
  } catch (error) {
    console.error('[Migration] Error checking migration requirement:', error);
    return false;
  }
}

/**
 * Clear migration status (for testing)
 */
export function clearMigrationStatus() {
  localStorage.removeItem(MIGRATION_STATUS_KEY);
  console.debug('[Migration] Local migration status cleared');
}
