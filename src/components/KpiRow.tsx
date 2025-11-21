/**
 * KPI Row Component
 * Unified dashboard metrics cards
 */

import React from 'react';
import { currencyNGN, formatInt } from '../utils/format';
import './KpiRow.css';

interface KpiRowProps {
  todaySales: {
    total: number;
    count: number;
  };
  itemsInStock: number;
  lowStock?: {
    count: number;
    onClick?: () => void;
  };
  creditOwed?: {
    total: number;
    count: number;
    onClick?: () => void;
  };
  profit?: {
    amount: number;
    margin: number;
  };
  showSalesData?: boolean;
}

export function KpiRow({
  todaySales,
  itemsInStock,
  lowStock,
  creditOwed,
  profit,
  showSalesData = true
}: KpiRowProps) {
  return (
    <div className="kpi-row">
      {/* Today's Sales */}
      <div className="kpi-card kpi-card-sales">
        <div className="kpi-card-content">
          <div className="kpi-card-left">
            <div className="kpi-card-label">Today's Sales</div>
            <div className="kpi-card-hint">
              {todaySales.count} sale{todaySales.count !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="kpi-card-right">
            <div className="kpi-card-value">
              {showSalesData ? currencyNGN(todaySales.total) : '₦—'}
            </div>
          </div>
        </div>
      </div>

      {/* Items in Stock */}
      <div className="kpi-card kpi-card-stock">
        <div className="kpi-card-content">
          <div className="kpi-card-left">
            <div className="kpi-card-label">Items in Stock</div>
            <div className="kpi-card-hint">total units</div>
          </div>
          <div className="kpi-card-right">
            <div className="kpi-card-value">{formatInt(itemsInStock)}</div>
          </div>
        </div>
      </div>

      {/* Low Stock - conditional */}
      {lowStock && lowStock.count > 0 && (
        <div
          className="kpi-card kpi-card-warning kpi-card-clickable"
          onClick={lowStock.onClick}
          role={lowStock.onClick ? 'button' : undefined}
          tabIndex={lowStock.onClick ? 0 : undefined}
        >
          <div className="kpi-card-content">
            <div className="kpi-card-left">
              <div className="kpi-card-label">Low Stock</div>
              <div className="kpi-card-hint">need restocking</div>
            </div>
            <div className="kpi-card-right">
              <div className="kpi-card-value kpi-card-value-warning">
                {lowStock.count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Owed - conditional */}
      {creditOwed && creditOwed.count > 0 && (
        <div
          className="kpi-card kpi-card-credit kpi-card-clickable"
          onClick={creditOwed.onClick}
          role={creditOwed.onClick ? 'button' : undefined}
          tabIndex={creditOwed.onClick ? 0 : undefined}
        >
          <div className="kpi-card-content">
            <div className="kpi-card-left">
              <div className="kpi-card-label">Credit Owed</div>
              <div className="kpi-card-hint">
                {creditOwed.count} customer{creditOwed.count !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="kpi-card-right">
              <div className="kpi-card-value">
                {showSalesData ? currencyNGN(creditOwed.total) : '₦—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profit - optional */}
      {profit && (
        <div className="kpi-card kpi-card-profit">
          <div className="kpi-card-content">
            <div className="kpi-card-left">
              <div className="kpi-card-label">Today's Profit</div>
              <div className="kpi-card-hint">
                {profit.margin.toFixed(1)}% margin
              </div>
            </div>
            <div className="kpi-card-right">
              <div className="kpi-card-value kpi-card-value-success">
                {showSalesData ? currencyNGN(profit.amount) : '₦—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
