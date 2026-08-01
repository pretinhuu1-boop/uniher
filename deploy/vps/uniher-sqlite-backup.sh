#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DATABASE_PATH="/var/www/uniher/data/uniher.db"
OUTPUT_DIR="/var/backups/uniher/automatic"
RETENTION_DAYS=14
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TEMP_BACKUP="$OUTPUT_DIR/.uniher-$STAMP.db.tmp"
FINAL_BACKUP="$OUTPUT_DIR/uniher-$STAMP.db"

cleanup() {
  if [[ "$TEMP_BACKUP" == "$OUTPUT_DIR"/.uniher-*.db.tmp ]]; then
    rm -f -- "$TEMP_BACKUP"
  fi
}

trap cleanup EXIT

for command_name in sqlite3 sha256sum install find; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if [[ ! -f "$DATABASE_PATH" ]]; then
  echo "Database not found: $DATABASE_PATH" >&2
  exit 1
fi

install -d -m 700 "$OUTPUT_DIR"
sqlite3 -cmd ".timeout 5000" "$DATABASE_PATH" ".backup '$TEMP_BACKUP'"
chmod 600 "$TEMP_BACKUP"

if [[ "$(sqlite3 "$TEMP_BACKUP" 'PRAGMA journal_mode=DELETE;')" != "delete" ]]; then
  echo "Could not normalize backup journal mode." >&2
  exit 1
fi

if [[ "$(sqlite3 -readonly "$TEMP_BACKUP" 'PRAGMA integrity_check;')" != "ok" ]]; then
  echo "Backup integrity check failed." >&2
  exit 1
fi

mv "$TEMP_BACKUP" "$FINAL_BACKUP"
sha256sum "$FINAL_BACKUP" > "$FINAL_BACKUP.sha256"
chmod 600 "$FINAL_BACKUP" "$FINAL_BACKUP.sha256"

find "$OUTPUT_DIR" -maxdepth 1 -type f \
  \( -name 'uniher-*.db' -o -name 'uniher-*.db.sha256' \) \
  -mtime "+$RETENTION_DAYS" -delete

printf 'backup=%s\n' "$FINAL_BACKUP"
