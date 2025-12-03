/**
 * Supabase Authentication Service
 * Drop-in replacement for Firebase auth with same API
 */

import { supabase } from './supabase';
import { logError } from '../utils/errorMonitoring';

/**
 * Sign up a new user with email and password
 * Creates user profile in stores table
 */
export async function signUp(email, password, storeName) {
  try {
    console.debug('[Auth] Signing up user:', email);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation can be disabled in Supabase dashboard for development
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('[Auth] Signup error:', error);
      throw formatAuthError(error);
    }

    const user = data.user;
    if (!user) {
      throw new Error('User creation failed');
    }

    console.debug('[Auth] User created:', user.id);

    // Check if email confirmation is required
    const needsEmailConfirmation = !user.email_confirmed_at && user.confirmation_sent_at;

    if (needsEmailConfirmation) {
      console.debug('[Auth] Email confirmation required - check your inbox');
    }

    // Create user record in public.users table (required for foreign key relationship)
    // Only if email confirmed or confirmation disabled
    let storeData = null;
    if (user.email_confirmed_at || !needsEmailConfirmation) {
      try {
        // Step 1: Create user record in public.users table
        const userRecord = {
          id: user.id, // Use same ID as auth.users
          email: user.email,
          phone_number: user.phone || user.email, // Use email as fallback if phone not provided
          business_name: storeName,
          device_type: 'web',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: userError } = await supabase
          .from('users')
          .insert([userRecord]);

        if (userError) {
          // Check if user already exists (e.g., email confirmation flow)
          if (userError.code === '23505') { // Duplicate key error
            console.debug('[Auth] User record already exists, continuing...');
          } else {
            console.error('[Auth] User record creation error:', userError);
            throw userError;
          }
        } else {
          console.debug('[Auth] User record created in public.users');
        }

        // Step 2: Create store profile in stores table
        const storeProfile = {
          user_id: user.id,
          business_name: storeName,
          store_slug: generateSlug(storeName, user.id),
          whatsapp_number: user.phone || user.email || 'pending', // Required field
          is_public: false, // Default to private
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error: storeError } = await supabase
          .from('stores')
          .insert([storeProfile])
          .select()
          .single();

        if (storeError) {
          console.error('[Auth] Store profile creation error:', storeError);
          // Auth user created but profile failed - this is a warning, not fatal
          console.warn('[Auth] User created but store profile failed:', storeError.message);
        } else {
          console.debug('[Auth] Store profile created');
          storeData = data;
        }
      } catch (error) {
        console.error('[Auth] Profile setup error:', error);
        // Continue anyway - user can complete profile later
      }
    }

    // Return user in Firebase-compatible format
    return {
      user: {
        uid: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
      profile: storeData ? {
        storeName: storeData.business_name,
        email: user.email,
      } : null,
      needsEmailConfirmation
    };
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Sign in error:', error);

      // Log authentication error for monitoring
      logError(error, 'auth', 'high', {
        action: 'signIn',
        email,
        errorCode: error.code,
        errorMessage: error.message,
      });

      throw formatAuthError(error);
    }

    const user = data.user;
    if (!user) {
      const authError = new Error('Sign in failed - no user returned');
      logError(authError, 'auth', 'critical', {
        action: 'signIn',
        email,
        reason: 'no_user_returned',
      });
      throw authError;
    }

    console.debug('[Auth] User signed in:', user.id);

    // Fetch store profile
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (storeError) {
      console.warn('[Auth] Store profile not found:', storeError);

      // Log missing store profile (medium severity - user can continue)
      logError(storeError, 'api', 'medium', {
        action: 'getUserProfile',
        userId: user.id,
        errorCode: storeError.code,
        errorMessage: storeError.message,
      });
    }

    const profile = storeData ? {
      storeName: storeData.business_name,
      email: user.email,
    } : null;

    console.debug('[Auth] User profile loaded');

    // Return user in Firebase-compatible format
    return {
      user: {
        uid: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
      profile
    };
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Sign out error:', error);
      throw formatAuthError(error);
    }

    console.debug('[Auth] User signed out');
  } catch (error) {
    console.error('[Auth] Sign out error:', error);
    throw formatAuthError(error);
  }
}

/**
 * Get current user profile from stores table
 */
export async function getUserProfile(uid) {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (error) {
      console.debug('[Auth] No store profile found for user:', uid);
      return null;
    }

    return {
      storeName: data.business_name,
      slug: data.store_slug,
      isPublic: data.is_public,
    };
  } catch (error) {
    console.error('[Auth] Error fetching user profile:', error);
    return null;
  }
}

/**
 * Subscribe to auth state changes
 * Returns a Firebase-compatible unsubscribe function
 */
export function subscribeToAuthChanges(callback) {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user ? mapSupabaseUserToFirebase(session.user) : null;
    console.debug('[Auth] Initial session:', session ? 'Active' : 'None');
    callback(user, 'INITIAL_SESSION');
  });

  // Listen for changes (including TOKEN_REFRESHED events)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.debug('[Auth] Auth event:', event, session ? 'Session active' : 'No session');
    const user = session?.user ? mapSupabaseUserToFirebase(session.user) : null;

    // Always notify about state changes, including token refreshes
    callback(user, event);
  });

  // Return unsubscribe function (Firebase-compatible)
  return () => subscription.unsubscribe();
}

/**
 * Map Supabase user to Firebase-compatible format
 */
function mapSupabaseUserToFirebase(supabaseUser) {
  if (!supabaseUser) return null;

  return {
    uid: supabaseUser.id,
    email: supabaseUser.email,
    emailVerified: !!supabaseUser.email_confirmed_at,
    metadata: {
      creationTime: supabaseUser.created_at,
    },
  };
}

/**
 * Generate a unique store slug from business name and user ID
 */
function generateSlug(businessName, userId) {
  const baseSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 40); // Limit length

  // Add shortened user ID for uniqueness
  const userIdShort = userId.substring(0, 8);
  return `${baseSlug}-${userIdShort}`;
}

/**
 * Format Supabase auth errors into user-friendly messages
 */
function formatAuthError(error) {
  const errorMessages = {
    'User already registered': 'This email is already registered. Please log in instead.',
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please confirm your email address before signing in.',
    'Invalid email': 'Please enter a valid email address.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'User not found': 'No account found with this email.',
    'Network request failed': 'Network error. Please check your connection.',
  };

  // Check if error message contains any of our known errors
  const message = Object.keys(errorMessages).find(key =>
    error.message?.includes(key)
  );

  const friendlyMessage = message ? errorMessages[message] : (error.message || 'An error occurred. Please try again.');

  return new Error(friendlyMessage);
}
