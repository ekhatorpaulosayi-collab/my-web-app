-- Add multi-payment methods support to stores
-- Allows businesses to configure OPay, Moniepoint, PalmPay, Kuda, etc.

-- Add payment_methods JSONB column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN stores.payment_methods IS 'Array of payment method objects: [{type: "opay"|"moniepoint"|"palmpay"|"kuda"|"bank"|"other", enabled: boolean, account_number: string, account_name: string, bank_name?: string, qr_code_url?: string, instructions?: string}]';

-- Example structure:
-- [
--   {
--     "id": "opay_1",
--     "type": "opay",
--     "enabled": true,
--     "account_number": "7012345678",
--     "account_name": "John's Fashion Store",
--     "instructions": "Send payment and screenshot to WhatsApp"
--   },
--   {
--     "id": "moniepoint_1",
--     "type": "moniepoint",
--     "enabled": true,
--     "account_number": "6012345678",
--     "account_name": "John's Fashion Store",
--     "qr_code_url": "https://..."
--   },
--   {
--     "id": "bank_1",
--     "type": "bank",
--     "enabled": true,
--     "bank_name": "GTBank",
--     "account_number": "0123456789",
--     "account_name": "John's Fashion Store"
--   }
-- ]

-- Create index for faster queries on payment methods
CREATE INDEX IF NOT EXISTS idx_stores_payment_methods
ON stores USING GIN (payment_methods);

-- Migration complete
