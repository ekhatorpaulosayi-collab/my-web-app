/**
 * Staff Context
 * Manages staff authentication state and role-based permissions
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { StaffMember } from '../services/staffService';
import { supabase } from '../lib/supabase';
import {
  canAccessSettings as roleCanAccessSettings,
  canAddProducts as roleCanAddProducts,
  canDeleteProducts as roleCanDeleteProducts,
  canEditProducts as roleCanEditProducts,
  canManageCustomers as roleCanManageCustomers,
  canManageStaff as roleCanManageStaff,
  canRecordSales as roleCanRecordSales,
  canViewReports as roleCanViewReports,
  normalizeStaffRole,
} from '../utils/staffPermissions';

const STAFF_SESSION_KEY = 'staff_session';

interface StaffContextType {
  // Current staff member (null if owner is logged in as owner)
  currentStaff: StaffMember | null;

  // Check if currently in staff mode
  isStaffMode: boolean;

  // Set staff mode (after PIN authentication)
  setStaffMode: (staff: StaffMember | null) => void;

  // Logout from staff mode (back to owner mode)
  /** H1: leaving staff mode requires the OWNER's password. */
  exitStaffMode: (ownerPassword: string) => Promise<{ ok: boolean; error?: string }>;

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

  /** False until the server session (or the pre-migration fallback) has loaded. */
  roleReady: boolean;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [roleReady, setRoleReady] = useState(false);

  // The role comes from get_acting_staff (migration 09), keyed to this JWT
  // session. Clearing localStorage does not clear the server row, so the next
  // load puts the cashier back. Until that function exists, fall back to the
  // saved session so the app still works before the SQL is applied.
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      setCurrentStaff(null);
      setRoleReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_acting_staff');
      if (cancelled) return;
      const missing = error && (
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        /does not exist|could not find the function/i.test(error.message || '')
      );
      if (!error && data) {
        if (data.role === 'manager' || data.role === 'cashier' || data.role === 'expired') {
          const staff = {
            id: data.staff_id,
            store_owner_uid: currentUser.uid,
            name: data.name || 'Staff',
            role: data.role === 'manager' ? 'manager' : 'cashier',
            is_active: true,
            created_at: '',
            updated_at: '',
          } as StaffMember;
          setCurrentStaff(staff);
          const { pin: _pin, ...safeStaff } = staff as any;
          localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({ ownerUid: currentUser.uid, staff: safeStaff }));
        } else {
          setCurrentStaff(null);
          localStorage.removeItem(STAFF_SESSION_KEY);
        }
        setRoleReady(true);
        return;
      }
      if (!missing && error) {
        console.warn('[StaffContext] get_acting_staff failed', error.message);
      }
      try {
        const raw = localStorage.getItem(STAFF_SESSION_KEY);
        if (!raw) {
          setCurrentStaff(null);
        } else {
          const saved = JSON.parse(raw);
          if (saved?.ownerUid === currentUser.uid && saved?.staff?.id) {
            setCurrentStaff(saved.staff);
          } else {
            localStorage.removeItem(STAFF_SESSION_KEY);
            setCurrentStaff(null);
          }
        }
      } catch {
        localStorage.removeItem(STAFF_SESSION_KEY);
        setCurrentStaff(null);
      }
      setRoleReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, loading]);

  // Clear staff mode when owner logs out
  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading

    // If user logged out, clear staff mode
    if (!currentUser) {
      setCurrentStaff(null);
      localStorage.removeItem(STAFF_SESSION_KEY);
      console.log('[StaffContext] Staff mode cleared - owner logged out');
    }
  }, [currentUser, loading]);

  const setStaffMode = (staff: StaffMember | null) => {
    setCurrentStaff(staff);
    if (staff) {
      // Persist (without the PIN hash) so a refresh keeps staff mode on
      const { pin: _pin, ...safeStaff } = staff as any;
      localStorage.setItem(
        STAFF_SESSION_KEY,
        JSON.stringify({ ownerUid: currentUser?.uid, staff: safeStaff })
      );
      console.log('[StaffContext] Staff mode activated:', staff.name, '-', staff.role);
    } else {
      localStorage.removeItem(STAFF_SESSION_KEY);
      console.log('[StaffContext] Staff mode deactivated');
    }
  };

  const exitStaffMode = async (ownerPassword: string) => {
    const email = currentUser?.email;
    if (!email) return { ok: false, error: 'Owner account not found' };
    if (!ownerPassword) return { ok: false, error: 'Owner password is required' };
    const { data, error } = await supabase.rpc('end_staff_session', { p_password: ownerPassword });
    const missing = error && (
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      /does not exist|could not find the function/i.test(error.message || '')
    );
    if (!error && data) {
      setStaffMode(null);
      return { ok: true };
    }
    if (error && !missing) {
      return { ok: false, error: 'Wrong owner password' };
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: ownerPassword });
    if (signInError) return { ok: false, error: 'Wrong owner password' };
    setStaffMode(null);
    return { ok: true };
  };

  const isStaffMode = currentStaff !== null;

  // Current role: owner if not in staff mode, otherwise staff role
  const currentRole: 'owner' | 'manager' | 'cashier' = isStaffMode
    ? currentStaff.role
    : 'owner';

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  // Cashiers and managers cannot edit or delete products. Managers may add.
  // Everyone, including cashiers, can record sales.
  const role = normalizeStaffRole(currentRole, isStaffMode);
  const canAddProducts = (): boolean => roleCanAddProducts(role);
  const canEditProducts = (): boolean => roleCanEditProducts(role);
  const canDeleteProducts = (): boolean => roleCanDeleteProducts(role);
  const canRecordSales = (): boolean => roleCanRecordSales(role);
  const canViewReports = (): boolean => roleCanViewReports(role);
  const canManageStaff = (): boolean => roleCanManageStaff(role);
  const canAccessSettings = (): boolean => roleCanAccessSettings(role);
  const canManageCustomers = (): boolean => roleCanManageCustomers(role);

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
    currentRole,
    roleReady,
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
