-- SQL to add position column to contribution_members table for recipient ordering

-- Add the position column if it doesn't exist
ALTER TABLE contribution_members
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Create an index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_contribution_members_position
ON contribution_members(group_id, position);

-- Update existing records to have sequential positions based on join date
WITH ordered_members AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at) - 1 as new_position
  FROM contribution_members
)
UPDATE contribution_members
SET position = ordered_members.new_position
FROM ordered_members
WHERE contribution_members.id = ordered_members.id;

-- Add comment to explain the column
COMMENT ON COLUMN contribution_members.position IS 'Order position for recipient rotation (0-based index)';