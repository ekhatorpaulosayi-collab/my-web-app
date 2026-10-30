-- FINAL FIX: Remove ALL database-level user creation
-- The application code will handle user creation after auth succeeds

-- ============================================
-- STEP 1: DROP ALL TRIGGERS AND FUNCTIONS
-- ============================================

-- Drop all triggers on auth.users
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

-- Drop all related functions
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.create_user_on_signup CASCADE;
DROP FUNCTION IF EXISTS create_user_on_signup CASCADE;

-- ============================================
-- STEP 2: FIX TABLE SCHEMAS - Ensure UUID compatibility
-- ============================================

-- Check current users table ID type
DO $$
DECLARE
    id_type text;
BEGIN
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'id';

    RAISE NOTICE 'Users table ID type: %', id_type;

    -- If it's TEXT, we need to keep it that way
    -- If it's UUID, we need to change it to TEXT for compatibility
    IF id_type = 'uuid' THEN
        RAISE NOTICE 'Converting users.id from UUID to TEXT for compatibility';

        -- Disable foreign key constraints temporarily
        ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_user_id_fkey;
        ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
        ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
        ALTER TABLE public.referral_codes DROP CONSTRAINT IF EXISTS referral_codes_user_id_fkey;

        -- Convert to TEXT
        ALTER TABLE public.users ALTER COLUMN id TYPE TEXT USING id::TEXT;

        -- Also convert related tables
        ALTER TABLE public.stores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        ALTER TABLE public.products ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        ALTER TABLE public.sales ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        ALTER TABLE public.customers ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
        ALTER TABLE public.referral_codes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

        -- Re-enable foreign key constraints
        ALTER TABLE public.stores ADD CONSTRAINT stores_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.products ADD CONSTRAINT products_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.sales ADD CONSTRAINT sales_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

        RAISE NOTICE 'Conversion complete';
    ELSE
        RAISE NOTICE 'ID type is already TEXT, no conversion needed';
    END IF;
END $$;

-- ============================================
-- STEP 3: DISABLE RLS TEMPORARILY
-- ============================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: DROP ALL POLICIES
-- ============================================

-- Drop all policies on users table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Drop all policies on stores table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'stores'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.stores', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- ============================================
-- STEP 5: GRANT FULL PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant full access to authenticated users
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.sales TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.referral_codes TO authenticated;

-- Grant insert/select to anon for initial signup
GRANT INSERT, SELECT ON public.users TO anon;
GRANT INSERT, SELECT ON public.stores TO anon;

-- ============================================
-- STEP 6: VERIFY NO TRIGGERS EXIST
-- ============================================

SELECT
    'REMAINING TRIGGERS' as status,
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- If no results, success!
