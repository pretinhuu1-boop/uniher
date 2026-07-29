# UniHER - Plano Coordenador das 9 Frentes

Data: 2026-07-27
Coordenador: thread principal Codex
Goal: orquestrar as 9 frentes UniHER em worktrees isoladas ate obter commits verificaveis, evidencias visuais quando aplicavel, anti-regressoes e uma decisao coordenada de integracao sem quebrar o que ja esta pronto.

## Fonte de Verdade

- Base canonica: `origin/codex/uniher-wave3-collaborator-nr1`
- Commit base: `2e348d4`
- Repo: `C:\Users\user\Documents\uniher-app-audit`
- Worktree coordenadora/auditoria: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Matriz de conclusao: `docs/superpowers/audits/2026-07-27-uniher-nine-fronts-completion-matrix.md`
- Relatorio Dra. Paola: `docs/superpowers/audits/2026-07-27-uniher-relatorio-dra-paola-3-semanas.md`

## Regra Principal

Nenhuma frente se autopromove. Cada sessao deve entregar commit local, lista de arquivos, comandos rodados, resultados, evidencia e riscos. O coordenador decide `PASS`, `HOLD`, `BLOCKED` ou `RETRY`.

## Sessoes

| Frente | Thread | Worktree prevista | Branch prevista | Gate principal |
| --- | --- | --- | --- | --- |
| 01 Sessao/revogacao | `019fa5c1-ad3f-7aa2-a338-96048c95ea32` | `.worktrees\kill-p0-session-revocation` | `codex/uniher-kill-p0-session-revocation` | P0 fechado com testes negativos |
| 02 Tenant/APIs | `019fa5c1-c7cc-74f1-9668-9a2f340a3395` | `.worktrees\kill-tenant-api-hardening` | `codex/uniher-kill-tenant-api-hardening` | isolamento por papel/empresa |
| 03 Campanhas/Educacao | `019fa5c1-e06b-7db0-ba00-eb7cfe716a59` | `.worktrees\kill-campaigns-education` | `codex/uniher-kill-campaigns-education` | join seguro por empresa/status |
| 04 Colaboradora/Agenda | `019fa5c2-724c-7e60-8c69-ee91da6c979f` | `.worktrees\kill-wellbeing-agenda` | `codex/uniher-kill-wellbeing-agenda` | wellbeing e agenda sem regressao |
| 05 Sidebar/Menu | `019fa5c2-9089-7953-bd66-bf816774efc2` | `.worktrees\kill-sidebar-menu` | `codex/uniher-kill-sidebar-menu` | visual/menu com screenshots |
| 06 Dashboard/RH/Admin | `019fa5c2-ad94-7ba3-8ac7-c817abfd3dcd` | `.worktrees\kill-dashboard-rh-admin` | `codex/uniher-kill-dashboard-rh-admin` | dashboard-css + sem overpromise |
| 07 P8 Modulos | `019fa5c3-4b71-7ce0-bd3c-e4e8a883d041` | `.worktrees\kill-p8-modules` | `codex/uniher-kill-p8-modules` | Master Admin-only + auditoria |
| 08 NR-1/Yavix | `019fa5c3-6fce-7431-94f8-ae95ee389932` | `.worktrees\kill-nr1-yavix-gates` | `codex/uniher-kill-nr1-yavix-gates` | fail-closed sem promessa clinica |
| 09 Smoke/Deploy | `019fa5c3-9f1d-7b61-ba41-5d5e47c464f5` | `.worktrees\kill-smoke-deploy-package` | `codex/uniher-kill-smoke-deploy-package` | pacote final e release gate |

## Gates Anti-Regressao

Cada frente deve provar que nao quebrou:

- base autenticada por perfis;
- sidebar sem numeracao visual;
- modulos sensiveis como gated/shell quando nao houver contrato;
- dados de wellbeing/agenda privados;
- dashboard apenas agregado e protegido;
- comunidade por empresa, sem rede social aberta;
- gamificacao sem ranking/score de saude;
- NR-1/Yavix fail-closed fora de mock/dev/test;
- testes existentes do escopo.

## Plano de Prints Visuais

