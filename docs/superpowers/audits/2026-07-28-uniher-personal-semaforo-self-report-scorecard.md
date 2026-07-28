# UniHER Personal Semaforo Self-Report Scorecard - 2026-07-28

## Decision

Status: PASS tecnico local para Semaforo real privado; HOLD para qualquer uso clinico, ocupacional, ranking, laudo ou visibilidade individual para empresa.

## Scope

- Intent: substituir a tela vazia/bloqueada de `/semaforo` por um produto real minimo.
- Branch: `codex/uniher-wave3-collaborator-nr1`.
- Allowlist: `/semaforo`, APIs `api/collaborator/semaforo*`, dominio `lib/semaforo`, migracao DB, DSAR export e testes de privacidade.
- Denylist: `health_scores`, calculo legado, RH/Admin individual, ranking, Liga, NR-1/Yavix, alertas clinicos, laudo e decisao ocupacional.

## Changes

- Criada tabela propria `personal_semaforo_consents`.
- Criada tabela propria `personal_semaforo_entries`.
- `GET /api/collaborator/semaforo` agora retorna estado privado da propria colaboradora.
- `POST /api/collaborator/semaforo` grava auto-relato privado com consentimento explicito.
- `GET /api/collaborator/semaforo/history` lista historico privado da propria colaboradora.
- `DELETE /api/collaborator/semaforo` apaga os registros privados, revoga consentimento e grava auditoria apenas com contagem.
- `POST /api/collaborator/semaforo/recalculate` permanece bloqueado em 423.
- DSAR export inclui `personalSemaforo`.

## Verification

- `npx vitest run tests/unit/privacy/semaforo-containment.test.ts`: PASS, 6 testes.
- `npx vitest run tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/gamification-openapi-containment.test.ts`: PASS, 4 arquivos / 61 testes.
- `npx vitest run tests/unit/privacy/semaforo-containment.test.ts tests/unit/wellbeing-events.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts`: PASS, 6 arquivos / 79 testes.
- `npx tsc --noEmit --pretty false`: PASS.
- `NODE_ENV=production npm run build`: PASS, 148 rotas.
- Varredura `rg` de mojibake nos arquivos alterados: sem matches.
- `git diff --check`: PASS, com aviso normal de LF -> CRLF no Windows.

## Remaining Boundaries

- Nao e diagnostico.
- Nao calcula score.
- Nao aciona alerta clinico.
- Nao usa `health_scores`.
- Nao e visivel para RH, lideranca, Admin Empresa ou Master.
- Qualquer interpretacao clinica, juridica, SST ou ocupacional segue fora do escopo.
