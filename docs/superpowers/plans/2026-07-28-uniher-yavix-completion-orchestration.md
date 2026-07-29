# UniHER Yavix Completion Orchestration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Concluir a proxima rodada UniHER com uma wave por worktree, Claude revisando cada wave, e desbloquear o caminho Yavix/NR-1 sem prometer integracao, laudo, scoring ou compliance antes do contrato real.

**Architecture:** Um coordenador integra somente commits verificados. Cada frente trabalha em branch/worktree propria, retorna recibo, evidencias e riscos; o coordenador roda gates e chama Claude como revisor externo read-only antes de promover a wave. Yavix fica em duas camadas: pacote de contrato/piloto primeiro; implementacao real apenas depois de auth servidor-a-servidor/SSO, sandbox, payload oficial e endpoint/matriz de resultados.

**Tech Stack:** Next.js 16, TypeScript, SQLite/better-sqlite3, Vitest, Playwright, PowerShell, Git worktrees, Claude Code CLI read-only.

---

## Source Of Truth

- Coordenador: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Branch coordenadora: `codex/uniher-wave3-collaborator-nr1`
- Base ao iniciar esta orquestracao: `9dae8d2`
- Plano anterior das 9 frentes: `docs/superpowers/plans/2026-07-27-uniher-nine-fronts-orchestration-goal.md`
- Scorecard integrado: `docs/superpowers/audits/2026-07-27-uniher-nine-fronts-integration-scorecard.md`
- Revisao Claude externa: `docs/superpowers/audits/2026-07-27-uniher-claude-external-review.md`
- Gate NR-1/Yavix atual: `docs/superpowers/audits/2026-07-27-uniher-nr1-yavix-fail-closed-scorecard.md`
- Perguntas para Yavix: `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`
- Arquitetura Yavix/NR-1: `docs/INTEGRACAO_YAVIX_NR1.md`
- Spec proxy COPSOQ: `docs/specs/SPEC_YAVIX_COPSOQ_PROXY.md`
- Descoberta publica Yavix: `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`
- Auditoria fonte COPSOQ/XLSX: `docs/superpowers/audits/2026-07-21-yavix-copsoq41-source-audit.md`

## Non-Negotiable Gates

- Nao armazenar senha de colaboradora Yavix.
- Nao implementar client real Yavix por suposicao.
- Nao chamar endpoint de implantacao/provisionamento inferido por certificado, host dev ou API publica de assessment.
- Nao automatizar `PUT /terms/update` como aceite em nome da colaboradora.
- Nao prometer NR-1/Yavix real, laudo, scoring, GRO/PGR ou conformidade antes de contrato, payload oficial, resultados e aprovacao juridica/privacidade.
- Smoke tecnico nao substitui aprovacao visual humana.
- Cada wave deve ter worktree propria, commit proprio, recibo, gates locais e revisao Claude read-only.

## Claude Review Contract

Rodar ao fim de cada wave, dentro da worktree da wave, antes de integrar no coordenador:

```powershell
$prompt = @'
Voce e revisor externo da UniHER. Trabalhe em PT-BR.
Modo somente leitura: nao edite, nao commit, nao push, nao reset, nao checkout, nao stash, nao revert.
Revise BASE..HEAD desta worktree.
Procure P0/P1 em seguranca, privacidade, tenant, auth, NR-1/Yavix, overpromise e regressao visual/teste.
Cada achado precisa de arquivo/linha ou comando/evidencia.
Se nao houver P0/P1 concreto, diga explicitamente.
Finalize com PASS, PASS COM RESSALVAS ou HOLD.
'@
claude --model opus --effort high --permission-mode dontAsk `
  --allowedTools "Bash(git:*),Bash(rg:*),Bash(npm:*),Bash(npx:*),Read,Grep,Glob,LS" `
  --disallowedTools "Edit,Write,MultiEdit,NotebookEdit,Bash(git commit:*),Bash(git push:*),Bash(git reset:*),Bash(git checkout:*),Bash(git stash:*),Bash(git revert:*),Bash(rm:*),Bash(del:*),Bash(Remove-Item:*)" `
  -p $prompt
