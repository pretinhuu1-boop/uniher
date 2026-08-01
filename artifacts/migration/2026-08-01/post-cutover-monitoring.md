# UniHER Post-Cutover Monitoring

DNS cutover baseline: 2026-08-01 15:45 BRT / 18:45 UTC
TTL: 3600 seconds
Required stability window: two TTL windows
Source retirement: `HOLD` pending owner handoff and separate operator approval

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

## Checkpoint T+1 TTL

Observed: 2026-08-01 16:45 BRT / 19:45 UTC
Result: `PASS`

### DNS And HTTPS

- `b.sec.dns.br`, `c.sec.dns.br`, `1.1.1.1`, and `8.8.8.8`: apex A `76.13.165.185`, TTL 3600, `www CNAME uniher.com.br`.
- Workstation resolver: `76.13.165.185`.
- Apex, health, and `www`: HTTP 200 directly from `76.13.165.185`, TLS verification result 0.

### Target Runtime And Data

- Host: `srv1872618`.
- Git HEAD: `2b8be831a3f5164f716b2c1c3dbf6bc816797cb8`.
- Git status: clean.
- PM2 `uniher` PID: `2608`.
- Nginx and backup timer: `active`.
- Database integrity: `ok`.
- Application tables: `68`.
- Users: `9`.
- Migrations: `71`.
- PM2 error log: `0` bytes.
- Health: `{"status":"healthy"}`.
- Landing SHA-256: `f3eaf03b48f39a68c745bfeb007e9803bea62db4f178e6d1ec0a0fc8c69b3837`, unchanged.
- Latest backup checksum: `OK`; backup integrity: `ok`.

The live SQLite file SHA-256 differed from the standalone backup because the
live database uses journal mode `wal` and the backup uses `delete`. A per-table
logical comparison found zero row-count changes and zero content-hash changes
across all 68 application tables.

### Public Route Audit

- Anonymous GET-only audit: `63/63` passed, `0` failed.
- State-changing method probes: disabled.
- Evidence: `artifacts/migration/2026-08-01/post-cutover-public-api-tplus1.json`.

### Source Rollback Edge

- Host: `srv1373909`.
- PM2 `uniher` PID: `0`.
- Port 3000: closed.
- Nginx: `active`.
- TLS bridge health: HTTP 200, TLS verification result 0.
- Source remains rollback-only; it is not a second writable application.

## Checkpoint T+2 TTL

Observed: 2026-08-01 17:45 BRT / 20:45 UTC
Result: `PASS`

### DNS, HTTPS, And Runtime

- `b.sec.dns.br`, `c.sec.dns.br`, `1.1.1.1`, `8.8.8.8`, and the workstation
  resolver returned apex A `76.13.165.185` with TTL 3600.
- `www` remained `CNAME uniher.com.br`.
- Apex, health, and `www` returned HTTP 200 directly from the target with TLS
  verification result 0.
- Target Git HEAD before this receipt commit: `a0dbdeab30539d4b32ecdd91b65d99d11f94ae80`;
  checkout clean, PM2 online, Nginx active, backup and Certbot timers active/enabled.
- Database integrity `ok`; 68 application tables, 9 users, and 71 migrations.
- PM2 error log: 0 bytes; health: `{"status":"healthy"}`.
- Landing SHA-256 remained
  `f3eaf03b48f39a68c745bfeb007e9803bea62db4f178e6d1ec0a0fc8c69b3837`.
- Certificate CN `uniher.com.br`, Let's Encrypt `YE2`, valid through
  2026-10-19 17:17:06 UTC.
- Anonymous GET-only audit passed `63/63`; state-changing probes were disabled.
- Evidence: `artifacts/migration/2026-08-01/post-cutover-public-api-tplus2.json`.

### Backups, Restore, And Snapshot

- Pre-rotation backup:
  `/var/backups/uniher/automatic/uniher-20260801T205226Z.db`.
- SHA-256:
  `4abc3ff4c7192a38a5b34ee04733e8868bb3535bb32c4ae4a2df101719a77e46`.
- Isolated restore:
  `/var/backups/uniher/restore-verification/20260801T205226Z/uniher-restored.db`.
- Restore integrity `ok`; 68 tables compared; zero row-count and content-hash
  differences; 9 users; 71 migrations.
- The backup job was hardened with `umask 077`; database and checksum now start
  with mode 600. Canonical files are under `deploy/vps/`.
- Hostinger snapshot `320800` refreshed at `2026-08-01T20:53:16Z`; API action
  `107238690` completed with state `success`; expiry `2026-08-02T20:53:16Z`.

### Source Rollback Edge

- Source PM2 PID `0`, port 3000 closed, Nginx active.
- Source TLS bridge health returned HTTP 200 with TLS verification result 0.
- Source remains rollback-only and is not a writable application.

## Post-Rotation Verification

Observed: 2026-08-01 17:57 BRT / 20:57 UTC
Result: `PASS`

- All four legacy smoke-bundle passwords were stale. They were removed from the
  environment instead of being reused.
- The dedicated RH smoke account `teste@uniher.com` received a generated
  credential on the target; its sessions were invalidated and the credential
  value was never printed or stored in Git.
- Smoke-account rollback bundle:
  `/var/backups/uniher/smoke-account-rotation/20260801T205657Z`.
- JWT rotation rollback bundle:
  `/var/backups/uniher/secret-rotation/20260801T205709Z` (directory 700; files 600).
- Pre-rotation login and authenticated `/api/auth/me` passed.
- Old access and refresh cookies returned 401 after rotation.
- Fresh login and authenticated `/api/auth/me` passed after rotation.
- Both JWT values changed and remain 64 characters; no value was printed.
- PM2 restarted once and is online; error log remains 0 bytes.
- Post-rotation backup:
  `/var/backups/uniher/automatic/uniher-20260801T205746Z.db`, mode 600.
- Post-rotation backup SHA-256:
  `8c0b7d521e39ea9e6735e7d133b4b8bf0cf20f7fd125dc2488ba9708a410f486`.
- Isolated restore:
  `/var/backups/uniher/restore-verification/20260801T205746Z/uniher-restored.db`;
  integrity `ok`, 68 tables compared, zero logical differences, 9 users, and
  71 migrations.
- Post-rotation anonymous GET-only audit passed `63/63`; writes disabled.
- Evidence: `artifacts/migration/2026-08-01/post-rotation-public-api.json`.

## Remaining External Gates

- Exact GitHub username and accepted repository access.
- New-owner SSH public key installed and independently tested.
- Migration Hostinger API token revoked in hPanel.
- Separate operator approval before removing the source rollback edge.
