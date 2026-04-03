import React from 'react';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface MemberStatusBadgeProps {
  status: 'active' | 'inactive' | 'pending';
  lastPaymentDate?: string | null;
  nextPaymentDue?: string | null;
  isUpToDate?: boolean;
}

export const MemberStatusBadge: React.FC<MemberStatusBadgeProps> = ({
  status,
  lastPaymentDate,
  nextPaymentDue,
  isUpToDate
}) => {
  const getStatusConfig = () => {
    if (isUpToDate !== undefined) {
      // Use payment status if available
      if (isUpToDate) {
        return {
          icon: CheckCircle,
          text: 'Up to date',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      } else if (status === 'active') {
        return {
          icon: AlertCircle,
          text: 'Payment due',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      }
    }

    // Fallback to basic status
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          text: 'Active',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'inactive':
        return {
          icon: XCircle,
          text: 'Inactive',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending',
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.text}
      </span>

      {nextPaymentDue && !isUpToDate && (
        <span className="text-xs text-gray-500">
          Due: {new Date(nextPaymentDue).toLocaleDateString()}
        </span>
      )}

      {lastPaymentDate && (
        <span className="text-xs text-gray-400">
          Last: {new Date(lastPaymentDate).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

export default MemberStatusBadge;