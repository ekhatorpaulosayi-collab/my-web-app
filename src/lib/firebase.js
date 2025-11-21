import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence, enableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[Firebase] Missing configuration! Check environment variables.');
  console.error('[Firebase] Config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasStorageBucket: !!firebaseConfig.storageBucket,
    hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId,
  });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log('[Firebase] App initialized successfully');

// Initialize services
export const auth = getAuth(app);

// In production, force long polling for maximum compatibility
// This bypasses WebSocket connection issues that can cause "offline" detection
export const db = !import.meta.env.DEV
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
    })
  : getFirestore(app);

if (!import.meta.env.DEV) {
  console.log('[Firebase] Production: Using forced long polling');
}

export const storage = getStorage(app);

console.log('[Firebase] All services initialized');

// Only enable persistence in development (not production)
if (import.meta.env.DEV) {
  enableIndexedDbPersistence(db, {
    forceOwnership: false // Allow multiple tabs
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Persistence not available in this browser');
    } else {
      console.warn('[Firebase] Persistence error:', err);
    }
  });
}

// Force enable network immediately to prevent "offline" detection
enableNetwork(db)
  .then(() => {
    console.log('[Firebase] Network enabled successfully');
    console.log('[Firebase] Firestore instance:', db.type, db.app.options.projectId);

    // Test connection after network is enabled (production only)
    if (!import.meta.env.DEV) {
      console.log('[Firebase] Waiting 2 seconds before testing connection...');
      setTimeout(() => {
        import('firebase/firestore').then(({ getDoc, doc }) => {
          console.log('[Firebase] Starting connection test...');
          getDoc(doc(db, '_test_connection', 'test'))
            .then(() => {
              console.log('[Firebase] ✅ Firestore connection test PASSED');
            })
            .catch((err) => {
              console.error('[Firebase] ❌ Firestore connection test FAILED');
              console.error('[Firebase] Error Code:', err.code);
              console.error('[Firebase] Error Message:', err.message);
              console.error('[Firebase] Error Name:', err.name);
              console.error('[Firebase] Error toString:', err.toString());
              console.error('[Firebase] Full error object:', err);
              console.error('[Firebase] This error suggests Firestore cannot connect. Possible causes:');
              console.error('[Firebase] 1. Firestore database not created in Firebase Console');
              console.error('[Firebase] 2. Network/firewall blocking firestore.googleapis.com');
              console.error('[Firebase] 3. Browser blocking third-party requests');
              console.error('[Firebase] 4. Vercel edge network cannot reach Firestore servers');
            });
        });
      }, 2000);
    }
  })
  .catch((err) => {
    console.error('[Firebase] Could not enable network:', err);
    console.error('[Firebase] Error details:', {
      code: err.code,
      message: err.message,
      name: err.name
    });
  });

// Log Firebase initialization (development only)
if (import.meta.env.DEV) {
  console.log('[Firebase] Initialized with project:', firebaseConfig.projectId);
}

/**
 * Wrapper for Firebase operations with timeout
 * Prevents long waits when Firebase detects as offline
 */
export const withTimeout = (promise, timeoutMs = 5000, fallback = null) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timeout')), timeoutMs)
    )
  ]).catch((err) => {
    if (err.message === 'Firebase operation timeout') {
      console.warn('[Firebase] Operation timed out, using fallback');
      return fallback;
    }
    throw err;
  });
};

export default app;
