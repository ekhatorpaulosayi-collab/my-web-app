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

// ROTATION (Stage 2) — has-collected ledger derived from contribution_payouts.
// A member has "collected" IFF a payout row exists for them in this group. The
// current recipient is the LOWEST payout_position among members with NO payout row.
// This makes the recipient depend on collected-status, not on payout_position ===
// current_cycle — so reordering can never double-collect or skip someone.

// Returns the set of member_ids that already have a payout row in this group.
export async function getCollectedMemberIds(groupId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('contribution_payouts')
    .select('member_id')
    .eq('group_id', groupId);
  if (error) {
    console.error('[contributions] getCollectedMemberIds failed:', error);
    // Fail safe: treat as "unknown" → empty set means everyone reads uncollected.
    // Callers should still gate writes via recordPayout's own existence check.
    return new Set<string>();
  }
  return new Set((data || []).map((r: { member_id: string }) => r.member_id));
}

// Pure selector: lowest payout_position among members WITHOUT a payout row.
// Returns null when every member has collected (rotation complete → no current recipient).
function pickCurrentRecipient<T extends { id: string; payout_position: number }>(
  members: T[],
  collectedIds: Set<string>
): T | null {
  const uncollected = (members || [])
    .filter(m => !collectedIds.has(m.id))
    .sort((a, b) => a.payout_position - b.payout_position);
  return uncollected.length > 0 ? uncollected[0] : null;
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
    cycleStartDate?: string; // Stage 4: YYYY-MM-DD first collection date
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
      cycle_start_date: data.cycleStartDate || null, // Stage 4
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

      // Current recipient = lowest payout_position among members with no payout row
      // (Stage 2). null when everyone has collected (rotation complete).
      const collectedIds = await getCollectedMemberIds(group.id);
      const currentRecipient = pickCurrentRecipient(
        group.contribution_members || [],
        collectedIds
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

    // Get payout history (also the has-collected ledger for recipient selection)
    const { data: payouts, error: payoutsError } = await supabase
      .from('contribution_payouts')
      .select(`
        *,
        contribution_members!inner(name)
      `)
      .eq('group_id', groupId)
      .order('cycle_number', { ascending: false });

    if (payoutsError) return { data: null, error: payoutsError };

    // Annotate members with payment status (this cycle) and collected status (ever).
    const paidMemberIds = new Set(payments?.map(p => p.member_id) || []);
    const collectedMemberIds = new Set((payouts || []).map(p => p.member_id));
    const annotatedMembers = members?.map(member => ({
      ...member,
      hasPaid: paidMemberIds.has(member.id),
      hasCollected: collectedMemberIds.has(member.id)
    })) || [];

    // Current recipient = lowest payout_position among members with no payout row
    // (Stage 2). null when everyone has collected (rotation complete).
    const currentRecipient = pickCurrentRecipient(annotatedMembers, collectedMemberIds);

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

// Stage 3: transactional reorder via RPC (single atomic statement; no UNIQUE collision;
// collected members kept at front; rejects reordering a collected member). memberIds is
// the desired order of the NOT-yet-collected members.
export async function reorderMembers(groupId: string, memberIds: string[]) {
  try {
    const { error } = await supabase.rpc('reorder_contribution_members', {
      p_group_id: groupId,
      p_member_ids: memberIds
    });
    if (error) return { data: null, error };
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Stage 3: add member via RPC — allowed only before the first payout; appends at end;
// recomputes total_members. Returns the new member id.
export async function addMemberSafe(groupId: string, name: string, phone?: string) {
  try {
    const { data, error } = await supabase.rpc('add_contribution_member', {
      p_group_id: groupId,
      p_name: name,
      p_phone: phone ?? null
    });
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Stage 3: remove member via RPC — blocked if the member already collected; otherwise
// deletes, re-packs positions 1..N, recomputes total_members. One atomic transaction.
export async function removeMemberSafe(memberId: string) {
  try {
    const { error } = await supabase.rpc('remove_contribution_member', {
      p_member_id: memberId
    });
    if (error) return { data: null, error };
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
    // PAYOUT GATE (Stage 2): no double-collect. A member may have at most ONE payout
    // row per group across the whole rotation — reject if one already exists.
    const { data: existing, error: existErr } = await supabase
      .from('contribution_payouts')
      .select('id')
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .limit(1);

    if (existErr) return { data: null, error: existErr };
    if (existing && existing.length > 0) {
      return { data: null, error: { message: 'This member has already collected in this group.' } };
    }

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

    if (error) return { data: payout, error };

    // Recording a payout IS the advance (Stage 2): keep current_cycle consistent as a
    // derived counter (= number of payouts made so far) and mark the group completed
    // when everyone has collected. Recipient selection itself is derived from payout
    // rows, so this is for display/status only — it never selects a member.
    try {
      const [{ count: payoutCount }, { count: memberCount }] = await Promise.all([
        supabase.from('contribution_payouts')
          .select('*', { count: 'exact', head: true }).eq('group_id', groupId),
        supabase.from('contribution_members')
          .select('*', { count: 'exact', head: true }).eq('group_id', groupId),
      ]);
      const collected = payoutCount || 0;
      const total = memberCount || 0;
      await supabase
        .from('contribution_groups')
        .update({
          current_cycle: collected,
          status: total > 0 && collected >= total ? 'completed' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId);
    } catch (syncErr) {
      // Non-fatal: the payout is recorded; the derived counter can self-correct later.
      console.warn('[contributions] recordPayout: current_cycle sync failed (non-fatal):', syncErr);
    }

    return { data: payout, error: null };
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
// Stage 2: "advancing" the cycle = the CURRENT (derived) recipient collects. This
// records a payout for the lowest-position uncollected member via recordPayout (which
// gates double-collect and syncs current_cycle). It can NEVER select a collected member
// or blindly increment a counter. amount defaults to total_members * group.amount.
export async function advanceCycle(
  groupId: string,
  paymentMethod: string = 'cash'
) {
  try {
    // Resolve group + members + collected ledger
    const { data: group, error: fetchError } = await supabase
      .from('contribution_groups')
      .select('amount, total_members')
      .eq('id', groupId)
      .single();
    if (fetchError) return { data: null, error: fetchError };

    const { data: members, error: membersError } = await supabase
      .from('contribution_members')
      .select('id, payout_position')
      .eq('group_id', groupId)
      .order('payout_position', { ascending: true });
    if (membersError) return { data: null, error: membersError };

    const collectedIds = await getCollectedMemberIds(groupId);
    const recipient = pickCurrentRecipient(members || [], collectedIds);

    if (!recipient) {
      return { data: null, error: { message: 'Rotation complete — everyone has collected.' } };
    }

    // Pot = amount per member × member count (display/default; not re-derived here).
    const memberCount = (members || []).length;
    const payoutAmount = Number(group?.amount || 0) * memberCount;

    // cycle_number recorded as the recipient's position (their turn number).
    return await recordPayout(groupId, recipient.id, recipient.payout_position, {
      amount: payoutAmount,
      paymentMethod
    });
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