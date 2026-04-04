-- SQL to add cycle_start_date column to contribution_groups table

-- Add the cycle_start_date column if it doesn't exist
ALTER TABLE contribution_groups
ADD COLUMN IF NOT EXISTS cycle_start_date DATE;

-- Set default values for existing records using their created_at date
UPDATE contribution_groups
SET cycle_start_date = created_at::DATE
WHERE cycle_start_date IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN contribution_groups.cycle_start_date IS 'The date from which to calculate the first collection day. First collection occurs on the first matching collection_day after this date.';