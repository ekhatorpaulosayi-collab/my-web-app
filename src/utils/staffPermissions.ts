/**
 * Staff Mode permissions.
 *
 * Product decision (safer default, flagged for Paul): cashiers and managers
 * cannot edit or delete products. Managers may add products. Everyone,
 * including cashiers, can record sales. Owner-only routes stay owner-only.
 * The same rules are mirrored by the restrictive RLS policies in
 * supabase/migrations/20261025_09_staff_sessions.sql.
 */

export type StaffRole = 'owner' | 'manager' | 'cashier';

export function normalizeStaffRole(role: string | null | undefined, isStaffMode: boolean): StaffRole {
  if (!isStaffMode) return 'owner';
  if (role === 'manager' || role === 'cashier') return role;
  return 'cashier';
}

export function canAddProducts(role: StaffRole): boolean {
  return role === 'owner' || role === 'manager';
}

export function canEditProducts(role: StaffRole): boolean {
  return role === 'owner';
}

export function canDeleteProducts(role: StaffRole): boolean {
  return role === 'owner';
}

export function canRecordSales(_role: StaffRole): boolean {
  return true;
}

/**
 * Owner and manager can type a price at the till.
 * A cashier can only when the owner has turned on
 * "Allow staff to change the price at the till".
 * record_sale enforces the same rule, with cost_price as the cashier floor.
 */
export function canEditTillPrice(role: StaffRole, allowStaffPriceChange: boolean): boolean {
  if (role === 'owner' || role === 'manager') return true;
  return allowStaffPriceChange === true;
}

export function canViewReports(role: StaffRole): boolean {
  return role === 'owner' || role === 'manager';
}

export function canManageStaff(role: StaffRole): boolean {
  return role === 'owner';
}

export function canAccessSettings(role: StaffRole): boolean {
  return role === 'owner';
}

export function canManageCustomers(role: StaffRole): boolean {
  return role === 'owner' || role === 'manager';
}

/** Invoices are money records. Cashiers cannot open them. Managers can. */
export function canViewInvoices(role: StaffRole): boolean {
  return role === 'owner' || role === 'manager';
}

export const PRODUCT_EDIT_DENIED = 'Ask the owner';
