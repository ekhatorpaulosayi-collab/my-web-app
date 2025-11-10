/**
 * More Menu Component
 * Hidden features accessible via "More" button
 */

import React, { useRef, useEffect } from 'react';
import { X, Package, AlertTriangle, DollarSign, FileText, Users, Receipt, Settings, Share2 } from 'lucide-react';
import './MoreMenu.css';

interface MoreMenuProps {
  onClose: () => void;
  onViewInventory?: () => void;
  onViewLowStock?: () => void;
  onViewMoney?: () => void;
  onViewReports?: () => void;
  onViewCustomers?: () => void;
  onViewExpenses?: () => void;
  onViewSettings?: () => void;
  onShowOnlineStore?: () => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  onClose,
  onViewInventory,
  onViewLowStock,
  onViewMoney,
  onViewReports,
  onViewCustomers,
  onViewExpenses,
  onViewSettings,
  onShowOnlineStore
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialogRef.current?.close();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Clean up dialog on unmount
      if (dialogRef.current?.open) {
        dialogRef.current?.close();
      }
    };
  }, [onClose]);

  const menuItems = [
    {
      icon: Share2,
      label: 'Online Store',
      description: 'Send store link',
      action: onShowOnlineStore
    },
    {
      icon: Package,
      label: 'Full Inventory',
      description: 'View all items',
      action: onViewInventory
    },
    {
      icon: AlertTriangle,
      label: 'Low Stock Alerts',
      description: 'Items running low',
      action: onViewLowStock
    },
    {
      icon: DollarSign,
      label: 'Money & Credit',
      description: 'Profits & debts',
      action: onViewMoney
    },
    {
      icon: FileText,
      label: 'Reports',
      description: 'Sales analytics',
      action: onViewReports
    },
    {
      icon: Users,
      label: 'Customers',
      description: 'Manage customers',
      action: onViewCustomers
    },
    {
      icon: Receipt,
      label: 'Expenses',
      description: 'Track expenses',
      action: onViewExpenses
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'App preferences',
      action: onViewSettings
    },
  ];

  const handleItemClick = (action?: () => void) => {
    // Close dialog first
    dialogRef.current?.close();
    onClose();

    // Execute action after a small delay to ensure modal is closed
    if (action) {
      setTimeout(() => action(), 100);
    }
  };

  return (
    <dialog ref={dialogRef} className="more-menu" onClose={onClose}>
      <div className="more-menu-content">
        <div className="more-menu-header">
          <h3>More Features</h3>
          <button
            onClick={() => {
              dialogRef.current?.close();
              onClose();
            }}
            className="more-menu-close"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="more-menu-grid">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="more-menu-item"
                onClick={() => handleItemClick(item.action)}
                disabled={!item.action}
              >
                <Icon size={24} className="more-menu-icon" />
                <div className="more-menu-text">
                  <div className="more-menu-label">{item.label}</div>
                  <div className="more-menu-description">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
};
