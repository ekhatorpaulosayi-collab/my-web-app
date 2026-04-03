-- Add member status tracking to contribution_members table
ALTER TABLE contribution_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'late', 'defaulted', 'frozen'));

ALTER TABLE contribution_members
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contribution_members_status
ON contribution_members(status);

CREATE INDEX IF NOT EXISTS idx_contribution_members_group_status
ON contribution_members(group_id, status);

-- Update contribution_payments to ensure paid_at exists
ALTER TABLE contribution_payments
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for payment history queries
CREATE INDEX IF NOT EXISTS idx_contribution_payments_member_paid
ON contribution_payments(member_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_contribution_payments_group_paid
ON contribution_payments(group_id, paid_at DESC);

-- Create a view for easy member payment status
CREATE OR REPLACE VIEW contribution_member_payment_status AS
SELECT
    cm.id,
    cm.group_id,
    cm.name,
    cm.phone,
    cm.payout_position,
    cm.status,
    cg.current_cycle,
    cg.collection_day,
    cg.frequency,
    COALESCE(
        (SELECT MAX(cp.paid_at)
         FROM contribution_payments cp
         WHERE cp.member_id = cm.id),
        NULL
    ) as last_payment_date,
    EXISTS(
        SELECT 1
        FROM contribution_payments cp
        WHERE cp.member_id = cm.id
        AND cp.cycle_number = cg.current_cycle
    ) as has_paid_current_cycle
FROM contribution_members cm
JOIN contribution_groups cg ON cm.group_id = cg.id;

-- Grant permissions
GRANT SELECT ON contribution_member_payment_status TO authenticated;
GRANT SELECT ON contribution_member_payment_status TO anon;