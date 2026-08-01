#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

TARGET_HOST="srv1872618"
APP_DIR="/var/www/uniher"
ENV_FILE="$APP_DIR/.env.production"
DATABASE_PATH="$APP_DIR/data/uniher.db"
BACKUP_ROOT="/var/backups/uniher/secret-rotation"
EXECUTE=0
ACK_SESSION_INVALIDATION=0
ROTATION_APPLIED=0
BACKUP_DIR=""

read_env_value() {
  local env_path="$1"
  local requested_key="$2"

  node - "$env_path" "$requested_key" <<'NODE'
const fs = require('fs');

const [envPath, requestedKey] = process.argv.slice(2);
const matches = [];
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || match[1] !== requestedKey) continue;
  let value = match[2].trim();
  if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) {
    const quote = value[0];
    value = value.slice(1, -1);
    if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
  }
  matches.push(value);
}

if (matches.length !== 1) throw new Error(`Expected exactly one ${requestedKey} entry`);
process.stdout.write(matches[0]);
NODE
}

load_env_safely() {
  local env_path="$1"
  local key=""
  local value=""
  local parse_complete=0

  while IFS= read -r -d '' key && IFS= read -r -d '' value; do
    if [[ "$key" == "__UNIHER_ENV_PARSE_COMPLETE__" ]]; then
      parse_complete=1
      continue
    fi
    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "Invalid environment key returned by parser." >&2
      return 1
    fi
    printf -v "$key" '%s' "$value"
    export "$key"
  done < <(node - "$env_path" <<'NODE'
const fs = require('fs');

const envPath = process.argv[2];
const entries = new Map();
for (const [index, line] of fs.readFileSync(envPath, 'utf8').split(/\r?\n/).entries()) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue;
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) throw new Error(`Invalid environment line ${index + 1}`);
  const key = match[1];
  if (entries.has(key)) throw new Error(`Duplicate environment key: ${key}`);
  let value = match[2].trim();
  if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) {
    const quote = value[0];
    value = value.slice(1, -1);
    if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
  }
  entries.set(key, value);
}

const chunks = [];
for (const [key, value] of entries) {
  chunks.push(Buffer.from(key), Buffer.from([0]), Buffer.from(value), Buffer.from([0]));
}
chunks.push(Buffer.from('__UNIHER_ENV_PARSE_COMPLETE__'), Buffer.from([0]), Buffer.from('1'), Buffer.from([0]));
process.stdout.write(Buffer.concat(chunks));
NODE
  )

  if [[ "$parse_complete" -ne 1 ]]; then
    echo "Environment parser did not complete." >&2
    return 1
  fi
}

usage() {
  cat <<'USAGE'
Usage:
  uniher-rotate-runtime-secrets.sh
  uniher-rotate-runtime-secrets.sh --execute --acknowledge-session-invalidation

Without --execute, the script performs read-only preflight checks.
Execution rotates only JWT_SECRET and JWT_REFRESH_SECRET. It intentionally does
not rotate Hostinger, Resend, VAPID, Sentry, employee-import HMAC, or smoke-account
credentials.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --execute)
      EXECUTE=1
      ;;
    --acknowledge-session-invalidation)
      ACK_SESSION_INVALIDATION=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the target VPS." >&2
  exit 1
fi

if [[ "$(hostname -s)" != "$TARGET_HOST" ]]; then
  echo "Refusing host $(hostname -s); expected $TARGET_HOST." >&2
  exit 1
fi

for required in "$APP_DIR/.git" "$ENV_FILE" "$DATABASE_PATH"; do
  if [[ ! -e "$required" ]]; then
    echo "Missing required path: $required" >&2
    exit 1
  fi
done

for command_name in node sqlite3 pm2 curl install sha256sum stat; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if [[ "$(stat -c '%a' "$ENV_FILE")" != "600" ]]; then
  echo "$ENV_FILE must have mode 600." >&2
  exit 1
fi

JWT_SECRET_VALUE="$(read_env_value "$ENV_FILE" JWT_SECRET)"
JWT_REFRESH_SECRET_VALUE="$(read_env_value "$ENV_FILE" JWT_REFRESH_SECRET)"
if [[ "${#JWT_SECRET_VALUE}" -lt 32 || "${#JWT_REFRESH_SECRET_VALUE}" -lt 32 ]]; then
  echo "Existing JWT secrets must be present and at least 32 characters." >&2
  exit 1
