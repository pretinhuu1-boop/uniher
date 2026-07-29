# Security Prod Hardening Scorecard

Data: 2026-07-28
Wave: 01 - `finish-security-prod-hardening`
Branch: `codex/uniher-finish-security-prod-hardening`
Base: `d8337e3 docs: record NR-1 consent wave progress`
Decision: **PASS para commit e integracao coordenada**

## Escopo

Fechar dois achados de seguranca antes de qualquer promessa de producao:

1. `src/proxy.ts` codificava `process.env.JWT_SECRET` diretamente e podia tratar secret ausente como chave `"undefined"`.
2. A blacklist de access tokens e in-memory; producao multi-instancia precisa continuar bloqueada ate existir backend real de revogacao.

## Mudancas

| Arquivo | Mudanca |
| --- | --- |
| `src/proxy.ts` | Substitui `jwtVerify` direto por `verifyAccessToken(accessToken)`, reaproveitando a validacao canonica de segredo em `src/lib/auth/jwt.ts` |
| `scripts/check-release-env.cjs` | Adiciona gate `ACCESS_TOKEN_BLACKLIST`; producao/HTTPS falha enquanto o runtime seguir in-memory |
| `tests/unit/auth-proxy-secret.test.ts` | Teste estrutural contra regressao no proxy |
| `tests/check-release-env-security.test.cjs` | Teste Node para garantir FAIL em producao com blacklist in-memory |

## TDD

| Etapa | Resultado |
| --- | --- |
| RED proxy | `npm run test:unit -- tests/unit/auth-proxy-secret.test.ts` falhou porque o proxy ainda importava `jwtVerify` e usava `TextEncoder` direto |
| RED release-env | `node --test tests/check-release-env-security.test.cjs` falhou pela ausencia do gate `ACCESS_TOKEN_BLACKLIST` |
| GREEN | Ambos passaram apos implementacao |

## Gates locais

| Gate | Resultado |
| --- | --- |
| `npm run test:unit -- tests/unit/auth-session-revocation.test.ts tests/unit/auth-proxy-secret.test.ts` | PASS, 2 arquivos / 8 testes |
| `node --test tests/check-release-env-security.test.cjs` | PASS |
| `npx tsc --noEmit --pretty false` | PASS |
| `git diff --check` | PASS |
| `npm run check:release-env` sem env final | FAIL esperado: faltam `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH`; `ACCESS_TOKEN_BLACKLIST` aparece HOLD para local/homologacao |

## Revisao Claude

Claude Opus revisou a wave em modo read-only e retornou **PASS**.

Resumo da revisao:

- P1 do proxy corrigido: `verifyAccessToken` usa a validacao canonica de segredo.
- P1 da blacklist em memoria nao e mascarado; o preflight bloqueia producao/HTTPS e tambem falha se alguem declarar backend que ainda nao existe.
- Nenhum P0/P1 concreto nas mudancas.

## Observacoes registradas para waves futuras

- P2 preexistente: `pathname.includes('.')` em `src/proxy.ts` e amplo demais se o proxy estiver ativo; paths com ponto em segmento intermediario podem ser classificados como publico.
- Info/preexistente: confirmar no runtime Next.js se `src/proxy.ts` esta efetivamente wired como proxy/middleware esperado.
- P3 preexistente: catch com refresh token permite `NextResponse.next()` para page routes; verificar se paginas protegidas nao renderizam shell antes do refresh.

## Decisao

**PASS** para integrar no coordenador.

Deploy/producao continua **HOLD** ate secrets, URL, DB, contas demo, smoke no host alvo e backend real/persistente de revogacao estarem validados.

