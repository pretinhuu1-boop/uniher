#!/usr/bin/env bash
set -euo pipefail

DATABASE_PATH="${1:-/var/www/uniher/data/uniher.db}"

if [[ "$DATABASE_PATH" != "/var/www/uniher/data/uniher.db" ]]; then
  echo "Refusing unexpected database path: $DATABASE_PATH" >&2
  exit 1
fi

if [[ ! -f "$DATABASE_PATH" ]]; then
  echo "Database not found: $DATABASE_PATH" >&2
  exit 1
fi

CANONICAL_DATABASE_PATH="$(readlink -f -- "$DATABASE_PATH")"
if [[ "$CANONICAL_DATABASE_PATH" != "/var/www/uniher/data/uniher.db" ]]; then
  echo "Refusing database path that resolves outside the expected location: $CANONICAL_DATABASE_PATH" >&2
  exit 1
fi

[[ "$(sqlite3 -readonly "$CANONICAL_DATABASE_PATH" 'PRAGMA integrity_check;')" == "ok" ]]

while IFS= read -r table_name; do
  quoted_name="${table_name//\"/\"\"}"
  row_count="$(sqlite3 -readonly "$CANONICAL_DATABASE_PATH" "SELECT COUNT(*) FROM \"$quoted_name\";")"
  printf '%s=%s\n' "$table_name" "$row_count"
done < <(
  sqlite3 -readonly "$CANONICAL_DATABASE_PATH" \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
)
