import React from 'react';
import { PaymentStatusDashboard } from '../components/contributions/PaymentStatusDashboard';

const TestPaymentStatus: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentStatusDashboard />
    </div>
  );
};

export default TestPaymentStatus;