#!/usr/bin/env bash
# Local proof for migration 15. Stubs only. Not for the live database.
# The scheduled command must name the Vault secrets and must not contain
# the stand-in values or the old hardcoded marker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)
MIG="${ROOT}/supabase/migrations/20261025_15_whatsapp_report_cron_vault.sql"

stubs_sql="
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS cron;
CREATE TABLE IF NOT EXISTS vault.decrypted_secrets (
  name text PRIMARY KEY,
  decrypted_secret text
);
CREATE TABLE IF NOT EXISTS cron.job (
  jobid bigserial PRIMARY KEY,
  jobname text UNIQUE,
  schedule text NOT NULL,
  command text NOT NULL
);
CREATE OR REPLACE FUNCTION cron.unschedule(job_name text)
RETURNS boolean
LANGUAGE plpgsql
AS \$\$
BEGIN
  DELETE FROM cron.job WHERE jobname = job_name;
  RETURN FOUND;
END
\$\$;
CREATE OR REPLACE FUNCTION cron.schedule(job_name text, job_schedule text, job_command text)
RETURNS bigint
LANGUAGE plpgsql
AS \$\$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO cron.job (jobname, schedule, command)
  VALUES (job_name, job_schedule, job_command)
  RETURNING jobid INTO v_id;
  RETURN v_id;
END
\$\$;
"

new_db() {
  local db="storehouse_cron_$$_$RANDOM"
  sudo -u postgres createdb "$db"
  echo "$db"
}

drop_db() {
  sudo -u postgres dropdb --if-exists "$1" >/dev/null 2>&1 || true
}

assert_no_standin() {
  local file="$1"
  if grep -E 'vault-service-role-stand-in|vault-cron-secret-stand-in' "$file" >/dev/null; then
    echo "CRON_VAULT: output contained a vault stand-in" >&2
    exit 1
  fi
}

db="$(new_db)"
trap 'drop_db "$db"' EXIT

"${PSQL[@]}" -d "$db" <<SQL
${stubs_sql}
INSERT INTO vault.decrypted_secrets (name, decrypted_secret) VALUES
  ('service_role_key', 'vault-service-role-stand-in'),
  ('cron_secret', 'vault-cron-secret-stand-in');
INSERT INTO cron.job (jobname, schedule, command) VALUES
  ('send-daily-whatsapp-reports', '0 17 * * *', 'HARDCODED_OLD_KEY'),
  ('hourly-whatsapp-reports', '0 * * * *', 'hourly-left-alone');
SQL

"${PSQL[@]}" -d "$db" -f "$MIG"

"${PSQL[@]}" -d "$db" <<'SQL'
DO $$
DECLARE
  v_schedule text;
  v_command text;
  v_hourly text;
BEGIN
  SELECT schedule, command INTO v_schedule, v_command
    FROM cron.job
   WHERE jobname = 'send-daily-whatsapp-reports';
  IF v_schedule IS DISTINCT FROM '0 17 * * *' THEN
    RAISE EXCEPTION 'schedule changed';
  END IF;
  IF v_command IS NULL
     OR v_command NOT LIKE '%vault.decrypted_secrets%'
     OR v_command NOT LIKE '%service_role_key%'
     OR v_command NOT LIKE '%cron_secret%'
     OR v_command NOT LIKE '%x-cron-secret%'
     OR v_command NOT LIKE '%send-daily-reports%' THEN
    RAISE EXCEPTION 'command does not read vault';
  END IF;
  IF v_command LIKE '%HARDCODED_OLD_KEY%' THEN
    RAISE EXCEPTION 'old key still in command';
  END IF;
  IF v_command LIKE '%vault-service-role-stand-in%'
     OR v_command LIKE '%vault-cron-secret-stand-in%' THEN
    RAISE EXCEPTION 'vault value was copied into the command';
  END IF;
  SELECT command INTO v_hourly
    FROM cron.job
   WHERE jobname = 'hourly-whatsapp-reports';
  IF v_hourly IS DISTINCT FROM 'hourly-left-alone' THEN
    RAISE EXCEPTION 'hourly job changed';
  END IF;
END $$;

SELECT cron.unschedule('send-daily-whatsapp-reports');

DO $$
DECLARE
  v_daily int;
  v_hourly text;
