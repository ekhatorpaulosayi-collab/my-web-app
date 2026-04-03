import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { EnhancedMembersList } from './EnhancedMembersList';
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calendar,
  RefreshCw,
  Bell,
  ChevronRight
} from 'lucide-react';

interface GroupStats {
  groupId: string;
  groupName: string;
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  pendingMembers: number;
  upToDateMembers: number;
  overdueMembers: number;
  totalCollected: number;
  expectedMonthly: number;
  paymentFrequency: string;
}

export const PaymentStatusDashboard: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupStats[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroupStats();
    }
  }, [user]);

  const loadGroupStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all groups for the user
      const { data: userGroups, error: groupsError } = await supabase
        .from('contribution_groups')
        .select('*')
        .eq('user_id', user.uid)
        .eq('status', 'active');

      if (groupsError) throw groupsError;

      const groupStats: GroupStats[] = [];

      for (const group of userGroups || []) {
        // Get member payment status for each group
        const { data: members, error: membersError } = await supabase
          .from('member_payment_status')
          .select('*')
          .eq('group_id', group.id);

        if (membersError) throw membersError;

        const stats: GroupStats = {
          groupId: group.id,
          groupName: group.name,
          totalMembers: members?.length || 0,
          activeMembers: members?.filter(m => m.status === 'active').length || 0,
          inactiveMembers: members?.filter(m => m.status === 'inactive').length || 0,
          pendingMembers: members?.filter(m => m.status === 'pending').length || 0,
          upToDateMembers: members?.filter(m => m.is_up_to_date).length || 0,
          overdueMembers: members?.filter(m => !m.is_up_to_date && m.status === 'active').length || 0,
          totalCollected: members?.reduce((sum, m) => sum + (m.total_contributed || 0), 0) || 0,
          expectedMonthly: (group.amount || 0) * (members?.length || 0),
          paymentFrequency: group.payment_frequency || group.frequency || 'monthly'
        };

        groupStats.push(stats);
      }

      setGroups(groupStats);

      // Auto-select first group if none selected
      if (groupStats.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupStats[0].groupId);
      }
    } catch (error) {
      console.error('Error loading group stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllStatuses = async () => {
    setRefreshing(true);
    try {
      // Call the check_inactive_members function for all groups
      await supabase.rpc('check_inactive_members');
      await loadGroupStats();
    } catch (error) {
      console.error('Error refreshing statuses:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const sendBulkReminders = async (groupId: string) => {
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return;

    // Get overdue members
    const { data: overdueMembers } = await supabase
      .from('member_payment_status')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_up_to_date', false)
      .eq('status', 'active');

    if (overdueMembers && overdueMembers.length > 0) {
      // Here you would implement the actual reminder sending logic
      console.log(`Sending reminders to ${overdueMembers.length} members in ${group.groupName}`);
      alert(`Reminders would be sent to ${overdueMembers.length} overdue members`);
    }
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount).replace('NGN', '₦');
  };

  const selectedGroup = groups.find(g => g.groupId === selectedGroupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading payment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Status Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Monitor member payments across all your contribution groups
              </p>
            </div>
            <button
              onClick={refreshAllStatuses}
              disabled={refreshing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {showAlerts && groups.some(g => g.overdueMembers > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Payment Alerts</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  {groups.filter(g => g.overdueMembers > 0).map(group => (
                    <div key={group.groupId} className="flex items-center justify-between py-1">
                      <span>
                        {group.groupName}: {group.overdueMembers} member{group.overdueMembers !== 1 ? 's' : ''} overdue
                      </span>
                      <button
                        onClick={() => sendBulkReminders(group.groupId)}
                        className="text-yellow-800 hover:text-yellow-900 font-medium text-xs"
                      >
                        Send Reminders →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowAlerts(false)}
                className="ml-3 text-yellow-500 hover:text-yellow-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <div
              key={group.groupId}
              onClick={() => setSelectedGroupId(group.groupId)}
              className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                selectedGroupId === group.groupId
                  ? 'border-green-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{group.groupName}</h3>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  selectedGroupId === group.groupId ? 'rotate-90' : ''
                }`} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Members
                  </span>
                  <span className="font-medium">
                    {group.activeMembers}/{group.totalMembers}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Up to Date
                  </span>
                  <span className={`font-medium ${
                    group.upToDateMembers === group.totalMembers ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {group.upToDateMembers}/{group.totalMembers}
                  </span>
                </div>

                {group.overdueMembers > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Overdue
                    </span>
                    <span className="font-medium text-yellow-600">
                      {group.overdueMembers}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Collected
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatNaira(group.totalCollected)}
                    </span>
                  </div>
                </div>
              </div>

              {group.overdueMembers > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sendBulkReminders(group.groupId);
                  }}
                  className="mt-3 w-full px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Send Reminders
                </button>
              )}
            </div>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Groups</h3>
            <p className="text-gray-500">
              Create a contribution group to start tracking member payments
            </p>
          </div>
        )}
      </div>

      {/* Selected Group Details */}
      {selectedGroup && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedGroup.groupName}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Payment frequency: {selectedGroup.paymentFrequency}
                </p>
              </div>

              {/* Summary Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedGroup.activeMembers}
                  </div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedGroup.upToDateMembers}
                  </div>
                  <div className="text-xs text-gray-500">Up to Date</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {selectedGroup.overdueMembers}
                  </div>
                  <div className="text-xs text-gray-500">Overdue</div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <EnhancedMembersList
              groupId={selectedGroupId}
              onMarkPaid={(memberId) => {
                console.log('Mark paid:', memberId);
                loadGroupStats(); // Refresh stats after marking paid
              }}
              onSendReminder={(memberId) => {
                console.log('Send reminder:', memberId);
                // Implement reminder logic
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusDashboard;