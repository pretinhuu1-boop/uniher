# UniHER Hostinger Account Migration Runbook

Date: 2026-08-01
Status: TARGET READY - DNS CUTOVER HOLD - GITHUB ACCESS BLOCKED
Coordinator: current Codex task

## Objective

Clone the complete UniHER production surface from the current Hostinger VPS to the new Hostinger account while both environments remain available. Production traffic must continue to use the source VPS until the target passes technical, data, security, functional, and visual gates and the operator explicitly approves cutover.

This is a UniHER migration, not a whole-server clone. The source VPS hosts unrelated services that must remain on the source and must not be copied to the target.

## Verified Inventory

### Source

- Host: `srv1373909`
- Public IP: `187.77.42.199`
- OS: Ubuntu 24.04 LTS
- Capacity: 2 vCPU, 8 GB RAM, 100 GB disk
- Disk use at preflight: 90%
- Application: `/var/www/uniher`
- Application process: PM2 `uniher`, bound to `127.0.0.1:3000`
- Git remote: `https://github.com/pretinhuu1-boop/uniher.git`
- Deployed branch: `codex/security-public-api-hardening`
- Deployed commit: `1efc1403c1c3e3848508ac3ac308328aa92f0391`
- Database: `/var/www/uniher/data/uniher.db`, SQLite WAL mode
- Database preflight: integrity `ok`, 9 users, 71 migrations
- Environment: `/var/www/uniher/.env.production`
- PM2 contract: `/var/www/uniher/ecosystem.config.cjs`
- Landing root: `/var/www/uniher-preview/current`
- Active landing release: `/var/www/uniher-preview/releases/20260715-123659`
- Nginx production contract: `/etc/nginx/sites-available/uniher-axial`
- Production domains: `uniher.com.br`, `www.uniher.com.br`
- Current DNS: apex A record to `187.77.42.199`, TTL 3600 seconds

Unrelated source services excluded from this migration include Catarina, Hermes/WhatsApp, model hosting, and the Canal Direto report site.

### Target

- Host: `srv1872618.hstgr.cloud`
- Hostinger VM ID: `1872618`
- Public IPv4: `76.13.165.185`
- OS template: Ubuntu 24.04 LTS
- Plan: KVM 2
- Capacity: 2 vCPU, 8 GB RAM, 100 GB disk
- Initial state: running
- Initial firewall groups: none
- Initial Hostinger backups: none
- Initial snapshot: none
- Initial attached SSH keys: none

### GitHub

- Repository: `pretinhuu1-boop/uniher`
- Visibility: public
- Default branch: `main`
- Current production does not run the default branch.
- Current collaborators: source owner only
- Pending invitations: none
- Actions secrets, variables, and deploy keys: none

## Harness Contract

### Intent source

Operator request to migrate all UniHER code, data, configuration, and runtime ownership to the new Hostinger account while retaining the source until final approval.

### Write allowlist

- New Hostinger VPS `1872618` / `76.13.165.185`
- New Hostinger firewall, snapshot, and SSH-key resources dedicated to UniHER
- Source backup directory dedicated to this migration
- Target paths `/var/www/uniher`, `/var/www/uniher-preview`, and UniHER-specific Nginx/PM2 configuration
- This migration runbook and evidence artifacts
- GitHub collaborator invitation for the new account

### Write denylist before cutover approval

- DNS records for `uniher.com.br` and `www.uniher.com.br`
- Source PM2 `uniher` process and source Nginx runtime
- Source application database contents
- Source certificates and unrelated virtual hosts
- Catarina, Hermes/WhatsApp, models, Canal Direto, and any non-UniHER service
- Deletion, shutdown, or cancellation of the source VPS
- GitHub repository ownership transfer
- Rotation of application secrets that would invalidate the source environment

### Evidence outputs

- Source and target inventory receipts
- SQLite-consistent database backups with SHA-256 hashes
- Source-code and landing manifests with hashes
- Target snapshot and firewall receipts
- Build, migration, PM2, Nginx, and health receipts
- Authenticated API smoke for all production roles
- Persistence checks across logout/login and process restart
- Desktop and mobile screenshots
- Public API/security audit
- Final data-delta and cutover checklist

### Stop conditions

- `PASS`: wave gates pass with recorded evidence.
- `FAIL`: deterministic verification fails; repair only the affected wave.
- `BLOCKED`: external account access or missing operator input prevents progress.
- `HOLD`: technical preparation is complete but cutover approval is absent.
- `ESCALATE`: evidence indicates source data loss, secret exposure, or destructive drift.

## Migration Phases

### Phase 0 - Safety and scope

1. Treat the supplied Hostinger token as temporary and never write it to the repository or receipts.
2. Keep DNS and source runtime unchanged.
3. Exclude unrelated source services.
4. Preserve the landing exactly as deployed.

Gate: source remains healthy and target inventory is read-only verified.

### Phase 1 - Source-of-truth inventory

1. Record source host, application commit, database mode, environment key names, Nginx routes, PM2 contract, and landing release.
2. Record target capacity, OS, IPs, existing controls, and API resources.
3. Record DNS TTL, repository visibility, default branch, production branch, collaborators, deploy keys, and Actions configuration.

Gate: every production dependency has an owner and transfer method.

### Phase 2 - Recoverable backups

1. Create a target baseline snapshot before provisioning.
2. Create a SQLite-consistent source backup using the SQLite backup mechanism, not a filesystem-only copy of the main database file.
3. Create checksummed archives for the active landing release and UniHER-specific runtime configuration.
4. Record the exact deployed commit and obtain a clean clone from GitHub.
5. Verify archives by listing and test extraction; verify the database with `PRAGMA integrity_check`.

Gate: all backups exist outside the application checkout, have hashes, and pass restoration checks.

### Phase 3 - Target access and hardening

1. Generate a dedicated migration SSH key outside the repository.
2. Register and attach only the public key through the Hostinger API.
3. Create a Hostinger firewall allowing SSH, HTTP, and HTTPS; restrict SSH to the operator IP when stable access permits.
4. Install security updates, Nginx, Node.js 22, PM2, SQLite, Certbot, and fail2ban.
5. Enable UFW defense in depth after confirming SSH survival.
6. Configure swap and resource limits appropriate for KVM 2.

Gate: key-only SSH works in a fresh session, firewall is active, and the host remains reachable after restart.

### Phase 4 - Parallel application clone

1. Clone the repository and check out the validated production branch/commit.
2. Install dependencies with the lockfile and build on the target.
3. Restore the application environment with original permissions without printing values.
4. Restore the SQLite snapshot and apply only pending migrations.
5. Restore the active landing release exactly.
6. Configure PM2 and Nginx for the target Hostinger hostname while keeping production DNS unchanged.
7. Do not copy source build artifacts or `node_modules`; rebuild them on the target.

Gate: target health and application routes pass through the target hostname/IP without production DNS changes.

### Phase 5 - Data and runtime parity

1. Compare schema, migration ledger, table counts, critical record counts, and content hashes.
2. Confirm JWT, VAPID, email, Sentry, HMAC, and public URL contracts are present without exposing values.
3. Confirm session-continuity requirements and outbound-integration controls.
4. Keep the target isolated from normal user traffic to prevent split-brain writes.

Gate: source and target parity report has no unexplained drift.

### Phase 6 - Functional, visual, and security validation

1. Validate public landing, authentication, role navigation, Semaforo, campaigns, objectives, challenges, achievements, agenda, notifications, settings, RH, leadership, and Admin surfaces.
2. Validate API authorization and anonymous-data isolation.
3. Validate persistence across logout/login and PM2 restart.
4. Capture desktop and mobile screenshots for landing and authenticated surfaces.
5. Run focused unit, build, E2E, and public API security gates.
6. Review logs for uncaught errors, failed email/push calls, and database errors.

Gate: independent scorecard returns PASS with remaining operational risks explicitly listed.

### Phase 7 - GitHub continuity

