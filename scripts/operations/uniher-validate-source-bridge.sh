#!/usr/bin/env bash
set -euo pipefail

EXPECTED_HOST="${UNIHER_EXPECTED_SOURCE_HOST:-srv1373909}"
PROBE_CONFIG="${1:-/tmp/nginx-uniher-bridge-probe.conf}"
INSTALLED_CONFIG="/etc/nginx/conf.d/uniher-bridge-probe.conf"
HEALTH_OUTPUT="/tmp/uniher-bridge-health.out"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This script must run as root." >&2
  exit 1
fi

if [[ "$(hostname)" != "$EXPECTED_HOST" ]]; then
  echo "Refusing to run on unexpected host: $(hostname)" >&2
  exit 1
fi

if [[ ! -f "$PROBE_CONFIG" ]]; then
  echo "Bridge probe config is missing: $PROBE_CONFIG" >&2
  exit 1
fi

PROBE_CONFIG="$(readlink -f -- "$PROBE_CONFIG")"
if [[ "$PROBE_CONFIG" != "/tmp/nginx-uniher-bridge-probe.conf" ]]; then
  echo "Refusing unexpected bridge probe path: $PROBE_CONFIG" >&2
  exit 1
fi

cleanup() {
  local rc=$?
  trap - EXIT
  unlink "$INSTALLED_CONFIG" 2>/dev/null || true
  unlink "$HEALTH_OUTPUT" 2>/dev/null || true
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
  fi
  exit "$rc"
}
trap cleanup EXIT

install -o root -g root -m 644 "$PROBE_CONFIG" "$INSTALLED_CONFIG"
nginx -t
systemctl reload nginx

for _ in $(seq 1 20); do
  if curl --max-time 5 -fsS http://127.0.0.1:18081/api/health >"$HEALTH_OUTPUT" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

grep -qx '{"status":"healthy"}' "$HEALTH_OUTPUT"
[[ "$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/)" == "200" ]]

echo "bridge_probe_health=PASS"
echo "bridge_probe_root=PASS"
echo "bridge_probe_tls_verify=PASS"
