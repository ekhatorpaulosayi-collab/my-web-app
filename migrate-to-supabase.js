/**
 * FIREBASE TO SUPABASE MIGRATION SCRIPT
 * Safely migrates all data with progress tracking and error handling
 *
 * Usage: node migrate-to-supabase.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

// Initialize Supabase with service role key (for admin operations)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Migration statistics
const stats = {
  users: { total: 0, migrated: 0, errors: 0 },
  stores: { total: 0, migrated: 0, errors: 0 },
  products: { total: 0, migrated: 0, errors: 0 },
  sales: { total: 0, migrated: 0, errors: 0 },
  expenses: { total: 0, migrated: 0, errors: 0 },
};

// User ID mapping (Firebase UID -> Supabase UUID)
const userIdMap = new Map();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type] || '📝';

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function parsePrice(price) {
  // Convert price to kobo (multiply by 100 and round)
  if (typeof price === 'number') {
    return Math.round(price * 100);
  }
  if (typeof price === 'string') {
    const parsed = parseFloat(price.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }
  return 0;
}

function parseDate(timestamp) {
  if (!timestamp) return null;

  // Firebase Timestamp
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }

  // JavaScript Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // Unix timestamp
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }

  // ISO string
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }

  return null;
}

// =====================================================
// MIGRATION FUNCTIONS
// =====================================================

async function migrateUsers() {
  log('Starting users migration...', 'info');

  try {
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    stats.users.total = usersSnapshot.size;

    log(`Found ${stats.users.total} users to migrate`, 'info');

    for (const doc of usersSnapshot.docs) {
      try {
        const firebaseData = doc.data();

        // Transform Firebase user to Supabase format
        const supabaseUser = {
          firebase_uid: doc.id,
          phone_number: firebaseData.phoneNumber || firebaseData.phone || '+2341234567890',
          email: firebaseData.email || null,
          full_name: firebaseData.displayName || firebaseData.name || firebaseData.fullName || null,
          business_name: firebaseData.businessName || null,
          created_at: parseDate(firebaseData.createdAt) || new Date().toISOString(),
          updated_at: parseDate(firebaseData.updatedAt) || new Date().toISOString(),
          last_login_at: parseDate(firebaseData.lastLoginAt) || null,
          app_version: firebaseData.appVersion || null,
          device_type: firebaseData.deviceType || 'web',
          is_active: firebaseData.isActive !== false,
        };

        // Insert into Supabase
        const { data, error } = await supabase
          .from('users')
          .insert(supabaseUser)
          .select()
          .single();

        if (error) {
          // Check if user already exists
          if (error.code === '23505') { // Unique constraint violation
            log(`User ${doc.id} already exists, fetching existing record`, 'warning');
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('firebase_uid', doc.id)
              .single();

            if (existingUser) {
              userIdMap.set(doc.id, existingUser.id);
              stats.users.migrated++;
              log(`Mapped existing user ${doc.id} -> ${existingUser.id}`, 'success');
            }
          } else {
            throw error;
          }
        } else {
          userIdMap.set(doc.id, data.id);
          stats.users.migrated++;
          log(`Migrated user ${doc.id} -> ${data.id}`, 'success');
        }
      } catch (error) {
        stats.users.errors++;
        log(`Error migrating user ${doc.id}: ${error.message}`, 'error');
      }
    }

    log(`Users migration complete: ${stats.users.migrated}/${stats.users.total} successful`, 'success');
  } catch (error) {
    log(`Users migration failed: ${error.message}`, 'error');
    throw error;
  }
}

async function migrateStores() {
  log('Starting stores migration...', 'info');

  try {
    const storesSnapshot = await getDocs(collection(firestore, 'stores'));
    stats.stores.total = storesSnapshot.size;

    log(`Found ${stats.stores.total} stores to migrate`, 'info');

    for (const doc of storesSnapshot.docs) {
      try {
        const firebaseData = doc.data();
        const firebaseUserId = firebaseData.userId || firebaseData.uid || doc.id;
        const supabaseUserId = userIdMap.get(firebaseUserId);

        if (!supabaseUserId) {
          log(`Skipping store ${doc.id}: User ${firebaseUserId} not found`, 'warning');
          stats.stores.errors++;
          continue;
        }

        // Transform Firebase store to Supabase format
        const supabaseStore = {
          user_id: supabaseUserId,
          business_name: firebaseData.businessName || 'My Store',
          store_slug: firebaseData.slug || firebaseData.storeSlug || `store-${doc.id.substring(0, 8)}`,
          whatsapp_number: firebaseData.whatsappNumber || firebaseData.phoneNumber || '+0000000000',
          logo_url: firebaseData.logoUrl || firebaseData.logo || null,

          // Payment info
          bank_name: firebaseData.bankName || null,
          account_number: firebaseData.accountNumber || null,
          account_name: firebaseData.accountName || null,
          paystack_enabled: firebaseData.paystackEnabled || false,
          paystack_public_key: firebaseData.paystackPublicKey || null,
          paystack_test_mode: firebaseData.paystackTestMode !== false,

          // Delivery info
          delivery_areas: firebaseData.deliveryAreas || null,
          delivery_fee: firebaseData.deliveryFee || null,
          minimum_order: firebaseData.minimumOrder || null,
          business_hours: firebaseData.businessHours || null,
          days_of_operation: firebaseData.daysOfOperation || [],

          // About
          about_us: firebaseData.aboutUs || firebaseData.description || null,
          instagram_url: firebaseData.instagramUrl || firebaseData.instagram || null,
          facebook_url: firebaseData.facebookUrl || firebaseData.facebook || null,

          // Settings
          is_public: firebaseData.isPublic !== false,
          is_verified: firebaseData.isVerified || false,

          created_at: parseDate(firebaseData.createdAt) || new Date().toISOString(),
          updated_at: parseDate(firebaseData.updatedAt) || new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('stores')
          .insert(supabaseStore)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            log(`Store for user ${firebaseUserId} already exists`, 'warning');
            stats.stores.migrated++;
          } else {
            throw error;
          }
        } else {
          stats.stores.migrated++;
          log(`Migrated store ${doc.id}`, 'success');
        }
      } catch (error) {
        stats.stores.errors++;
        log(`Error migrating store ${doc.id}: ${error.message}`, 'error');
      }
    }

    log(`Stores migration complete: ${stats.stores.migrated}/${stats.stores.total} successful`, 'success');
  } catch (error) {
    log(`Stores migration failed: ${error.message}`, 'error');
    throw error;
  }
}

async function migrateProducts() {
  log('Starting products migration...', 'info');

  try {
    const productsSnapshot = await getDocs(collection(firestore, 'products'));
    stats.products.total = productsSnapshot.size;

    log(`Found ${stats.products.total} products to migrate`, 'info');

    // Batch insert for better performance
    const batchSize = 100;
    let batch = [];

    for (const doc of productsSnapshot.docs) {
      try {
        const firebaseData = doc.data();
        const firebaseUserId = firebaseData.userId || firebaseData.uid;
        const supabaseUserId = userIdMap.get(firebaseUserId);

        if (!supabaseUserId) {
          log(`Skipping product ${doc.id}: User ${firebaseUserId} not found`, 'warning');
          stats.products.errors++;
          continue;
        }

        // Transform Firebase product to Supabase format
        const supabaseProduct = {
          user_id: supabaseUserId,
          name: firebaseData.name || 'Unnamed Product',
          sku: firebaseData.sku || null,
          barcode: firebaseData.barcode || null,
          category: firebaseData.category || null,

          // Prices in kobo
          cost_price: parsePrice(firebaseData.costPrice || firebaseData.buyingPrice || 0),
          selling_price: parsePrice(firebaseData.sellingPrice || firebaseData.price || 0),
          discount_price: firebaseData.discountPrice ? parsePrice(firebaseData.discountPrice) : null,

          // Inventory
          quantity: parseInt(firebaseData.quantity || firebaseData.stock || 0),
          low_stock_threshold: parseInt(firebaseData.lowStockThreshold || 5),
          unit: firebaseData.unit || 'piece',

          // Images
          image_url: firebaseData.imageUrl || firebaseData.image || null,
          image_thumbnail: firebaseData.imageThumbnail || firebaseData.thumbnail || null,
          image_sizes: firebaseData.imageSizes || null,

          // Description
          description: firebaseData.description || null,
          tags: firebaseData.tags || [],

          // Status
          is_active: firebaseData.isActive !== false,
          is_featured: firebaseData.isFeatured || false,

          created_at: parseDate(firebaseData.createdAt) || new Date().toISOString(),
          updated_at: parseDate(firebaseData.updatedAt) || new Date().toISOString(),
          last_sold_at: parseDate(firebaseData.lastSoldAt) || null,
        };

        batch.push(supabaseProduct);

        // Insert batch when full
        if (batch.length >= batchSize) {
          const { error } = await supabase.from('products').insert(batch);

          if (error) {
            log(`Batch insert error: ${error.message}`, 'error');
            stats.products.errors += batch.length;
          } else {
            stats.products.migrated += batch.length;
            log(`Migrated ${batch.length} products`, 'success');
          }

          batch = [];
        }
      } catch (error) {
        stats.products.errors++;
        log(`Error processing product ${doc.id}: ${error.message}`, 'error');
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase.from('products').insert(batch);

      if (error) {
        log(`Final batch insert error: ${error.message}`, 'error');
        stats.products.errors += batch.length;
      } else {
        stats.products.migrated += batch.length;
        log(`Migrated final ${batch.length} products`, 'success');
      }
    }

    log(`Products migration complete: ${stats.products.migrated}/${stats.products.total} successful`, 'success');
  } catch (error) {
    log(`Products migration failed: ${error.message}`, 'error');
    throw error;
  }
}

async function migrateSales() {
  log('Starting sales migration...', 'info');

  try {
    const salesSnapshot = await getDocs(collection(firestore, 'sales'));
    stats.sales.total = salesSnapshot.size;

    log(`Found ${stats.sales.total} sales to migrate`, 'info');

    const batchSize = 100;
    let batch = [];

    for (const doc of salesSnapshot.docs) {
      try {
        const firebaseData = doc.data();
        const firebaseUserId = firebaseData.userId || firebaseData.uid;
        const supabaseUserId = userIdMap.get(firebaseUserId);

        if (!supabaseUserId) {
          log(`Skipping sale ${doc.id}: User ${firebaseUserId} not found`, 'warning');
          stats.sales.errors++;
          continue;
        }

        const saleDate = parseDate(firebaseData.saleDate || firebaseData.date);

        const supabaseSale = {
          user_id: supabaseUserId,
          product_id: null, // Will need to map product IDs if needed
          product_name: firebaseData.productName || firebaseData.name || 'Unknown Product',
          quantity: parseInt(firebaseData.quantity || 1),
          unit_price: parsePrice(firebaseData.unitPrice || firebaseData.price || 0),
          total_amount: parsePrice(firebaseData.totalAmount || firebaseData.total || 0),
          discount_amount: parsePrice(firebaseData.discountAmount || firebaseData.discount || 0),
          final_amount: parsePrice(firebaseData.finalAmount || firebaseData.total || 0),

          // Customer
          customer_name: firebaseData.customerName || null,
          customer_phone: firebaseData.customerPhone || null,
          customer_email: firebaseData.customerEmail || null,

          // Payment
          payment_method: firebaseData.paymentMethod || 'cash',
          payment_status: firebaseData.paymentStatus || 'paid',
          amount_paid: parsePrice(firebaseData.amountPaid || firebaseData.finalAmount || 0),
          amount_due: parsePrice(firebaseData.amountDue || 0),

          // Dates
          sale_date: saleDate ? new Date(saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          sale_time: saleDate ? new Date(saleDate).toISOString().split('T')[1].split('.')[0] : new Date().toISOString().split('T')[1].split('.')[0],
          created_at: parseDate(firebaseData.createdAt) || new Date().toISOString(),

          notes: firebaseData.notes || null,
        };

        batch.push(supabaseSale);

        if (batch.length >= batchSize) {
          const { error } = await supabase.from('sales').insert(batch);

          if (error) {
            log(`Batch insert error: ${error.message}`, 'error');
            stats.sales.errors += batch.length;
          } else {
            stats.sales.migrated += batch.length;
            log(`Migrated ${batch.length} sales`, 'success');
          }

          batch = [];
        }
      } catch (error) {
        stats.sales.errors++;
        log(`Error processing sale ${doc.id}: ${error.message}`, 'error');
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase.from('sales').insert(batch);

      if (error) {
        log(`Final batch insert error: ${error.message}`, 'error');
        stats.sales.errors += batch.length;
      } else {
        stats.sales.migrated += batch.length;
        log(`Migrated final ${batch.length} sales`, 'success');
      }
    }

    log(`Sales migration complete: ${stats.sales.migrated}/${stats.sales.total} successful`, 'success');
  } catch (error) {
    log(`Sales migration failed: ${error.message}`, 'error');
    throw error;
  }
}

async function migrateExpenses() {
  log('Starting expenses migration...', 'info');

  try {
    const expensesSnapshot = await getDocs(collection(firestore, 'expenses'));
    stats.expenses.total = expensesSnapshot.size;

    log(`Found ${stats.expenses.total} expenses to migrate`, 'info');

    const batchSize = 100;
    let batch = [];

    for (const doc of expensesSnapshot.docs) {
      try {
        const firebaseData = doc.data();
        const firebaseUserId = firebaseData.userId || firebaseData.uid;
        const supabaseUserId = userIdMap.get(firebaseUserId);

        if (!supabaseUserId) {
          log(`Skipping expense ${doc.id}: User ${firebaseUserId} not found`, 'warning');
          stats.expenses.errors++;
          continue;
        }

        const expenseDate = parseDate(firebaseData.expenseDate || firebaseData.date);

        const supabaseExpense = {
          user_id: supabaseUserId,
          category: firebaseData.category || 'Other',
          description: firebaseData.description || null,
          amount: parsePrice(firebaseData.amount || 0),
          expense_date: expenseDate ? new Date(expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          created_at: parseDate(firebaseData.createdAt) || new Date().toISOString(),
          updated_at: parseDate(firebaseData.updatedAt) || new Date().toISOString(),
        };

        batch.push(supabaseExpense);

        if (batch.length >= batchSize) {
          const { error } = await supabase.from('expenses').insert(batch);

          if (error) {
            log(`Batch insert error: ${error.message}`, 'error');
            stats.expenses.errors += batch.length;
          } else {
            stats.expenses.migrated += batch.length;
            log(`Migrated ${batch.length} expenses`, 'success');
          }

          batch = [];
        }
      } catch (error) {
        stats.expenses.errors++;
        log(`Error processing expense ${doc.id}: ${error.message}`, 'error');
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase.from('expenses').insert(batch);

      if (error) {
        log(`Final batch insert error: ${error.message}`, 'error');
        stats.expenses.errors += batch.length;
      } else {
        stats.expenses.migrated += batch.length;
        log(`Migrated final ${batch.length} expenses`, 'success');
      }
    }

    log(`Expenses migration complete: ${stats.expenses.migrated}/${stats.expenses.total} successful`, 'success');
  } catch (error) {
    log(`Expenses migration failed: ${error.message}`, 'error');
    throw error;
  }
}

// =====================================================
// MAIN MIGRATION FUNCTION
// =====================================================

async function migrate() {
  const startTime = Date.now();

  log('========================================', 'info');
  log('FIREBASE TO SUPABASE MIGRATION', 'info');
  log('========================================', 'info');

  try {
    // Migrate in order (users first, then dependent tables)
    await migrateUsers();
    await migrateStores();
    await migrateProducts();
    await migrateSales();
    await migrateExpenses();

    // Refresh materialized view
    log('Refreshing materialized views...', 'info');
    await supabase.rpc('refresh_daily_sales_summary');
    log('Materialized views refreshed', 'success');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('========================================', 'info');
    log('MIGRATION COMPLETE!', 'success');
    log('========================================', 'info');
    log(`Total time: ${duration}s`, 'info');
    log('', 'info');
    log('Summary:', 'info');
    log(`Users:    ${stats.users.migrated}/${stats.users.total} (${stats.users.errors} errors)`, 'info');
    log(`Stores:   ${stats.stores.migrated}/${stats.stores.total} (${stats.stores.errors} errors)`, 'info');
    log(`Products: ${stats.products.migrated}/${stats.products.total} (${stats.products.errors} errors)`, 'info');
    log(`Sales:    ${stats.sales.migrated}/${stats.sales.total} (${stats.sales.errors} errors)`, 'info');
    log(`Expenses: ${stats.expenses.migrated}/${stats.expenses.total} (${stats.expenses.errors} errors)`, 'info');
    log('========================================', 'info');

    const totalMigrated = stats.users.migrated + stats.stores.migrated + stats.products.migrated + stats.sales.migrated + stats.expenses.migrated;
    const totalRecords = stats.users.total + stats.stores.total + stats.products.total + stats.sales.total + stats.expenses.total;
    const totalErrors = stats.users.errors + stats.stores.errors + stats.products.errors + stats.sales.errors + stats.expenses.errors;

    log(`GRAND TOTAL: ${totalMigrated}/${totalRecords} records migrated (${totalErrors} errors)`, 'success');

    process.exit(0);
  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrate();
