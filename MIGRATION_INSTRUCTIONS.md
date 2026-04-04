# Migration Instructions for Contribution Recipients Ordering

## Overview
This migration adds position tracking to contribution group members to enable reordering of recipients in the payout sequence.

## Migration Steps

### Step 1: Run the SQL Migration

Execute the following SQL in your Supabase SQL editor:

```sql
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
```

### Step 2: Verify the Migration

Run this query to verify the migration was successful:

```sql
-- Check that the position column exists and has values
SELECT
  cm.group_id,
  cm.user_id,
  cm.position,
  u.display_name,
  cm.created_at
FROM contribution_members cm
JOIN users u ON u.id = cm.user_id
ORDER BY cm.group_id, cm.position;
```

### Step 3: Test the Feature

1. Navigate to a contribution group detail page
2. Click the Settings (gear) icon
3. In the "Recipient Order" section, use the up/down arrows to reorder members
4. Click "Save Changes" to persist the new order
5. Verify the payout order reflects the new arrangement

## Features Implemented

### 1. Recipient Reordering (Settings → Recipient Order)
- Added up/down arrow buttons next to each member in the Settings modal
- Members can be reordered by clicking the arrows
- Order is saved to the database when "Save Changes" is clicked
- The payout sequence follows the custom order

### 2. Payment Method Selection Modal
- When marking a member as paid, a modal now appears
- Three payment method options: Cash, Transfer, Other
- Optional note field for payment details
- Payment method is recorded with the transaction

### 3. Collection Day Banner
- Smart banner that shows between summary card and member list
- On collection day: Shows amber banner with payment progress
- When all paid on collection day: Shows green "All Paid" banner
- Other days: Shows subtle grey text with days until next collection

## Production Deployment

The frontend changes have been deployed to production at:
- https://smartstock-v2-kwsd5x3lg-pauls-projects-cfe953d7.vercel.app

## Troubleshooting

If the position column already exists, the migration will skip that step safely.

If you encounter any issues:
1. Check that the contribution_members table exists
2. Verify you have the necessary permissions to alter tables
3. Ensure no active transactions are blocking the migration

## Rollback (if needed)

To rollback this migration:

```sql
-- Remove the position column and index
DROP INDEX IF EXISTS idx_contribution_members_position;
ALTER TABLE contribution_members DROP COLUMN IF EXISTS position;
```

---
Created: April 4, 2026
Version: 1.0.0