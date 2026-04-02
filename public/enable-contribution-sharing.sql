-- Enable sharing for all existing contribution groups that have a share_code
-- This fixes the issue where groups were created with share_enabled=false

UPDATE contribution_groups
SET share_enabled = true
WHERE share_code IS NOT NULL
  AND share_code != ''
  AND share_enabled = false;

-- Verify the update
SELECT
  id,
  name,
  share_code,
  share_enabled,
  status
FROM contribution_groups
WHERE share_code IS NOT NULL
ORDER BY created_at DESC;