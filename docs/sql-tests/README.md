# SQL Tests & Migrations

This folder contains all SQL scripts for database setup, testing, and migrations.

## 📁 File Structure

### Phase 1 - Database Foundation
- **`phase1_database_setup.sql`** - Initial database setup script (has type casting issue)
- **`phase1_database_setup_fixed.sql`** - Fixed version with proper UUID type casting
- **`test_phase1.sql`** - Test script to verify Phase 1 (has foreign key issue)
- **`test_phase1_fixed.sql`** - Fixed test script that handles auth.users foreign key

## 🎯 Quick Start

### Setting Up Database (Phase 1)
1. Run `phase1_database_setup_fixed.sql` in Supabase SQL Editor
2. Run `test_phase1_fixed.sql` to verify setup
3. Look for: "✅✅✅ SUCCESS: Anonymous users CAN see 2 test messages"

## ✅ Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Database foundation (RLS, columns, RPC functions) |
| Phase 2 | 🔄 In Progress | Customer Chat Widget fixes |
| Phase 3 | ⏳ Pending | Agent Dashboard fixes |
| Phase 4 | ⏳ Pending | WhatsApp Fallback implementation |
| Phase 5 | ⏳ Pending | Complete system testing |

## 🔑 Key Changes Made

### Database Structure
- Added WhatsApp fields to `stores` table
- Added agent fields to `ai_chat_conversations` table
- Added agent tracking to `ai_chat_messages` table

### RLS Policies
- **CRITICAL**: Made message SELECT policy permissive (`USING (true)`)
- This allows anonymous users to see agent messages

### RPC Functions
- Created `send_agent_message` function for agents to send messages
- Handles conversation state updates automatically

## 🧪 Testing

Always run test scripts after any database changes:
```sql
-- Run the latest test script
-- Look for SUCCESS messages in the output
```

## ⚠️ Common Issues

1. **Type Casting Error**: Use `::text` when comparing UUIDs with text
2. **Foreign Key Error**: `agent_id` must exist in `auth.users` table
3. **RLS Blocking**: Ensure SELECT policies use `USING (true)` for public access

## 📝 Notes

- All scripts are idempotent (safe to run multiple times)
- Scripts use `IF NOT EXISTS` to prevent duplicate errors
- Test scripts clean up after themselves

Last Updated: March 26, 2024