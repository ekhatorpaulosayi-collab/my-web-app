import { supabase } from '../config/supabaseClient';

interface OverdueMember {
  member_id: string;
  member_name: string;
  member_phone?: string;
  group_name: string;
  expected_amount: number;
  last_payment_date?: string | null;
  next_payment_due?: string | null;
  days_overdue: number;
}

export class PaymentAlertService {
  /**
   * Get all overdue members across all groups for a user
   */
  static async getOverdueMembers(userId: string): Promise<OverdueMember[]> {
    try {
      // First get all groups for the user
      const { data: groups, error: groupsError } = await supabase
        .from('contribution_groups')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (groupsError) throw groupsError;

      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map(g => g.id);

      // Get all overdue members from member_payment_status view
      const { data: overdueMembers, error: membersError } = await supabase
        .from('member_payment_status')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_up_to_date', false)
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Calculate days overdue for each member
      const membersWithDaysOverdue: OverdueMember[] = (overdueMembers || []).map(member => {
        let daysOverdue = 0;

        if (member.next_payment_due) {
          const dueDate = new Date(member.next_payment_due);
          const today = new Date();
          const diffTime = today.getTime() - dueDate.getTime();
          daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        return {
          member_id: member.member_id,
          member_name: member.member_name,
          member_phone: member.member_phone,
          group_name: member.group_name,
          expected_amount: member.expected_amount,
          last_payment_date: member.last_payment_date,
          next_payment_due: member.next_payment_due,
          days_overdue: daysOverdue
        };
      });

      // Sort by days overdue (most overdue first)
      return membersWithDaysOverdue.sort((a, b) => b.days_overdue - a.days_overdue);
    } catch (error) {
      console.error('Error getting overdue members:', error);
      return [];
    }
  }

  /**
   * Send WhatsApp reminder to a member
   */
  static sendWhatsAppReminder(member: OverdueMember): void {
    if (!member.member_phone) return;

    const message = `Hi ${member.member_name},

This is a friendly reminder about your contribution to "${member.group_name}".

Payment Due: ₦${member.expected_amount.toLocaleString()}
${member.days_overdue > 0 ? `Days Overdue: ${member.days_overdue}` : ''}

Please make your payment at your earliest convenience. Thank you!`;

    const phoneNumber = member.member_phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
  }

  /**
   * Send bulk WhatsApp reminders
   */
  static sendBulkWhatsAppReminders(members: OverdueMember[]): void {
    const membersWithPhone = members.filter(m => m.member_phone);

    if (membersWithPhone.length === 0) {
      alert('No members with phone numbers to send reminders to.');
      return;
    }

    // Create a summary message for group admin
    const summary = membersWithPhone.map(m =>
      `${m.member_name}: ₦${m.expected_amount.toLocaleString()} (${m.days_overdue} days overdue)`
    ).join('\n');

    const message = `Payment Reminders Sent to:\n\n${summary}\n\nTotal: ${membersWithPhone.length} members`;

    // In a real app, you would send individual messages
    // For now, we'll show a confirmation
    if (confirm(`Send payment reminders to ${membersWithPhone.length} members?`)) {
      membersWithPhone.forEach((member, index) => {
        // Delay each message to avoid being flagged as spam
        setTimeout(() => {
          this.sendWhatsAppReminder(member);
        }, index * 1000); // 1 second delay between messages
      });

      alert(`Reminders are being sent to ${membersWithPhone.length} members.`);
    }
  }

  /**
   * Mark members as inactive based on payment frequency
   */
  static async updateInactiveMembers(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('check_inactive_members');

      if (error) throw error;

      // Get count of updated members
      const { count, error: countError } = await supabase
        .from('contribution_members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive');

      if (countError) throw countError;

      return count || 0;
    } catch (error) {
      console.error('Error updating inactive members:', error);
      return 0;
    }
  }

  /**
   * Get payment reminder schedule for a group
   */
  static async getReminderSchedule(groupId: string): Promise<any> {
    try {
      const { data: members, error } = await supabase
        .from('member_payment_status')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_up_to_date', false)
        .order('next_payment_due', { ascending: true });

      if (error) throw error;

      // Group by due date
      const schedule = members?.reduce((acc: any, member: any) => {
        const dueDate = member.next_payment_due
          ? new Date(member.next_payment_due).toLocaleDateString()
          : 'No due date';

        if (!acc[dueDate]) {
          acc[dueDate] = [];
        }

        acc[dueDate].push({
          name: member.member_name,
          amount: member.expected_amount,
          phone: member.member_phone
        });

        return acc;
      }, {});

      return schedule || {};
    } catch (error) {
      console.error('Error getting reminder schedule:', error);
      return {};
    }
  }

  /**
   * Create an in-app notification for overdue payments
   */
  static async createOverdueNotification(userId: string, groupId: string, message: string): Promise<void> {
    try {
      // This would typically create a notification in a notifications table
      // For now, we'll just log it
      console.log('Notification created:', { userId, groupId, message });

      // You could implement a notifications table like this:
      /*
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'payment_overdue',
          title: 'Payment Overdue',
          message: message,
          related_id: groupId,
          read: false
        });

      if (error) throw error;
      */
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Get payment statistics for dashboard
   */
  static async getPaymentStatistics(userId: string): Promise<any> {
    try {
      // Get all groups for the user
      const { data: groups, error: groupsError } = await supabase
        .from('contribution_groups')
        .select('id, name, amount')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) return null;

      const groupIds = groups.map(g => g.id);

      // Get member payment status
      const { data: members, error: membersError } = await supabase
        .from('member_payment_status')
        .select('*')
        .in('group_id', groupIds);

      if (membersError) throw membersError;

      // Calculate statistics
      const stats = {
        totalGroups: groups.length,
        totalMembers: members?.length || 0,
        activeMembers: members?.filter(m => m.status === 'active').length || 0,
        inactiveMembers: members?.filter(m => m.status === 'inactive').length || 0,
        pendingMembers: members?.filter(m => m.status === 'pending').length || 0,
        upToDateMembers: members?.filter(m => m.is_up_to_date).length || 0,
        overdueMembers: members?.filter(m => !m.is_up_to_date && m.status === 'active').length || 0,
        totalExpected: members?.reduce((sum, m) => sum + (m.expected_amount || 0), 0) || 0,
        totalCollected: members?.reduce((sum, m) => sum + (m.total_contributed || 0), 0) || 0,
        collectionRate: 0
      };

      // Calculate collection rate
      if (stats.totalExpected > 0) {
        stats.collectionRate = Math.round((stats.totalCollected / stats.totalExpected) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      return null;
    }
  }
}

export default PaymentAlertService;