1. Invite the new GitHub account as collaborator using its verified account identity.
2. Require invitation acceptance and 2FA before ownership changes.
3. Confirm clone and push from the new account.
4. Prefer transferring the repository to a UniHER organization with at least two owners rather than moving it between personal accounts.
5. Keep the source owner until the new ownership and recovery path are confirmed.

Gate: new account has accepted access and can clone/push without using source credentials.

### Phase 8 - Approval packet

Present:

- backup hashes and restoration evidence;
- target infrastructure receipt;
- source/target parity report;
- test and screenshot evidence;
- GitHub access receipt;
- final sync procedure;
- rollback procedure;
- estimated write-freeze window.

Gate: explicit operator approval. Without it, status remains `HOLD` and DNS is untouched.

### Phase 9 - Controlled cutover

1. Enter a short source write-freeze or maintenance window.
2. Create the final SQLite-consistent backup and transfer it to the target.
3. Verify integrity and record-count parity.
4. Start the target with final data and run local target smoke.
5. Change DNS A records to `76.13.165.185` only after approval.
6. Monitor both addresses through at least two TTL windows.
7. Keep the source online and rollback-ready.

Rollback: restore DNS to `187.77.42.199`, verify source PM2/Nginx health, and reconcile any writes that occurred after cutover.

### Phase 10 - Stabilization and retirement

1. Monitor errors, latency, authentication, email, push, database WAL growth, disk use, and certificate renewal.
2. Take a target post-cutover snapshot and application-level backup.
3. Rotate the temporary Hostinger API token and review all application secrets.
4. Retain the source until the agreed stability window and explicit retirement approval.
5. Remove source access only after rollback is no longer required.

Gate: separate explicit approval to retire the source environment.

## Current Decision

The target environment and the rehearsed data-sync path are technically ready. Production DNS, the source runtime, repository ownership transfer, and source retirement remain `HOLD`.

GitHub collaborator access is `BLOCKED` until the operator provides the exact GitHub username associated with the new account. The supplied email is not publicly associated with a GitHub username, and the supported API requires a username. No invitation or ownership transfer has been made.

## Execution Receipts

### Source preservation

- Production host remained `srv1373909` / `187.77.42.199` throughout preparation.
- `uniher.com.br` and `www.uniher.com.br` still resolve to `187.77.42.199` with TTL 3600.
- Production PM2, Nginx, database, certificates, and unrelated services were not stopped or changed.
- Active landing release remained `/var/www/uniher-preview/releases/20260715-123659`.
- Initial source backup: `/root/uniher-migration-20260801/20260801T155506Z`.
- Backup contents include a consistent SQLite copy, active landing archive, UniHER certificate archive, environment file, PM2/Nginx contracts, manifest, and SHA-256 checksums.
- Initial database receipt: integrity `ok`, 9 users, 71 migrations.

### Target infrastructure

- Target host: `srv1872618` / `76.13.165.185`, Hostinger VM `1872618`.
- Dedicated SSH key fingerprint: `SHA256:8Cmbpk+uRsDRtegy5lAi1Ya3rRO+Iob0THbdIMG+9Zk`.
- SSH password authentication disabled; fresh key-only connection passed.
- Hostinger firewall `338480` allows only TCP 22, 80, and 443.
- UFW is active with deny-by-default ingress; fail2ban is active.
- External probes confirmed 22/80/443 open and 3000/3306/5432/6379/27017 closed.
- Node.js `22.22.2`, npm `10.9.7`, PM2 `6.0.14`, Nginx `1.24.0`, SQLite `3.45.1`.
- Two GB swap configured; timezone `America/Sao_Paulo`.
- TLS issued for `srv1872618.hstgr.cloud`; Certbot renewal timer is active.
- Staging responses carry `X-Robots-Tag: noindex, nofollow, noarchive`.
- Post-provision Hostinger snapshot `320800` created at `2026-08-01T16:33:11Z`; API action `107215340` completed with state `success`.
- Full target reboot passed: PM2, Nginx, fail2ban, UFW, backup timer, Certbot timer, and health returned automatically.