```

O output do Claude e evidencia auxiliar, nao promocao automatica. O coordenador valida P0/P1 manualmente antes de aceitar ou descartar.

## Wave Matrix

| Wave | Worktree | Branch | Owner scope | Promotion gate |
| --- | --- | --- | --- | --- |
| 00 | `.worktrees\finish-yavix-contract-packet` | `codex/uniher-finish-yavix-contract-packet` | pacote para chamar Yavix + checklist de respostas esperadas | docs-only PASS + Claude |
| 01 | `.worktrees\finish-security-prod-hardening` | `codex/uniher-finish-security-prod-hardening` | P1 auth/proxy/token blacklist antes de prod | unit auth + typecheck + Claude |
| 02 | `.worktrees\finish-nr1-consent-gates` | `codex/uniher-finish-nr1-consent-gates` | P1 bootstrap COPSOQ e gates NR-1 fail-closed | nr1 tests + Claude |
| 03 | `.worktrees\finish-yavix-data-model` | `codex/uniher-finish-yavix-data-model` | modelo interno CPF/CNPJ/GHE/ciclo/outbox como spec ou migration conforme contrato | blocked until Wave 00 answers |
| 04 | `.worktrees\finish-yavix-provisioning-mvp` | `codex/uniher-finish-yavix-provisioning-mvp` | XLSX/staging/diff/outbox ou API provisioning conforme contrato | no PII logs + tests + Claude |
| 05 | `.worktrees\finish-copsoq-runtime-real` | `codex/uniher-finish-copsoq-runtime-real` | client/proxy real somente com auth servidor/SSO; senao redirect/shell | blocked until auth answer |
| 06 | `.worktrees\finish-yavix-results-boundary` | `codex/uniher-finish-yavix-results-boundary` | resultados/scoring/laudo/agregados, apenas via endpoint/matriz oficial | blocked until results answer |
| 07 | `.worktrees\finish-visual-leadership-demo` | `codex/uniher-finish-visual-leadership-demo` | fixture visual lideranca + screenshots demo controlado | visual smoke + screenshots + Claude |
| 08 | `.worktrees\finish-release-demo-package` | `codex/uniher-finish-release-demo-package` | release/demo packet final, env gate, mensagem Dra. Paola | full gate + Claude + HOLD prod |

## Progress Ledger

| Wave | Status | Branch commit | Coordenador commit | Evidencia |
| --- | --- | --- | --- | --- |
| 00 Yavix contract packet | PASS integrado | `31a382e docs: prepare Yavix contract packet` | `411705f docs: prepare Yavix contract packet` | `docs/superpowers/audits/2026-07-28-yavix-contract-packet-scorecard.md` |
| 01 Security prod hardening | PASS integrado | `141d3bf fix: harden auth proxy release gates` | `8288da2 fix: harden auth proxy release gates` | `docs/superpowers/audits/2026-07-28-security-prod-hardening-scorecard.md` |
| 02 NR-1 consent gates | PASS integrado | `5970b0e fix: require NR-1 consent before COPSOQ bootstrap` | `b26665e fix: require NR-1 consent before COPSOQ bootstrap` | `docs/superpowers/audits/2026-07-28-nr1-consent-gates-scorecard.md` |
| 03 Yavix data model | HOLD integrado | `1c7bc45 docs: hold Yavix data model pending contract` | `b728cda docs: hold Yavix data model pending contract` | `docs/superpowers/audits/2026-07-28-yavix-data-model-hold-scorecard.md` |
| 04 Yavix provisioning MVP | HOLD integrado | `587b32e docs: hold Yavix provisioning pending contract` | `1f589a0 docs: hold Yavix provisioning pending contract` | `docs/superpowers/audits/2026-07-28-yavix-provisioning-mvp-hold-scorecard.md` |
| 05 COPSOQ runtime real | HOLD integrado | `54ac661 docs: hold COPSOQ runtime pending auth` | `1999e27 docs: hold COPSOQ runtime pending auth` | `docs/superpowers/audits/2026-07-28-copsoq-runtime-real-hold-scorecard.md` |
| 06 Yavix results boundary | HOLD integrado | `a9fc070 docs: hold Yavix results pending official scoring` | `9078cab docs: hold Yavix results pending official scoring` | `docs/superpowers/audits/2026-07-28-yavix-results-boundary-hold-scorecard.md` |
| 07 Visual leadership demo | PASS COM RESSALVAS integrado | `a19ee90 fix: add leadership visual coverage and scope gates` | `30abf93 fix: add leadership visual coverage and scope gates` | `docs/superpowers/audits/2026-07-28-uniher-leadership-visual-scorecard.md` |
| 08 Release demo package | PASS COM RESSALVAS integrado / HOLD prod | `2b1b571 docs: package UniHER release demo evidence` | `13a1ee6 docs: package UniHER release demo evidence` | `docs/superpowers/audits/2026-07-28-uniher-release-demo-final-scorecard.md` |

## Task 00: Yavix Contract Packet

**Files:**
- Modify: `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`
- Create: `docs/superpowers/audits/YYYY-MM-DD-yavix-contract-intake-checklist.md`
- Create: `docs/superpowers/prompts/YYYY-MM-DD-yavix-outbound-message.md`

- [x] **Step 1: Criar worktree**

```powershell
git worktree add .worktrees\finish-yavix-contract-packet -b codex/uniher-finish-yavix-contract-packet
```

- [x] **Step 2: Preparar versao enviavel**

Remover ou separar qualquer trecho marcado como interno, principalmente `Anexo - Decisoes internas (Nelson - NAO enviar a Yavix)` de `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`.

- [x] **Step 3: Checklist de intake**

O checklist deve exigir, no minimo:

- OpenAPI/Postman atual de implantacao/provisionamento.
- Base URLs de homologacao e producao.
- Sandbox tenant e credenciais de teste sem PII real.
- Auth servidor-a-servidor, API key, service account ou SSO/OIDC.
- Endpoint de resultados/scoring/laudo ou matriz oficial de calculo.
- Payload completo de `GET /form/COPSOQ41`, com versao/hash.
- Semantica de `POST /form` depois de `DONE`.
- Rate limits/429.
- Upsert por CPF e comportamento `REMOVER=Sim`.
- Retencao/exclusao, controlador/operador e aceite de termos.

- [x] **Step 4: Gate**

```powershell
git diff --check
rg -n "NAO enviar|NÃO enviar|senha de cada|laudo pronto|compliance pronta" docs/PERGUNTAS_YAVIX_INTEGRACAO.md docs/superpowers/prompts
```

Expected: sem texto interno no pacote enviavel; nenhuma promessa de laudo/compliance.

- [x] **Step 5: Claude review**

Rodar o contrato Claude desta planilha. Promocao esperada: `PASS` ou `PASS COM RESSALVAS`.

## Task 01: Security Production Hardening

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/lib/auth/token-blacklist.ts` or create production adapter behind env/config
- Test: `tests/unit/auth-session-revocation.test.ts`
- Test: add focused proxy secret validation test if no current coverage exists

