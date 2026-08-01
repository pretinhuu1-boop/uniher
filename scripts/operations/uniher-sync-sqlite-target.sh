#!/usr/bin/env bash
set -euo pipefail

EXPECTED_HOST="${UNIHER_EXPECTED_TARGET_HOST:-srv1872618}"
LIVE_DB="${UNIHER_DATABASE_PATH:-/var/www/uniher/data/uniher.db}"
SERVICE="${UNIHER_SERVICE:-pm2-root}"
PRE_SYNC_ROOT="${UNIHER_PRE_SYNC_ROOT:-/var/backups/uniher/pre-sync}"

usage() {
  echo "Usage: $0 --incoming /var/backups/uniher/incoming/file.db --sha256 HEX" >&2
}

INCOMING=""
EXPECTED_SHA256=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --incoming)
      INCOMING="${2:-}"
      shift 2
      ;;
    --sha256)
      EXPECTED_SHA256="${2:-}"
      shift 2
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This script must run as root." >&2
  exit 1
fi

if [[ "$(hostname)" != "$EXPECTED_HOST" ]]; then
  echo "Refusing to run on unexpected host: $(hostname)" >&2
  exit 1
fi

if [[ "$LIVE_DB" != "/var/www/uniher/data/uniher.db" ]]; then
  echo "Refusing unexpected live database path: $LIVE_DB" >&2
  exit 1
fi

if [[ ! -f "$LIVE_DB" ]]; then
  echo "Live database is missing." >&2
  exit 1
fi

CANONICAL_LIVE_DB="$(readlink -f -- "$LIVE_DB")"
if [[ "$CANONICAL_LIVE_DB" != "/var/www/uniher/data/uniher.db" ]]; then
  echo "Refusing live database path that resolves outside the expected location: $CANONICAL_LIVE_DB" >&2
  exit 1
fi
LIVE_DB="$CANONICAL_LIVE_DB"

if [[ ! -f "$INCOMING" ]]; then
  echo "Incoming database is missing." >&2
  exit 1
fi

INCOMING="$(readlink -f -- "$INCOMING")"
case "$INCOMING" in
  /var/backups/uniher/incoming/*.db) ;;
  *)
    echo "Incoming database must be under /var/backups/uniher/incoming." >&2
    exit 1
    ;;
esac

if [[ ! "$EXPECTED_SHA256" =~ ^[a-f0-9]{64}$ ]]; then
  echo "A lowercase SHA-256 digest is required." >&2
  exit 1
fi

ACTUAL_SHA256="$(sha256sum "$INCOMING" | cut -d' ' -f1)"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "Incoming database checksum mismatch." >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PRE_SYNC_DIR="$PRE_SYNC_ROOT/$STAMP"
NEXT_DB="$LIVE_DB.next"
SERVICE_STOPPED=0
SWAPPED=0

rollback() {
  local rc=$?
  trap - EXIT
  if [[ $rc -ne 0 ]]; then
    set +e
    if [[ $SWAPPED -eq 1 ]]; then
      systemctl stop "$SERVICE"
      [[ ! -e "$LIVE_DB" ]] || mv "$LIVE_DB" "$PRE_SYNC_DIR/failed-replacement.db"
      mv "$PRE_SYNC_DIR/target-live.db" "$LIVE_DB"
      [[ ! -e "$PRE_SYNC_DIR/target-live.db-wal" ]] || mv "$PRE_SYNC_DIR/target-live.db-wal" "$LIVE_DB-wal"
      [[ ! -e "$PRE_SYNC_DIR/target-live.db-shm" ]] || mv "$PRE_SYNC_DIR/target-live.db-shm" "$LIVE_DB-shm"
    elif [[ -e "$NEXT_DB" ]]; then
      mv "$NEXT_DB" "$PRE_SYNC_DIR/failed-next.db"
    fi
    if [[ $SERVICE_STOPPED -eq 1 ]]; then
      systemctl start "$SERVICE"
    fi
  fi
  exit "$rc"
}
trap rollback EXIT

install -d -m 700 "$PRE_SYNC_DIR"
systemctl stop "$SERVICE"
SERVICE_STOPPED=1

sqlite3 "$LIVE_DB" 'PRAGMA wal_checkpoint(TRUNCATE);' >/dev/null
sqlite3 "$LIVE_DB" ".backup '$PRE_SYNC_DIR/target-before-sync.db'"
[[ "$(sqlite3 "$PRE_SYNC_DIR/target-before-sync.db" 'PRAGMA journal_mode=DELETE;')" == "delete" ]]
[[ "$(sqlite3 -readonly "$PRE_SYNC_DIR/target-before-sync.db" 'PRAGMA integrity_check;')" == "ok" ]]
sha256sum "$PRE_SYNC_DIR/target-before-sync.db" > "$PRE_SYNC_DIR/target-before-sync.db.sha256"

install -m 600 "$INCOMING" "$NEXT_DB"
INSTALLED_SHA256="$(sha256sum "$NEXT_DB" | cut -d' ' -f1)"
[[ "$INSTALLED_SHA256" == "$EXPECTED_SHA256" ]]

mv "$LIVE_DB" "$PRE_SYNC_DIR/target-live.db"
SWAPPED=1
[[ ! -e "$LIVE_DB-wal" ]] || mv "$LIVE_DB-wal" "$PRE_SYNC_DIR/target-live.db-wal"
[[ ! -e "$LIVE_DB-shm" ]] || mv "$LIVE_DB-shm" "$PRE_SYNC_DIR/target-live.db-shm"
mv "$NEXT_DB" "$LIVE_DB"
chmod 600 "$LIVE_DB"

systemctl start "$SERVICE"

HEALTHY=0
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 1
done
[[ $HEALTHY -eq 1 ]]
[[ "$(sqlite3 -readonly "$LIVE_DB" 'PRAGMA integrity_check;')" == "ok" ]]

SERVICE_STOPPED=0
SWAPPED=0
trap - EXIT

echo "sync_snapshot_sha256=$EXPECTED_SHA256"
echo "installed_sha256=$INSTALLED_SHA256"
echo "pre_sync_dir=$PRE_SYNC_DIR"
echo "service_state=$(systemctl is-active "$SERVICE")"
echo "database_integrity=ok"
echo "users=$(sqlite3 -readonly "$LIVE_DB" 'SELECT COUNT(*) FROM users;')"
echo "migrations=$(sqlite3 -readonly "$LIVE_DB" 'SELECT COUNT(*) FROM _migrations;')"
