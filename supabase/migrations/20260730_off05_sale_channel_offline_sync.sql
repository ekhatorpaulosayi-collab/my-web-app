-- OFF-05: allow 'offline-sync' as a sale_channel value so late-drained offline
-- sales are visibly distinct in the ledger — the vendor SEES that a sale arrived
-- via late offline sync instead of wondering where it came from.
-- Additive only: every existing value remains valid; no rows are touched.
BEGIN;

-- IF EXISTS: the constraint predates the tracked migration set (created outside
-- it), so a fresh-environment replay reaches this file with no constraint to drop.
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS valid_sale_channel;
ALTER TABLE public.sales ADD CONSTRAINT valid_sale_channel
  CHECK (sale_channel = ANY (ARRAY[
    'in-person'::text,
    'online-store'::text,
    'wholesale'::text,
    'social-media'::text,
    'offline-sync'::text
  ]));

COMMIT;