- [x] **Step 1: Escrever testes negativos**

Cobrir `JWT_SECRET` ausente/curto no proxy e registrar decisao para blacklist persistente em producao. Se a implementacao persistente ficar fora do escopo, o gate de release deve falhar explicitamente quando `NODE_ENV=production` sem backend persistente de revogacao.

- [x] **Step 2: Implementar menor hardening**

Reutilizar a validacao canonica de segredo ou extrair helper seguro compartilhado. Nao aceitar `"undefined"` como chave.

- [x] **Step 3: Gate**

```powershell
npm run test:unit -- tests/unit/auth-session-revocation.test.ts
npx tsc --noEmit --pretty false
git diff --check
```

- [x] **Step 4: Claude review**

Foco: auth, secrets, revogacao, multi-instancia, deploy HOLD.

## Task 02: NR-1 Consent Gates

**Files:**
- Modify: `src/app/api/yavix/copsoq/bootstrap/route.ts`
- Modify: `tests/unit/nr1-runtime-entitlement.test.ts`
- Optional: `docs/specs/SPEC_YAVIX_COPSOQ_PROXY.md`

- [x] **Step 1: Escrever teste RED**

Bootstrap deve bloquear colaboradora sem consentimento `nr1_psychosocial` quando o fluxo retorna metadados sensiveis do COPSOQ.

