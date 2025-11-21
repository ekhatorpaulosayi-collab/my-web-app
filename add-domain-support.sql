-- Add subdomain and custom domain support to stores table
-- This enables stores to have their own subdomain (e.g., storename.storehouse.app)
-- and optionally connect custom domains (e.g., mybusiness.com)

-- Add new columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS domain_verification_token TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain_added_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ;

-- Create index for faster subdomain lookup
CREATE INDEX IF NOT EXISTS idx_stores_subdomain ON stores(subdomain);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain);

-- Add constraint to ensure subdomain format (lowercase, alphanumeric + hyphens only)
ALTER TABLE stores ADD CONSTRAINT IF NOT EXISTS subdomain_format
  CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$');

-- Update existing stores to have subdomain based on store_slug
UPDATE stores
SET subdomain = store_slug
WHERE subdomain IS NULL AND store_slug IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN stores.subdomain IS 'Subdomain for the store (e.g., storename in storename.storehouse.app)';
COMMENT ON COLUMN stores.custom_domain IS 'Custom domain configured by user (e.g., mybusiness.com)';
COMMENT ON COLUMN stores.custom_domain_verified IS 'Whether the custom domain DNS is correctly configured';
COMMENT ON COLUMN stores.domain_verification_token IS 'Token used to verify domain ownership';
