#!/usr/bin/env bash
set -euo pipefail

EXPECTED_HOST="${UNIHER_EXPECTED_SOURCE_HOST:-srv1373909}"
ORIGINAL_CONFIG="/etc/nginx/sites-available/uniher-axial"
AXIAL_REDIRECT_CONFIG="/etc/nginx/sites-available/uniher-axial-cutover"
BRIDGE_CONFIG="/etc/nginx/sites-available/uniher-domain-bridge"
AXIAL_ENABLED="/etc/nginx/sites-enabled/uniher-axial"
BRIDGE_ENABLED="/etc/nginx/sites-enabled/uniher-domain-bridge"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This script must run as root." >&2
  exit 1
fi

if [[ "$(hostname)" != "$EXPECTED_HOST" ]]; then
  echo "Refusing to run on unexpected host: $(hostname)" >&2
  exit 1
fi

for required_file in "$ORIGINAL_CONFIG" "$AXIAL_REDIRECT_CONFIG" "$BRIDGE_CONFIG"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Required Nginx config is missing: $required_file" >&2
    exit 1
  fi
done

if curl --max-time 1 -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "The source UniHER application must be stopped before bridge activation." >&2
  exit 1
fi

curl --max-time 15 -fsS \
  --resolve uniher.com.br:443:76.13.165.185 \
  https://uniher.com.br/api/health | grep -qx '{"status":"healthy"}'

rollback() {
  local rc=$?
  trap - EXIT
  if [[ $rc -ne 0 ]]; then
    set +e
    ln -sfn "$ORIGINAL_CONFIG" "$AXIAL_ENABLED"
    unlink "$BRIDGE_ENABLED" 2>/dev/null || true
    nginx -t && systemctl reload nginx
    if pm2 start uniher >/dev/null; then
      for _ in $(seq 1 20); do
        if [[ "$(pm2 pid uniher)" =~ ^[1-9][0-9]*$ ]]; then
          pm2 save >/dev/null
          break
        fi
        sleep 0.5
      done
    fi
  fi
  exit "$rc"
}
trap rollback EXIT

ln -sfn "$AXIAL_REDIRECT_CONFIG" "$AXIAL_ENABLED"
ln -sfn "$BRIDGE_CONFIG" "$BRIDGE_ENABLED"
nginx -t
systemctl reload nginx

for _ in $(seq 1 20); do
  if curl --max-time 5 -fsS \
    --resolve uniher.com.br:443:127.0.0.1 \
    https://uniher.com.br/api/health >/tmp/uniher-bridge-health.out 2>/dev/null; then
    break
  fi
  sleep 0.5
done

grep -qx '{"status":"healthy"}' /tmp/uniher-bridge-health.out
[[ "$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' --resolve uniher.com.br:443:127.0.0.1 https://uniher.com.br/)" == "200" ]]
[[ "$(curl --max-time 10 -sS -o /dev/null -w '%{redirect_url}' --resolve uniher.axialagents.com:443:127.0.0.1 https://uniher.axialagents.com/)" == "https://uniher.com.br/" ]]

pm2 save >/dev/null
unlink /tmp/uniher-bridge-health.out
trap - EXIT

echo "source_bridge=active"
echo "source_application=stopped"
echo "source_bridge_health=PASS"
echo "source_bridge_landing=PASS"
echo "legacy_domain_redirect=PASS"
