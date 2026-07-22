# Recibo de regressao Playwright - UniHER

**Data:** 2026-07-21

**Branch:** `codex/uniher-wave3-collaborator-nr1`

**HEAD de codigo testado:** `d90147f4b5b433adce59c5917ed15efcd8809123`

**Mudanca local relevante:** baseline visual Admin atualizada para a navegacao promovida na Wave 4

## Comando integral

```powershell
cd C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1\tests
npx playwright test --config=playwright.config.ts
```

## Primeiro ciclo

- Resultado: `179 passed / 1 failed`.
- Duracao: aproximadamente 3,5 minutos.
- Unica falha: `platform-foundation.spec.ts:219`, snapshot `platform-shell-desktop-platform-foundation-win32.png`.
- Diff observado: inclusao intencional de `Gerenciar comunidade` no menu Admin e remocao do badge antigo, ambas provenientes da Wave 4 promovida.
- Decisao visual: atualizar a baseline; nao houve regressao funcional ou sobreposicao.

## Correcao focada

```powershell
npx playwright test --config=playwright.config.ts --project=platform-foundation --grep "desktop and mobile authenticated admin references remain stable" --update-snapshots
```

- Resultado: `1 passed` em aproximadamente 1,3 minuto.
- Artefato atualizado: `tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-desktop-platform-foundation-win32.png`.
- Warning conhecido: NFT tracing do Turbopack em `next.config.ts` / `src/app/api/admin/system/ops/route.ts`; nao falhou o build ou a suite.

## Segundo ciclo integral

```powershell
npx playwright test --config=playwright.config.ts
```

- Resultado final: `180 passed`.
- Duracao: `3,3m`.
- Teardown: 8 usuarios e 6 empresas de teste removidos.
- Warning conhecido: uma ocorrencia de NFT tracing do Turbopack; nao falhou a suite.

## Decisao

**PASS.** A baseline representa o estado promovido da Wave 4 e a matriz Playwright completa esta verde no HEAD de codigo auditado. Este recibo, a baseline e os documentos de auditoria/roadmap foram versionados juntos no commit `36d5e16`, mantendo a cadeia de evidencia.

## Verificacoes complementares do mesmo pacote

| Comando | Resultado |
| --- | --- |
| `npm run test:unit` | PASS - 52 arquivos / 472 testes em 42,02s |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS - 137 paginas/rotas em 65,3s |
| `git diff --check` | PASS; somente aviso de normalizacao LF/CRLF no plano existente |

O build repetiu o warning conhecido de NFT tracing, sem falha de compilacao ou geracao das rotas.
