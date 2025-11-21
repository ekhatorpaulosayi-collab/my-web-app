import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, withTimeout } from './firebase';

/**
 * Sign up a new user with email and password
 * Creates user profile in Firestore
 */
export async function signUp(email, password, storeName) {
  try {
    console.debug('[Auth] Signing up user:', email);

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.debug('[Auth] User created:', user.uid);

    // Create user profile in Firestore
    const userProfile = {
      email: user.email,
      storeName: storeName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    console.debug('[Auth] User profile created in Firestore');

    return { user, profile: userProfile };
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    throw formatAuthError(error);
  }
}

/**
 * Sign in existing user with email and password
 */
export async function signIn(email, password) {
  try {
    console.debug('[Auth] Signing in user:', email);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.debug('[Auth] User signed in:', user.uid);

    // Fetch user profile from Firestore with timeout
    const userDoc = await withTimeout(getDoc(doc(db, 'users', user.uid)), 3000);

    if (!userDoc || !userDoc.exists()) {
      console.warn('[Auth] User profile not found in Firestore');
      return { user, profile: null };
    }

    const profile = userDoc.data();
    console.debug('[Auth] User profile loaded');

    return { user, profile };
  } catch (error) {
    console.error('[Auth] Sign in error:', error);
    throw formatAuthError(error);
  }
}

/**
 * Sign out current user
 */
export async function logOut() {
  try {
    console.debug('[Auth] Signing out user');
    await signOut(auth);
    console.debug('[Auth] User signed out');
  } catch (error) {
    console.error('[Auth] Sign out error:', error);
    throw formatAuthError(error);
  }
}

/**
 * Get current user profile from Firestore
 */
export async function getUserProfile(uid) {
  try {
    // Add 3-second timeout to prevent blocking app load
    const userDoc = await withTimeout(getDoc(doc(db, 'users', uid)), 3000);

    if (!userDoc || !userDoc.exists()) {
      return null;
    }

    return userDoc.data();
  } catch (error) {
    console.error('[Auth] Error fetching user profile:', error);
    // Return null instead of throwing - profile is not critical
    return null;
  }
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Format Firebase auth errors into user-friendly messages
 */
function formatAuthError(error) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered. Please log in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password sign in is not enabled.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.'
  };

  const message = errorMessages[error.code] || error.message || 'An error occurred. Please try again.';

  return new Error(message);
}
