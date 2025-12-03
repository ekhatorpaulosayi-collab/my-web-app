/**
 * Check if WhatsApp tables exist
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkTables() {
  console.log('🔍 Checking WhatsApp tables...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Check each table
  const tables = ['subscription_tiers', 'whatsapp_settings', 'whatsapp_chats']

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ ${table}: NOT FOUND`)
        console.log(`   Error: ${error.message}\n`)
      } else {
        console.log(`✅ ${table}: EXISTS (${data?.length || 0} rows found)\n`)
      }
    } catch (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}\n`)
    }
  }

  console.log('\n📋 Summary:')
  console.log('If any tables are missing, run the migration SQL in Supabase Dashboard:')
  console.log('https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql\n')
}

checkTables().catch(console.error)
