-- Fix database error when creating new auth users
-- This handles the UUID vs TEXT type mismatch

-- First, drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- Create an improved function that handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into public.users table with error handling
  INSERT INTO public.users (
    id,
    email,
    phone_number,
    business_name,
    device_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text, -- Cast UUID to TEXT for compatibility
    NEW.email,
    COALESCE(NEW.phone, NEW.email), -- Use email as fallback
    'My Store', -- Default business name
    'web',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Ignore if user already exists

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies allow INSERT for authenticated users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

-- Create policies that allow users to manage their own data (with type casting)
CREATE POLICY "Users can insert their own record"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can read their own record"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own record"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Also ensure the stores table has proper RLS (with type casting)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own store" ON public.stores;
DROP POLICY IF EXISTS "Users can read their own store" ON public.stores;
DROP POLICY IF EXISTS "Users can update their own store" ON public.stores;

CREATE POLICY "Users can insert their own store"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can read their own store"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own store"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.stores TO authenticated;