- [x] **Step 2: Implementar gate**

Adicionar `requireNr1PsychosocialConsent(auth.userId)` ao bootstrap ou documentar fluxo alternativo seguro onde bootstrap sem consentimento retorna somente termos/tela de consentimento sem perguntas. A opcao mais simples e segura para fechar P1: exigir consentimento antes de retornar perguntas.

- [x] **Step 3: Gate**

```powershell
npm run test:unit -- tests/unit/nr1-runtime-entitlement.test.ts tests/unit/module-shells.test.ts tests/unit/nr1-gamification.test.ts
npx tsc --noEmit --pretty false
```

- [x] **Step 4: Claude review**

Foco: COPSOQ, consentimento, PII, fail-closed, ausencia de ranking/scoring/laudo.

## Task 03: Yavix Data Model

**Status:** HOLD integrado via `docs/superpowers/audits/2026-07-28-yavix-data-model-hold-scorecard.md` ate Wave 00 receber contrato ou, no minimo, confirmar que o piloto usara XLSX.

**Files:**
- Create/Modify: docs/specs or migrations only after decision
- Candidate future areas: companies parent/CNPJ, users CPF, phone, sexo, unidade, cargo, GHE, leader, assessment cycles, outbox, reconciliation receipts

- [ ] **Step 1: Antes de codigo, registrar decision record**

Decidir se o proximo passo e:

- `D1`: XLSX operacional com staging/diff/manual approval.
- `API`: provisioning via OpenAPI/Postman oficial.
- `A1`: redirect/SSO ao portal Yavix.
- `A2`: proxy embutido real com auth servidor-a-servidor.

- [ ] **Step 2: Gate**

Nenhuma migration real se a resposta Yavix ainda nao definiu chaves naturais, CPF, CNPJ, filiais, REMOVER, GHE, retencao e reconciliacao.

## Task 04: Yavix Provisioning MVP

**Status:** HOLD integrado via `docs/superpowers/audits/2026-07-28-yavix-provisioning-mvp-hold-scorecard.md` ate Wave 00 responder provisioning.

**Files:**
- To be defined after contract. Do not infer endpoint names.

- [ ] **Step 1: Se XLSX for o caminho MVP**

Construir staging/diff/export com hash, aprovacao RH, senha/cripto ou link temporario, destinatario, recibo e retencao. Nao logar CPF em claro.

- [ ] **Step 2: Se API for contratada**

Construir `YavixProvisioningClient` separado de `YavixAssessmentClient`, com idempotency key, retries, recibo por registro, reconciliacao e testes de erro por registro.

- [ ] **Step 3: Gate**

Sem PII em logs, sem endpoints presumidos, sem push automatico de cadastro real.

## Task 05: COPSOQ Runtime Real

**Status:** HOLD integrado via `docs/superpowers/audits/2026-07-28-copsoq-runtime-real-hold-scorecard.md` ate Yavix fornecer auth servidor-a-servidor/SSO seguro.

**Files:**
- Candidate: `src/lib/yavix/*`, `src/app/api/yavix/copsoq/*`, `src/components/copsoq/*`

- [ ] **Step 1: Se nao houver auth servidor/SSO**

Nao implementar A2 real. Manter shell/gated ou implementar apenas A1 redirect/SSO, sem armazenar senha de colaboradora.

- [ ] **Step 2: Se houver auth servidor/SSO**

