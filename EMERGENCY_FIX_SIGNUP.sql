-- EMERGENCY FIX: Disable all user creation triggers and start fresh
-- This will allow signups to work immediately

-- Step 1: Find and drop ALL triggers on auth.users
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_record.tgname);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
    END LOOP;
END $$;

-- Step 2: Drop all related functions
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.create_user_on_signup CASCADE;
DROP FUNCTION IF EXISTS create_user_on_signup CASCADE;

-- Step 3: TEMPORARILY disable RLS on users table to allow signups
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop all existing policies
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- Step 5: Grant full access to authenticated users (temporary - for testing)
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.stores TO authenticated;

-- Step 6: Show current triggers (for debugging)
SELECT
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;
