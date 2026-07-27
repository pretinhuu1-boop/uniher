# UniHER release smoke/deploy checklist

Data: 2026-07-27
Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\kill-smoke-deploy-package`
Branch: `codex/uniher-kill-smoke-deploy-package`
Base: `origin/codex/uniher-wave3-collaborator-nr1` em `2e348d4`

## Decisao

**PASS tecnico local** somente se build, TypeScript e smokes focados passarem nesta worktree.

**HOLD para deploy/prod** ate existir ambiente final com `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH`, postura de cookies e contas demo validadas no host alvo.

**HOLD para aprovacao visual humana** ate revisao explicita da Dra. Paola ou responsavel de produto. Smoke tecnico e screenshots nao substituem aceite visual.

## Gates obrigatorios

| Gate | Comando | Status nesta frente | Evidencia |
| --- | --- | --- | --- |
| Worktree limpa na base candidata | `git status --short --branch` | PASS inicial | Branch criada em `2e348d4` |
| TypeScript | `npx tsc --noEmit` | PASS | Sem erros apos `npm ci` |
| Build Next | `npm run build` | PASS | Next 16.2.1, 148 paginas/rotas estaticas geradas |
| Teste de config Next | `npm run test:next-config` | PASS | 1/1 PASS |
| Preflight env release | `npm run check:release-env` | HOLD | Sem env final: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL` e `DATABASE_PATH` ausentes |
| Preflight env local/homologacao | `npm run check:release-env` com env Playwright local | HOLD | PASS 4, HOLD 3, FAIL 0; HTTP/insecure cookies so local e conta `nr1.visual` ausente antes do fixture smoke |
| Unit suite ampla | `npm run test:unit` | HOLD | 576/581 PASS; 5 falhas em `sidebar-capability` e `dashboard-css` |
| Smoke visual amplo | `npm run test:visual-ux-smoke` | HOLD | WebServer Playwright estourou 180s; tentativa local bloqueada por artefato Next start/standalone |
| Revisao de segredos/tamanho | `git diff --check` + varredura de evidencias | PASS | Sem erro de whitespace; arquivos novos entre 3.6KB e 6.1KB; sem segredo real encontrado |

## Precondicoes de ambiente

- `JWT_SECRET`: obrigatorio, minimo 32 caracteres, nao pode ser placeholder e deve diferir do refresh secret.
- `JWT_REFRESH_SECRET`: obrigatorio, minimo 32 caracteres, nao pode ser placeholder e deve diferir do access secret.
- `NEXT_PUBLIC_APP_URL`: obrigatorio. Para producao real deve ser `https://...`.
- Cookies: `ALLOW_INSECURE_HTTP_COOKIES=true` so e aceitavel em localhost/homologacao HTTP; em HTTPS final deve estar ausente ou falso.
- `DATABASE_PATH`: obrigatorio no host alvo; a pasta deve existir e o banco deve estar migrado/seedado.
- Contas demo: `admin@uniher.com.br`, `rh.visual@eduardaeyurimarketingltda.com.br` e `nr1.visual@eduardaeyurimarketingltda.com.br` precisam login validado no ambiente alvo antes de qualquer smoke final.

## Riscos que nao podem ser escondidos

- P0: refresh/session revocation ainda nao pode ser declarado completo sem correcao e testes negativos.
- P0: NR-1/Yavix real permanece sem contrato/API/scoring/laudo validado; manter como shell/gate.
- P0: producao nao pode ser declarada pronta sem URL final, secrets e smoke no host alvo.
- P1: tenant isolation, campanhas, P8/produtos-modulos e copy/destinos de algumas superficies ainda exigem fechamento governado.
- P1 tecnico nesta frente: suite unit ampla ainda tem 5 falhas e o smoke visual nao teve recaptura fresca nesta worktree.

## Politica de promocao

- `PASS tecnico local`: exige todos os gates obrigatorios verdes; nesta frente permanece `HOLD` por unit/smoke/env.
- `PASS visual humano`: exige revisao externa das screenshots/telas.
- `PASS deploy/prod`: exige ambiente final validado, smoke no host final e aprovacao explicita de promocao.
- Qualquer falha P0/P1 fica registrada como `HOLD`, nao como sucesso implicito.
