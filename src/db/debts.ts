// Native IndexedDB debt management (no external libraries)

export type Debt = {
  id: string;              // uuid
  name: string;
  phone?: string;
  amount: number;          // naira as integer (not kobo for simplicity)
  dueDate?: string;        // ISO
  createdAt: string;       // ISO
  paid: boolean;
  paidAt?: string | null;  // ISO | null
};

const DB_NAME = 'storehouse';
const DB_VERSION = 6; // Increment to add debts store
const DEBT_STORE = 'debts';

let dbInstance: IDBDatabase | null = null;

// Get or initialize DB
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // Create debts store if it doesn't exist
      if (!db.objectStoreNames.contains(DEBT_STORE)) {
        console.log('[IndexedDB] Creating debts store');
        const store = db.createObjectStore(DEBT_STORE, { keyPath: 'id' });
        store.createIndex('by_paid', 'paid', { unique: false });
        store.createIndex('by_dueDate', 'dueDate', { unique: false });
        store.createIndex('by_createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function listDebts(): Promise<Debt[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DEBT_STORE, 'readonly');
      const store = tx.objectStore(DEBT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[listDebts] Error:', error);
    return [];
  }
}

export async function markDebtPaid(id: string): Promise<Debt | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DEBT_STORE, 'readwrite');
      const store = tx.objectStore(DEBT_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const debt = getRequest.result;
        if (!debt) {
          resolve(null);
          return;
        }

        debt.paid = true;
        debt.paidAt = new Date().toISOString();

        const putRequest = store.put(debt);
        putRequest.onsuccess = () => resolve(debt as Debt);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[markDebtPaid] Error:', error);
    return null;
  }
}

export async function addOrUpdateDebt(debt: Debt): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DEBT_STORE, 'readwrite');
      const store = tx.objectStore(DEBT_STORE);
      const request = store.put(debt);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[addOrUpdateDebt] Error:', error);
  }
}
