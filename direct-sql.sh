#!/bin/bash

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Do not paste a connection string into this file."
  exit 1
fi
CONNECTION_STRING="$DATABASE_URL"

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
    echo "   (DATABASE_URL is set; the value is not printed)"
fi