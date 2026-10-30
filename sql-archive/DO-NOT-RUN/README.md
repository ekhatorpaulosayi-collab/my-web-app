# DO NOT RUN these scripts

Every script in this folder contains `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`
(stores, users, sales, products, variants). Running any of them against production
makes that table readable/writable by anyone holding the public (publishable) key.

They are kept only for history. Moved here from the repo root (audit finding H3).
If you need a policy fix, write a new migration that adjusts policies instead.

`open-policies/` holds root and `public/` SQL that re-creates `USING (true)` /
`WITH CHECK (true)` policies or disables RLS (Builder note B7). Those files
were also reachable as static files under `public/`. Do not run them. The
replacement is `supabase/migrations/20261025_04_advisor_hardening.sql`.
