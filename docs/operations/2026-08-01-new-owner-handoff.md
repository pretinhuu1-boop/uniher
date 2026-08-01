# UniHER New Owner Handoff

Date: 2026-08-01
Status: `DNS ACTIVE ON TARGET - STABILITY MONITORING - ACCESS AND ROTATION PENDING`

This document is safe to keep in the public repository. It contains no
passwords, tokens, private keys, environment values, user records, or personal
account identifiers.

## Canonical Production State

- Public domain: `https://uniher.com.br`
- Target VPS: `srv1872618` / `76.13.165.185`
- Application directory: `/var/www/uniher`
- PM2 process: `uniher`, one fork instance, bound to `127.0.0.1:3000`
- Database: `/var/www/uniher/data/uniher.db`
- Repository: `https://github.com/pretinhuu1-boop/uniher`
- Active production branch: `codex/security-public-api-hardening`
- Active checkpoint commit at this handoff revision: `611c22cece8c06f275148d0dff969573ce9bf1f4`
- Landing response SHA-256: `f3eaf03b48f39a68c745bfeb007e9803bea62db4f178e6d1ec0a0fc8c69b3837`

The source VPS `srv1373909` / `187.77.42.199` has no running UniHER
application and no listener on port 3000. Its Nginx is retained only as a
verified TLS rollback bridge during the stability window.

## Repository Source Of Truth

The GitHub default branch is `main`, but it is not the deployed artifact. At
the `611c22c` production checkpoint, `main` and production had diverged
substantially:

- 230 commits reachable only from `main`
- 76 commits reachable only from the production branch
- common ancestor: `aad19b691c7a85e8516b23b55389190f946b8bee`

This is not a safe fast-forward. Do not merge, rebase, force-push, or change the
default branch as part of the infrastructure handoff. Product reconciliation
must be a separate reviewed project with database, route, security, and visual
gates.

To obtain the exact running source:

```bash
git clone https://github.com/pretinhuu1-boop/uniher.git
cd uniher
git checkout codex/security-public-api-hardening
git pull --ff-only origin codex/security-public-api-hardening
```

Read-only clone works while the repository remains public. Push and repository
administration require an explicit GitHub collaborator invitation.

## GitHub Access Gate

The new owner's email does not resolve to a public GitHub account and no exact
GitHub username has been provided. GitHub repository access is therefore still
`BLOCKED`, with no pending invitation.

Required completion evidence:

1. Receive the exact GitHub username from the new owner.
2. Invite that exact username with the minimum required permission.
3. Require invitation acceptance and GitHub 2FA.
4. Verify authenticated clone, fetch, and a controlled push from the new account.
5. Decide separately whether repository ownership will remain shared or be transferred.

Do not send a personal access token, SSH private key, password, or copied
credential as a substitute for repository access.

## Secret Inventory

The target environment was inspected by key name and length only. Values were
not printed or copied.

| Item | Current state | Rotation impact |
| --- | --- | --- |
| `JWT_SECRET` | set, 64 characters | Invalidates current 15-minute access tokens |
| `JWT_REFRESH_SECRET` | set, 64 characters | Invalidates current refresh tokens, maximum life 48 hours |
| `UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET` | set, 64 characters | Present in the environment; no reference exists in the deployed branch source, so verify before remove or rotate |
| `UNIHER_RELEASE_SMOKE_ACCOUNTS` | set | Operational credential bundle; replace or remove after handoff validation |
| `RESEND_API_KEY` | empty | Email provider is not active in this environment |
| VAPID public/private keys | empty | Push provider is not active in this environment |
| Sentry DSNs | empty | Sentry is not active in this environment |
| Migration Hostinger API token | external credential | Revoke and replace after final Hostinger operations; never store it in this repository |
| Deployment SSH private key | local operator credential | Never transfer through Git; new owner must provide her own public key |

The tracked production tree contains no `.env`, private-key file, or private-key
marker. The local `.env.production.local` is covered by the `.env*` rule in
`.gitignore`.

## Rotation Sequence

Execute only after the two-TTL stability gate. JWT rotation signs out active
users and therefore requires an announced maintenance window.

The guarded script is `scripts/operations/uniher-rotate-runtime-secrets.sh`.
Run it without arguments for read-only preflight. Real execution additionally
requires both `--execute` and `--acknowledge-session-invalidation`.

1. Take a fresh application backup and Hostinger snapshot.
2. Copy `.env.production` to a root-only rollback file on the target.
3. Generate replacement JWT secrets directly on the target without printing them.
4. Replace `JWT_SECRET` and `JWT_REFRESH_SECRET` atomically; keep mode 600.
5. Restart PM2 with updated environment and save the PM2 state.
6. Verify health, TLS, landing hash, login, refresh, logout, and role boundaries.
7. Replace or remove the release smoke credential bundle after provisioning new owner-controlled smoke accounts.
8. Verify whether the unused employee-import HMAC key is still contractually required before rotating or removing it.
9. Revoke the migration Hostinger API token only after no further migration API action is required.
10. Rotate Resend, VAPID, and Sentry only if those integrations are activated later.

Rollback is the root-only environment copy followed by a PM2 restart with the
previous environment. Never place either environment file in Git or an artifact.

## Source Retirement Gate

Source retirement is not approved by completion of DNS propagation. It requires:

- two complete TTL checkpoints passed;
- fresh target backup and restore evidence;
- GitHub access resolved for the new owner;
- secret rotation completed or explicitly accepted as a documented residual risk;
- separate operator approval to remove the source rollback edge.

Until then, keep the source Nginx bridge active and the source UniHER PM2
process stopped.