BEGIN
  SELECT count(*) INTO v_daily FROM cron.job
   WHERE jobname = 'send-daily-whatsapp-reports';
  IF v_daily <> 0 THEN
    RAISE EXCEPTION 'rollback left the daily job';
  END IF;
  SELECT command INTO v_hourly FROM cron.job
   WHERE jobname = 'hourly-whatsapp-reports';
  IF v_hourly IS DISTINCT FROM 'hourly-left-alone' THEN
    RAISE EXCEPTION 'rollback changed the hourly job';
  END IF;
END $$;
SQL

# Missing job: the file must stop before it invents a schedule.
db_missing="$(new_db)"
"${PSQL[@]}" -d "$db_missing" <<SQL
${stubs_sql}
INSERT INTO vault.decrypted_secrets (name, decrypted_secret) VALUES
  ('service_role_key', 'vault-service-role-stand-in'),
  ('cron_secret', 'vault-cron-secret-stand-in');
INSERT INTO cron.job (jobname, schedule, command) VALUES
  ('hourly-whatsapp-reports', '0 * * * *', 'hourly-left-alone');
SQL
missing_out="$(mktemp)"
set +e
"${PSQL[@]}" -d "$db_missing" -f "$MIG" >"$missing_out" 2>&1
missing_code=$?
set -e
if [[ "$missing_code" -eq 0 ]]; then
  echo "CRON_VAULT: missing job was accepted" >&2
  drop_db "$db_missing"
  rm -f "$missing_out"
  exit 1
fi
if ! grep -q 'whatsapp_report_job_missing' "$missing_out"; then
  echo "CRON_VAULT: missing job failed for another reason" >&2
  drop_db "$db_missing"
  rm -f "$missing_out"
  exit 1
fi
assert_no_standin "$missing_out"
rm -f "$missing_out"
"${PSQL[@]}" -d "$db_missing" <<'SQL'
DO $$
DECLARE v_hourly text; v_daily int;
BEGIN
  SELECT count(*) INTO v_daily FROM cron.job
   WHERE jobname = 'send-daily-whatsapp-reports';
  IF v_daily <> 0 THEN
    RAISE EXCEPTION 'missing-job failure created a daily job';
  END IF;
  SELECT command INTO v_hourly FROM cron.job
   WHERE jobname = 'hourly-whatsapp-reports';
  IF v_hourly IS DISTINCT FROM 'hourly-left-alone' THEN
    RAISE EXCEPTION 'missing-job failure changed the hourly job';
  END IF;
END $$;
SQL
drop_db "$db_missing"

# Short secret: stop before unscheduling.
db_short="$(new_db)"
"${PSQL[@]}" -d "$db_short" <<SQL
${stubs_sql}
INSERT INTO vault.decrypted_secrets (name, decrypted_secret) VALUES
  ('service_role_key', 'short'),
  ('cron_secret', 'vault-cron-secret-stand-in');
INSERT INTO cron.job (jobname, schedule, command) VALUES
  ('send-daily-whatsapp-reports', '0 17 * * *', 'HARDCODED_OLD_KEY');
SQL
short_out="$(mktemp)"
set +e
"${PSQL[@]}" -d "$db_short" -f "$MIG" >"$short_out" 2>&1
short_code=$?
set -e
if [[ "$short_code" -eq 0 ]]; then
  echo "CRON_VAULT: short secret was accepted" >&2
  drop_db "$db_short"
  rm -f "$short_out"
  exit 1
fi
if ! grep -q 'service_role_key_missing' "$short_out"; then
  echo "CRON_VAULT: short secret failed for another reason" >&2
  drop_db "$db_short"
  rm -f "$short_out"
  exit 1
fi
assert_no_standin "$short_out"
rm -f "$short_out"
"${PSQL[@]}" -d "$db_short" <<'SQL'
DO $$
DECLARE v_command text;
BEGIN
  SELECT command INTO v_command FROM cron.job
   WHERE jobname = 'send-daily-whatsapp-reports';
  IF v_command IS DISTINCT FROM 'HARDCODED_OLD_KEY' THEN
    RAISE EXCEPTION 'short secret replaced the command';
  END IF;
END $$;
SQL
drop_db "$db_short"

echo "CRON_VAULT:0"
