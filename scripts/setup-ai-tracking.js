/**
 * Setup AI Chat Tracking Tables
 *
 * This script helps you run the SQL migrations to set up AI chat tracking.
 *
 * Usage:
 * 1. Make sure you have your Supabase URL and Service Role Key
 * 2. Run: node scripts/setup-ai-tracking.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================');
console.log('AI CHAT TRACKING SETUP');
console.log('================================\n');

const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', 'create_ai_chat_tracking_tables.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

console.log('📋 SQL file ready to execute!\n');
console.log('Follow these steps to set up AI chat tracking:\n');
console.log('1. Go to your Supabase Dashboard:');
console.log('   https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new\n');
console.log('2. Copy the entire SQL from:');
console.log(`   ${sqlFilePath}\n`);
console.log('3. Paste it into the SQL editor');
console.log('4. Click "Run" to execute\n');
console.log('5. You should see a success message with all created tables\n');

console.log('Alternatively, you can run this SQL using the Supabase CLI:');
console.log('npx supabase db push --db-url "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"\n');

console.log('================================');
console.log('What these tables do:');
console.log('================================\n');
console.log('✅ ai_chat_usage - Tracks monthly usage per user');
console.log('✅ ai_chat_messages - Stores chat history');
console.log('✅ ai_response_cache - Caches common responses');
console.log('✅ ai_chat_analytics - Tracks all chat events');
console.log('✅ ai_chat_rate_limits - Manages visitor limits\n');

console.log('================================');
console.log('After running the SQL:');
console.log('================================\n');
console.log('1. Update the ai-chat Edge Function with tracking');
console.log('2. Deploy the updated Edge Function');
console.log('3. Test the chat widget to verify tracking\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file found\n');

    // Read env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL');
    const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY');

    if (hasSupabaseUrl && hasSupabaseKey) {
        console.log('✅ Supabase credentials found in .env\n');
    } else {
        console.log('⚠️ Missing Supabase credentials in .env\n');
    }
} else {
    console.log('⚠️ No .env file found\n');
}

console.log('Need help? Check the documentation:');
console.log('- AI_CHAT_SIMPLE_IMPLEMENTATION.md');
console.log('- AI_CHAT_COST_ANALYSIS_CORRECTED.md\n');