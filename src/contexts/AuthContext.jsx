import { createContext, useContext, useState, useEffect } from 'react';
// MIGRATION: Using Supabase auth instead of Firebase
import { subscribeToAuthChanges, getUserProfile } from '../lib/authService-supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // SUPABASE: Session persistence is handled automatically
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.debug('[AuthContext] Initializing Supabase auth listener');

    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges(async (user, event) => {
      console.debug('[AuthContext] Auth state changed:', {
        event,
        user: user?.uid || 'signed out',
        timestamp: new Date().toISOString()
      });

      if (user) {
        // User is signed in or session refreshed
        setCurrentUser(user);

        // Fetch user profile (only if not already loaded or if user changed)
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
          console.debug('[AuthContext] User profile loaded:', profile?.storeName);
        } catch (error) {
          console.error('[AuthContext] Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        // User is signed out
        console.debug('[AuthContext] User signed out, clearing state');
        setCurrentUser(null);
        setUserProfile(null);
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
