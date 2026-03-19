-- =====================================================
-- FIX CHAT MESSAGE STORAGE FOR VISITOR/CUSTOMER CHATS
-- This migration enables store owners to see all chats
-- including those from visitors when they were offline
-- =====================================================

-- STEP 1: Modify the ai_chat_messages table to better handle visitor chats
-- =====================================================
ALTER TABLE ai_chat_messages
  ADD COLUMN IF NOT EXISTS visitor_ip TEXT,
  ADD COLUMN IF NOT EXISTS visitor_name TEXT,
  ADD COLUMN IF NOT EXISTS visitor_email TEXT,
  ADD COLUMN IF NOT EXISTS visitor_phone TEXT,
  ADD COLUMN IF NOT EXISTS is_visitor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_by_owner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_slug TEXT;

-- Add index for store slug lookups
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_store_slug
ON ai_chat_messages(store_slug, created_at DESC);

-- Add index for unread messages
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_unread
ON ai_chat_messages(store_id, read_by_owner) WHERE read_by_owner = false;

-- STEP 2: Update RLS policies to allow store owners to see ALL messages for their store
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "System can manage all messages" ON ai_chat_messages;

-- Create new comprehensive policies
CREATE POLICY "Store owners can view all store messages" ON ai_chat_messages
  FOR SELECT USING (
    -- Allow store owners to see all messages for their stores
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
    OR
    -- Allow users to see their own messages
    user_id = auth.uid()
  );

CREATE POLICY "Anyone can insert chat messages" ON ai_chat_messages
  FOR INSERT WITH CHECK (true);  -- Allow visitors to save messages

CREATE POLICY "Store owners can update message status" ON ai_chat_messages
  FOR UPDATE USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access" ON ai_chat_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- STEP 3: Create a view for easy chat conversation access
-- =====================================================
CREATE OR REPLACE VIEW chat_conversations AS
SELECT
  session_id,
  store_id,
  store_slug,
  MIN(created_at) as started_at,
  MAX(created_at) as last_message_at,
  COUNT(*) as message_count,
  MAX(CASE WHEN role = 'user' THEN content END) as last_user_message,
  BOOL_OR(NOT read_by_owner AND role = 'user') as has_unread,
  MAX(visitor_name) as visitor_name,
  MAX(visitor_email) as visitor_email,
  MAX(visitor_phone) as visitor_phone,
  MAX(visitor_ip) as visitor_ip,
  ARRAY_AGG(
    jsonb_build_object(
      'role', role,
      'content', content,
      'created_at', created_at
    ) ORDER BY created_at
  ) as messages
FROM ai_chat_messages
WHERE context_type IN ('storefront', 'storefront_visitor')
GROUP BY session_id, store_id, store_slug;

-- Grant permissions on the view
GRANT SELECT ON chat_conversations TO authenticated;

-- STEP 4: Create function to mark conversations as read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_session_id TEXT,
  p_store_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE ai_chat_messages
  SET read_by_owner = true
  WHERE session_id = p_session_id
    AND store_id = p_store_id
    AND role = 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create function to get unread message count for store owner
-- =====================================================
CREATE OR REPLACE FUNCTION get_unread_chat_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT session_id)
    FROM ai_chat_messages m
    JOIN stores s ON m.store_id = s.id
    WHERE s.user_id = p_user_id
      AND m.role = 'user'
      AND m.read_by_owner = false
      AND m.context_type IN ('storefront', 'storefront_visitor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Create notification trigger for new customer messages
-- =====================================================
CREATE OR REPLACE FUNCTION notify_store_owner_of_chat()
RETURNS TRIGGER AS $$
DECLARE
  store_owner_id UUID;
  store_name_var TEXT;
BEGIN
  -- Only notify for visitor/customer messages
  IF NEW.role = 'user' AND NEW.is_visitor = true THEN
    -- Get store owner
    SELECT user_id, name INTO store_owner_id, store_name_var
    FROM stores
    WHERE id = NEW.store_id;

    -- Insert a notification (you'll need to create notifications table if not exists)
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      created_at
    ) VALUES (
      store_owner_id,
      'new_chat_message',
      'New customer message',
      'A customer sent a message on your store: ' || COALESCE(store_name_var, 'Your Store'),
      jsonb_build_object(
        'session_id', NEW.session_id,
        'store_id', NEW.store_id,
        'message_preview', LEFT(NEW.content, 100)
      ),
      NOW()
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if not exists)
DROP TRIGGER IF EXISTS chat_message_notification ON ai_chat_messages;
CREATE TRIGGER chat_message_notification
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_store_owner_of_chat();

-- STEP 7: Create notifications table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- STEP 8: Success message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Chat message storage fixed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - Visitor chats can now be saved';
  RAISE NOTICE '  - Store owners can see all chats for their stores';
  RAISE NOTICE '  - Added conversation grouping view';
  RAISE NOTICE '  - Added read/unread tracking';
  RAISE NOTICE '  - Added notification system for new messages';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update Edge Function to save visitor messages';
  RAISE NOTICE '  2. Create Chat History Dashboard in frontend';
  RAISE NOTICE '  3. Add notification badge to navigation';
END $$;