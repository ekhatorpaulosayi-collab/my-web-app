/**
 * Widget Card Component
 * Renders individual dashboard widgets with dynamic badges
 */

import React from 'react';
import { WidgetMetadata } from '../constants/widgets';
import './WidgetCard.css';

interface WidgetCardProps {
  widget: WidgetMetadata;
  data?: any;
  locked?: boolean;
  onClick?: () => void;
}

function formatCurrency(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(naira);
}

export function WidgetCard({ widget, data, locked, onClick }: WidgetCardProps) {
  // Locked state (requires owner PIN)
  if (locked) {
    return (
      <div className="widget-card widget-card-locked" onClick={onClick}>
        <div className="widget-header">
          <span className="widget-icon">{widget.icon}</span>
          <h3 className="widget-title">{widget.name}</h3>
        </div>
        <div className="widget-lock-overlay">
          <div className="lock-icon">🔒</div>
          <div className="lock-text">Owner Access Required</div>
        </div>
      </div>
    );
  }

  // Render badge if widget has badge configuration
  const renderBadge = () => {
    if (!widget.badge || !data) return null;

    const { field, color, prefix, suffix } = widget.badge;
    let value = '';

    switch (field) {
      case 'amount':
        value = `${prefix || ''}${formatCurrency(data.amount || 0)}${suffix || ''}`;
        break;
      case 'count':
        value = `${prefix || ''}${data.count || 0}${suffix || ''}`;
        break;
      case 'percentage':
        value = `${prefix || ''}${(data.percentage || 0).toFixed(1)}${suffix || ''}`;
        break;
      case 'profit':
        value = `${prefix || ''}${formatCurrency(data.profit || 0)}${suffix || ''}`;
        break;
      default:
        return null;
    }

    return (
      <div className={`widget-badge widget-badge-${color}`}>
        {value}
      </div>
    );
  };

  // Render widget-specific content
  const renderContent = () => {
    // Quick Sell Grid
    if (widget.id === 'quickSell' && data?.items) {
      return (
        <div className="quick-sell-grid">
          {data.items.slice(0, 6).map((item: any) => (
            <button
              key={item.id}
              type="button"
              className="quick-sell-item"
              onClick={(e) => {
                e.stopPropagation();
                // Dispatch event to trigger sale modal with pre-filled item
                window.dispatchEvent(new CustomEvent('quicksell:item', {
                  detail: { itemId: item.id }
                }));
              }}
            >
              <div className="quick-sell-name">{item.name}</div>
              <div className="quick-sell-price">₦{formatCurrency(item.sellKobo || 0)}</div>
            </button>
          ))}
        </div>
      );
    }

    // Low Stock Items
    if (widget.id === 'lowStock' && data?.items) {
      if (data.items.length === 0) {
        return <div className="widget-empty">✓ All items well stocked</div>;
      }
      return (
        <ul className="widget-list">
          {data.items.slice(0, 5).map((item: any) => (
            <li key={item.id} className="widget-list-item">
              <span className="widget-list-name">{item.name}</span>
              <span className="widget-list-badge widget-list-badge-warning">
                {item.quantity} left
              </span>
            </li>
          ))}
        </ul>
      );
    }

    // Top Products
    if (widget.id === 'topProducts' && data?.products) {
      if (data.products.length === 0) {
        return <div className="widget-empty">No sales this month</div>;
      }
      return (
        <ul className="widget-list">
          {data.products.map((product: any, index: number) => (
            <li key={index} className="widget-list-item">
              <span className="widget-list-rank">{index + 1}</span>
              <span className="widget-list-name">{product.name}</span>
              <span className="widget-list-value">{product.qty} sold</span>
            </li>
          ))}
        </ul>
      );
    }

    // Recent Sales
    if (widget.id === 'recentSales' && data?.sales) {
      if (data.sales.length === 0) {
        return <div className="widget-empty">No sales yet</div>;
      }
      return (
        <ul className="widget-list">
          {data.sales.map((sale: any) => (
            <li key={sale.id} className="widget-list-item">
              <div className="widget-list-col">
                <div className="widget-list-name">{sale.itemName}</div>
                <div className="widget-list-meta">
                  {new Date(sale.createdAt).toLocaleTimeString('en-NG', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="widget-list-value">
                ₦{formatCurrency(sale.totalKobo || 0)}
              </div>
            </li>
          ))}
        </ul>
      );
    }

    // Default: show badge or description
    return (
      <div className="widget-content-default">
        {data?.count !== undefined && (
          <div className="widget-subtitle">
            {data.count} {widget.id === 'customers' ? 'customers' : 'items'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="widget-card" onClick={onClick}>
      <div className="widget-header">
        <span className="widget-icon">{widget.icon}</span>
        <h3 className="widget-title">{widget.name}</h3>
      </div>

      {renderBadge()}

      <div className="widget-body">
        {renderContent()}
      </div>

      {/* Show description for simple widgets */}
      {!data?.items && !data?.products && !data?.sales && (
        <p className="widget-description">{widget.description}</p>
      )}
    </div>
  );
}
