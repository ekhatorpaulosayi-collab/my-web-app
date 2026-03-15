#!/bin/bash

# Deploy AI Chat with Tracking
# This script deploys the updated AI chat Edge Function with usage tracking

echo "================================"
echo "DEPLOYING AI CHAT WITH TRACKING"
echo "================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "📋 Steps to deploy the updated AI chat function:"
echo ""
echo "1. First, make sure the tracking tables are created in Supabase"
echo "   (Run the SQL from supabase/migrations/create_ai_chat_tracking_tables.sql)"
echo ""
echo "2. Back up the current Edge Function:"
echo "   cp supabase/functions/ai-chat/index.ts supabase/functions/ai-chat/index-backup.ts"
echo ""
echo "3. Replace with the new tracking version:"
echo "   cp supabase/functions/ai-chat/index-with-tracking.ts supabase/functions/ai-chat/index.ts"
echo ""
echo "4. Deploy the updated function:"
echo "   supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl"
echo ""
echo "5. Test the function to ensure tracking works"
echo ""
echo "================================"
echo "IMPORTANT NOTES:"
echo "================================"
echo ""
echo "⚠️  Make sure you have:"
echo "   - Created the tracking tables first"
echo "   - Backed up the current function"
echo "   - Tested in development"
echo ""
echo "📊 After deployment, you can monitor:"
echo "   - ai_chat_usage table for monthly usage"
echo "   - ai_chat_analytics table for events"
echo "   - ai_response_cache table for cache hits"
echo ""

# Ask for confirmation
read -p "Ready to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Creating backup..."
    cp supabase/functions/ai-chat/index.ts supabase/functions/ai-chat/index-backup-$(date +%Y%m%d-%H%M%S).ts

    echo "Copying new version..."
    cp supabase/functions/ai-chat/index-with-tracking.ts supabase/functions/ai-chat/index.ts

    echo ""
    echo "✅ Files prepared for deployment!"
    echo ""
    echo "Now run:"
    echo "supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl"
else
    echo "Deployment cancelled."
fi