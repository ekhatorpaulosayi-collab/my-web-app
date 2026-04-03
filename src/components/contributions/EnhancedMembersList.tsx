import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { MemberStatusBadge } from './MemberStatusBadge';
import { Clock, User, DollarSign, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import * as contributionService from '../../services/contributionService';

interface MemberPaymentStatus {
  member_id: string;
  group_id: string;
  member_name: string;
  member_phone?: string;
  status: 'active' | 'inactive' | 'pending';
  last_payment_date?: string | null;
  joined_at?: string;
  group_name: string;
  payment_frequency: string;
  expected_amount: number;
  is_up_to_date: boolean;
  next_payment_due?: string | null;
  total_payments: number;
  total_contributed: number;
}

interface EnhancedMembersListProps {
  groupId: string;
  onMarkPaid: (memberId: string) => void;
  onSendReminder: (memberId: string) => void;
}

export const EnhancedMembersList: React.FC<EnhancedMembersListProps> = ({
  groupId,
  onMarkPaid,
  onSendReminder
}) => {
  const [members, setMembers] = useState<MemberPaymentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'nextDue'>('name');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    loadMemberStatus();
  }, [groupId]);

  const loadMemberStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_payment_status')
        .select('*')
        .eq('group_id', groupId)
        .order('member_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading member status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (memberId: string) => {
    const member = members.find(m => m.member_id === memberId);
    if (!member) return;

    // Get current cycle from group
    const { data: group } = await supabase
      .from('contribution_groups')
      .select('current_cycle')
      .eq('id', groupId)
      .single();

    if (group) {
      const { error } = await contributionService.markPaid(
        groupId,
        memberId,
        group.current_cycle || 1,
        {
          amount: member.expected_amount,
          paymentMethod: 'cash',
          note: `Payment for cycle ${group.current_cycle || 1}`
        }
      );

      if (!error) {
        onMarkPaid(memberId);
        await loadMemberStatus(); // Refresh the list
      }
    }
  };

  const checkInactiveMembers = async () => {
    try {
      await supabase.rpc('check_inactive_members');
      await loadMemberStatus();
    } catch (error) {
      console.error('Error checking inactive members:', error);
    }
  };

  const filteredMembers = members.filter(member => {
    if (statusFilter === 'all') return true;
    return member.status === statusFilter;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'status':
        const statusOrder = { active: 0, pending: 1, inactive: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      case 'nextDue':
        if (!a.next_payment_due && !b.next_payment_due) return 0;
        if (!a.next_payment_due) return 1;
        if (!b.next_payment_due) return -1;
        return new Date(a.next_payment_due).getTime() - new Date(b.next_payment_due).getTime();
      default:
        return a.member_name.localeCompare(b.member_name);
    }
  });

  // Calculate statistics
  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    inactive: members.filter(m => m.status === 'inactive').length,
    pending: members.filter(m => m.status === 'pending').length,
    upToDate: members.filter(m => m.is_up_to_date).length,
    overdue: members.filter(m => !m.is_up_to_date && m.status === 'active').length,
    totalCollected: members.reduce((sum, m) => sum + (m.total_contributed || 0), 0)
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount).replace('NGN', '₦');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading member status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">Payment Overview</h3>
          <span className="text-gray-500">{showStats ? '−' : '+'}</span>
        </button>

        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">Active</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.active}</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-yellow-600">Overdue</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">{stats.overdue}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600">Collected</span>
              </div>
              <div className="text-lg font-bold text-blue-700">
                {formatNaira(stats.totalCollected)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Members</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="nextDue">Sort by Due Date</option>
            </select>
          </div>

          <button
            onClick={checkInactiveMembers}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Check Inactive
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {sortedMembers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No members found with the selected filters</p>
          </div>
        ) : (
          sortedMembers.map(member => (
            <div
              key={member.member_id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {member.member_name}
                    </h4>
                    <MemberStatusBadge
                      status={member.status}
                      lastPaymentDate={member.last_payment_date}
                      nextPaymentDue={member.next_payment_due}
                      isUpToDate={member.is_up_to_date}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Payments:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {member.total_payments}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Contributed:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formatNaira(member.total_contributed || 0)}
                      </span>
                    </div>
                    {member.member_phone && (
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {member.member_phone}
                        </span>
                      </div>
                    )}
                    {member.joined_at && (
                      <div>
                        <span className="text-gray-500">Joined:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {!member.is_up_to_date && member.status !== 'inactive' && (
                    <>
                      <button
                        onClick={() => handleMarkPaid(member.member_id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Mark Paid
                      </button>
                      {member.member_phone && (
                        <button
                          onClick={() => onSendReminder(member.member_id)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                        >
                          Send Reminder
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedMembersList;