# UniHER Platform Wave 1.1 Scorecard

> Escopo: plataforma interna autenticada. Landing publica, metadata/JSON-LD, e-mails e Wave 1.2 ficaram fora desta missao.

## Resultado

- Reviewed code commit: `227c8f765e83cd44676301b5083da6b48126577b`
- Decision: PASS
- Base historica: `f398d535c5c30bf79f6bb1d2cee26a55217a9731`
- Branch: `codex/uniher-wave1-1-corrective`
- Data do gate: 2026-07-17

## Commits revisados

- `dd0b285` - sparse user-preference updates.
- `c57c6a0` - copy portuguesa interna autenticada.
- `a7c3dcc` - baseline visual Admin desktop sem `Badges`.
- `227c8f7` - foco do drawer mobile estabilizado; substitui o `4839e78` nao aprovado.

Commits documentais na faixa registram plano, escopo reduzido e desvio do foco do drawer.

## Revisoes independentes

- Reparo do drawer: APPROVED, sem findings, revisao read-only da faixa `4839e78..227c8f7`.
- Revisao final: APPROVED, sem findings, revisao read-only da faixa `f398d535..227c8f7`.
- Escopo proibido confirmado pela revisao final: sem diffs em `src/app/layout.tsx`, `src/lib/mail/templates.ts` ou `tests/unit/privacy/home-gamification-reachability.test.ts`.

## Gate automatizado

