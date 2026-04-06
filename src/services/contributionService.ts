import { supabase } from '../lib/supabase';

// Types
interface ContributionGroup {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  collection_day?: string;
  total_members: number;
  current_cycle: number;
  share_enabled: boolean;
  share_code?: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

interface ContributionMember {
  id: string;
  group_id: string;
  name: string;
  phone?: string;
  payout_position: number;
  created_at: string;
  hasPaid?: boolean;
}

interface ContributionPayment {
  id: string;
  group_id: string;
  member_id: string;
  cycle_number: number;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'pos' | 'other';
  note?: string;
  paid_at: string;
}

interface ContributionPayout {
  id: string;
  group_id: string;
  member_id: string;
  cycle_number: number;
  amount: number;
  payment_method: string;
  paid_at: string;
}

// SHARE CODE GENERATOR - no ambiguous chars (0,o,1,l,i)
function generateShareCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GROUP CRUD
export async function createGroup(
  userId: string,
  data: {
    name: string;
    amount: number;
    frequency: string;
    collectionDay?: string;
    members?: { name: string; phone: string }[];
  }
) {
  console.log('=== contributionService.createGroup START ===');
  console.log('userId:', userId);
  console.log('data:', data);

  try {
    // First create the group
    const insertData = {
      user_id: userId,
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      collection_day: data.collectionDay,
      total_members: data.members?.length || 0,
      current_cycle: 1,
      share_enabled: true, // Enable sharing by default since UI shows share links
      share_code: generateShareCode(),
      status: 'active'
    };

    console.log('Inserting group with data:', insertData);

    const { data: group, error: groupError } = await supabase
      .from('contribution_groups')
      .insert(insertData)
      .select()
      .single();

    if (groupError || !group) {
      console.error('Failed to create group:', groupError);
      console.error('Error details:', {
        message: (groupError as any)?.message,
        code: (groupError as any)?.code,
        details: (groupError as any)?.details,
        hint: (groupError as any)?.hint
      });
      return { data: null, error: groupError };
    }

    console.log('Group created successfully:', group);

    // Then add members if provided
    if (data.members && data.members.length > 0) {
      const membersToInsert = data.members.map((member, index) => ({
        group_id: group.id,
        name: member.name,
        phone: member.phone || null,
        payout_position: index + 1
      }));

      console.log('Inserting members:', membersToInsert);

      const { error: membersError } = await supabase
        .from('contribution_members')
        .insert(membersToInsert);

      if (membersError) {
        console.error('Failed to insert members:', membersError);
        console.error('Member error details:', {
          message: (membersError as any)?.message,
          code: (membersError as any)?.code,
          details: (membersError as any)?.details,
          hint: (membersError as any)?.hint
        });

        // If members fail to insert, delete the group to maintain consistency
        console.log('Rolling back - deleting group due to member insertion failure');
        await supabase
          .from('contribution_groups')
          .delete()
          .eq('id', group.id);

        return { data: null, error: membersError };
      }

      console.log('Members inserted successfully');
    }

    console.log('=== contributionService.createGroup SUCCESS ===');
    return { data: group, error: null };
  } catch (error) {
    console.error('=== contributionService.createGroup UNEXPECTED ERROR ===');
    console.error('Error:', error);
    return { data: null, error };
  }
}

export async function getGroups(userId: string) {
  try {
    const { data: groups, error } = await supabase
      .from('contribution_groups')
      .select(`
        *,
        contribution_members(
          id, name, phone, payout_position
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Enhance each group with calculated fields
    const enhancedGroups = await Promise.all((groups || []).map(async (group) => {
      // Get payment count for current cycle
      const { count: paidCount } = await supabase
        .from('contribution_payments')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
        .eq('cycle_number', group.current_cycle);

      // Get current recipient
      console.log('RECIPIENT CALC:', {
        current_cycle: group.current_cycle,
        cycleType: typeof group.current_cycle,
        members: group.contribution_members?.map(m => ({
          name: m.name,
          pos: m.payout_position,
          posType: typeof m.payout_position,
          match: m.payout_position === group.current_cycle,
          looseMatch: m.payout_position == group.current_cycle
        }))
      });
      const currentRecipient = group.contribution_members?.find(
        (m: ContributionMember) => m.payout_position === group.current_cycle
      );

      return {
        ...group,
        paidCount: paidCount || 0,
        totalMembers: group.contribution_members?.length || 0,
        currentRecipient
      };
    }));

    return { data: enhancedGroups, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getGroup(groupId: string) {
  try {
    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('contribution_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) return { data: null, error: groupError };

    // Get all members sorted by payout position
    const { data: members, error: membersError } = await supabase
      .from('contribution_members')
      .select('*')
      .eq('group_id', groupId)
      .order('payout_position', { ascending: true });

    if (membersError) return { data: null, error: membersError };

    // Get payments for current cycle
    const { data: payments, error: paymentsError } = await supabase
      .from('contribution_payments')
      .select('*')
      .eq('group_id', groupId)
      .eq('cycle_number', group.current_cycle);

    if (paymentsError) return { data: null, error: paymentsError };

    // Annotate members with payment status
    const paidMemberIds = new Set(payments?.map(p => p.member_id) || []);
    const annotatedMembers = members?.map(member => ({
      ...member,
      hasPaid: paidMemberIds.has(member.id)
    })) || [];

    // Get current recipient
    const currentRecipient = annotatedMembers.find(
      m => m.payout_position === group.current_cycle
    );

    // Get payout history
    const { data: payouts, error: payoutsError } = await supabase
      .from('contribution_payouts')
      .select(`
        *,
        contribution_members!inner(name)
      `)
      .eq('group_id', groupId)
      .order('cycle_number', { ascending: false });

    if (payoutsError) return { data: null, error: payoutsError };

    return {
      data: {
        ...group,
        members: annotatedMembers,
        currentRecipient,
        payouts: payouts || [],
        currentCyclePayments: payments || []
      },
      error: null
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateGroup(groupId: string, updates: Partial<ContributionGroup>) {
  try {
    const { data, error } = await supabase
      .from('contribution_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteGroup(groupId: string) {
  try {
    const { error } = await supabase
      .from('contribution_groups')
      .delete()
      .eq('id', groupId);

    return { data: null, error };
  } catch (error) {
    return { data: null, error };
  }
}

// MEMBER MANAGEMENT
export async function addMember(
  groupId: string,
  data: {
    name: string;
    phone?: string;
    payoutPosition: number;
  }
) {
  try {
    // Start a transaction
    const { data: member, error: memberError } = await supabase
      .from('contribution_members')
      .insert({
        group_id: groupId,
        name: data.name,
        phone: data.phone,
        payout_position: data.payoutPosition
      })
      .select()
      .single();

    if (memberError) return { data: null, error: memberError };

    // Update total members count
    const { error: updateError } = await supabase.rpc('increment', {
      table_name: 'contribution_groups',
      column_name: 'total_members',
      row_id: groupId
    });

    // If increment RPC doesn't exist, do it manually
    if (updateError) {
      const { data: group } = await supabase
        .from('contribution_groups')
        .select('total_members')
        .eq('id', groupId)
        .single();

      await supabase
        .from('contribution_groups')
        .update({
          total_members: (group?.total_members || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId);
    }

    return { data: member, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function removeMember(memberId: string) {
  try {
    // Get member info first
    const { data: member } = await supabase
      .from('contribution_members')
      .select('group_id')
      .eq('id', memberId)
      .single();

    // Delete the member
    const { error: deleteError } = await supabase
      .from('contribution_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) return { data: null, error: deleteError };

    // Update total members count
    if (member?.group_id) {
      const { data: group } = await supabase
        .from('contribution_groups')
        .select('total_members')
        .eq('id', member.group_id)
        .single();

      await supabase
        .from('contribution_groups')
        .update({
          total_members: Math.max((group?.total_members || 1) - 1, 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', member.group_id);
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function reorderMembers(groupId: string, memberIds: string[]) {
  try {
    // Update payout positions for all members
    const updates = memberIds.map((memberId, index) =>
      supabase
        .from('contribution_members')
        .update({ payout_position: index + 1 })
        .eq('id', memberId)
    );

    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);

    if (hasError) {
      return { data: null, error: 'Failed to reorder members' };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// PAYMENT TRACKING
export async function markPaid(
  groupId: string,
  memberId: string,
  cycleNumber: number,
  data: {
    amount: number;
    paymentMethod: string;
    note?: string;
  }
) {
  try {
    const { data: payment, error } = await supabase
      .from('contribution_payments')
      .insert({
        group_id: groupId,
        member_id: memberId,
        cycle_number: cycleNumber,
        amount: data.amount,
        payment_method: data.paymentMethod,
        note: data.note,
        paid_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data: payment, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Get payment history for a specific member
export async function getMemberPaymentHistory(memberId: string) {
  try {
    const { data, error } = await supabase
      .from('contribution_payments')
      .select(`
        *,
        contribution_groups!inner(name, amount, frequency)
      `)
      .eq('member_id', memberId)
      .order('paid_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Get all payment history for a group
export async function getGroupPaymentHistory(groupId: string) {
  try {
    const { data, error } = await supabase
      .from('contribution_payments')
      .select(`
        *,
        contribution_members!inner(name)
      `)
      .eq('group_id', groupId)
      .order('paid_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function unmarkPaid(paymentId: string) {
  try {
    const { error } = await supabase
      .from('contribution_payments')
      .delete()
      .eq('id', paymentId);

    return { data: null, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPaymentsForCycle(groupId: string, cycleNumber: number) {
  try {
    const { data, error } = await supabase
      .from('contribution_payments')
      .select(`
        *,
        contribution_members!inner(name, phone)
      `)
      .eq('group_id', groupId)
      .eq('cycle_number', cycleNumber)
      .order('paid_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getUnpaidMembers(groupId: string, cycleNumber: number) {
  try {
    // Get all members
    const { data: members } = await supabase
      .from('contribution_members')
      .select('*')
      .eq('group_id', groupId);

    // Get paid members for this cycle
    const { data: payments } = await supabase
      .from('contribution_payments')
      .select('member_id')
      .eq('group_id', groupId)
      .eq('cycle_number', cycleNumber);

    const paidMemberIds = new Set(payments?.map(p => p.member_id) || []);
    const unpaidMembers = members?.filter(m => !paidMemberIds.has(m.id)) || [];

    return { data: unpaidMembers, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// PAYOUT
export async function recordPayout(
  groupId: string,
  memberId: string,
  cycleNumber: number,
  data: {
    amount: number;
    paymentMethod: string;
  }
) {
  try {
    const { data: payout, error } = await supabase
      .from('contribution_payouts')
      .insert({
        group_id: groupId,
        member_id: memberId,
        cycle_number: cycleNumber,
        amount: data.amount,
        payment_method: data.paymentMethod
      })
      .select()
      .single();

    return { data: payout, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPayoutHistory(groupId: string) {
  try {
    const { data, error } = await supabase
      .from('contribution_payouts')
      .select(`
        *,
        contribution_members!inner(name, phone)
      `)
      .eq('group_id', groupId)
      .order('cycle_number', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// CYCLE
export async function advanceCycle(groupId: string) {
  try {
    // Get current group info
    const { data: group, error: fetchError } = await supabase
      .from('contribution_groups')
      .select('current_cycle, total_members')
      .eq('id', groupId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    const nextCycle = (group?.current_cycle || 1) + 1;
    const isCompleted = nextCycle > (group?.total_members || 0);

    // Update group
    const { data: updated, error: updateError } = await supabase
      .from('contribution_groups')
      .update({
        current_cycle: nextCycle,
        status: isCompleted ? 'completed' : 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
      .single();

    return { data: updated, error: updateError };
  } catch (error) {
    return { data: null, error };
  }
}

// SHARING
export async function enableSharing(groupId: string) {
  try {
    let shareCode = generateShareCode();
    let attempts = 0;

    // Try to generate unique code (max 5 attempts)
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('contribution_groups')
        .select('id')
        .eq('share_code', shareCode)
        .single();

      if (!existing) break;

      shareCode = generateShareCode();
      attempts++;
    }

    const { data, error } = await supabase
      .from('contribution_groups')
      .update({
        share_enabled: true,
        share_code: shareCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function disableSharing(groupId: string) {
  try {
    const { data, error } = await supabase
      .from('contribution_groups')
      .update({
        share_enabled: false,
        share_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getGroupByShareCode(shareCode: string) {
  try {
    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('contribution_groups')
      .select('*')
      .eq('share_code', shareCode)
      .eq('share_enabled', true)
      .single();

    if (groupError || !group) return { data: null, error: groupError || 'Group not found' };

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('contribution_members')
      .select('*')
      .eq('group_id', group.id)
      .order('payout_position', { ascending: true });

    if (membersError) return { data: null, error: membersError };

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('contribution_payments')
      .select(`
        *,
        contribution_members!inner(name)
      `)
      .eq('group_id', group.id)
      .order('cycle_number', { ascending: false })
      .order('paid_at', { ascending: false });

    if (paymentsError) return { data: null, error: paymentsError };

    // Get all payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('contribution_payouts')
      .select(`
        *,
        contribution_members!inner(name)
      `)
      .eq('group_id', group.id)
      .order('cycle_number', { ascending: false });

    if (payoutsError) return { data: null, error: payoutsError };

    // Annotate members with current cycle payment status
    const currentPayments = payments?.filter(p => p.cycle_number === group.current_cycle) || [];
    const paidMemberIds = new Set(currentPayments.map(p => p.member_id));

    const annotatedMembers = members?.map(member => ({
      ...member,
      hasPaid: paidMemberIds.has(member.id)
    })) || [];

    return {
      data: {
        ...group,
        members: annotatedMembers,
        payments: payments || [],
        payouts: payouts || []
      },
      error: null
    };
  } catch (error) {
    return { data: null, error };
  }
}