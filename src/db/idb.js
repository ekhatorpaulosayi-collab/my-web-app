// IndexedDB helper using idb pattern
// Money stored as integer kobo (1 Naira = 100 kobo)

import { formatNaira } from '../utils/money.ts';

const DB_NAME = 'storehouse';
const DB_VERSION = 5; // v5: Backfill sales with isCredit + paymentMethod for accurate EOD reports

let dbInstance = null;

// Initialize database
export async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      console.log(`[IndexedDB] Migrating from version ${oldVersion} to ${DB_VERSION}`);

      // Items store (v1, updated in v3)
      if (!db.objectStoreNames.contains('items')) {
        console.log('[IndexedDB] Creating items store');
        const itemStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        itemStore.createIndex('by_name', 'name', { unique: true });
      } else if (oldVersion < 3) {
        // v3 migration: Ensure by_name index exists
        console.log('[IndexedDB] Updating items store for v3');
        const transaction = event.target.transaction;
        const itemStore = transaction.objectStore('items');

        // Check if old 'name' index exists and create 'by_name' if needed
        if (!itemStore.indexNames.contains('by_name')) {
          if (itemStore.indexNames.contains('name')) {
            itemStore.deleteIndex('name');
          }
          itemStore.createIndex('by_name', 'name', { unique: true });
        }
      }

      // Sales store (v1)
      if (!db.objectStoreNames.contains('sales')) {
        console.log('[IndexedDB] Creating sales store');
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('timestamp', 'timestamp');
        salesStore.createIndex('itemId', 'itemId');
      }

      // Settings store (v1)
      if (!db.objectStoreNames.contains('settings')) {
        console.log('[IndexedDB] Creating settings store');
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Customers store (v2) - for credit/debt tracking
      if (!db.objectStoreNames.contains('customers')) {
        console.log('[IndexedDB] Creating customers store');
        const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        customerStore.createIndex('name', 'name', { unique: false }); // Multiple customers can have same name
        customerStore.createIndex('phone', 'phone', { unique: false }); // For quick lookup
        customerStore.createIndex('by_lower_name', 'lowerName', { unique: false }); // v4: Case-insensitive lookup
      } else if (oldVersion < 4) {
        // v4 migration: Add lowerName index and populate existing records
        console.log('[IndexedDB] Adding lowerName index to customers store');
        const transaction = event.target.transaction;
        const customerStore = transaction.objectStore('customers');

        if (!customerStore.indexNames.contains('by_lower_name')) {
          customerStore.createIndex('by_lower_name', 'lowerName', { unique: false });
        }

        // Populate lowerName for existing customers
        const getAllRequest = customerStore.getAll();
        getAllRequest.onsuccess = () => {
          const customers = getAllRequest.result;
          customers.forEach(customer => {
            if (!customer.lowerName && customer.name) {
              customer.lowerName = customer.name.toLowerCase();
              customerStore.put(customer);
            }
          });
        };
      }

      // Credits store (v2) - tracks credit sales
      if (!db.objectStoreNames.contains('credits')) {
        console.log('[IndexedDB] Creating credits store');
        const creditStore = db.createObjectStore('credits', { keyPath: 'id', autoIncrement: true });
        creditStore.createIndex('saleId', 'saleId', { unique: true }); // One credit per sale
        creditStore.createIndex('customerId', 'customerId', { unique: false }); // Customer can have multiple credits
        creditStore.createIndex('status', 'status', { unique: false }); // Filter by status
        creditStore.createIndex('dueDate', 'dueDate', { unique: false }); // Sort by due date
      }

      // Payments store (v2) - tracks payments against credits
      if (!db.objectStoreNames.contains('payments')) {
        console.log('[IndexedDB] Creating payments store');
        const paymentStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
        paymentStore.createIndex('creditId', 'creditId', { unique: false }); // Multiple payments per credit
        paymentStore.createIndex('createdAt', 'createdAt', { unique: false }); // Sort by date
      }

      // Outbox store (v4) - for idempotent operations and offline queue
      if (!db.objectStoreNames.contains('outbox')) {
        console.log('[IndexedDB] Creating outbox store');
        const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' }); // Use saleId as id for idempotency
        outboxStore.createIndex('kind', 'kind', { unique: false }); // Filter by operation type
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false }); // Sort by date
      }

      // v5 migration: Backfill sales with isCredit and paymentMethod for accurate EOD reports
      if (oldVersion < 5) {
        console.log('[IndexedDB] v5: Backfilling sales with payment method fields');
        const transaction = event.target.transaction;
        const salesStore = transaction.objectStore('sales');

        // Add indexes if they don't exist
        if (!salesStore.indexNames.contains('paymentMethod')) {
          salesStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
        }
        if (!salesStore.indexNames.contains('isCredit')) {
          salesStore.createIndex('isCredit', 'isCredit', { unique: false });
        }

        // Backfill existing sales (idempotent - safe to re-run)
        const getAllSales = salesStore.getAll();
        getAllSales.onsuccess = () => {
          const sales = getAllSales.result;
          console.log(`[IndexedDB] Backfilling ${sales.length} sales records`);

          sales.forEach(sale => {
            let modified = false;

            // Set isCredit if not present
            if (typeof sale.isCredit === 'undefined') {
              // Check if this was a credit sale by looking at customerName or other indicators
              sale.isCredit = !!(sale.customerName && sale.dueDate);
              modified = true;
            }

            // Set paymentMethod if not present
            if (!sale.paymentMethod) {
              if (sale.isCredit) {
                sale.paymentMethod = 'credit';
              } else {
                // Default to 'cash' for old records without explicit payment method
                sale.paymentMethod = 'cash';
              }
              modified = true;
            }

            // Save if modified
            if (modified) {
              salesStore.put(sale);
            }
          });

          console.log('[IndexedDB] Sales backfill completed');
        };
      }

      console.log('[IndexedDB] Migration completed successfully');
    };
  });
}

