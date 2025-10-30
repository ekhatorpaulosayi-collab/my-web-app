// Reliable IndexedDB wrapper for items
// Wraps the existing db/idb.js functions with guaranteed async/await completion

import {
  initDB as initDBBase,
  addItem as addItemBase,
  updateItem as updateItemBase,
  getItems as getItemsBase
} from '../../db/idb';

export type Item = {
  id?: number;
  name: string;
  category: string;
  qty: number;
  purchaseKobo: number;
  sellKobo: number;
  reorderLevel?: number;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Ensure DB is initialized before any operation
export async function ensureDB() {
  try {
    await initDBBase();
    console.log('[items.ts] DB initialized');
  } catch (error) {
    console.error('[items.ts] DB init failed:', error);
    throw error;
  }
}

// Add new item with guaranteed completion
export async function addItem(item: Item): Promise<Item> {
  console.log('[items.ts] addItem called with:', item);

  try {
    await ensureDB();
    console.log('[items.ts] Calling base addItem...');
    const result = await addItemBase(item);
    console.log('[items.ts] addItem completed, result:', result);
    return result;
  } catch (error) {
    console.error('[items.ts] addItem failed:', error);
    throw error;
  }
}

// Update existing item with guaranteed completion
export async function updateItem(id: number, updates: Partial<Item>): Promise<void> {
  console.log('[items.ts] updateItem called with id:', id, 'updates:', updates);

  try {
    await ensureDB();
    console.log('[items.ts] Calling base updateItem...');
    await updateItemBase(id, updates);
    console.log('[items.ts] updateItem completed');
  } catch (error) {
    console.error('[items.ts] updateItem failed:', error);
    throw error;
  }
}

// Get all items with guaranteed completion
export async function getItems(): Promise<Item[]> {
  console.log('[items.ts] getItems called');

  try {
    await ensureDB();
    console.log('[items.ts] Calling base getItems...');
    const items = await getItemsBase();
    console.log('[items.ts] getItems completed, count:', items.length);
    return items;
  } catch (error) {
    console.error('[items.ts] getItems failed:', error);
    throw error;
  }
}
