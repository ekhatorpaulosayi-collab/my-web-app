-- Proves a wrong PIN is remembered when the function RETURNS an error
-- instead of RAISE. Six wrong PINs: the fifth locks, the sixth stays
-- locked, and the row still shows 5 attempts. Local / throwaway only.
-- Not for the live database.
BEGIN;

CREATE TEMP TABLE staff_pin_attempts (
  owner_uid uuid PRIMARY KEY,
  attempts int NOT NULL,
  locked_until timestamptz,
  updated_at timestamptz
);

CREATE OR REPLACE FUNCTION pg_temp.fail_pin(p_owner uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts int;
  v_locked timestamptz;
BEGIN
  SELECT attempts, locked_until INTO v_attempts, v_locked
    FROM staff_pin_attempts
   WHERE owner_uid = p_owner;
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RETURN jsonb_build_object('error', 'pin_locked');
  END IF;

  INSERT INTO staff_pin_attempts (owner_uid, attempts, locked_until, updated_at)
  VALUES (p_owner, 1, NULL, now())
  ON CONFLICT (owner_uid) DO UPDATE
    SET attempts = staff_pin_attempts.attempts + 1,
        locked_until = CASE
          WHEN staff_pin_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE NULL
        END,
        updated_at = now()
  RETURNING attempts INTO v_attempts;

  IF v_attempts >= 5 THEN
    RETURN jsonb_build_object('error', 'pin_locked');
  END IF;
  RETURN jsonb_build_object('error', 'invalid_pin');
END;
$$;

DO $$
DECLARE
  u uuid := '00000000-0000-0000-0000-000000000001';
  i int;
  r jsonb;
  n int;
  locked timestamptz;
BEGIN
  FOR i IN 1..4 LOOP
    r := pg_temp.fail_pin(u);
    IF r->>'error' IS DISTINCT FROM 'invalid_pin' THEN
      RAISE EXCEPTION 'attempt % returned %', i, r;
    END IF;
  END LOOP;

  r := pg_temp.fail_pin(u);
  IF r->>'error' IS DISTINCT FROM 'pin_locked' THEN
    RAISE EXCEPTION 'fifth attempt returned %', r;
  END IF;

  r := pg_temp.fail_pin(u);
  IF r->>'error' IS DISTINCT FROM 'pin_locked' THEN
    RAISE EXCEPTION 'sixth attempt returned %', r;
  END IF;

  SELECT attempts, locked_until INTO n, locked
    FROM staff_pin_attempts
   WHERE owner_uid = u;
  IF n IS DISTINCT FROM 5 OR locked IS NULL OR locked <= now() THEN
    RAISE EXCEPTION 'lock did not persist (attempts=%, locked=%)', n, locked;
  END IF;
END $$;

ROLLBACK;