// Seed demo items on first run (3 items only)
export async function seedDemoItems() {
  const demoActive = localStorage.getItem('demoItemsActive');

  // Only seed if not already done
  if (demoActive !== null) {
    console.log('[Demo] Demo items already processed');
    return;
  }

  const db = await initDB();
  const items = await getItems();

  // Don't seed if there are already items
  if (items.length > 0) {
    localStorage.setItem('demoItemsActive', 'false');
    return;
  }

  console.log('[Demo] Seeding 3 demo items');

  const demoItems = [
    {
      name: 'Rice (50kg)',
      category: 'Food Items',
      qty: 10,
      purchaseKobo: 2500000,  // ₦25,000
      sellKobo: 2800000,      // ₦28,000
      reorderLevel: 2,
      isDemo: true,
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Milk Tin',
      category: 'Food Items',
      qty: 2,
      purchaseKobo: 100000,   // ₦1,000
      sellKobo: 120000,       // ₦1,200
      reorderLevel: 3,
      isDemo: true,
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Soap Carton',
      category: 'Household',
      qty: 12,
      purchaseKobo: 600000,   // ₦6,000
      sellKobo: 700000,       // ₦7,000
      reorderLevel: 2,
      isDemo: true,
      updatedAt: new Date().toISOString()
    }
  ];

  const transaction = db.transaction(['items'], 'readwrite');
  const store = transaction.objectStore('items');

  for (const item of demoItems) {
    store.add(item);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      localStorage.setItem('demoItemsActive', 'true');
      console.log('[Demo] Demo items seeded successfully');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// Remove demo items when user adds first real item
export async function removeDemoItems() {
  const demoActive = localStorage.getItem('demoItemsActive');

  if (demoActive !== 'true') {
    return; // Demo items already removed or never existed
  }

  const db = await initDB();
  const items = await getItems();

  const demoItems = items.filter(item => item.isDemo === true);

  if (demoItems.length === 0) {
    localStorage.setItem('demoItemsActive', 'false');
    return;
  }

  console.log(`[Demo] Removing ${demoItems.length} demo items`);

  const transaction = db.transaction(['items'], 'readwrite');
  const store = transaction.objectStore('items');

  for (const item of demoItems) {
    store.delete(item.id);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      localStorage.setItem('demoItemsActive', 'false');
      console.log('[Demo] Demo items removed');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get all items
export async function getItems() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readonly');
    const store = transaction.objectStore('items');
    const request = store.getAll();

    let items = null;

    request.onsuccess = () => {
      items = request.result;
      console.log('[getItems] Request succeeded, count:', items.length);
    };

    request.onerror = () => {
      console.error('[getItems] Request error:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      console.log('[getItems] ✅ Transaction complete, loaded:', items.length);
      resolve(items);
    };

    transaction.onerror = () => {
      console.error('[getItems] Transaction error:', transaction.error);
      reject(transaction.error);
    };
  });
}

// Check if item name exists (for duplicate detection)
export async function checkItemExists(name) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readonly');
    const store = transaction.objectStore('items');
    const index = store.index('by_name');
    const request = index.get(name);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Add new item (throws if duplicate name)
export async function addItem(item) {
  const db = await initDB();

  // Add updatedAt timestamp
  const itemData = {
    ...item,
    updatedAt: new Date().toISOString(),
    isDemo: false
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readwrite');
    const store = transaction.objectStore('items');
    const request = store.add(itemData);

    let addedId = null;

    request.onsuccess = () => {
      addedId = request.result;
      console.log('[addItem] Add request succeeded, id:', addedId);
    };

    request.onerror = () => {
      console.error('[addItem] Add request error:', request.error);
      if (request.error.name === 'ConstraintError') {
        reject(new Error('DUPLICATE_NAME'));
      } else {
        reject(request.error);
      }
    };

    transaction.oncomplete = () => {
      console.log('[addItem] ✅ Transaction committed successfully, id:', addedId);
      resolve({ ...itemData, id: addedId });
    };

    transaction.onerror = () => {
      console.error('[addItem] Transaction error:', transaction.error);
      reject(transaction.error);
    };

    transaction.onabort = () => {
      console.error('[addItem] Transaction aborted');
      reject(new Error('Transaction aborted'));
    };
  });
}

// Update existing item by ID
export async function updateItem(id, updates) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readwrite');
    const store = transaction.objectStore('items');
    const getRequest = store.get(id);

    let updatedItem = null;

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error('Item not found'));
        return;
      }

      updatedItem = {
        ...item,
        ...updates,
        id: item.id, // Preserve ID
        updatedAt: new Date().toISOString()
      };

      const putRequest = store.put(updatedItem);

      putRequest.onsuccess = () => {
        console.log('[updateItem] Put request succeeded for id:', id);
      };

      putRequest.onerror = () => {
        console.error('[updateItem] Put request error:', putRequest.error);
        reject(putRequest.error);
      };
    };

    getRequest.onerror = () => {
      console.error('[updateItem] Get request error:', getRequest.error);
      reject(getRequest.error);
    };

    transaction.oncomplete = () => {
      console.log('[updateItem] ✅ Transaction committed successfully');
      resolve(updatedItem);
    };

    transaction.onerror = () => {
      console.error('[updateItem] Transaction error:', transaction.error);
      reject(transaction.error);
    };
  });
}

