/**
 * More Menu Component
 * Hidden features accessible via "More" button
 */

import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, AlertTriangle, DollarSign, FileText, Users, Receipt, Share2, HelpCircle, Send, Download, UserCircle2, UserCog, LogOut, Gift } from 'lucide-react';
import { useStaff } from '../contexts/StaffContext';
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
  onSendDailySummary?: () => void;
  onExportData?: () => void;
  onStaffModeToggle?: () => void;
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
  onShowOnlineStore,
  onSendDailySummary,
  onExportData,
  onStaffModeToggle
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { isStaffMode, currentStaff, exitStaffMode, canManageStaff } = useStaff();

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
    // Staff Mode Toggle (show if in staff mode)
    ...(isStaffMode ? [{
      icon: LogOut,
      label: 'Exit Staff Mode',
      description: `Logged in as ${currentStaff?.name}`,
      action: () => {
        exitStaffMode();
        alert('Exited staff mode');
      }
    }] : []),

    // Staff Mode Login (show if owner and not in staff mode)
    ...(!isStaffMode && canManageStaff() ? [{
      icon: Users,
      label: 'Staff Mode',
      description: 'Login as staff member',
      action: onStaffModeToggle
    }] : []),

    // Staff Management (owner only)
    ...(canManageStaff() && !isStaffMode ? [{
      icon: UserCog,
      label: 'Manage Staff',
      description: 'Add & manage team',
      action: () => navigate('/staff')
    }] : []),

    {
      icon: Gift,
      label: 'Referral Program',
      description: 'Invite friends, earn rewards',
      action: () => navigate('/referrals')
    },
    {
      icon: Receipt,
      label: 'Professional Invoices',
      description: 'B2B sales & payment tracking',
      action: () => navigate('/invoices')
    },
    {
      icon: HelpCircle,
      label: 'Getting Started Guide',
      description: 'Show setup checklist',
      action: () => {
        window.dispatchEvent(new Event('show-getting-started'));
      }
    },
    {
      icon: Send,
      label: 'Daily Sales Summary',
      description: 'Send today\'s report',
      action: onSendDailySummary
    },
    {
      icon: Download,
      label: 'Export Data (CSV)',
      description: 'Download all data',
      action: onExportData
    },
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
      label: 'Sales History',
      description: 'View all transactions',
      action: onViewReports
    },
    {
      icon: Users,
      label: 'Debt/Credit Sales',
      description: 'Track customer debts',
      action: onViewCustomers
    },
    {
      icon: UserCircle2,
      label: 'All Customers',
      description: 'View customer history',
      action: () => navigate('/customers')
    },
    {
      icon: Receipt,
      label: 'Expenses',
      description: 'Track expenses',
      action: onViewExpenses
    }
  ];

  const handleItemClick = (action?: () => void) => {
    // Close dialog first
    dialogRef.current?.close();
    onClose();
    // Execute action immediately
    action?.();
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
