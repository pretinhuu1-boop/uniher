# COPSOQ runtime real HOLD scorecard

Data: 2026-07-28
Wave: 05 - `finish-copsoq-runtime-real`
Branch: `codex/uniher-finish-copsoq-runtime-real`
Base: `6fc197e docs: record release demo wave integration`
Decision: **HOLD por auth Yavix e runtime seguro**

## Escopo

Esta wave deveria implementar ou destravar runtime real COPSOQ/NR-1 dentro da UniHER, mantendo o browser falando apenas com a UniHER e o servidor UniHER falando com a Yavix.

## Decisao

**Nao implementar proxy A2 real, client server-side real, token exchange, bootstrap real ou submit real agora.**

O material conhecido ainda descreve login por usuario/senha/tenant. A UniHER nao deve armazenar senha individual de colaboradora nem expor token Yavix no browser. Sem auth B2B, service account, API key oficial, OIDC/SSO ou redirect seguro, runtime real fica bloqueado.

## Evidencia verificada

- `docs/superpowers/audits/2026-07-28-yavix-contract-intake-checklist.md`: Auth B2B/SSO e sandbox seguem `PENDENTE`.
- `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`: pergunta P0 sobre autenticacao servidor-a-servidor ou SSO continua requisito bloqueante.
- `docs/superpowers/audits/2026-07-28-nr1-consent-gates-scorecard.md`: runtime atual fecha gate de consentimento e segue fail-closed fora do mock dev/test.
- `docs/superpowers/plans/2026-07-28-uniher-yavix-completion-orchestration.md`: Task 05 marcada como HOLD ate auth servidor-a-servidor/SSO seguro.

## Condicoes para desbloquear

1. Auth B2B/server-side, service account, API key oficial, OAuth/OIDC ou redirect/SSO documentado.
2. Sandbox com tenant e credenciais sem PII real.
3. Contrato de expiracao/refresh/rate limit.
4. Payload `GET /form/COPSOQ41` com versao/hash e confirmacao de indices `value.value` 1-based e `optionIndex` 0-based.
5. Contrato de erros 401/403/404/429.
6. Regra de aceite de termos, evidencias exigidas e se UniHER pode apenas redirecionar a acao da colaboradora.

## Design seguro futuro

- Tokens Yavix somente server-side.
- Nenhum CPF, token ou resposta sensivel no browser/log/analytics.
- Consentimento `nr1_psychosocial` antes de perguntas ou metadados sensiveis.
- Fallback fail-closed fora de ambiente autorizado.
- Completude e coercao de payload no servidor.
- Tests para 401/403/404/429, token leakage, PII logs e submit incompleto.

## Gates desta wave

- `git diff --check`: deve passar.
- `git diff --name-only`: deve mostrar apenas este scorecard docs-only.
- Varredura de overpromise: sem dizer que COPSOQ real, Yavix runtime, token server-side, submit real ou NR-1 operacional estao prontos.

## Revisao Claude

Claude Opus revisou a wave em modo read-only e retornou **PASS**.

Resumo:

- Confirmou que a worktree e docs-only e nao toca `src`, testes, migrations ou config.
- Confirmou que auth B2B/SSO, sandbox e runtime seguro seguem pendentes e sustentam o HOLD.
- Confirmou alinhamento com os gates non-negotiable: sem senha de colaboradora, sem client por suposicao, sem promessa de NR-1/Yavix real.
- Nenhum P0/P1 encontrado.

## Findings

- P0: runtime real sem auth B2B/SSO oficial e inseguro.
- P1: manter shell/gated ou redirect/SSO, nao proxy real por senha individual.
- P2: quando houver contrato, implementar client real em nova worktree com testes negativos antes da UI.

## Proxima acao

Usar o pacote de perguntas Yavix para obter auth seguro. Sem resposta, manter NR-1 como shell/gate seguro.
