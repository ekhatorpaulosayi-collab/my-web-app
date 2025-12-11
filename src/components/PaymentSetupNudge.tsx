/**
 * Payment Setup Nudge Component
 * Shows after user has added 3+ products but hasn't set up payment methods
 * Progressive UX nudge to complete payment setup
 */

import React from 'react';
import { CreditCard, ArrowRight } from 'lucide-react';
import './PaymentSetupNudge.css';

interface PaymentSetupNudgeProps {
  productCount: number;
  onSetupClick: () => void;
  onDismiss: () => void;
}

export const PaymentSetupNudge: React.FC<PaymentSetupNudgeProps> = ({
  productCount,
  onSetupClick,
  onDismiss
}) => {
  return (
    <div className="payment-setup-nudge">
      <button
        className="nudge-dismiss"
        onClick={onDismiss}
        title="Dismiss"
        aria-label="Dismiss payment setup nudge"
      >
        ×
      </button>

      <div className="nudge-content">
        <div className="nudge-icon">
          <CreditCard size={24} />
        </div>

        <div className="nudge-text">
          <h3 className="nudge-title">
            You have {productCount} products ready to sell!
          </h3>
          <p className="nudge-message">
            Set up payment methods so customers can checkout instantly
          </p>
        </div>

        <button
          className="nudge-action"
          onClick={onSetupClick}
        >
          Setup Payments
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
