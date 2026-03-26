import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyWhatsAppFallback() {
  console.log('🔧 Applying WhatsApp fallback timer migration...\n');

  const migration = `
    -- Add WhatsApp fallback timer configuration to stores
    ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS wa_fallback_minutes INTEGER DEFAULT 5
      CHECK (wa_fallback_minutes >= 1 AND wa_fallback_minutes <= 30);

    -- Add moved_to_whatsapp_at column
    ALTER TABLE ai_chat_conversations
    ADD COLUMN IF NOT EXISTS moved_to_whatsapp_at TIMESTAMPTZ;

    -- Add index for tracking WhatsApp transfers
    CREATE INDEX IF NOT EXISTS idx_chat_whatsapp_transfers
    ON ai_chat_conversations(moved_to_whatsapp_at)
    WHERE moved_to_whatsapp_at IS NOT NULL;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', {
      query: migration
    });

    if (error) {
      // Try direct SQL execution
      console.log('Trying alternative method...');

      // Execute each statement separately
      const statements = [
        `ALTER TABLE stores ADD COLUMN IF NOT EXISTS wa_fallback_minutes INTEGER DEFAULT 5 CHECK (wa_fallback_minutes >= 1 AND wa_fallback_minutes <= 30)`,
        `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS moved_to_whatsapp_at TIMESTAMPTZ`,
        `CREATE INDEX IF NOT EXISTS idx_chat_whatsapp_transfers ON ai_chat_conversations(moved_to_whatsapp_at) WHERE moved_to_whatsapp_at IS NOT NULL`
      ];

      for (const stmt of statements) {
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        // Note: Supabase doesn't directly support DDL through the client
        // We'll need to use the SQL editor or migration system
      }

      console.log('\n⚠️  Please run the following SQL in Supabase SQL editor:');
      console.log(migration);
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Check current structure
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, whatsapp_number, wa_fallback_minutes')
      .limit(1);

    if (stores && stores[0]) {
      console.log('\n📊 Sample store structure:');
      console.log('   - whatsapp_number:', stores[0].whatsapp_number ? '✅ Exists' : '❌ Missing');
      console.log('   - wa_fallback_minutes:', stores[0].wa_fallback_minutes || 'Not set yet');
    }

  } catch (error) {
    console.error('Error:', error);
    console.log('\n📋 Please run this SQL manually in Supabase:');
    console.log(migration);
  }
}

applyWhatsAppFallback();