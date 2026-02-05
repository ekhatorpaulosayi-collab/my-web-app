#!/bin/bash

# Storehouse Quick Debug Commands
# Run with: chmod +x DEBUG_COMMANDS.sh && ./DEBUG_COMMANDS.sh [command]

case "$1" in

  # Development
  dev)
    echo "🚀 Starting development server..."
    npm run dev
    ;;

  build)
    echo "🔨 Building for production..."
    npm run build
    ;;

  deploy)
    echo "🚢 Deploying to production..."
    npm run build && vercel --prod --yes
    ;;

  # Database
  db-affiliates)
    echo "📊 Fetching latest affiliates..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, payout_email, referral_code, status, created_at FROM affiliates ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-commissions)
    echo "💰 Fetching latest commissions..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT ac.amount, ac.status, ac.created_at, a.payout_email FROM affiliate_commissions ac JOIN affiliates a ON ac.affiliate_id = a.id ORDER BY ac.created_at DESC LIMIT 10;"
    ;;

  db-referrals)
    echo "🔗 Fetching latest referrals..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, referral_code, referred_user_id, created_at FROM referrals ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-stats)
    echo "📈 Affiliate program stats..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "
      SELECT
        COUNT(DISTINCT a.id) as total_affiliates,
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT ac.id) as total_commissions,
        COALESCE(SUM(ac.amount), 0) as total_commission_amount
      FROM affiliates a
      LEFT JOIN referrals r ON a.id = r.affiliate_id
      LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id;
    "
    ;;

  db-products)
    echo "📦 Fetching latest products..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, name, price, user_id, created_at FROM products ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-invoices)
    echo "🧾 Fetching latest invoices..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, invoice_number, customer_name, total, status, created_at FROM invoices ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-customers)
    echo "👥 Fetching latest customers..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, name, phone, email, total_purchases, created_at FROM customers ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-reviews)
    echo "⭐ Fetching latest reviews..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, rating, comment, reviewer_name, created_at FROM reviews ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-staff)
    echo "👨‍💼 Fetching staff members..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, name, email, role, status, created_at FROM staff ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-stores)
    echo "🏪 Fetching online stores..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, business_name, store_slug, custom_domain, subdomain, storefront_enabled FROM business_profiles WHERE storefront_enabled = true ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-check-slug)
    echo "🔍 Checking store slug: $2"
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, business_name, store_slug, storefront_enabled FROM business_profiles WHERE store_slug = '$2';"
    ;;

  db-chat-history)
    echo "💬 Fetching AI chat history..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT id, message, response, created_at FROM ai_chat_history ORDER BY created_at DESC LIMIT 10;"
    ;;

  db-errors)
    echo "🔴 Fetching recent errors..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT error_type, COUNT(*) as count, MAX(created_at) as last_seen FROM error_logs GROUP BY error_type ORDER BY count DESC LIMIT 10;"
    ;;

  db-query)
    echo "🔍 Running custom query..."
    PGPASSWORD="Godisgood1." psql "postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "$2"
    ;;

  # Logs
  logs)
    echo "📋 Viewing production logs..."
    vercel logs storehouse.ng --follow
    ;;

  logs-deployment)
    echo "📋 Viewing latest deployment logs..."
    vercel ls --prod
    ;;

  # Cache
  clear-cache)
    echo "🧹 Clearing local build cache..."
    rm -rf node_modules/.vite
    rm -rf dist
    echo "✅ Cache cleared!"
    ;;

  # Testing
  test-affiliate)
    echo "🧪 Testing affiliate flow..."
    echo "1. Visit: https://storehouse.ng/affiliate/signup"
    echo "2. Sign up as affiliate"
    echo "3. Get referral link from dashboard"
    echo "4. Open incognito and use: https://storehouse.ng/?ref=YOUR_CODE"
    echo "5. Sign up and subscribe"
    echo "6. Check dashboard for commission"
    ;;

  # Environment
  env-pull)
    echo "⬇️  Pulling environment variables from Vercel..."
    vercel env pull .env.local
    ;;

  env-list)
    echo "📝 Listing Vercel environment variables..."
    vercel env ls
    ;;

  # Sentry setup
  setup-sentry)
    echo "🔔 Setting up Sentry monitoring..."
    echo ""
    echo "1. Visit: https://sentry.io/signup/"
    echo "2. Create account (FREE tier)"
    echo "3. Create new project: 'Storehouse'"
    echo "4. Copy your DSN (looks like: https://...@sentry.io/...)"
    echo "5. Run: vercel env add VITE_SENTRY_DSN"
    echo "6. Paste your DSN"
    echo "7. Run: ./DEBUG_COMMANDS.sh deploy"
    echo ""
    echo "Done! Sentry will now monitor your production errors."
    ;;

  # Help
  help|*)
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Storehouse Debug Commands - Quick Reference      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: ./DEBUG_COMMANDS.sh [command]"
    echo ""
    echo "📦 Development:"
    echo "  dev              - Start development server"
    echo "  build            - Build for production"
    echo "  deploy           - Build and deploy to production"
    echo ""
    echo "💾 Database - Affiliate & Revenue:"
    echo "  db-affiliates    - View latest affiliates"
    echo "  db-commissions   - View latest commissions"
    echo "  db-referrals     - View latest referrals"
    echo "  db-stats         - View affiliate program statistics"
    echo ""
    echo "💾 Database - Business Features:"
    echo "  db-products      - View latest products"
    echo "  db-invoices      - View latest invoices"
    echo "  db-customers     - View latest customers"
    echo "  db-reviews       - View latest customer reviews"
    echo "  db-staff         - View staff members"
    echo "  db-stores        - View all online stores with slugs"
    echo "  db-check-slug SLUG - Check if a specific slug exists"
    echo ""
    echo "💾 Database - Technical:"
    echo "  db-chat-history  - View AI chat history"
    echo "  db-errors        - View recent error logs"
    echo "  db-query \"SQL\"   - Run custom SQL query"
    echo ""
    echo "📋 Logs & Monitoring:"
    echo "  logs             - View production logs (follow mode)"
    echo "  logs-deployment  - List recent deployments"
    echo ""
    echo "🔧 Maintenance:"
    echo "  clear-cache      - Clear local build cache"
    echo "  env-pull         - Pull environment variables from Vercel"
    echo "  env-list         - List Vercel environment variables"
    echo ""
    echo "🧪 Testing & Setup:"
    echo "  test-affiliate   - Show steps to test affiliate flow"
    echo "  setup-sentry     - Setup automated error monitoring"
    echo ""
    echo "📚 Documentation:"
    echo "  See DEBUGGING_GUIDE.md for complete reference"
    echo "  See QUICK_START.md for quick tips"
    echo ""
    ;;
esac
