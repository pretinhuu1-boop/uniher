# UniHER Post-Cutover Monitoring

DNS cutover baseline: 2026-08-01 15:45 BRT / 18:45 UTC
TTL: 3600 seconds
Required stability window: two TTL windows
Source retirement: `HOLD` pending stability completion and separate operator approval

## Checkpoint T+10 minutes

Observed: 2026-08-01 15:55 BRT / 18:55 UTC
Result: `PASS`

### DNS

| Resolver | Apex A | TTL | WWW |
| --- | --- | --- | --- |
| `b.sec.dns.br` | `76.13.165.185` | 3600 | `CNAME uniher.com.br` |
| `c.sec.dns.br` | `76.13.165.185` | 3600 | `CNAME uniher.com.br` |
| `1.1.1.1` | `76.13.165.185` | 3600 | `CNAME uniher.com.br` |
| `8.8.8.8` | `76.13.165.185` | 3600 | `CNAME uniher.com.br` |

### Target

- Host: `srv1872618` / `76.13.165.185`
- Git HEAD: `d9b4939012fa171fc34159f6d57025de42c9db0b`
- PM2 `uniher` PID: `2608`
- Nginx: `active`
- Backup timer: `active`
- Database integrity: `ok`
- Users: `9`
- Migrations: `71`
- PM2 error log: present and empty (`0` bytes)
- Direct apex, health, and `www` checks: HTTP 200, TLS verification result 0
- Health body: `{"status":"healthy"}`
- Landing response SHA-256: `f3eaf03b48f39a68c745bfeb007e9803bea62db4f178e6d1ec0a0fc8c69b3837`, unchanged from the pre-cutover verified hash

### Source Rollback Edge

- Host: `srv1373909` / `187.77.42.199`
- PM2 `uniher` PID: `0`
- Port 3000: closed
- Nginx: `active`
- TLS bridge health: HTTP 200, TLS verification result 0

There remains exactly one writable UniHER application/database on the target. The source is only a verified TLS rollback edge.

## Checkpoint T+39 minutes

Observed: 2026-08-01 16:24 BRT / 19:24 UTC
Result: `PASS`

### Fresh Backup And Isolated Restore

- Backup service result: `success`
- Backup: `/var/backups/uniher/automatic/uniher-20260801T192407Z.db`
- Backup SHA-256: `4abc3ff4c7192a38a5b34ee04733e8868bb3535bb32c4ae4a2df101719a77e46`
- Backup checksum verification: `OK`
- Backup integrity: `ok`
- Isolated restore: `/var/backups/uniher/restore-verification/20260801T192407Z/uniher-restored.db`
- Restore integrity: `ok`
- Application tables compared: `68`
- Row-count differences between live and restored databases: `0`
- Restored users: `9`
- Restored migrations: `71`
- Target health after verification: `{"status":"healthy"}`

### Secret-Rotation Readiness

- Guarded script: `scripts/operations/uniher-rotate-runtime-secrets.sh`
- Target Bash syntax check: `PASS`
- Read-only target preflight: `PASS`
- Target commit: `3c4d1081466d2af9c38c95863996c71334868c83`
- PM2 remained on PID `2608`
- No secret, environment file, database, or process was changed by the preflight.
- Real rotation remains blocked until the T+2 stability gate and acknowledged session invalidation.

### Public Routes And TLS

- Anonymous GET-only audit: `63/63` passed, `0` failed.
- State-changing method probes: disabled.
- Evidence: `artifacts/migration/2026-08-01/post-cutover-public-api-tplus39.json`.
- Workstation resolver: `76.13.165.185`.
- Apex and health through the workstation resolver: HTTP 200, TLS verification result 0.
- Certificate subject: `CN = uniher.com.br`.
- Certificate issuer: Let's Encrypt `YE2`.
- Certificate validity: 2026-07-21 17:17:07 UTC through 2026-10-19 17:17:06 UTC.
- Certbot timer: `active` and `enabled`.

## Pending Checkpoints

- T+1 TTL: 2026-08-01 16:45 BRT or later
- T+2 TTL: 2026-08-01 17:45 BRT or later
