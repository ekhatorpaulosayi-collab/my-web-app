/**
 * Command Menu Component
 * Quick access menu for common actions
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './CommandMenu.css';

interface CommandMenuProps {
  onClose: () => void;
  onAddExpense?: () => void;
  onViewMoney?: () => void;
  onViewExpenses?: () => void;
  onViewCustomers?: () => void;
  onViewDebts?: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  onClose,
  onAddExpense,
  onViewMoney,
  onViewExpenses,
  onViewCustomers,
  onViewDebts
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const menuItems = [
    { label: 'Add Expense', action: onAddExpense },
    { label: 'View Money & Profits', action: onViewMoney },
    { label: 'View All Expenses', action: onViewExpenses },
    { label: 'Customers', action: onViewCustomers },
    { label: 'Debts', action: onViewDebts },
  ];

  const handleItemClick = (action?: () => void) => {
    if (action) {
      action();
    }
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="commandMenu" onClose={onClose}>
      <div className="commandMenuContent">
        <div className="commandMenuHeader">
          <h3>Quick Actions</h3>
          <button
            onClick={onClose}
            className="commandMenuClose"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="commandMenuList">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="commandMenuItem"
              onClick={() => handleItemClick(item.action)}
              disabled={!item.action}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
};
