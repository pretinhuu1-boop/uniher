# UniHER nine-front integration scorecard

Data: 2026-07-27
Branch coordenadora: `codex/uniher-wave3-collaborator-nr1`
Base antes da integracao: `cdf8103 docs: add UniHER nine-front orchestration goal`

## Decisao

**PASS tecnico integrado para envio de relato e demonstracao controlada.**

**HOLD para deploy/producao** ate validar ambiente final com secrets, URL, banco, contas demo e smoke no host alvo.

**HOLD para aprovacao visual humana**: o smoke visual e os screenshots frescos provam ausencia de quebras tecnicas/geométricas; nao substituem aceite visual da Dra. Paola.

## Commits integrados

| Frente | Commit integrado | Status |
| --- | --- | --- |
| 01 P0 sessao/revogacao | `0999fed fix: enforce session revocation on auth tokens` | PASS |
| 02 tenant/API por papel | `3239f84 fix: harden tenant scoped role APIs` | PASS |
| 03 campanhas/join | `1d91407 fix: secure campaign join lifecycle` | PASS |
| 04 wellbeing/agenda | `2be2a13 fix: harden wellbeing check-in and agenda validation` | PASS |
| 06 dashboard/RH/Admin | `ea10a94 fix: align dashboard section contract` | PASS |
| 08 NR-1/Yavix fail-closed | `9b658d9 fix: harden nr1 yavix fail-closed gate` | PASS seguro; HOLD integracao real |
| 07 P8 produtos/modulos | `94902ff feat: gate company module state updates` | PASS tecnico |
| 05 sidebar/menu/visual | `b181747 fix sidebar menu evidence` | PASS visual smoke; lideranca sem fixture visual |
| 09 smoke/deploy package | `a41d898 chore: package release smoke evidence` | PASS pacote; HOLD release |

## Ajustes de integracao feitos pelo coordenador

- Resolvido conflito P8 + sidebar preservando `/produtos-modulos` e copy segura de `Objetivos e Desafios`.
- Atualizado contrato unitario do sidebar para os rotulos atuais (`Educacao`, `SIPAT`) e endpoints permitidos.
- Corrigido fixture de privacidade de campanhas para conter `start_date`/`end_date`, exigidos pelo repositorio integrado.
- Sidebar deixou de chamar `/api/company` para colaboradora/lideranca sem permissao; colaboradora usa `/api/collaborator/company`.
- `/avaliacao-nr1` nao monta `CopsoqFlow` quando `YAVIX_MOCK` esta bloqueado fora de dev/test; mostra estado seguro indisponivel.
- Matriz visual passou a cobrir `admin-produtos-modulos` em `/produtos-modulos`.

## Gates finais executados

| Gate | Resultado |
| --- | --- |
| `git diff --check` | PASS |
| conflito real `<<<<<<<|=======|>>>>>>>` | PASS, nenhum marcador real |
| `npm run test:unit` | PASS, 70 arquivos / 627 testes |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run build` | PASS, Next 16.2.1, 148 rotas/paginas |
| `npm run test:rh` | PASS, 22/22 |
| `npm run test:visual-ux-smoke` | PASS, 2/2; matriz 184/184 PASS |
| `sidebar-geometry-report.json` | PASS, `issues: []` |
| `npm run check:release-env` sem env final | FAIL esperado: faltam `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH` |

## Evidencia visual fresca

- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md`
- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.json`
- `docs/superpowers/evidence/visual-ux-smoke-latest/sidebar-geometry-report.json`
- 196 PNGs atualizados no pacote `visual-ux-smoke-latest`.
- `admin-produtos-modulos` agora aponta para `/produtos-modulos` nos quatro viewports.

## Findings e riscos

### P0

- Nenhum P0 tecnico bloqueando a demonstracao controlada depois da integracao.
- P0 para deploy/producao permanece: ambiente final nao validado por falta de secrets, URL publica, `DATABASE_PATH` e contas demo no host alvo.

### P1

- NR-1/Yavix continua bloqueado por contrato/API/governanca. Pode ser apresentado como chave/gate seguro, nao como laudo, scoring, GRO/PGR, conformidade ou integracao real.
- SIPAT, Concierge, Desenvolvimento Humano e Canal de Denuncias continuam superficies gated/shell/contrato, nao fluxos operacionais completos.
- Lideranca tem contrato/unit test, mas nao tem fixture visual dedicada na matriz final.

### P2

- Aprovacao visual humana segue pendente apesar de smoke 184/184 PASS.
- `check:release-env` deve ser executado no host alvo antes de qualquer promessa de deploy.

### P3

- Claude foi tentado como revisor auxiliar em algumas frentes, mas nao contou como gate porque nao retornou em tempo util.
- Evidencias visuais sao tecnicas; para material comercial, usar prints selecionados e texto honesto sobre o que esta implementado versus gated.

## Recomendacao

**PASS para enviar relatorio honesto para a doutora** com status de tres semanas, commits, evidencias e proximas etapas.

**HOLD para prometer producao, NR-1/Yavix real, SIPAT operacional, Concierge operacional, ranking/liga ou denuncia operacional.**
