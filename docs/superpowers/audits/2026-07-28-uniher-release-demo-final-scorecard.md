# UniHER release/demo final scorecard

Data: 2026-07-28
Wave: 08 - `finish-release-demo-package`
Branch: `codex/uniher-finish-release-demo-package`
Base: `e936a1a docs: record leadership visual wave integration`

## Decisao

**PASS para envio comercial controlado e demonstracao local/homologacao controlada.**

**HOLD para deploy/producao.** O preflight de ambiente falha corretamente sem `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL` e `DATABASE_PATH`, e a blacklist de access token ainda e in-memory. Producao tambem exige URL final, banco final, contas demo validadas no host alvo, smoke no host alvo e decisao sobre backend persistente de revogacao.

**HOLD para NR-1/Yavix real, laudo, scoring, GRO/PGR e conformidade.** O pacote Yavix esta pronto para chamada/contrato, mas Waves 03-06 seguem bloqueadas ate resposta oficial da Yavix sobre auth, sandbox, provisionamento, resultados e governanca.

**HOLD para aprovacao visual humana final.** O smoke visual e forte como evidencia tecnica, mas nao substitui aceite visual da Dra. Paola.

## Commits integrados no coordenador

| Wave | Status | Commit coordenador | Evidencia |
| --- | --- | --- | --- |
| 00 Yavix contract packet | PASS integrado | `411705f` | `docs/superpowers/audits/2026-07-28-yavix-contract-packet-scorecard.md` |
| 01 Security prod hardening | PASS integrado | `8288da2` | `docs/superpowers/audits/2026-07-28-security-prod-hardening-scorecard.md` |
| 02 NR-1 consent gates | PASS integrado | `b26665e` | `docs/superpowers/audits/2026-07-28-nr1-consent-gates-scorecard.md` |
| 07 Visual leadership demo | PASS integrado | `30abf93` | `docs/superpowers/audits/2026-07-28-uniher-leadership-visual-scorecard.md` |
| Ledger Wave 07 | PASS integrado | `e936a1a` | `docs/superpowers/plans/2026-07-28-uniher-yavix-completion-orchestration.md` |

## Gates executados nesta wave

| Gate | Resultado | Observacao |
| --- | --- | --- |
| `npm ci` | PASS | Instalou 576 pacotes; `npm audit` reportou 26 vulnerabilidades no lock atual: 2 low, 16 moderate, 8 high. Nao foi executado `npm audit fix` para nao alterar dependencias fora da wave. |
| `npm run test:unit` | PASS | 72 arquivos / 633 testes. |
| `npx tsc --noEmit --pretty false` | PASS | Sem erros. |
| `npm run build` | PASS | Next 16.2.1; build otimizado; 148 paginas/rotas estaticas. |
| `npm run test:rh` | PASS | 22/22 Playwright RH. |
| `npm run test:visual-ux-smoke` | PASS | 2/2 Playwright; matriz 192/192 PASS. |
| `docs/superpowers/evidence/visual-ux-smoke-latest/sidebar-geometry-report.json` | PASS | `issues: []`. |
| `npm run check:release-env` | FAIL esperado / HOLD release | Falta `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH`; `ACCESS_TOKEN_BLACKLIST` HOLD para local/homologacao. |
| `git diff --check` | PASS | Reexecutado apos a criacao do pacote; sem erro de whitespace, apenas avisos LF/CRLF nas evidencias regeneradas. |
| Claude Opus final review | PASS COM RESSALVAS | Nenhum P0/P1 bloqueia envio controlado; producao e NR-1/Yavix real seguem HOLD. |

Observacao de preflight: antes do `npm ci`, `npm run test:unit` e `npx tsc` falharam porque a worktree nova ainda nao tinha `node_modules`. Apos instalar dependencias locais, ambos passaram.

## Evidencia visual fresca

- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md`
- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.json`
- `docs/superpowers/evidence/visual-ux-smoke-latest/sidebar-geometry-report.json`
- Screen smoke generated at `2026-07-28T02:44:51.072Z`.
- Sidebar geometry generated at `2026-07-28T02:45:51.733Z`.
- Counts: **192/192 PASS**, 48 route/view combinations, 4 viewports.
- Viewports: mobile-375, tablet-768, desktop-1366, desktop-wide-1920.

## O que pode ser apresentado a Dra. Paola

- Plataforma autenticada navegavel por perfis: Colaboradora, RH/Admin Empresa, Admin Master e Lideranca.
- Sidebar/menu organizados por papel, com smoke visual em mobile, tablet, desktop e desktop-wide.
- Dashboard RH/Admin agregado e protegido por escopo.
- Dashboard de Lideranca demonstravel por departamento persistido, sem escopo arbitrario por querystring.
- Check-in/check-out privado, agenda pessoal, comunidade/feed/editorial admin, campanhas e notificacoes.
- Gestao operacional RH/Admin: colaboradoras, departamentos, convites, company profile, configuracoes e campanhas.
- Objetivos, desafios e conquistas privadas, sem ranking publico como promessa.
- NR-1/Yavix, SIPAT, Concierge, Desenvolvimento Humano, Canal de Denuncias, Semaforo e Liga como modulos chaveados/gated, nao como operacao pronta.
- Pacote de perguntas para chamar a Yavix com bloqueadores tecnicos/contratuais claros.

## O que nao pode ser prometido

- Produto final aprovado visualmente.
- Deploy/producao pronto.
- NR-1/Yavix operacional.
- Auth B2B/SSO Yavix, provisionamento Yavix, resultados Yavix, scoring ou laudo.
- GRO/PGR/conformidade ocupacional.
- SIPAT operacional com conteudo aprovado.
- Concierge operacional com SLA/equipe/processo.
- Canal de Denuncias funcional com parceiro, governanca, anonimato e tratativa.
- Desenvolvimento Humano completo.
- Liga/ranking/recompensas publicas.
- Semaforo clinico ou diagnostico individual.

## Findings priorizados

### P0

- Nenhum P0 tecnico encontrado bloqueando demonstracao controlada local/homologacao.
- P0 de producao: ambiente final nao esta validado; `check:release-env` falha sem secrets, URL e `DATABASE_PATH`.
- P0 de escopo comercial: NR-1/Yavix real segue bloqueado por contrato/API/sandbox/auth/resultados/governanca.

### P1

- Producao continua bloqueada enquanto a blacklist de access token for in-memory.
- Supply chain: `npm ci` reportou 8 vulnerabilidades high e 16 moderate no lock atual; precisa triagem antes de producao, sem usar `npm audit fix` automaticamente em release candidata.
- Aprovacao visual humana final segue externa apesar do smoke 192/192.

### P2

- Waves 03-06 permanecem HOLD ate resposta da Yavix; qualquer modelo CPF/CNPJ/GHE/ciclos/provisionamento/resultados deve aguardar contrato oficial.
- Smoke visual prova renderizacao/geometry, nao prova usabilidade final nem copy aprovada.
- Claude apontou que os steps da Task 08 ainda estavam desmarcados no plano; corrigido nesta wave apos a revisao.

### P3

- Manter o indice de screenshots atualizado quando houver novo smoke.
- Se houver ambiente homologado, repetir `check:release-env`, `test:rh` e `test:visual-ux-smoke` contra o host alvo antes de qualquer demo externa com URL publica.

## Recomendacao

**Enviar para Dra. Paola como PASS controlado:** "a plataforma evoluiu muito, esta demonstravel, tem evidencias tecnicas e esta organizada por frentes reais, parciais e bloqueadas".

**Nao enviar como pronto para producao ou compliance:** qualquer frase sobre NR-1/Yavix real, laudo, scoring, GRO/PGR, SIPAT operacional, Concierge operacional, Canal de Denuncias funcional, Desenvolvimento Humano completo, Liga/ranking ou aceite visual final deve permanecer em HOLD.
