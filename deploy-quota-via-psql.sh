#!/bin/bash

echo ""
echo "🚀 DEPLOYING QUOTA CHECK FUNCTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Read the SQL file
SQL_FILE="./supabase/migrations/20241230000004_create_chat_quota_function.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set. Do not paste a connection string into this file."
    exit 1
fi

echo "📦 Deploying check_chat_quota() function..."
echo ""

# Deploy via docker + postgres
docker run --rm postgres:15 psql \
  "$DATABASE_URL" \
  -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Quota function deployed successfully!"
    echo ""
    echo "Testing function..."
    docker run --rm postgres:15 psql \
      "$DATABASE_URL" \
      -c "SELECT proname FROM pg_proc WHERE proname = 'check_chat_quota';"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PHASE 2 STEP 1: COMPLETE"
echo ""
