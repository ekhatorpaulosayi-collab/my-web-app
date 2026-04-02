-- Create contribution groups table
CREATE TABLE IF NOT EXISTS contribution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  collection_day TEXT,
  total_members INTEGER DEFAULT 0,
  current_cycle INTEGER DEFAULT 1,
  share_enabled BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contribution members table
CREATE TABLE IF NOT EXISTS contribution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES contribution_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  payout_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contribution payments table
CREATE TABLE IF NOT EXISTS contribution_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES contribution_groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES contribution_members(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'pos', 'other')),
  note TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contribution payouts table
CREATE TABLE IF NOT EXISTS contribution_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES contribution_groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES contribution_members(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contribution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owners
CREATE POLICY "Users manage own groups"
  ON contribution_groups FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage members in own groups"
  ON contribution_members FOR ALL
  USING (group_id IN (SELECT id FROM contribution_groups WHERE user_id = auth.uid()));

CREATE POLICY "Users manage payments in own groups"
  ON contribution_payments FOR ALL
  USING (group_id IN (SELECT id FROM contribution_groups WHERE user_id = auth.uid()));

CREATE POLICY "Users manage payouts in own groups"
  ON contribution_payouts FOR ALL
  USING (group_id IN (SELECT id FROM contribution_groups WHERE user_id = auth.uid()));

-- Public view policies for shared groups
CREATE POLICY "Public view shared groups"
  ON contribution_groups FOR SELECT
  USING (share_enabled = true AND share_code IS NOT NULL);

CREATE POLICY "Public view shared members"
  ON contribution_members FOR SELECT
  USING (group_id IN (SELECT id FROM contribution_groups WHERE share_enabled = true AND share_code IS NOT NULL));

CREATE POLICY "Public view shared payments"
  ON contribution_payments FOR SELECT
  USING (group_id IN (SELECT id FROM contribution_groups WHERE share_enabled = true AND share_code IS NOT NULL));

CREATE POLICY "Public view shared payouts"
  ON contribution_payouts FOR SELECT
  USING (group_id IN (SELECT id FROM contribution_groups WHERE share_enabled = true AND share_code IS NOT NULL));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contribution_groups_user
  ON contribution_groups(user_id);

CREATE INDEX IF NOT EXISTS idx_contribution_groups_share_code
  ON contribution_groups(share_code)
  WHERE share_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contribution_members_group
  ON contribution_members(group_id);

CREATE INDEX IF NOT EXISTS idx_contribution_payments_group_cycle
  ON contribution_payments(group_id, cycle_number);

CREATE INDEX IF NOT EXISTS idx_contribution_payouts_group_cycle
  ON contribution_payouts(group_id, cycle_number);

-- Create unique index for member payout position within a group
CREATE UNIQUE INDEX IF NOT EXISTS idx_contribution_members_group_position
  ON contribution_members(group_id, payout_position);