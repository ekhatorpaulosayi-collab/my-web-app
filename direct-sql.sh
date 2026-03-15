#!/bin/bash

# Supabase Database Connection Details
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.yzlniqwzqlsftxrtapdl"
DB_PASS="Godisgood1."

# Connection string
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "🔗 Connecting to Supabase Database..."
echo ""
echo "You can run any SQL command. Examples:"
echo "  \\dt                    -- List all tables"
echo "  \\d subscription_tiers  -- Show table structure"
echo "  SELECT * FROM subscription_tiers;"
echo "  UPDATE subscription_tiers SET ... WHERE ...;"
echo ""
echo "Type \\q to exit"
echo ""

# Connect with psql (if installed)
psql "$CONNECTION_STRING"

# If psql is not installed, show alternative
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  psql not installed. You can:"
    echo "1. Install PostgreSQL client: sudo apt-get install postgresql-client"
    echo "2. Use the Supabase Dashboard: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new"
    echo "3. Use the connection string in any SQL client:"
    echo "   $CONNECTION_STRING"
fi