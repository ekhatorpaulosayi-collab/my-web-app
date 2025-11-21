/**
 * Staff Context
 * Manages staff authentication state and role-based permissions
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { StaffMember } from '../services/staffService';

interface StaffContextType {
  // Current staff member (null if owner is logged in as owner)
  currentStaff: StaffMember | null;

  // Check if currently in staff mode
  isStaffMode: boolean;

  // Set staff mode (after PIN authentication)
  setStaffMode: (staff: StaffMember | null) => void;

  // Logout from staff mode (back to owner mode)
  exitStaffMode: () => void;

  // Permission checks
  canAddProducts: () => boolean;
  canEditProducts: () => boolean;
  canDeleteProducts: () => boolean;
  canRecordSales: () => boolean;
  canViewReports: () => boolean;
  canManageStaff: () => boolean;
  canAccessSettings: () => boolean;
  canManageCustomers: () => boolean;

  // Role getter
  currentRole: 'owner' | 'manager' | 'cashier';
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);

  // Persist staff session in localStorage
  useEffect(() => {
    const savedStaff = localStorage.getItem('staff_session');
    if (savedStaff) {
      try {
        const staff = JSON.parse(savedStaff);
        setCurrentStaff(staff);
        console.log('[StaffContext] ✅ Staff session restored from localStorage:', staff.name, '-', staff.role);
      } catch (e) {
        console.error('[StaffContext] Error loading staff session:', e);
        localStorage.removeItem('staff_session');
      }
    }
  }, []);

  // Clear staff session when owner logs out
  useEffect(() => {
    // Only clear if auth is done loading AND user is null (means logged out)
    if (!loading && !currentUser) {
      setCurrentStaff(null);
      localStorage.removeItem('staff_session');
      console.log('[StaffContext] Staff session cleared - owner logged out');
    }
  }, [currentUser, loading]);

  const setStaffMode = (staff: StaffMember | null) => {
    setCurrentStaff(staff);
    if (staff) {
      localStorage.setItem('staff_session', JSON.stringify(staff));
      console.log('[StaffContext] Staff mode activated:', staff.name, '-', staff.role);
    } else {
      localStorage.removeItem('staff_session');
      console.log('[StaffContext] Staff mode deactivated');
    }
  };

  const exitStaffMode = () => {
    setStaffMode(null);
  };

  const isStaffMode = currentStaff !== null;

  // Current role: owner if not in staff mode, otherwise staff role
  const currentRole: 'owner' | 'manager' | 'cashier' = isStaffMode
    ? currentStaff.role
    : 'owner';

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  /**
   * Can add new products
   * Owner: YES | Manager: YES | Cashier: NO
   */
  const canAddProducts = (): boolean => {
    if (!isStaffMode) return true; // Owner has full access
    return currentStaff.role === 'manager';
  };

  /**
   * Can edit existing products (prices, quantities, names)
   * Owner: YES | Manager: NO | Cashier: NO
   */
  const canEditProducts = (): boolean => {
    if (!isStaffMode) return true; // Only owner can edit
    return false; // Staff cannot edit products
  };

  /**
   * Can delete products
   * Owner: YES | Manager: NO | Cashier: NO
   */
  const canDeleteProducts = (): boolean => {
    if (!isStaffMode) return true; // Only owner can delete
    return false; // Staff cannot delete products
  };

  /**
   * Can record sales
   * Owner: YES | Manager: YES | Cashier: YES
   */
  const canRecordSales = (): boolean => {
    return true; // Everyone can record sales
  };

  /**
   * Can view financial reports
   * Owner: YES | Manager: YES | Cashier: NO
   */
  const canViewReports = (): boolean => {
    if (!isStaffMode) return true; // Owner has full access
    return currentStaff.role === 'manager';
  };

  /**
   * Can manage staff accounts
   * Owner: YES | Manager: NO | Cashier: NO
   */
  const canManageStaff = (): boolean => {
    if (!isStaffMode) return true; // Only owner can manage staff
    return false;
  };

  /**
   * Can access settings
   * Owner: YES | Manager: NO | Cashier: NO
   */
  const canAccessSettings = (): boolean => {
    if (!isStaffMode) return true; // Only owner can access settings
    return false;
  };

  /**
   * Can manage customer debts/credits
   * Owner: YES | Manager: YES | Cashier: NO
   */
  const canManageCustomers = (): boolean => {
    if (!isStaffMode) return true; // Owner has full access
    return currentStaff.role === 'manager';
  };

  const value: StaffContextType = {
    currentStaff,
    isStaffMode,
    setStaffMode,
    exitStaffMode,
    canAddProducts,
    canEditProducts,
    canDeleteProducts,
    canRecordSales,
    canViewReports,
    canManageStaff,
    canAccessSettings,
    canManageCustomers,
    currentRole
  };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

/**
 * Hook to use staff context
 */
export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
}

/**
 * HOC to protect routes/components based on permissions
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissionCheck: (staff: StaffContextType) => boolean,
  fallbackMessage: string = 'You do not have permission to access this feature.'
) {
  return function PermissionWrappedComponent(props: P) {
    const staffContext = useStaff();
    const hasPermission = permissionCheck(staffContext);

    if (!hasPermission) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>🔒</div>
          <h3 style={{ marginBottom: '8px', color: '#1f2937' }}>Access Restricted</h3>
          <p>{fallbackMessage}</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
