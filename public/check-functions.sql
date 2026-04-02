-- Check what send_agent_message functions exist in the database
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    n.nspname AS schema_name
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'send_agent_message'
ORDER BY p.proname, p.oid;