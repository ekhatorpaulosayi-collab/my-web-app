/**
 * Smart Notification Bar
 * Shows ONE context-aware priority alert per day
 * Priority: Low stock > Overdue debt > Profit milestone
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import './SmartNotificationBar.css';

interface Notification {
  id: string;
  type: 'low_stock' | 'debt' | 'milestone';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface SmartNotificationBarProps {
  lowStockCount?: number;
  overdueDebtAmount?: number;
  profitMilestone?: number;
  onViewLowStock?: () => void;
  onViewDebts?: () => void;
}

export const SmartNotificationBar: React.FC<SmartNotificationBarProps> = ({
  lowStockCount = 0,
  overdueDebtAmount = 0,
  profitMilestone = 0,
  onViewLowStock,
  onViewDebts
}) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const stored = localStorage.getItem('storehouse:dismissed-notifications');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // Determine priority notification
    let priorityNotification: Notification | null = null;

    // Priority 1: Low stock (critical)
    if (lowStockCount > 0 && !dismissed.includes('low_stock_today')) {
      priorityNotification = {
        id: 'low_stock_today',
        type: 'low_stock',
        message: `⚠️ ${lowStockCount} item${lowStockCount > 1 ? 's' : ''} running low on stock`,
        action: onViewLowStock,
        actionLabel: 'View Items'
      };
    }
    // Priority 2: Overdue debt (urgent)
    else if (overdueDebtAmount > 0 && !dismissed.includes('debt_today')) {
      priorityNotification = {
        id: 'debt_today',
        type: 'debt',
        message: `💰 ₦${(overdueDebtAmount / 100).toLocaleString()} in outstanding credit`,
        action: onViewDebts,
        actionLabel: 'Collect'
      };
    }
    // Priority 3: Profit milestone (positive)
    else if (profitMilestone > 0 && !dismissed.includes('milestone_today')) {
      const milestones = [10000, 50000, 100000, 500000, 1000000];
      const reached = milestones.find(m => profitMilestone >= m * 100);

      if (reached) {
        priorityNotification = {
          id: 'milestone_today',
          type: 'milestone',
          message: `🎉 Congratulations! You've earned ₦${(reached).toLocaleString()} profit!`,
        };
      }
    }

    setNotification(priorityNotification);
  }, [lowStockCount, overdueDebtAmount, profitMilestone, dismissed, onViewLowStock, onViewDebts]);

  const handleDismiss = () => {
    if (notification) {
      const newDismissed = [...dismissed, notification.id];
      setDismissed(newDismissed);
      localStorage.setItem('storehouse:dismissed-notifications', JSON.stringify(newDismissed));
      setNotification(null);
    }
  };

  const handleAction = () => {
    if (notification?.action) {
      notification.action();
      handleDismiss();
    }
  };

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'low_stock':
        return <AlertTriangle size={20} />;
      case 'debt':
        return <Clock size={20} />;
      case 'milestone':
        return <TrendingUp size={20} />;
      default:
        return null;
    }
  };

  const getClassName = () => {
    return `smart-notification smart-notification-${notification.type}`;
  };

  return (
    <div className={getClassName()}>
      <div className="smart-notification-content">
        <span className="smart-notification-icon">{getIcon()}</span>
        <span className="smart-notification-message">{notification.message}</span>
      </div>
      <div className="smart-notification-actions">
        {notification.action && (
          <button className="smart-notification-action" onClick={handleAction}>
            {notification.actionLabel}
          </button>
        )}
        <button className="smart-notification-dismiss" onClick={handleDismiss} aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
