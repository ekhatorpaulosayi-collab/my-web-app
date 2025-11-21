/**
 * Utility to make all items public
 * Run this once to update existing items
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function makeAllItemsPublic(userId) {
  try {
    console.log('[makeItemsPublic] Starting for user:', userId);

    // Get all items from /users/{userId}/products
    const productsRef = collection(db, 'users', userId, 'products');
    const snapshot = await getDocs(productsRef);

    console.log('[makeItemsPublic] Found', snapshot.docs.length, 'items');

    let updated = 0;

    for (const itemDoc of snapshot.docs) {
      const data = itemDoc.data();

      // Skip if already public
      if (data.isPublic === true) {
        console.log('[makeItemsPublic] Skipping (already public):', data.name);
        continue;
      }

      // Update to make public
      await updateDoc(doc(db, 'users', userId, 'products', itemDoc.id), {
        isPublic: true
      });

      console.log('[makeItemsPublic] Made public:', data.name);
      updated++;
    }

    console.log('[makeItemsPublic] ✅ Done! Made', updated, 'items public');
    return { success: true, updated };

  } catch (error) {
    console.error('[makeItemsPublic] Error:', error);
    throw error;
  }
}
