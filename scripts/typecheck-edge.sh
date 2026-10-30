#!/usr/bin/env bash
# Typecheck each edge function entry with Deno's own checker.
# Remote imports are cached by Deno. This does not deploy anything.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DENO_BIN="${DENO:-deno}"
if ! command -v "$DENO_BIN" >/dev/null 2>&1; then
  if [[ -x /tmp/deno/bin/deno ]]; then
    DENO_BIN=/tmp/deno/bin/deno
  else
    echo "deno is not installed" >&2
    exit 1
  fi
fi
fail=0
while IFS= read -r file; do
  echo "CHECK $file"
  if ! "$DENO_BIN" check "$file"; then
    fail=1
  fi
done < <(find "$ROOT/supabase/functions" -name 'index.ts' -print | sort)
exit "$fail"
