-- Combined Migrations for Agent Takeover & WhatsApp Verification
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

-- ============================================
-- PART 1: AGENT TAKEOVER SYSTEM
-- ============================================

-- Add agent takeover columns to conversations
ALTER TABLE ai_chat_conversations
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS agent_takeover_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS takeover_status TEXT DEFAULT 'ai' CHECK (takeover_status IN ('ai', 'agent_requested', 'agent_active', 'agent_ended')),
ADD COLUMN IF NOT EXISTS agent_notes TEXT;

-- Add sender type to messages
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'customer' CHECK (sender_type IN ('customer', 'ai', 'agent', 'system'));

-- Create agent activity table
CREATE TABLE IF NOT EXISTS agent_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations ON ai_chat_conversations(agent_id, takeover_status);

-- ============================================
-- PART 2: WHATSAPP VERIFICATION SYSTEM
-- ============================================

-- Create verification codes table
CREATE TABLE IF NOT EXISTS whatsapp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_code TEXT NOT NULL,
    session_id TEXT NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    phone_number TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create WhatsApp conversations table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    session_id TEXT,
    customer_name TEXT,
    verification_code TEXT,
    verified BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_verification_code ON whatsapp_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verification_session ON whatsapp_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_store ON whatsapp_conversations(store_id);

-- ============================================
-- PART 3: FUNCTIONS
-- ============================================

-- Function to request agent takeover
CREATE OR REPLACE FUNCTION request_agent_takeover(
    p_conversation_id UUID,
    p_customer_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    UPDATE ai_chat_conversations
    SET takeover_status = 'agent_requested', updated_at = NOW()
    WHERE id = p_conversation_id;

    IF p_customer_message IS NOT NULL THEN
        INSERT INTO ai_chat_messages (conversation_id, role, content, sender_type)
        VALUES (p_conversation_id, 'system', p_customer_message, 'system');
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'status', 'agent_requested',
        'message', 'Agent has been notified'
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to verify WhatsApp customer
CREATE OR REPLACE FUNCTION verify_whatsapp_customer(
    p_verification_code TEXT,
    p_phone_number TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_verification RECORD;
BEGIN
    SELECT * INTO v_verification
    FROM whatsapp_verifications
    WHERE verification_code = p_verification_code
        AND verified = FALSE
        AND expires_at > NOW()
    LIMIT 1;

    IF v_verification IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
    END IF;

    UPDATE whatsapp_verifications
    SET verified = TRUE, verified_at = NOW(), phone_number = p_phone_number
    WHERE id = v_verification.id;

    INSERT INTO whatsapp_conversations (
        phone_number, store_id, session_id, verification_code, verified, last_message_at
    ) VALUES (
        p_phone_number, v_verification.store_id, v_verification.session_id,
        p_verification_code, TRUE, NOW()
    )
    ON CONFLICT (phone_number, store_id) DO UPDATE
    SET session_id = v_verification.session_id, verification_code = p_verification_code,
        verified = TRUE, last_message_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_verification.session_id,
        'store_id', v_verification.store_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: PERMISSIONS
-- ============================================

-- Grant permissions
GRANT ALL ON agent_activities TO authenticated;
GRANT ALL ON whatsapp_verifications TO authenticated;
GRANT ALL ON whatsapp_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION request_agent_takeover TO authenticated;
GRANT EXECUTE ON FUNCTION verify_whatsapp_customer TO authenticated;

-- Enable RLS
ALTER TABLE whatsapp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Store owners manage WhatsApp verifications"
ON whatsapp_verifications FOR ALL
USING (store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid() OR created_by = auth.uid()
));

CREATE POLICY "Store owners manage WhatsApp conversations"
ON whatsapp_conversations FOR ALL
USING (store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid() OR created_by = auth.uid()
));

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if tables were created successfully
SELECT
    'agent_activities' as table_name,
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_activities') as exists
UNION ALL
SELECT
    'whatsapp_verifications',
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'whatsapp_verifications')
UNION ALL
SELECT
    'whatsapp_conversations',
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'whatsapp_conversations');