### Application and parity

- Target checkout: `/var/www/uniher`, branch `codex/security-public-api-hardening`, commit `807ffc06d48587faec1a7e391710dffef0e557e7`.
- Production commit remains `1efc1403c1c3e3848508ac3ac308328aa92f0391`; the delta to target contains only tests and evidence, not runtime code.
- `npm ci`, migrations, and production build passed; build produced 129 routes.
- PM2 `uniher` runs under `pm2-root.service` and binds only to `127.0.0.1:3000`.
- Landing tree hash matched on source and target: `f84e8dc53c7610d0a1afa0dd8ccb8061379efb6adce29825285588c8736d5e40`.
- HTTPS landing response hash matched on source and target: `f3eaf03b48f39a68c745bfeb007e9803bea62db4f178e6d1ec0a0fc8c69b3837`.
- Environment key-name hash matched: `bdc96a2c7c44ed94710c2e1dea79d484961c755260a27cd2115633e27b866a79`.
- Rehearsed source snapshot SHA-256: `e2fcabd656a68a1a4ba6ebd63682bbd850e47f59a481399aec95f545becf7816`.
- Installed target checksum matched exactly; post-sync database integrity is `ok`, with 9 users and 71 migrations.
- Target pre-sync rollback copy: `/var/backups/uniher/pre-sync/20260801T164120Z` with valid integrity and checksum.
- Reusable export/import scripts:
  - `scripts/operations/uniher-export-sqlite-source.sh`
  - `scripts/operations/uniher-sync-sqlite-target.sh`
- Independent Claude review passed with no remaining P0/P1 after canonical-path hardening on both scripts.
- Target negative guards passed for an invalid checksum and a symlink escape; both attempts exited before service interruption, while PM2 stayed active and database integrity remained `ok`.

### Backup and restore controls

- Initial source bundle restored and verified at `/var/backups/uniher/source-20260801T155506Z`.
- Daily target backup timer `uniher-backup.timer` is enabled and active.
- Backup output: `/var/backups/uniher/automatic`, mode 700, 14-day retention.
- Two consecutive target backups passed integrity and SHA-256 verification.
- Latest validated backup used standalone journal mode `delete` and left zero WAL/SHM/temp sidecars.

### Functional, visual, and security gates

- Unit suite: 50 files passed, 259 tests passed.
- Anonymous public API audit passed twice, including after data rehearsal: 63/63 GET routes, 0 failures.
- Authenticated read-only role smoke passed 33/33 platform routes across admin, RH, collaborator, and leadership with 0 failures and 0 unexpected mutations.
- Master, two RH profiles, collaborator, and leadership credentials authenticated successfully.
- Master system endpoint returned 200; role and cookie security checks passed (`HttpOnly`, `Secure`, `SameSite`).
- Semaforo retirement E2E passed with non-mutating route protection: 13 preventive exam groups on desktop/mobile, result action visible, and legacy Semaforo routes returning 404.
- PM2 error log contained zero lines after sync; health returned `{"status":"healthy"}`.
- Production dependency audit returned 0 vulnerabilities.
- Visual evidence:
  - `artifacts/migration/2026-08-01/target-landing-desktop-viewport.png`
  - `artifacts/migration/2026-08-01/target-landing-mobile.png`
  - `artifacts/migration/2026-08-01/target-colaboradora-desktop.png`
  - `tests/artifacts/migration/2026-08-01/semaforo-playwright/`
  - `artifacts/migration/2026-08-01/readonly-role-route-smoke.json`

## Remaining Approval Gates

1. Receive the exact new GitHub username, invite it as collaborator, require acceptance and 2FA, and prove clone/push from the new account.
2. Obtain explicit operator approval for the cutover window.
3. At cutover, freeze writes on the source, run a new export/transfer/import, and verify fresh data parity.
4. Change DNS only after the final sync passes; monitor at least two TTL windows while keeping the source online.
5. Retire the source only after a separate stability approval.
6. Rotate the Hostinger API token after migration operations are complete.
