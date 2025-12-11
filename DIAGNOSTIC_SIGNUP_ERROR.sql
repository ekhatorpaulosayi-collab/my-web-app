-- COMPREHENSIVE DIAGNOSTIC FOR SIGNUP ERROR
-- Run this to identify what's blocking signups

-- ============================================
-- 1. CHECK ALL TRIGGERS ON auth.users
-- ============================================
SELECT
    'TRIGGERS ON auth.users' as check_type,
    tgname as trigger_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- ============================================
-- 2. CHECK ALL FUNCTIONS THAT MIGHT BE CALLED
-- ============================================
SELECT
    'FUNCTIONS IN PUBLIC SCHEMA' as check_type,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%user%'
    OR routine_name LIKE '%auth%'
    OR routine_name LIKE '%signup%'
);

-- ============================================
-- 3. CHECK USERS TABLE SCHEMA
-- ============================================
SELECT
    'USERS TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK RLS STATUS ON USERS TABLE
-- ============================================
SELECT
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================
-- 5. CHECK ALL POLICIES ON USERS TABLE
-- ============================================
SELECT
    'POLICIES ON USERS' as check_type,
    policyname as policy_name,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================
-- 6. CHECK STORES TABLE SCHEMA
-- ============================================
SELECT
    'STORES TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'stores'
ORDER BY ordinal_position;

-- ============================================
-- 7. CHECK FOR AUTH HOOKS IN SUPABASE
-- ============================================
-- Note: Auth hooks are configured in Supabase Dashboard
-- This checks for Edge Functions that might be auth hooks
SELECT
    'EDGE FUNCTIONS' as check_type,
    name,
    created_at,
    updated_at
FROM supabase_functions.functions
WHERE name LIKE '%auth%' OR name LIKE '%user%';

-- ============================================
-- 8. CHECK GRANTS ON USERS TABLE
-- ============================================
SELECT
    'GRANTS ON USERS TABLE' as check_type,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'users';

-- ============================================
-- 9. CHECK FOR CONSTRAINTS ON USERS TABLE
-- ============================================
SELECT
    'CONSTRAINTS ON USERS' as check_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'users';

-- ============================================
-- 10. TEST IF WE CAN INSERT INTO USERS TABLE
-- ============================================
-- This will show if there's a permission or constraint issue
-- Replace 'test-uuid' with a real UUID if you want to test
DO $$
BEGIN
    -- Try to insert a test record
    INSERT INTO public.users (
        id,
        email,
        phone_number,
        business_name,
        device_type,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'test-' || gen_random_uuid()::text,
        'test@diagnostic.com',
        'test@diagnostic.com',
        'Test Store',
        'web',
        true,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'SUCCESS: Can insert into users table';

    -- Clean up test record
    DELETE FROM public.users WHERE email = 'test@diagnostic.com';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR inserting into users: %', SQLERRM;
END $$;