fi

PM2_PID="$(pm2 pid uniher)"
if [[ ! "$PM2_PID" =~ ^[1-9][0-9]*$ ]]; then
  echo "PM2 process uniher is not running." >&2
  exit 1
fi

if ! curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
  echo "Target health preflight failed." >&2
  exit 1
fi

if [[ "$EXECUTE" -eq 0 ]]; then
  echo "PRECHECK PASS: target, environment, database, PM2, and health are ready."
  echo "No secret was changed."
  exit 0
fi

if [[ "$ACK_SESSION_INVALIDATION" -ne 1 ]]; then
  echo "Execution requires --acknowledge-session-invalidation." >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
install -d -m 700 "$BACKUP_DIR"
install -m 600 "$ENV_FILE" "$BACKUP_DIR/env.before"
sqlite3 "$DATABASE_PATH" ".backup '$BACKUP_DIR/uniher-before.db'"
chmod 600 "$BACKUP_DIR/uniher-before.db"

if [[ "$(sqlite3 -readonly "$BACKUP_DIR/uniher-before.db" 'PRAGMA integrity_check;')" != "ok" ]]; then
  echo "Database backup integrity failed." >&2
  exit 1
fi

sha256sum "$BACKUP_DIR/uniher-before.db" > "$BACKUP_DIR/uniher-before.db.sha256"
chmod 600 "$BACKUP_DIR/uniher-before.db.sha256"

NEW_JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
NEW_JWT_REFRESH_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"

STAGED_ENV="$BACKUP_DIR/env.next"
NEW_JWT_SECRET="$NEW_JWT_SECRET" NEW_JWT_REFRESH_SECRET="$NEW_JWT_REFRESH_SECRET" \
  node - "$ENV_FILE" "$STAGED_ENV" <<'NODE'
const fs = require('fs');

const [sourcePath, targetPath] = process.argv.slice(2);
const replacements = new Map([
  ['JWT_SECRET', process.env.NEW_JWT_SECRET],
  ['JWT_REFRESH_SECRET', process.env.NEW_JWT_REFRESH_SECRET],
]);
const seen = new Set();
const lines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
  if (!match || !replacements.has(match[1])) return line;
  if (seen.has(match[1])) throw new Error(`Duplicate environment key: ${match[1]}`);
  seen.add(match[1]);
  return `${match[1]}=${replacements.get(match[1])}`;
});

for (const [key, value] of replacements) {
  if (!value || value.length < 32) throw new Error(`Invalid generated value for ${key}`);
  if (!seen.has(key)) lines.push(`${key}=${value}`);
}

fs.writeFileSync(targetPath, `${lines.join('\n').replace(/\n+$/, '')}\n`, { mode: 0o600 });
NODE

rollback() {
  local exit_code="$1"
  trap - ERR
  if [[ "$ROTATION_APPLIED" -eq 1 && -n "$BACKUP_DIR" ]]; then
    echo "Rotation failed; restoring previous environment." >&2
    install -m 600 "$BACKUP_DIR/env.before" "$ENV_FILE"
    load_env_safely "$ENV_FILE"
    pm2 restart uniher --update-env >/dev/null
    pm2 save >/dev/null
  fi
  exit "$exit_code"
}

trap 'rollback $?' ERR

install -m 600 "$STAGED_ENV" "$ENV_FILE.next"
if [[ "$(stat -c '%d' "$ENV_FILE")" != "$(stat -c '%d' "$ENV_FILE.next")" ]]; then
  echo "Environment replacement is not on the same filesystem." >&2
  false
fi
ROTATION_APPLIED=1
mv -f "$ENV_FILE.next" "$ENV_FILE"

load_env_safely "$ENV_FILE"
pm2 restart uniher --update-env >/dev/null

for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Health did not recover after secret rotation." >&2
    false
  fi
  sleep 1
done

pm2 save >/dev/null
trap - ERR

echo "ROTATION PASS: JWT secrets replaced without printing values."
echo "Rollback bundle: $BACKUP_DIR"
