# Registro.br DNS Cutover Receipt

Date: 2026-08-01
Publication time: approximately 15:45 BRT / 18:45 UTC
Domain: `uniher.com.br`

## Published Zone

- Apex: `A 76.13.165.185`
- WWW: `CNAME uniher.com.br`
- Previous apex: `187.77.42.199`
- TTL: 3600 seconds

Only the apex A record was replaced. The `www` CNAME was preserved.

## DNS Verification

Immediately after publication, all four explicit DNS queries returned the target IP:

| Resolver | Apex result | TTL |
| --- | --- | --- |
| `b.sec.dns.br` | `76.13.165.185` | 3600 |
| `c.sec.dns.br` | `76.13.165.185` | 3600 |
| `1.1.1.1` | `76.13.165.185` | 3600 |
| `8.8.8.8` | `76.13.165.185` | 3600 |

Both authoritative servers returned `www.uniher.com.br CNAME uniher.com.br` with TTL 3600.

## Target HTTPS Verification

Direct checks pinned to `76.13.165.185` returned:

| Route | HTTP | TLS verification |
| --- | --- | --- |
| `https://uniher.com.br/` | 200 | 0 |
| `https://uniher.com.br/api/health` | 200 | 0 |
| `https://www.uniher.com.br/` | 200 | 0 |

Health body: `{"status":"healthy"}`.

The workstation resolver still had the previous apex cached during the first public request and reached `187.77.42.199`, where the verified TLS bridge returned HTTP 200 from the target runtime. This is expected during the TTL window.

## Evidence

- `artifacts/migration/2026-08-01/registrobr-dns-cutover-20260801-154545.png`
- `docs/operations/2026-08-01-hostinger-account-migration-runbook.md`

Source retirement remains on hold pending the stability window and separate approval.
