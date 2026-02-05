#!/bin/bash
# Affiliate Program Migration Deployment Script

echo "🚀 Deploying Affiliate Program Migration..."
echo "============================================"

# Check if PostgreSQL client is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found"
    echo ""
    echo "Please use Supabase Dashboard instead:"
    echo "1. Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new"
    echo "2. Copy contents of: supabase/migrations/20250115_affiliate_program.sql"
    echo "3. Paste and click 'Run'"
    echo ""
    exit 1
fi

# Database connection string
DB_URL="postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Run migration
PGPASSWORD="Godisgood1." psql "$DB_URL" -f supabase/migrations/20250115_affiliate_program.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration deployed successfully!"
    echo ""
    echo "Verifying tables..."
    PGPASSWORD="Godisgood1." psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'affiliate%';"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please use Supabase Dashboard method instead."
fi
