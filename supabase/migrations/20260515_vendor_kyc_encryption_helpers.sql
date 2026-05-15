-- Step 1b — vendor_kyc encryption helpers.
-- Spec: docs/KYC_V1_SPEC.md §3.4
--
-- Creates encrypt_vendor_kyc_field and REPLACES the existing
-- decrypt_vendor_kyc_field. Both functions read vendor_kyc_key
-- from vault.decrypted_secrets and use pgcrypto pgp_sym_*.
--
-- pgcrypto functions live in the 'extensions' schema (Supabase
-- default), not 'public'. SECURITY DEFINER functions with
-- hardened search_path=public cannot resolve unqualified
-- pgp_sym_encrypt/decrypt. We qualify with extensions. prefix
-- to make these robust against any caller's search_path.
--
-- The pre-existing decrypt_vendor_kyc_field used the unqualified
-- form, which fails at runtime when called from inside any
-- SECURITY DEFINER RPC. This migration repairs it alongside
-- adding the encrypt counterpart so the pair round-trips.

CREATE OR REPLACE FUNCTION encrypt_vendor_kyc_field(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value text;
BEGIN
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'vendor_kyc_key';

  IF key_value IS NULL THEN
    RAISE EXCEPTION 'vendor_kyc_key not configured in vault';
  END IF;

  RETURN extensions.pgp_sym_encrypt(plaintext, key_value);
END;
$$;

REVOKE ALL ON FUNCTION encrypt_vendor_kyc_field(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION decrypt_vendor_kyc_field(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value text;
BEGIN
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'vendor_kyc_key';

  IF key_value IS NULL THEN
    RAISE EXCEPTION 'vendor_kyc_key not configured in vault';
  END IF;

  RETURN extensions.pgp_sym_decrypt(encrypted_data, key_value);
END;
$$;

REVOKE ALL ON FUNCTION decrypt_vendor_kyc_field(bytea) FROM PUBLIC;
