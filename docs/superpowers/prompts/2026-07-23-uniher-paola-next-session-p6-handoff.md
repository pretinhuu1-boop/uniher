# UniHER Paola Redesign - Next Session Handoff Prompt

Copie e cole este prompt na nova sessao do Codex para continuar sem reiniciar o trabalho.

```text
Voce esta continuando o redesign/correcao da UniHER pedido pela Dra. Paola. Nao reinicie do zero. Primeiro recupere o contexto local, preserve a dirty worktree existente, confirme os gates ja rodados e avance pelo loop canonico.

## Repositorio e branch

Use esta tree como fonte operacional:

C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1

Branch atual:

codex/uniher-wave3-collaborator-nr1

Ultimo commit ja enviado ao GitHub:

72335a2d2553f3beffec380cd21660373b1df151

Mensagem do commit:

feat: finalize UniHER Paola redesign gates

Esse SHA ja esta no remoto origin/codex/uniher-wave3-collaborator-nr1. Depois dele existe trabalho P5 local ainda nao commitado.

## Regra de seguranca do Git

Nao use reset, stash, checkout reversivo nem revert sem pedido explicito. A worktree esta suja de proposito com a fundacao P5. Preserve tudo.

Antes de qualquer commit ou push, rode e leia:

git status --short --branch
git diff --stat
git diff -- docs/superpowers src tests

Se o usuario pedir para publicar, commit somente os arquivos da fundacao P5 apos gates verdes e push para a mesma branch.

## Documentos obrigatorios para ler primeiro

- docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md
- docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md
- docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md
- docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md
- docs/superpowers/plans/2026-07-23-uniher-paola-p5-checkout-foundation.md
- docs/superpowers/plans/2026-07-23-uniher-paola-nr1-runtime-entitlement-guard.md

## Arquivos de codigo para inspecionar antes de P6

- src/services/wellbeing.service.ts
- src/lib/db/migrations/061_wellbeing_events.sql
- src/app/api/wellbeing/check-out/route.ts
- src/app/api/wellbeing/daily-status/route.ts
- src/app/api/gamification/check-in/route.ts
- src/app/api/gamification/streak-status/route.ts
- src/app/(platform)/colaboradora/page.tsx
- src/lib/privacy/dsar-export.ts
- tests/unit/wellbeing-events.test.ts
- tests/unit/privacy/gamification-write-containment.test.ts
- tests/unit/privacy/semaforo-containment.test.ts

## Estado P5 local ainda nao commitado

P5 Check-out foundation foi implementado localmente:

- Nova migration src/lib/db/migrations/061_wellbeing_events.sql com tabela wellbeing_events.
- Novo service src/services/wellbeing.service.ts com moods fechados e eventos check_in/check_out.
- Novas APIs:
  - src/app/api/wellbeing/check-out/route.ts
  - src/app/api/wellbeing/daily-status/route.ts
- Check-in existente agora registra evento em wellbeing_events sem quebrar clientes antigos.
- Streak/status agora expõe estado diario do proprio usuario.
- Tela da colaboradora tem check-in e check-out com seletor de humor.
- DSAR export inclui wellbeingEvents.
- Testes de privacidade foram atualizados para incluir containment de wellbeing_events.
- tests/unit/wellbeing-events.test.ts cobre moods fechados, idempotencia diaria, ausencia de score/ranking, DSAR sem user_id e preservacao de gamificacao legada.

Gates P5 ja rodados e passaram:

npm run test:unit -- tests/unit/wellbeing-events.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts

npx tsc --noEmit

git diff --check

npm run test:unit -- tests/unit/wellbeing-events.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts

npm run build

Resultado observado:

- Testes focados: PASS, 3 arquivos / 29 testes.
- TypeScript: PASS.
- Teste ampliado: PASS, 6 arquivos / 75 testes.
- Build: PASS, 148 paginas.
- Warning conhecido do Turbopack/NFT segue em next.config.ts via /api/admin/system/ops.

## Trabalho restante

Imediato:

- Confirmar que o ledger nao contradiz P5. A linha stale correta deve dizer que P5 Check-out foundation existe localmente e que o dashboard Check-in x Check-out ainda pertence ao P6.
- Se o usuario pedir publish, rerode gates essenciais, commit e push do P5.

P6:

- Criar fundacao RH/Admin do dashboard agregado Check-in x Check-out.
- Nao expor humor individual, check-in individual nem check-out individual para RH/Admin.
- Usar apenas agregados com supressao de grupos pequenos.
- Definir projection/service/API/testes antes de UI.
- Exigir gates de privacidade, contrato e fonte.

P7B:

- Ajustar tratamento visual de menu-card/boxes numerados. O alvo visual ainda esta HOLD.

P8:

- Governanca Admin/RH de ativacao/desativacao de modulos com mutacoes, auditoria e permissao.

Modulos ainda source-gated:

- SIPAT/Viva SIPAT
- Concierge
- Canal de Denuncias
- Desenvolvimento Humano
- Conteudos/workflows especificos nao devem ser inventados.

NR-1/Yavix:

- Producao permanece HOLD.
- Ja existe guarda de rota/API; nao assumir provisonamento real sem contrato/fonte.

## Harness e loop canonico

Use harness engineering e loop engineering como padrao global:

1. Preflight
2. Observe
3. Plan
4. Act
5. Verify
6. Reflect
7. Coordinator gate

Nao auto-promova. Cada wave deve produzir recibos: arquivos tocados, comandos, resultados, scorecard e decisao PASS/FAIL/BLOCKED/HOLD.

Checklist ETCLOVG antes de uma wave substancial:

- Execution: objetivo e done condition.
- Tooling: comandos permitidos e runtime.
- Context: documentos e codigo de fonte.
- Lifecycle: preflight, execucao, verificacao e registro.
- Observability: evidencias que serao produzidas.
- Verification: testes/build/auditoria visual quando aplicavel.
- Governance: privacidade, modulos contratados, fonte clinica/legal e usuario.

## Primeiro loop recomendado na nova sessao

Rode:

Set-Location 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1'
git status --short --branch
git diff --stat
rg -n "P5 Check-out foundation now exists|Check-out and Check-in x Check-out dashboards remain unimplemented|P6|wellbeing_events" docs/superpowers src tests
npm run test:unit -- tests/unit/wellbeing-events.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts
npx tsc --noEmit

Depois:

1. Feche P5 se ainda houver doc drift.
2. Se o usuario pedir GitHub, commit/push P5.
3. Caso contrario, inicie P6 com contrato de harness compacto, write allowlist, denylist e testes de privacidade antes da UI.
```
