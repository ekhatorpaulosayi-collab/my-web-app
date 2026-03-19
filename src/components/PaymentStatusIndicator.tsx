/**
 * Payment Status Indicator Component
 * Shows merchant their current payment setup status at a glance
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Building2, Settings, X, Plus } from 'lucide-react';
import './PaymentStatusIndicator.css';

interface PaymentStatusIndicatorProps {
  hasBank: boolean;
  onlinePaymentMethods: number;
  onSetupClick: () => void;
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  hasBank,
  onlinePaymentMethods,
  onSetupClick
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissedTime = localStorage.getItem('paymentBannerDismissed');
    if (dismissedTime) {
      const dismissedDate = new Date(dismissedTime);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Hide for 30 days after dismissal
      if (daysSinceDismissed < 30) {
        setIsDismissed(true);
      } else {
        // Clear old dismissal
        localStorage.removeItem('paymentBannerDismissed');
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsHiding(true);
    // Store dismissal time
    localStorage.setItem('paymentBannerDismissed', new Date().toISOString());

    // Wait for animation then hide
    setTimeout(() => {
      setIsDismissed(true);
      setIsHiding(false);
    }, 300);
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }
  // Determine status and messaging
  const getStatus = () => {
    if (!hasBank && onlinePaymentMethods === 0) {
      return {
        type: 'not-set',
        icon: <Settings size={18} />,
        label: 'No Payment Methods',
        message: 'Add payment methods so customers can checkout instantly',
        color: 'gray'
      };
    }

    if (hasBank && onlinePaymentMethods === 0) {
      return {
        type: 'bank-only',
        icon: <Building2 size={18} />,
        label: 'Payment Methods: Bank Transfer Active',
        message: '+ Add online payments for instant checkout',
        color: 'green'
      };
    }

    if (hasBank && onlinePaymentMethods > 0) {
      return {
        type: 'bank-and-online',
        icon: <CreditCard size={18} />,
        label: `Bank + ${onlinePaymentMethods} Online Method${onlinePaymentMethods > 1 ? 's' : ''}`,
        message: 'Customers can pay instantly online or via bank transfer',
        color: 'blue'
      };
    }

    // Online only (no bank)
    return {
      type: 'online-only',
      icon: <CreditCard size={18} />,
      label: `${onlinePaymentMethods} Online Method${onlinePaymentMethods > 1 ? 's' : ''}`,
      message: 'Customers can checkout instantly online',
      color: 'blue'
    };
  };

  const status = getStatus();

  return (
    <div className={`payment-status-indicator payment-status-${status.color} ${isHiding ? 'payment-status-hiding' : ''}`}>
      <div className="payment-status-content">
        <div className="payment-status-icon">{status.icon}</div>
        <div className="payment-status-text">
          <div className="payment-status-label">{status.label}</div>
          <div className="payment-status-message">
            {status.message.startsWith('+') ? (
              <>
                <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {status.message.substring(2)}
              </>
            ) : (
              status.message
            )}
          </div>
        </div>
      </div>
      <div className="payment-status-actions">
        <button
          className="payment-status-action"
          onClick={onSetupClick}
          title="Manage payment methods"
        >
          <Settings size={16} />
          Setup
        </button>
        <button
          className="payment-status-dismiss"
          onClick={handleDismiss}
          title="Dismiss for 30 days"
          aria-label="Dismiss payment banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
