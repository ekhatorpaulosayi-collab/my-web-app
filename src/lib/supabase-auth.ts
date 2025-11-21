/**
 * Supabase Authentication Utilities
 * Handles user registration, login, logout, and session management
 */

import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string | undefined;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: AuthError | null;
}

/**
 * Convert Supabase User to our AuthUser format
 */
function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    emailVerified: !!user.email_confirmed_at,
    createdAt: user.created_at,
  };
}

/**
 * Register a new user with email and password
 */
export async function registerUser(email: string, password: string): Promise<AuthResult> {
  try {
    console.log('[Auth] Registering user:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation is optional for now (can enable later)
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('[Auth] Registration error:', error);
      return { user: null, error };
    }

    console.log('[Auth] Registration successful:', data.user?.id);
    return {
      user: mapSupabaseUser(data.user),
      error: null
    };
  } catch (err) {
    console.error('[Auth] Registration exception:', err);
    return {
      user: null,
      error: err as AuthError
    };
  }
}

/**
 * Sign in with email and password
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    console.log('[Auth] Logging in user:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Login error:', error);
      return { user: null, error };
    }

    console.log('[Auth] Login successful:', data.user?.id);
    return {
      user: mapSupabaseUser(data.user),
      error: null
    };
  } catch (err) {
    console.error('[Auth] Login exception:', err);
    return {
      user: null,
      error: err as AuthError
    };
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<{ error: AuthError | null }> {
  try {
    console.log('[Auth] Logging out user');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Logout error:', error);
      return { error };
    }

    console.log('[Auth] Logout successful');
    return { error: null };
  } catch (err) {
    console.error('[Auth] Logout exception:', err);
    return { error: err as AuthError };
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Get user error:', error);
      return null;
    }

    return mapSupabaseUser(user);
  } catch (err) {
    console.error('[Auth] Get user exception:', err);
    return null;
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[Auth] Get session error:', error);
      return null;
    }

    return session;
  } catch (err) {
    console.error('[Auth] Get session exception:', err);
    return null;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChanged(
    (_event, session) => {
      const user = session?.user ? mapSupabaseUser(session.user) : null;
      callback(user);
    }
  );

  return subscription;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    console.log('[Auth] Sending password reset email:', email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('[Auth] Password reset error:', error);
      return { error };
    }

    console.log('[Auth] Password reset email sent');
    return { error: null };
  } catch (err) {
    console.error('[Auth] Password reset exception:', err);
    return { error: err as AuthError };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  try {
    console.log('[Auth] Updating password');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('[Auth] Password update error:', error);
      return { error };
    }

    console.log('[Auth] Password updated successfully');
    return { error: null };
  } catch (err) {
    console.error('[Auth] Password update exception:', err);
    return { error: err as AuthError };
  }
}

/**
 * Update user email
 */
export async function updateEmail(newEmail: string): Promise<{ error: AuthError | null }> {
  try {
    console.log('[Auth] Updating email');

    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      console.error('[Auth] Email update error:', error);
      return { error };
    }

    console.log('[Auth] Email updated successfully');
    return { error: null };
  } catch (err) {
    console.error('[Auth] Email update exception:', err);
    return { error: err as AuthError };
  }
}

// Export for debugging
if (import.meta.env.DEV) {
  (window as any).__supabaseAuth = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getSession,
  };
  console.log('[Auth] Debug utilities available at window.__supabaseAuth');
}
