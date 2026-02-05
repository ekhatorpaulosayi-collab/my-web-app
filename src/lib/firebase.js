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
if (import.meta.env.DEV) {
  console.log('[Firebase] App initialized successfully');
}

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

export const storage = getStorage(app);

if (import.meta.env.DEV) {
  console.log('[Firebase] All services initialized');
}

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
    if (import.meta.env.DEV) {
      console.log('[Firebase] Network enabled successfully');
      console.log('[Firebase] Firestore instance:', db.type, db.app.options.projectId);
    }

    // Connection test disabled in production to reduce console noise
    // Firebase will connect automatically when needed
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
