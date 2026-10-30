-- Fix phone_number constraint to allow email signup
-- This removes the E.164 validation so users can sign up without a phone number

-- Drop the strict E.164 constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_e164;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS phone_number_format;

-- Make phone_number nullable (allow users to sign up with just email)
ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL;

-- Add a more flexible constraint that allows either valid E.164 phone OR email format
ALTER TABLE public.users ADD CONSTRAINT phone_or_email_format
  CHECK (
    phone_number ~ '^\+?[1-9]\d{1,14}$' OR  -- Valid E.164 phone
    phone_number ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'  -- Valid email
  );

-- Update the unique constraint to allow NULL values
-- (Multiple users can have NULL phone numbers, but actual phone numbers must be unique)
DROP INDEX IF EXISTS idx_users_phone;
CREATE UNIQUE INDEX idx_users_phone_unique ON public.users(phone_number) WHERE phone_number IS NOT NULL AND phone_number !~ '@';
