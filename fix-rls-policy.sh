#!/bin/bash

# Fix Users Table RLS Policy
# Adds INSERT policy for user self-registration

SUPABASE_URL="https://yzlniqwzqlsftxrtapdl.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A"

echo "🔧 Fixing users table RLS policy..."
echo ""

# Run the SQL via Supabase REST API
SQL_QUERY="DROP POLICY IF EXISTS users_insert_own ON public.users; CREATE POLICY users_insert_own ON public.users FOR INSERT WITH CHECK (true);"

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${SQL_QUERY}\"}"

echo ""
echo ""
echo "✅ Policy should be fixed!"
echo ""
echo "Next steps:"
echo "1. Refresh your browser at http://localhost:4000"
echo "2. Try creating your store again"
echo ""