// Update item quantity (for stock updates)
export async function updateItemQty(itemId, newQty) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readwrite');
    const store = transaction.objectStore('items');
    const getRequest = store.get(itemId);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error('Item not found'));
        return;
      }

      item.qty = newQty;
      const updateRequest = store.put(item);

      updateRequest.onsuccess = () => resolve(item);
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Get all sales
export async function getSales() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add sale (idempotent - checks if sale ID exists)
export async function addSale(sale) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sales', 'items'], 'readwrite');
    const salesStore = transaction.objectStore('sales');
    const itemsStore = transaction.objectStore('items');

    // Check if sale already exists
    const checkRequest = salesStore.get(sale.id);

    checkRequest.onsuccess = () => {
      if (checkRequest.result) {
        // Sale already exists - idempotent, don't duplicate
        reject(new Error('Sale already recorded'));
        return;
      }

      // Get item to check stock and decrement
      const itemRequest = itemsStore.get(sale.itemId);

      itemRequest.onsuccess = () => {
        const item = itemRequest.result;

        if (!item) {
          reject(new Error('Item not found'));
          return;
        }

        if (item.qty < sale.qty) {
          reject(new Error(`Insufficient stock. Only ${item.qty} available.`));
          return;
        }

        // Decrement stock atomically
        item.qty -= sale.qty;
        itemsStore.put(item);

        // Add sale
        salesStore.add(sale);

        transaction.oncomplete = () => resolve({ sale, updatedItem: item });
        transaction.onerror = () => reject(transaction.error);
      };

      itemRequest.onerror = () => reject(itemRequest.error);
    };

    checkRequest.onerror = () => reject(checkRequest.error);
  });
}

