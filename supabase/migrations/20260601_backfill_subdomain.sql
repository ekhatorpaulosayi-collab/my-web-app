-- Phase 4 backfill: align stores.subdomain with stores.store_slug.
--
-- Exception: slug '234' (numeric-only, grandfathered) → subdomain NULL
-- so 234.storehouse.ng is never resolved as a storefront. The matching
-- frontend guard lives in src/utils/reservedSubdomains.ts (also '234')
-- and the resolution checks in src/AppRoutes.jsx + src/pages/StorefrontPage.tsx.
--
-- Apply INTERACTIVELY so the verification SELECT can be inspected before
-- committing. Per CLAUDE.md migration-drift workaround:
--
--   psql "$(cat ~/.supabase-paystack-dburl)"
--   \i supabase/migrations/20260601_backfill_subdomain.sql
--   -- Read the verification SELECT below.
--   -- If aligned=15, numeric_nulled=1, unexpected_nulls=0, unexpected_drift=0:
--   COMMIT;
--   -- Otherwise:
--   ROLLBACK;
--
-- After COMMIT, record the migration:
--   psql "$(cat ~/.supabase-paystack-dburl)" -c \
--     "INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
--      VALUES ('20260601','backfill_subdomain', ARRAY[]::text[]);"

BEGIN;

-- 15 rows: set subdomain = store_slug for all non-numeric slugs that
-- are either NULL or drifted from their slug.
UPDATE stores
SET subdomain  = store_slug::text,
    updated_at = NOW()
WHERE store_slug::text !~ '^\d+$'
  AND (subdomain IS NULL OR subdomain <> store_slug::text);

-- 1 row: clear subdomain for the grandfathered numeric slug.
UPDATE stores
SET subdomain  = NULL,
    updated_at = NOW()
WHERE store_slug::text ~ '^\d+$';

-- Verification: expected aligned=15, numeric_nulled=1,
-- unexpected_nulls=0, unexpected_drift=0, total_rows=16.
-- Transaction is intentionally left OPEN — type COMMIT; or ROLLBACK;
-- at the psql prompt after reading the SELECT result.
SELECT
  COUNT(*) FILTER (WHERE subdomain = store_slug::text)            AS aligned,
  COUNT(*) FILTER (WHERE subdomain IS NULL
                    AND store_slug::text ~ '^\d+$')               AS numeric_nulled,
  COUNT(*) FILTER (WHERE subdomain IS NULL
                    AND store_slug::text !~ '^\d+$')              AS unexpected_nulls,
  COUNT(*) FILTER (WHERE subdomain IS NOT NULL
                    AND subdomain <> store_slug::text)            AS unexpected_drift,
  COUNT(*)                                                         AS total_rows
FROM stores;

-- COMMIT;   -- uncomment + run manually after verifying counts above
-- ROLLBACK; -- run instead if counts are unexpected