Prints sao obrigatorios para qualquer frente que altere UI, navegacao, copy ou layout.

### Minimo por frente visual

- Frente 04: `/colaboradora`, `/agenda`, mobile e desktop se alterar UI.
- Frente 05: sidebar Admin, RH, Colaboradora e Lideranca; mobile topo/fim e desktop.
- Frente 06: `/dashboard`, `/dashboard?section=saude-primaria`, `/dashboard?section=exames` se houver mudanca visual/semantica.
- Frente 07: Admin Produtos/Modulos e shell de modulos; mobile e desktop se houver UI.
- Frente 08: `/nr1`, `/avaliacao-nr1` quando permitido em mock, e evidencia de bloqueio/fail-closed.
- Frente 09: matriz final de smoke desktop/mobile.

### Criterios visuais

- Sem texto sobreposto.
- Sem overflow horizontal.
- Sidebar sem badges numericos de sequencia.
- Badges permitidos: `Bloqueado`, `Em breve`, `Parceiro`, `Contrato`, contagem de notificacao.
- Modulos sensiveis nao podem parecer operacionais se estiverem gated.
- Smoke tecnico nao substitui aceite visual humano.

## Ordem de Integracao

A integracao deve ser sequencial, com revisao antes de cada merge/cherry-pick:

1. Frente 01: P0 sessao/revogacao.
2. Frente 02: tenant/APIs.
3. Frente 03: campanhas join.
4. Frente 04: wellbeing/agenda.
5. Frente 06: dashboard/RH/Admin.
6. Frente 08: NR-1/Yavix gates.
7. Frente 07: P8 modulos.
8. Frente 05: sidebar/menu, porque pode tocar navegacao comum.
9. Frente 09: smoke/deploy package por ultimo.

Se houver conflito entre frentes, a frente menor e mais critica ganha prioridade. Mudancas visuais entram depois de seguranca/tenant.

## Bateria Final Coordenadora

Antes de PASS final:

```powershell
npm run test:unit -- tests/unit/privacy/report-projection.test.ts tests/unit/platform/dashboard-view-model.test.ts tests/unit/platform/dashboard-export.test.ts tests/unit/platform/dashboard-charts.test.tsx tests/unit/platform/use-dashboard.test.ts tests/unit/platform/dashboard-css.test.ts
npm run test:unit -- tests/unit/wellbeing-events.test.ts tests/unit/privacy/agenda-alerts.service.test.ts tests/unit/privacy/agenda-client-capability.test.tsx tests/unit/privacy/agenda-history-migration.test.ts tests/unit/privacy/agenda-patch-schema.test.ts tests/unit/privacy/agenda-reminder-action.test.ts
npm run test:unit -- tests/unit/personal-objectives.test.ts tests/unit/company-challenges.test.ts tests/unit/private-achievements.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/gamification-openapi-containment.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-quarantine-migration.test.ts tests/unit/privacy/home-gamification-reachability.test.ts
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/mobile-community-navigation.test.tsx tests/unit/module-shells.test.ts tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/company-modules-migration.test.ts
npx tsc --noEmit
npm run build
npm run test:visual-ux-smoke
```

Se algum comando nao existir ou for inviavel, registrar o bloqueio exato e nao converter em PASS.

## Criterios de Fechamento

### PASS por frente

- Commit local existe.
- Worktree da frente esta limpa.
- Testes focados passaram.
- Prints/evidencia visual existem quando aplicavel.
- Nao houve promessa nova sobre NR-1/Yavix, SIPAT, Concierge, Denuncias, DH, Semaforo ou Liga.
- Risco residual esta documentado.

### HOLD por frente

- Teste falha.
- Build/typecheck falha sem justificativa.
- Falta evidencia visual para UI.
- A frente depende de contrato externo.
- A solucao amplia escopo ou quebra privacidade.

### PASS final

- Todas as frentes criticas P0/P1 aprovadas ou explicitamente bloqueadas por contrato.
- Branch coordenadora limpa.
- Bateria final passou ou tem bloqueios objetivos.
- Scorecard final atualizado.
- Relatorio para Dra. Paola atualizado sem overpromise.