// Update sale (mark as paid)
export async function updateSale(saleId, updates) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sales'], 'readwrite');
    const store = transaction.objectStore('sales');
    const getRequest = store.get(saleId);

    getRequest.onsuccess = () => {
      const sale = getRequest.result;
      if (!sale) {
        reject(new Error('Sale not found'));
        return;
      }

      const updatedSale = { ...sale, ...updates };
      const updateRequest = store.put(updatedSale);

      updateRequest.onsuccess = () => resolve(updatedSale);
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Get settings
export async function getSettings() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('app-settings');

    request.onsuccess = () => resolve(request.result?.value || {});
    request.onerror = () => reject(request.error);
  });
}

// Save settings
export async function saveSettings(settings) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({ key: 'app-settings', value: settings });

    request.onsuccess = () => resolve(settings);
    request.onerror = () => reject(request.error);
  });
}

// Utility: Format kobo to NGN currency
export function formatNGN(kobo) {
  const naira = (kobo || 0) / 100;
  return formatNaira(naira);
}

// Utility: Convert NGN input to kobo
export function ngnToKobo(ngnString) {
  const cleaned = ngnString.replace(/[^\d.]/g, '');
  const naira = parseFloat(cleaned) || 0;
  return Math.round(naira * 100);
}

// ==================== CUSTOMER OPERATIONS ====================

// Get all customers
export async function getCustomers() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['customers'], 'readonly');
    const store = transaction.objectStore('customers');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add customer
export async function addCustomer(customer) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['customers'], 'readwrite');
    const store = transaction.objectStore('customers');

    const customerData = {
      name: customer.name,
      phone: customer.phone || null,
      consentAt: customer.consentAt || null,
      createdAt: Date.now()
    };

    const request = store.add(customerData);

    request.onsuccess = () => {
      resolve({ ...customerData, id: request.result });
    };
    request.onerror = () => reject(request.error);
  });
}

// Get customer by ID
export async function getCustomer(customerId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['customers'], 'readonly');
    const store = transaction.objectStore('customers');
    const request = store.get(customerId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Find customer by name (returns first match)
export async function findCustomerByName(name) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['customers'], 'readonly');
    const store = transaction.objectStore('customers');
    const index = store.index('name');
    const request = index.get(name);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Find customer by lowerName (case-insensitive, returns first match)
