import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, withTimeout } from '../lib/firebase';

/**
 * Firebase Products Service
 * Manages products in Firestore with per-user isolation
 * Products are stored in /users/{userId}/products
 */

const PRODUCTS_CACHE_KEY = 'storehouse:products:cache';

/**
 * Get products collection reference for a user
 */
function getProductsRef(userId) {
  return collection(db, 'users', userId, 'products');
}

/**
 * Get all products for current user
 */
export async function getProducts(userId) {
  try {
    console.debug('[FirebaseProducts] Fetching products for user:', userId);

    const productsRef = getProductsRef(userId);
    const q = query(productsRef, orderBy('name', 'asc'));

    // Add 5-second timeout to prevent long waits
    const snapshot = await withTimeout(getDocs(q), 5000);

    // If timeout returned null fallback, use cache immediately
    if (!snapshot) {
      console.warn('[FirebaseProducts] Fetch timed out, using cache');
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.debug('[FirebaseProducts] Loaded', products.length, 'products');

    // Cache in localStorage for offline access
    try {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn('[FirebaseProducts] Failed to cache products:', e);
    }

    return products;
  } catch (error) {
    console.error('[FirebaseProducts] Error fetching products:', error);

    // Try to load from cache if Firebase fails
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (cached) {
        console.debug('[FirebaseProducts] Loaded from cache');
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[FirebaseProducts] Failed to load cache:', e);
    }

    throw error;
  }
}

/**
 * Subscribe to real-time product updates
 */
export function subscribeToProducts(userId, callback) {
  console.debug('[FirebaseProducts] Subscribing to products for user:', userId);

  const productsRef = getProductsRef(userId);
  const q = query(productsRef, orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.debug('[FirebaseProducts] Real-time update:', products.length, 'products');

      // Update cache
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
      } catch (e) {
        console.warn('[FirebaseProducts] Failed to cache products:', e);
      }

      callback(products);
    },
    (error) => {
      console.error('[FirebaseProducts] Subscription error:', error);
      callback(null, error);
    }
  );
}

/**
 * Add a new product
 */
export async function addProduct(userId, productData) {
  try {
    console.debug('[FirebaseProducts] Adding product:', productData.name);

    const productsRef = getProductsRef(userId);

    const newProduct = {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(productsRef, newProduct);

    console.debug('[FirebaseProducts] Product added with ID:', docRef.id);

    return {
      id: docRef.id,
      ...newProduct
    };
  } catch (error) {
    console.error('[FirebaseProducts] Error adding product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(userId, productId, updates) {
  try {
    console.debug('[FirebaseProducts] Updating product:', productId);

    const productRef = doc(db, 'users', userId, 'products', productId);

    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    await updateDoc(productRef, updatedData);

    console.debug('[FirebaseProducts] Product updated');

    return {
      id: productId,
      ...updates
    };
  } catch (error) {
    console.error('[FirebaseProducts] Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(userId, productId) {
  try {
    console.debug('[FirebaseProducts] Deleting product:', productId);

    const productRef = doc(db, 'users', userId, 'products', productId);
    await deleteDoc(productRef);

    console.debug('[FirebaseProducts] Product deleted');
  } catch (error) {
    console.error('[FirebaseProducts] Error deleting product:', error);
    throw error;
  }
}

/**
 * Check if a product with the same name exists
 */
export async function productExists(userId, productName, excludeId = null) {
  try {
    const productsRef = getProductsRef(userId);
    const q = query(
      productsRef,
      where('name', '==', productName)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return false;
    }

    // If excludeId is provided, ignore that product (for updates)
    if (excludeId) {
      const matches = snapshot.docs.filter(doc => doc.id !== excludeId);
      return matches.length > 0;
    }

    return true;
  } catch (error) {
    console.error('[FirebaseProducts] Error checking product existence:', error);
    return false;
  }
}

/**
 * Clear cached products
 */
export function clearProductsCache() {
  try {
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    console.debug('[FirebaseProducts] Cache cleared');
  } catch (e) {
    console.warn('[FirebaseProducts] Failed to clear cache:', e);
  }
}