Implementar client server-side com token nunca exposto ao browser, payload helper unico para `value.value` 1-based e `optionIndex` 0-based, fallback i18n e completude server-side.

- [ ] **Step 3: Gate**

Testes devem provar: sem token/CPF/respostas no browser/log, 401/403/404/429 mapeados, fail-closed fora de env autorizado.

## Task 06: Results, Scoring And Report Boundary

**Status:** HOLD integrado via `docs/superpowers/audits/2026-07-28-yavix-results-boundary-hold-scorecard.md` ate Yavix fornecer endpoint de resultado ou matriz oficial com governanca.

**Files:**
- To be defined after contract.

- [ ] **Step 1: Se houver endpoint de resultados**

Consumir somente status tecnico, devolutiva individual autorizada e agregados protegidos por k-anonimato/supressao. Nao expor respostas individuais a RH/Admin.

- [ ] **Step 2: Se nao houver endpoint**

Manter NR-1 como bloqueado por contrato; nao calcular scoring proprio.

- [ ] **Step 3: Gate**

Sem laudo, scoring, GRO/PGR ou conformidade comercial sem evidencia oficial.

## Task 07: Visual Leadership Demo

**Files:**
- Modify: visual smoke fixtures/scripts
- Evidence: `docs/superpowers/evidence/visual-ux-smoke-latest/`
- Audit: `docs/superpowers/audits/YYYY-MM-DD-uniher-leadership-visual-scorecard.md`

- [x] **Step 1: Adicionar fixture visual de lideranca**

Cobrir desktop/mobile e estados principais sem ampliar dados sensiveis.

- [x] **Step 2: Gate**

```powershell
npm run test:visual-ux-smoke
```

Expected: matriz PASS, screenshots frescos, sem overlap/sidebar geometry issues.

- [x] **Step 3: Claude review**

Foco: claims visuais, papeis, ausencia de dados individuais sensiveis.

## Task 08: Release Demo Package

**Files:**
- Modify/Create: final audit, demo checklist, screenshot index, client-facing note

- [x] **Step 1: Full technical gate**

```powershell
npm run test:unit
npx tsc --noEmit --pretty false
npm run build
npm run test:rh
npm run test:visual-ux-smoke
npm run check:release-env
git diff --check
```

Expected:

- Unit/type/build/RH/visual PASS.
- `check:release-env` pode seguir FAIL esperado se secrets/URL/banco/contas demo ainda nao estiverem provisionados; nesse caso deploy/prod permanece HOLD.

- [x] **Step 2: Claude final review**

Foco: P0-P3, overpromise, deploy/env, visual human approval.

- [x] **Step 3: Coordinator closeout**

Atualizar scorecard final com:

- commits integrados;
- comandos e resultados;
- screenshots e evidencias;
- P0-P3;
- PASS/HOLD;
- texto do que pode e nao pode ser enviado a Dra. Paola.

## Integration Rules

- Cada executor comita apenas o escopo da propria wave.
- Coordenador revisa `git diff --stat BASE..HEAD`, `git diff --name-only`, recibo e output Claude.
- Coordenador cherry-picka uma wave por vez na worktree principal.
- Depois de cada cherry-pick, rodar gate focado da wave e `git status --short --branch`.
- Antes do push final, rodar gate amplo da Task 08.
- Nunca usar `reset --hard`, `checkout --`, `stash`, `revert` ou limpeza destrutiva para organizar worktree suja.

## Current Recommendation

Comecar pela **Wave 00** imediatamente: ela nao depende de codigo e gera o material certo para chamar a Yavix. Em paralelo, Wave 01 e Wave 02 podem fechar P1 tecnicos ja conhecidos, porque nao dependem de contrato externo e reduzem risco antes de qualquer piloto.

Waves 03 a 06 ficam bloqueadas ate a Yavix responder os itens de contrato. Se a Yavix nao fornecer auth servidor-a-servidor/SSO, a UniHER nao deve implementar proxy A2 real; deve seguir com redirect/SSO ou XLSX controlado como MVP.
