-- =============================================================================
-- FOR PAUL TO REVIEW AND RUN HIMSELF. NOT applied by this PR. Do not db push.
--
-- stores_public_read currently allows anon to read public stores. A
-- signed-in customer who is not the owner was left out, so a public
-- storefront looked empty after login. This recreates the same policy
-- for anon and authenticated.
--
-- The owner policy is unchanged. This does not grant writes.
-- A public store row still contains settlement columns. The storefront
-- must keep selecting only the columns it shows.
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS stores_public_read ON public.stores;
--   CREATE POLICY stores_public_read ON public.stores
--     FOR SELECT TO anon
--     USING (is_public = true);
-- =============================================================================
BEGIN;

DROP POLICY IF EXISTS stores_public_read ON public.stores;

CREATE POLICY stores_public_read ON public.stores
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

COMMIT;