export async function findCustomerByLowerName(name) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['customers'], 'readonly');
    const store = transaction.objectStore('customers');
    const index = store.index('by_lower_name');
    const request = index.get(name.toLowerCase());

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Update existing customer
export async function updateCustomer(customerId, updates) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['customers'], 'readwrite');
    const store = transaction.objectStore('customers');
    const getRequest = store.get(customerId);

    getRequest.onsuccess = () => {
      const customer = getRequest.result;
      if (!customer) {
        reject(new Error('Customer not found'));
        return;
      }

      const updatedCustomer = {
        ...customer,
        ...updates,
        id: customer.id // Preserve ID
      };

      // Update lowerName if name changed
      if (updates.name && updates.name !== customer.name) {
        updatedCustomer.lowerName = updates.name.toLowerCase();
      }

      const updateRequest = store.put(updatedCustomer);

      updateRequest.onsuccess = () => resolve(updatedCustomer);
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ==================== CREDIT OPERATIONS ====================

// Add credit (associated with a sale)
export async function addCredit(credit) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['credits'], 'readwrite');
    const store = transaction.objectStore('credits');

    const creditData = {
      saleId: credit.saleId,
      customerId: credit.customerId,
      principalKobo: credit.principalKobo,
      paidKobo: credit.paidKobo || 0,
      dueDate: credit.dueDate, // ISO date string
      status: credit.status || 'open',
      createdAt: Date.now()
    };

    const request = store.add(creditData);

    request.onsuccess = () => {
      resolve({ ...creditData, id: request.result });
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all credits
export async function getCredits() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['credits'], 'readonly');
    const store = transaction.objectStore('credits');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get credits by customer ID
export async function getCreditsByCustomer(customerId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['credits'], 'readonly');
    const store = transaction.objectStore('credits');
    const index = store.index('customerId');
    const request = index.getAll(customerId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get credits by status
export async function getCreditsByStatus(status) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['credits'], 'readonly');
    const store = transaction.objectStore('credits');
    const index = store.index('status');
    const request = index.getAll(status);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Update credit (e.g., mark as paid, update status)