| Comando | Resultado |
|---|---|
| `npm run test:unit` | PASS - 29 arquivos, 277 testes |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run build` | PASS - 127 paginas estaticas; 1 aviso NFT conhecido |
| `npm run test:wave1.1` | PASS - unit 29/277 + privacy-wave-1-1 10/10 |
| `npm run test:master` | PASS - 26/26 |
| `npm run test:seguranca` | PASS - 25/25 |
| `npm run test:rh` | PASS - 23/23 |
| `npm run test:colaboradora` | PASS - 24/24 |
| `npm run test:integrado` | PASS - 16/16 |
| `Push-Location tests; npx playwright test --config=playwright.config.ts --project=platform-foundation; Pop-Location` | PASS - 6/6 |
| `git diff --check` | PASS - exit 0 |

Aviso recorrente e nao bloqueante: Turbopack/NFT informa whole-project trace a partir de `next.config.ts` via `src/app/api/admin/system/ops/route.ts`. Isso ja era divida registrada e nao falhou build nem Playwright.

## Evidencia focada do reparo do drawer

- RED legitimo contra `4839e78`: `tests/unit/platform/sidebar-capability.test.tsx` falhou porque o foco ficou no `body` apos `blur/focusout`.
- GREEN: `npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx` passou 9/9.
- TypeScript: `npx tsc --noEmit` saiu 0.
- Repeticao real do sintoma: `platform-foundation --grep "opens an accessible mobile drawer" --workers=1 --repeat-each=20` passou 20/20.
- Foundation completa pos-reparo: 6/6.

## Preferencias

PASS. `PATCH /api/users/me/preferences` usa `z.partialRecord`, aceita patch esparso, aceita `{}` sem abrir fila de escrita, rejeita chave desconhecida/tipo invalido antes da escrita e mantem `privacy_ranking` atomico com resposta `410`, `Cache-Control: private, no-store` e `Vary: Cookie`.

Cobertura: `tests/unit/privacy/user-preferences-route.test.ts`, `wave-1-1-privacy` e o fluxo real `Pular tour`.

## Copy interna

PASS. A correcao ficou restrita as superficies autenticadas: dashboard, historico e comunicacoes. O contrato AST rejeita escapes `\u...` em JSX text e atributos string, preservando escapes validos em strings JavaScript. O teste RH confirma Dashboard, Historico e Comunicacoes sem escapes literais.

Landing publica e e-mails nao tiveram diff nesta missao.

## Visual/Admin

PASS. O baseline Admin desktop foi alinhado para remover `Badges 6`; `Sistema`, `Alertas` e `Auditoria` deslocaram a esquerda. O snapshot mobile permaneceu byte-intacto. O gate foundation final preservou os snapshots e a ausencia semantica de `Badges`.

O defeito de foco do drawer mobile foi fechado com logica dirigida por evento real: `focusout` em capture agenda um `requestAnimationFrame`; no frame, se o drawer segue aberto e o foco esta fora dele, o primeiro `nav a[href]` recebe foco. Nao ha timeout longo nem polling.

## Inventarios estaticos

### Agenda, ranking, pontos, badges, Semaforo e health score

Comando:

```powershell
rg -n "api/rh/agenda|alert_preferences|user_leagues|week_points|recalculateSemaforo|health_scores|UPDATE users SET points|SUM\(points\)|pointsEarned|xp_reward|holder_count|toPublicUser|recordHealthScore|INSERT INTO health_scores" src
```

Classificacao:

- `src/app/api/rh/agenda/route.ts` e `src/app/api/rh/alert-preferences/route.ts`: alcancaveis, mas retornam `privacyReviewResponse()`.
- `src/services/semaforo-calculator.service.ts`: quarentena fail-closed por `SemaforoContainmentError`.
- `src/repositories/health-score.repository.ts`, `src/lib/privacy/dsar-export.ts` e migracoes `001`, `022`, `052`, `053`: schema/historico/exportacao LGPD; nao sao exposicao RH agregada.
- `src/lib/gamification/containment.ts`: lista de chaves proibidas e projecao fail-closed.
- Seeds e migracoes de gamificacao: dados/schema legados em quarentena.
- Rotas RH lessons removem ou rejeitam `xp_reward` na projecao/entrada.
- Admin badges ainda contem contagem/pontos de badge em superficie Master legada; endpoints de badge respondem `privacyReviewResponse()` e Wave 1.2/Admin redesign ficam fora deste gate.

Blocker: nenhum.

### Wording de UI

Comando:

```powershell
rg -n "Urgente|Saudável|Liga Semanal|ranking|XP|pts" 'src/app/(platform)' src/components
```

Classificacao:

- `campanhas/page.tsx` usa `Primavera Saudável` como placeholder de campanha; wording seguro.
- `RewardsShop`, `LeagueNotification`, `Gamification` e CSS associado sao componentes legados nao promovidos pelo gate Wave 1.1; APIs correlatas estao em privacy review.
- `admin/page.tsx` exibe dados legados de badges apenas na superficie Master fora da promocao Wave 1.1.
- `historico.module.css` e `gamificacao-config.module.css`: nomes/classes CSS legadas.
- `convites/page.tsx`: falso positivo em `mutateDepts`.

Blocker: nenhum.

### Jobs, reports e exports

Comando:

```powershell
rg -n "scheduled|cron|report|export" src/services src/app/api src/instrumentation.ts
```

Classificacao:

- `instrumentation.ts`: agenda reminders e auto-backup. Nao ha gerador/exportador de relatorio RH agendado.
- `src/app/api/users/me/export/route.ts` e `src/lib/privacy/dsar-export.ts`: DSAR LGPD autenticado da propria usuaria.
- `dashboard.service.ts`: projecoes protegidas de dashboard/comunicacoes.
- Rotas gamification/leagues/rewards/objectives/challenges: indisponiveis via `privacyReviewResponse()` quando sensiveis.
- Demais hits sao exports TypeScript, servicos internos ou CRUDs autenticados ja cobertos por gates.

Blocker: nenhum.

## Canarios e negativos cobertos

- Agenda propria de colaboradora: CRUD limitado a propria usuaria.
- Manager/RH/Admin Agenda: superficies persistidas e payloads removidos ou `privacyReviewResponse()`.
- Notificacoes e exports: nao revelam payloads de Agenda para manager/RH.
- Ranking, pontos, badges, rewards, leagues, objectives e challenges sensiveis: indisponiveis durante privacy review.
- Semaforo e health scores: escritores fail-closed; `health_scores` nao e alterado pelos antigos caminhos.
- Dashboard RH: supressao 9/10, complementar e temporal; cache/tenant switch nao vaza canario da empresa A para B.
- Historico e comunicacoes: historico indisponivel e comunicacoes sem payload de Agenda.
- API/UI/CSV/cache/tenant/role/payload: cobertos pelos projetos `privacy-wave-1-1`, `master`, `seguranca`, `rh`, `colaboradora` e `integrado`.

## Arquivo protegido

O arquivo externo protegido `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-platform-wave1\tests\unit\privacy\dsar-export-cooldown.test.ts` permaneceu intocado. SHA-256 verificado:

```text
CFCEFB26E378816C833DF1F4BB936FD095539751BB4229C24928B85FD61EDF54
```

## Divida remanescente

- Aviso NFT/Turbopack em `next.config.ts` via `src/app/api/admin/system/ops/route.ts`.
- 25 advisories de dependencias reportados em instalacao anterior; nao houve `npm audit fix` nesta missao por estar fora do write set.
- Admin Master e componentes legados de gamificacao permanecem fora da promocao Wave 1.1; qualquer reativacao exige plano separado.

## Precondicao para Wave 1.2

Wave 1.2 so pode iniciar depois do commit documental deste scorecard, com `227c8f765e83cd44676301b5083da6b48126577b` como ancestral, sem drift nao documental apos ele e worktree limpo.
