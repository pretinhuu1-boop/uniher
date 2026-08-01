# UniHER Hostinger Account Migration Runbook

Date: 2026-08-01
Status: FINAL DATA MIGRATED - SOURCE BRIDGE ACTIVE - DNS LOGIN REQUIRED - SOURCE RETIREMENT HOLD
Coordinator: current Codex task

## Objective

Clone the complete UniHER production surface from the current Hostinger VPS to the new Hostinger account while retaining the source as a rollback edge. After operator approval, production processing and persistence move to the target first through a source-side TLS bridge, then by DNS after authenticated access to Registro.br.

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

The final database and production runtime are active on the target. The source UniHER process is stopped and the source Nginx now forwards `uniher.com.br` traffic over verified TLS to the target, so there is only one writable application/database. DNS still resolves to the source IP until the operator completes login/2FA in Registro.br. Repository ownership transfer and source retirement remain `HOLD`.

GitHub collaborator access is `BLOCKED` until the operator provides the exact GitHub username associated with the new account. The supplied email is not publicly associated with a GitHub username, and the supported API requires a username. No invitation or ownership transfer has been made.

## Execution Receipts

### Source preservation before final migration

- Production host remained `srv1373909` / `187.77.42.199` throughout preparation.
- `uniher.com.br` and `www.uniher.com.br` still resolve to `187.77.42.199` with TTL 3600.
- Production PM2, Nginx, database, certificates, and unrelated services were not stopped or changed before the approved final migration window.
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

- Target checkout: `/var/www/uniher`, branch `codex/security-public-api-hardening`, commit `7f1bdb4f0bfcfac93158a15954b8128ac59b829c` before this receipt wave.
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

### Final data migration and logical cutover

- Operator authorized the complete data migration on 2026-08-01.
- Source PM2 process `uniher` was stopped before the final export; its PID is `0` and source port 3000 has no listener.
- Final source snapshot: `/root/uniher-migration-20260801-final/source-20260801T180136Z/uniher.db`.
- Final source and installed target SHA-256 matched exactly: `4abc3ff4c7192a38a5b34ee04733e8868bb3535bb32c4ae4a2df101719a77e46`.
- Final snapshot size: 2,273,280 bytes; integrity `ok`; 9 users; 71 migrations.
- Target rollback copy before final sync: `/var/backups/uniher/pre-sync/20260801T180207Z`.
- Source and target matched across all 68 application tables with zero row-count differences; manifest SHA-256 `5320ed2b8cc3ef1bf604180662f95e53bd4d128258eeddbbc19385f50b537e41`.
- The valid `uniher.com.br` certificate lineage was transferred directly between servers, checksum-verified, and installed on the target without local persistence.
- Direct target TLS checks for `uniher.com.br` and `www.uniher.com.br` returned 200 with the correct certificate and no public `X-Robots-Tag`.
- Source bridge probe passed health, landing, and upstream certificate verification before activation.
- Source Nginx now forwards the official domains to `76.13.165.185` with SNI, certificate verification, and forwarded request metadata; the legacy `uniher.axialagents.com` redirects to the official domain.
- A unique read-only trace appeared once in both source and target access logs, proving the public request traversed the source edge and was processed by the target.
- Final independent Claude review passed with no remaining P0/P1 after the `/nova` fallback, PM2 rollback receipt, and canonical probe-path findings were corrected.

### Backup and restore controls

- Initial source bundle restored and verified at `/var/backups/uniher/source-20260801T155506Z`.
- Daily target backup timer `uniher-backup.timer` is enabled and active.
- Backup output: `/var/backups/uniher/automatic`, mode 700, 14-day retention.
- Target backups passed integrity and SHA-256 verification, including the post-final-sync backup `/var/backups/uniher/automatic/uniher-20260801T181052Z.db`.
- Latest validated backup used standalone journal mode `delete` and left zero WAL/SHM/temp sidecars.

### Functional, visual, and security gates

- Unit suite: 50 files passed, 259 tests passed.
- Anonymous public API audit passed twice, including after data rehearsal: 63/63 GET routes, 0 failures.
- Final anonymous audit through the active production bridge passed 63/63 GET routes with 0 failures and no state-changing probes.
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
  - `artifacts/migration/2026-08-01/final-public-api-readonly-audit.json`
  - `artifacts/migration/2026-08-01/final-public-landing-desktop.png`
  - `artifacts/migration/2026-08-01/final-public-landing-mobile.png`

## Remaining Approval Gates

1. Complete login/2FA in Registro.br and change the apex A record from `187.77.42.199` to `76.13.165.185`; keep `www` pointing to the apex.
2. Monitor at least two TTL windows while retaining the verified source bridge as rollback.
3. Receive the exact new GitHub username, invite it as collaborator, require acceptance and 2FA, and prove clone/push from the new account.
4. Retire the source only after a separate stability approval.
5. Rotate the Hostinger API token and application secrets after migration operations are complete.