export async function updateCredit(creditId, updates) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['credits'], 'readwrite');
    const store = transaction.objectStore('credits');
    const getRequest = store.get(creditId);

    getRequest.onsuccess = () => {
      const credit = getRequest.result;
      if (!credit) {
        reject(new Error('Credit not found'));
        return;
      }

      const updatedCredit = { ...credit, ...updates };
      const updateRequest = store.put(updatedCredit);

      updateRequest.onsuccess = () => resolve(updatedCredit);
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ==================== PAYMENT OPERATIONS ====================

// Add payment to a credit
export async function addPayment(payment) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['payments', 'credits'], 'readwrite');
    const paymentStore = transaction.objectStore('payments');
    const creditStore = transaction.objectStore('credits');

    // First, get the credit to update paidKobo
    const getCreditRequest = creditStore.get(payment.creditId);

    getCreditRequest.onsuccess = () => {
      const credit = getCreditRequest.result;
      if (!credit) {
        reject(new Error('Credit not found'));
        return;
      }

      // Create payment record
      const paymentData = {
        creditId: payment.creditId,
        amountKobo: payment.amountKobo,
        createdAt: Date.now()
      };

      const addPaymentRequest = paymentStore.add(paymentData);

      addPaymentRequest.onsuccess = () => {
        // Update credit's paidKobo
        credit.paidKobo = (credit.paidKobo || 0) + payment.amountKobo;

        // Update status based on payment
        const balanceKobo = credit.principalKobo - credit.paidKobo;
        if (balanceKobo <= 0) {
          credit.status = 'closed';
        }

        creditStore.put(credit);

        transaction.oncomplete = () => {
          resolve({
            payment: { ...paymentData, id: addPaymentRequest.result },
            updatedCredit: credit
          });
        };
      };

      addPaymentRequest.onerror = () => reject(addPaymentRequest.error);
    };

    getCreditRequest.onerror = () => reject(getCreditRequest.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get payments for a credit
export async function getPaymentsByCredit(creditId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['payments'], 'readonly');
    const store = transaction.objectStore('payments');
    const index = store.index('creditId');
    const request = index.getAll(creditId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all payments
export async function getPayments() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['payments'], 'readonly');
    const store = transaction.objectStore('payments');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==================== UTILITY FUNCTIONS ====================

// Get database instance (for advanced queries)
export async function getDB() {
  return await initDB();
}

// Calculate overdue credits (updates status)
export async function updateOverdueCredits() {
  const db = await initDB();
  const today = new Date().toISOString().split('T')[0];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['credits'], 'readwrite');
    const store = transaction.objectStore('credits');
    const index = store.index('status');
    const request = index.getAll('open');

    request.onsuccess = () => {
      const openCredits = request.result;
      let updatedCount = 0;

      openCredits.forEach((credit) => {
        if (credit.dueDate < today) {
          credit.status = 'overdue';
          store.put(credit);
          updatedCount++;
        }
      });

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Updated ${updatedCount} credits to overdue status`);
        resolve(updatedCount);
      };
    };

    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

// ==================== STAGE 3 UTILITIES ====================

// Parse quantity input (digits only, minimum 1)
export function parseQty(value) {
  const cleaned = String(value).replace(/\D/g, '');
  const num = parseInt(cleaned, 10) || 0;
  return Math.max(1, num);
}

// Convert naira string to kobo integer (safe money handling)
export function toKobo(value) {
  const cleaned = String(value).replace(/[^\d.]/g, '');
  const naira = parseFloat(cleaned) || 0;
  return Math.round(naira * 100);
}

// Get local day key (YYYY-MM-DD in local timezone, not UTC)
export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get ISO date string for today + N days (local timezone)
export function todayPlusDaysISO(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

// Clean Nigerian phone number (digits only)
export function cleanMsisdnNG(phone) {
  return String(phone).replace(/\D/g, '');
}

// Validate Nigerian phone number format
export function isValidNG(phone) {
  const cleaned = cleanMsisdnNG(phone);
  // Accept +234XXXXXXXXXX or 0XXXXXXXXXX
  return /^(\+?234|0)([789]\d{9})$/.test(phone) || /^234[789]\d{9}$/.test(cleaned);
}

// Convert phone to WhatsApp URL with message
export function toWhatsAppTarget(phone) {
  if (!phone) {
    return 'https://wa.me/?text='; // Generic share
  }

  const digits = cleanMsisdnNG(phone);

  if (!digits) {
    return 'https://wa.me/?text=';
  }

  // Remove leading 0 if present
  if (digits.startsWith('0')) {
    return `https://wa.me/234${digits.slice(1)}?text=`;
  }

  // Add 234 if not present
  if (digits.startsWith('234')) {
    return `https://wa.me/${digits}?text=`;
  }

  return `https://wa.me/234${digits}?text=`;
}

// Build credit receipt message for WhatsApp
export function buildCreditReceipt({ storeName, customer, itemName, qty, sellKobo, dueDateISO, refCode }) {
  // Format due date as DD/MM/YYYY
  const dueDate = new Date(dueDateISO);
  const day = String(dueDate.getDate()).padStart(2, '0');
  const month = String(dueDate.getMonth() + 1).padStart(2, '0');
  const year = dueDate.getFullYear();
  const formattedDueDate = `${day}/${month}/${year}`;

  const totalKobo = qty * sellKobo;

  return `📱 CREDIT SALE RECEIPT

Store: ${storeName || 'Storehouse'}
Customer: ${customer}
Item: ${itemName}
Qty: ${qty}
Total: ${formatNGN(totalKobo)}

💳 Payment Terms
Amount Due: ${formatNGN(totalKobo)}
Due Date: ${formattedDueDate}

Thank you!

—
Powered by Storehouse
https://storehouse.ng/?ref=${refCode || 'APP'}`;
}
