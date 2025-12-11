/**
 * Payment Status Indicator Component
 * Shows merchant their current payment setup status at a glance
 */

import React from 'react';
import { CreditCard, Building2, Settings } from 'lucide-react';
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
        label: 'Bank Transfer Only',
        message: 'Consider adding online payments for instant checkout',
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
    <div className={`payment-status-indicator payment-status-${status.color}`}>
      <div className="payment-status-content">
        <div className="payment-status-icon">{status.icon}</div>
        <div className="payment-status-text">
          <div className="payment-status-label">{status.label}</div>
          <div className="payment-status-message">{status.message}</div>
        </div>
      </div>
      <button
        className="payment-status-action"
        onClick={onSetupClick}
        title="Manage payment methods"
      >
        <Settings size={16} />
        Setup
      </button>
    </div>
  );
};
