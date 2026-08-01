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

## Pending Checkpoints

- T+1 TTL: 2026-08-01 16:45 BRT or later
- T+2 TTL: 2026-08-01 17:45 BRT or later
