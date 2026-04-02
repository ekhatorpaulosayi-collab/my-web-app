# MANUAL SQL REQUIRED - WhatsApp Fallback Timer

## Important: Database Column Missing

The WhatsApp fallback timer feature requires a database column that needs to be added manually.

### Step 1: Go to Supabase SQL Editor

Visit: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

### Step 2: Run This SQL

```sql
-- Add waiting_for_owner_since timestamp to track when customer requested human agent
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS waiting_for_owner_since TIMESTAMPTZ;

-- Add index for queries filtering by waiting status
CREATE INDEX IF NOT EXISTS idx_chat_waiting_for_owner
ON ai_chat_conversations(waiting_for_owner_since)
WHERE waiting_for_owner_since IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_chat_conversations.waiting_for_owner_since IS
  'Timestamp when customer requested to speak with store owner - used for WhatsApp fallback timer calculation';

-- Grant permissions
GRANT UPDATE (waiting_for_owner_since) ON ai_chat_conversations TO authenticated;
GRANT SELECT (waiting_for_owner_since) ON ai_chat_conversations TO anon;
```

### Step 3: Verify

After running the SQL, you can verify it worked by running:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_chat_conversations'
  AND column_name = 'waiting_for_owner_since';
```

This should return one row showing the column exists.

## Feature Status

The WhatsApp fallback timer has been deployed with fallback handling:
- ✅ Code deployed to production
- ✅ Gracefully handles missing column
- ⚠️ Timer won't persist across page refresh until column is added
- ⚠️ Full functionality requires the SQL above to be run

## What This Enables

Once the column is added:
1. **Timer Persistence**: Timer continues from correct time after page refresh
2. **Cross-Device Sync**: If customer opens chat on different device, timer state is preserved
3. **Analytics**: Store owners can track how often customers request human help

## Testing After SQL

After adding the column:
1. Visit a store page: https://smartstock-v2.vercel.app/store/[slug]
2. Start a chat
3. Click "Request Store Owner"
4. Refresh the page
5. Timer should continue from where it left off

---
Created: March 27, 2026
Status: Awaiting manual SQL execution