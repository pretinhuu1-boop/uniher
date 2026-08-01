#!/usr/bin/env bash
set -euo pipefail

EXPECTED_HOST="${UNIHER_EXPECTED_SOURCE_HOST:-srv1373909}"
DATABASE_PATH="${UNIHER_DATABASE_PATH:-/var/www/uniher/data/uniher.db}"
BACKUP_ROOT="${UNIHER_BACKUP_ROOT:-/root/uniher-migration}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This script must run as root." >&2
  exit 1
fi

if [[ "$(hostname)" != "$EXPECTED_HOST" ]]; then
  echo "Refusing to run on unexpected host: $(hostname)" >&2
  exit 1
fi

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
DATABASE_PATH="$CANONICAL_DATABASE_PATH"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_DIR="$BACKUP_ROOT/source-$STAMP"
OUTPUT_DB="$OUTPUT_DIR/uniher.db"

install -d -m 700 "$OUTPUT_DIR"
sqlite3 -cmd ".timeout 5000" "$DATABASE_PATH" ".backup '$OUTPUT_DB'"

# Make the exported copy standalone. The live database remains untouched.
[[ "$(sqlite3 "$OUTPUT_DB" 'PRAGMA journal_mode=DELETE;')" == "delete" ]]
[[ "$(sqlite3 -readonly "$OUTPUT_DB" 'PRAGMA integrity_check;')" == "ok" ]]

sha256sum "$OUTPUT_DB" > "$OUTPUT_DB.sha256"
{
  echo "created_at_utc=$STAMP"
  echo "source_host=$(hostname)"
  echo "database_sha256=$(cut -d' ' -f1 "$OUTPUT_DB.sha256")"
  echo "database_size=$(stat -c %s "$OUTPUT_DB")"
  echo "users=$(sqlite3 -readonly "$OUTPUT_DB" 'SELECT COUNT(*) FROM users;')"
  echo "migrations=$(sqlite3 -readonly "$OUTPUT_DB" 'SELECT COUNT(*) FROM _migrations;')"
} > "$OUTPUT_DIR/manifest.txt"

chmod 600 "$OUTPUT_DB" "$OUTPUT_DB.sha256" "$OUTPUT_DIR/manifest.txt"
cat "$OUTPUT_DIR/manifest.txt"
echo "output_dir=$OUTPUT_DIR"
