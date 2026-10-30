#!/bin/bash

# Paystack Go-Live Setup Script for Storehouse
# This script helps you update your Paystack configuration to live mode

echo "🚀 Storehouse - Paystack Go-Live Setup"
echo "======================================"
echo ""

# Check if live secret key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your live secret key"
    echo ""
    echo "Usage:"
    echo "  ./update-paystack-live.sh sk_live_YOUR_LIVE_SECRET_KEY"
    echo ""
    echo "Get your live keys from:"
    echo "  https://dashboard.paystack.com/#/settings/developer"
    echo ""
    exit 1
fi

LIVE_SECRET_KEY="$1"

# Validate secret key format
if [[ ! "$LIVE_SECRET_KEY" =~ ^sk_live_ ]]; then
    echo "❌ Error: Invalid secret key format"
    echo "   Live secret key must start with 'sk_live_'"
    echo ""
    exit 1
fi

echo "✓ Valid secret key format detected"
echo ""

# Update Supabase secret
echo "📝 Step 1: Updating Supabase secret key..."
echo ""

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "Set SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens)."
    exit 1
fi

supabase secrets set PAYSTACK_SECRET_KEY="$LIVE_SECRET_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Supabase secret key updated successfully!"
else
    echo "❌ Failed to update Supabase secret key"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Supabase Configuration Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update Vercel environment variable:"
echo "   - Go to: https://vercel.com/dashboard"
echo "   - Settings → Environment Variables"
echo "   - Add: VITE_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY"
echo "   - Redeploy your app"
echo ""
echo "2. Configure live webhook URL in Paystack:"
echo "   - Go to: https://dashboard.paystack.com/#/settings/developer"
echo "   - Toggle to 'Live Mode'"
echo "   - Set webhook URL to:"
echo "     https://yzlniqwzqlsftxrtapdl.supabase.co/functions/v1/paystack-webhook"
echo ""
echo "3. Update plan codes in database (if using subscriptions)"
echo ""
echo "4. Configure live keys in your app's Payment Settings UI"
echo "   (for individual merchant payments)"
echo ""
echo "======================================"
echo ""
