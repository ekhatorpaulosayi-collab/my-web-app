/**
 * Sales with Staff Information Service
 * Fetches sales data with staff member details
 */

import { supabase } from '../lib/supabase';

export interface SaleWithStaff {
  id: string;
  user_id: string;
  created_at: string;
  itemId?: string;
  qty: number;
  sellKobo: number;
  paymentMethod?: string;
  customerName?: string;
  recorded_by_staff_id?: string;
  staff_name?: string;
  staff_role?: 'manager' | 'cashier';
}

export interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  staff_role: 'manager' | 'cashier';
  sales_count: number;
  total_revenue: number; // in kobo
}

/**
 * Fetch today's sales with staff information
 */
export async function fetchTodaySalesWithStaff(
  ownerUid: string
): Promise<SaleWithStaff[]> {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        staff_members!recorded_by_staff_id (
          id,
          name,
          role
        )
      `)
      .eq('user_id', ownerUid)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[salesWithStaffService] Error fetching sales:', error);
      throw error;
    }

    // Transform data to include staff info
    return (data || []).map((sale: any) => ({
      ...sale,
      staff_name: sale.staff_members?.name || null,
      staff_role: sale.staff_members?.role || null
    }));
  } catch (error) {
    console.error('[salesWithStaffService] fetchTodaySalesWithStaff error:', error);
    return [];
  }
}

/**
 * Get staff performance for today
 */
export async function getTodayStaffPerformance(
  ownerUid: string
): Promise<StaffPerformance[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('sales')
      .select(`
        recorded_by_staff_id,
        sellKobo,
        qty,
        staff_members!recorded_by_staff_id (
          id,
          name,
          role
        )
      `)
      .eq('user_id', ownerUid)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .not('recorded_by_staff_id', 'is', null);

    if (error) {
      console.error('[salesWithStaffService] Error fetching staff performance:', error);
      throw error;
    }

    // Group by staff and calculate stats
    const staffMap = new Map<string, StaffPerformance>();

    for (const sale of data || []) {
      if (!sale.staff_members || !sale.recorded_by_staff_id) continue;

      const staffId = sale.recorded_by_staff_id;
      const saleRevenue = (sale.sellKobo || 0) * (sale.qty || 0);

      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          staff_id: staffId,
          staff_name: sale.staff_members.name,
          staff_role: sale.staff_members.role,
          sales_count: 0,
          total_revenue: 0
        });
      }

      const staff = staffMap.get(staffId)!;
      staff.sales_count += 1;
      staff.total_revenue += saleRevenue;
    }

    // Convert to array and sort by revenue
    return Array.from(staffMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
  } catch (error) {
    console.error('[salesWithStaffService] getTodayStaffPerformance error:', error);
    return [];
  }
}
