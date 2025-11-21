/**
 * Staff Performance Widget
 * Shows today's staff sales performance - minimal and collapsible
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { currencyNGN } from '../utils/format';

interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  staff_role: 'manager' | 'cashier';
  sales_count: number;
  total_revenue: number; // in kobo
}

interface StaffPerformanceWidgetProps {
  sales: any[];
  showSalesData?: boolean;
}

export function StaffPerformanceWidget({ sales, showSalesData = true }: StaffPerformanceWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);

  useEffect(() => {
    // Calculate staff performance from today's sales
    const staffMap = new Map<string, StaffPerformance>();

    for (const sale of sales) {
      if (!sale.recorded_by_staff_id || !sale.recorded_by_staff_name) continue;

      const staffId = sale.recorded_by_staff_id;
      const saleRevenue = (sale.sellKobo || 0) * (sale.qty || 0);

      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          staff_id: staffId,
          staff_name: sale.recorded_by_staff_name,
          staff_role: sale.recorded_by_staff_role || 'cashier',
          sales_count: 0,
          total_revenue: 0
        });
      }

      const staff = staffMap.get(staffId)!;
      staff.sales_count += 1;
      staff.total_revenue += saleRevenue;
    }

    // Convert to array and sort by revenue
    const performance = Array.from(staffMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
    setStaffPerformance(performance);
  }, [sales]);

  // Don't render if no staff sales
  if (staffPerformance.length === 0) {
    return null;
  }

  return (
    <div className="staff-performance-widget">
      <div
        className="staff-performance-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="staff-performance-title">
          <Users size={18} />
          <h3>Staff Performance Today</h3>
          <span className="staff-count">{staffPerformance.length} staff</span>
        </div>
        <button
          className="collapse-toggle-btn"
          aria-label={isExpanded ? "Collapse" : "Expand"}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div className="staff-performance-list">
          {staffPerformance.map((staff) => (
            <div key={staff.staff_id} className="staff-performance-item">
              <div className="staff-info">
                <div className="staff-name">{staff.staff_name}</div>
                <div className="staff-role-badge">{staff.staff_role}</div>
              </div>
              <div className="staff-stats">
                <div className="staff-stat">
                  <span className="stat-label">{staff.sales_count} sales</span>
                </div>
                <div className="staff-stat staff-revenue">
                  {showSalesData ? currencyNGN(staff.total_revenue) : '***'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
