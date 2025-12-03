/**
 * App Context Hook
 * Collects current app state for AI personalization
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppContext } from '../types/documentation';

/**
 * Custom hook to gather app context for AI chat
 */
export function useAppContext(): AppContext {
  const location = useLocation();
  const { user } = useAuth();
  const [context, setContext] = useState<AppContext>({
    currentPage: 'dashboard',
    hasProducts: false,
    productCount: 0,
    hasSales: false,
    salesCount: 0,
    hasStaff: false,
    staffCount: 0,
    userPlan: 'FREE',
    accountAge: 0,
    isNewUser: true,
    hasCompletedOnboarding: false,
  });

  useEffect(() => {
    if (!user) return;

    // Determine current page from route
    const getCurrentPage = (): string => {
      const path = location.pathname;
      if (path === '/' || path === '/dashboard') return 'dashboard';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/online-store')) return 'online-store-setup';
      if (path.includes('/products')) return 'products';
      if (path.includes('/sales')) return 'sales';
      if (path.includes('/staff')) return 'staff';
      if (path.includes('/reports')) return 'reports';
      return 'dashboard';
    };

    // Gather app state asynchronously
    const gatherContext = async () => {
      try {
        // Get products from IndexedDB or state
        const products = await getProductsFromStorage();
        const productCount = products?.length || 0;
        const hasProducts = productCount > 0;

        // Get sales from IndexedDB or state
        const sales = await getSalesFromStorage();
        const salesCount = sales?.length || 0;
        const hasSales = salesCount > 0;

        // Get staff from localStorage or state
        const staff = await getStaffFromStorage();
        const staffCount = staff?.length || 0;
        const hasStaff = staffCount > 0;

        // Get user plan from localStorage or user metadata
        const userPlan = getUserPlan();

        // Calculate account age
        const accountAge = calculateAccountAge(user);

        // Check if new user (< 7 days)
        const isNewUser = accountAge < 7;

        // Check onboarding completion
        const hasCompletedOnboarding = checkOnboardingCompletion(hasProducts, hasSales);

        setContext({
          currentPage: getCurrentPage(),
          hasProducts,
          productCount,
          hasSales,
          salesCount,
          hasStaff,
          staffCount,
          userPlan,
          accountAge,
          isNewUser,
          hasCompletedOnboarding,
        });
      } catch (error) {
        console.error('[useAppContext] Error gathering context:', error);
      }
    };

    gatherContext();

    // Re-gather context when route changes
  }, [location.pathname, user]);

  return context;
}

/**
 * Helper: Get products from IndexedDB
 */
async function getProductsFromStorage(): Promise<any[]> {
  try {
    // Try to get from IndexedDB
    const { getItems } = await import('../db/idb');
    return await getItems();
  } catch (error) {
    console.error('[useAppContext] Error getting products:', error);
    return [];
  }
}

/**
 * Helper: Get sales from IndexedDB
 */
async function getSalesFromStorage(): Promise<any[]> {
  try {
    const { getSales } = await import('../db/idb');
    return await getSales();
  } catch (error) {
    console.error('[useAppContext] Error getting sales:', error);
    return [];
  }
}

/**
 * Helper: Get staff from localStorage
 */
async function getStaffFromStorage(): Promise<any[]> {
  try {
    const staffData = localStorage.getItem('staff_members');
    return staffData ? JSON.parse(staffData) : [];
  } catch (error) {
    console.error('[useAppContext] Error getting staff:', error);
    return [];
  }
}

/**
 * Helper: Get user plan
 */
function getUserPlan(): 'FREE' | 'STARTER' | 'BUSINESS' {
  try {
    const plan = localStorage.getItem('user_plan');
    if (plan === 'STARTER' || plan === 'BUSINESS') return plan;
    return 'FREE';
  } catch (error) {
    return 'FREE';
  }
}

/**
 * Helper: Calculate account age in days
 */
function calculateAccountAge(user: any): number {
  try {
    if (!user?.metadata?.creationTime) return 0;

    const creationDate = new Date(user.metadata.creationTime);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - creationDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    return 0;
  }
}

/**
 * Helper: Check if onboarding is complete
 */
function checkOnboardingCompletion(hasProducts: boolean, hasSales: boolean): boolean {
  // Consider onboarding complete if user has added products AND recorded at least one sale
  return hasProducts && hasSales;
}
