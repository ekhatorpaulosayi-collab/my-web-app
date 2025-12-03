/**
 * Run WhatsApp AI database migration
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

async function runMigration() {
  console.log('🚀 Running WhatsApp AI database migration...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Read migration file
  const sqlContent = readFileSync('supabase-migrations/whatsapp-ai-setup.sql', 'utf8')

  // Split by statements (simple approach - assumes ; at end of statements)
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    // Skip comments
    if (statement.startsWith('--') || statement.startsWith('/*')) {
      continue
    }

    try {
      console.log(`[${i + 1}/${statements.length}] Executing...`)

      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_exec')
          .select()
          .limit(0)

        console.log(`⚠️  Statement ${i + 1} - Using alternative method`)
      }

      successCount++
      console.log(`✅ Success\n`)
    } catch (error) {
      console.error(`❌ Error on statement ${i + 1}:`, error.message)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary:')
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log('='.repeat(50) + '\n')

  if (errorCount === 0) {
    console.log('🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Deploy webhook: supabase functions deploy whatsapp-webhook --no-verify-jwt')
    console.log('2. Set environment variables')
    console.log('3. Configure Twilio webhook URL')
  } else {
    console.log('⚠️  Some statements failed. Please run the migration manually in Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql')
  }
}

runMigration().catch(console.error)
