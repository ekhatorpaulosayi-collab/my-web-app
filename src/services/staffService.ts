/**
 * Staff Management Service
 * Handles all staff-related database operations
 */

import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export interface StaffMember {
  id: string;
  store_owner_uid: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'manager' | 'cashier';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface ActivityLog {
  id: string;
  store_owner_uid: string;
  staff_id: string;
  action_type: string;
  action_details?: any;
  created_at: string;
}

/**
 * Hash a PIN code using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

/**
 * Verify a PIN code against a hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Create a new staff member
 */
export async function createStaffMember(
  ownerUid: string,
  data: {
    name: string;
    phone?: string;
    email?: string;
    pin: string;
    role: 'manager' | 'cashier';
  }
): Promise<StaffMember> {
  // Hash the PIN
  const hashedPin = await hashPin(data.pin);

  const { data: staff, error } = await supabase
    .from('staff_members')
    .insert({
      store_owner_uid: ownerUid,
      name: data.name,
      phone: data.phone,
      email: data.email,
      pin: hashedPin,
      role: data.role,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('[staffService] Error creating staff:', error);
    throw new Error(error.message);
  }

  console.log('[staffService] ✅ Staff member created:', staff.name);

  // Log activity
  await logActivity(ownerUid, staff.id, 'staff_created', {
    staff_name: staff.name,
    role: staff.role
  });

  return staff;
}

/**
 * Fetch all staff members for a store owner
 */
export async function fetchStaffMembers(ownerUid: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('store_owner_uid', ownerUid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[staffService] Error fetching staff:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Authenticate staff member with PIN
 */
export async function authenticateStaffWithPin(
  ownerUid: string,
  pin: string
): Promise<StaffMember | null> {
  // Fetch all active staff for this owner
  const { data: staffMembers, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('store_owner_uid', ownerUid)
    .eq('is_active', true);

  if (error) {
    console.error('[staffService] Error fetching staff for auth:', error);
    throw new Error(error.message);
  }

  if (!staffMembers || staffMembers.length === 0) {
    return null;
  }

  // Check PIN against each staff member
  for (const staff of staffMembers) {
    const isValid = await verifyPin(pin, staff.pin);
    if (isValid) {
      // Update last login
      await supabase
        .from('staff_members')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', staff.id);

      // Log login activity
      await logActivity(ownerUid, staff.id, 'login', {
        staff_name: staff.name
      });

      console.log('[staffService] ✅ Staff authenticated:', staff.name);
      return staff;
    }
  }

  return null;
}

/**
 * Update staff member details
 */
export async function updateStaffMember(
  ownerUid: string,
  staffId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string;
    role?: 'manager' | 'cashier';
    is_active?: boolean;
  }
): Promise<StaffMember> {
  const { data, error } = await supabase
    .from('staff_members')
    .update(updates)
    .eq('id', staffId)
    .eq('store_owner_uid', ownerUid)
    .select()
    .single();

  if (error) {
    console.error('[staffService] Error updating staff:', error);
    throw new Error(error.message);
  }

  console.log('[staffService] ✅ Staff member updated:', data.name);

  // Log activity
  await logActivity(ownerUid, staffId, 'staff_updated', {
    updates
  });

  return data;
}

/**
 * Reset staff member PIN
 */
export async function resetStaffPin(
  ownerUid: string,
  staffId: string,
  newPin: string
): Promise<void> {
  const hashedPin = await hashPin(newPin);

  const { error } = await supabase
    .from('staff_members')
    .update({ pin: hashedPin })
    .eq('id', staffId)
    .eq('store_owner_uid', ownerUid);

  if (error) {
    console.error('[staffService] Error resetting PIN:', error);
    throw new Error(error.message);
  }

  console.log('[staffService] ✅ PIN reset for staff:', staffId);

  // Log activity
  await logActivity(ownerUid, staffId, 'pin_reset', {});
}

/**
 * Deactivate/Reactivate staff member
 */
export async function toggleStaffActive(
  ownerUid: string,
  staffId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('staff_members')
    .update({ is_active: isActive })
    .eq('id', staffId)
    .eq('store_owner_uid', ownerUid);

  if (error) {
    console.error('[staffService] Error toggling staff active:', error);
    throw new Error(error.message);
  }

  console.log('[staffService] ✅ Staff', isActive ? 'activated' : 'deactivated');

  // Log activity
  await logActivity(ownerUid, staffId, isActive ? 'staff_activated' : 'staff_deactivated', {});
}

/**
 * Delete staff member (soft delete by deactivating)
 */
export async function deleteStaffMember(ownerUid: string, staffId: string): Promise<void> {
  // Just deactivate instead of actual delete to preserve activity logs
  await toggleStaffActive(ownerUid, staffId, false);

  console.log('[staffService] ✅ Staff member deleted (deactivated)');
}

/**
 * Log staff activity
 */
export async function logActivity(
  ownerUid: string,
  staffId: string,
  actionType: string,
  details?: any
): Promise<void> {
  const { error } = await supabase
    .from('staff_activity_logs')
    .insert({
      store_owner_uid: ownerUid,
      staff_id: staffId,
      action_type: actionType,
      action_details: details || {}
    });

  if (error) {
    console.error('[staffService] Error logging activity:', error);
    // Don't throw - activity logging should not break main operations
  }
}

/**
 * Fetch activity logs for a staff member
 */
export async function fetchStaffActivityLogs(
  ownerUid: string,
  staffId?: string,
  limit: number = 100
): Promise<ActivityLog[]> {
  let query = supabase
    .from('staff_activity_logs')
    .select('*')
    .eq('store_owner_uid', ownerUid)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[staffService] Error fetching activity logs:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get staff member by ID
 */
export async function getStaffMember(
  ownerUid: string,
  staffId: string
): Promise<StaffMember | null> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('id', staffId)
    .eq('store_owner_uid', ownerUid)
    .single();

  if (error) {
    console.error('[staffService] Error fetching staff member:', error);
    return null;
  }

  return data;
}

/**
 * Get staff sales statistics
 */
export async function getStaffSalesStats(
  ownerUid: string,
  staffId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalSales: number;
  totalRevenue: number;
  averageSaleAmount: number;
}> {
  let query = supabase
    .from('sales')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('recorded_by_staff_id', staffId);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[staffService] Error fetching staff sales stats:', error);
    throw new Error(error.message);
  }

  const sales = data || [];
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => {
    return sum + ((sale.sellKobo || 0) * (sale.qty || 0) / 100);
  }, 0);
  const averageSaleAmount = totalSales > 0 ? totalRevenue / totalSales : 0;

  return {
    totalSales,
    totalRevenue,
    averageSaleAmount
  };
}
