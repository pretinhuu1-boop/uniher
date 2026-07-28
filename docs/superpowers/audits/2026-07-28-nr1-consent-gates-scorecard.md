# NR-1 Consent Gates Scorecard

Data: 2026-07-28
Wave: 02 - `finish-nr1-consent-gates`
Branch: `codex/uniher-finish-nr1-consent-gates`
Base: `41478c4 docs: record Yavix wave 00 progress`
Decision: **PASS para commit e integracao coordenada**

## Escopo

Fechar o achado P1 da revisao externa: `GET /api/yavix/copsoq/bootstrap` exigia entitlement NR-1 da empresa, mas ainda podia retornar metadados/perguntas COPSOQ antes de existir consentimento psicossocial ativo da colaboradora.

## Mudancas

| Arquivo | Mudanca |
| --- | --- |
| `src/app/api/yavix/copsoq/bootstrap/route.ts` | Adiciona `requireNr1PsychosocialConsent(auth.userId)` apos entitlement e antes de ler locale/session/mock/real path |
| `tests/unit/nr1-runtime-entitlement.test.ts` | Atualiza o teste do bootstrap para exigir 403 sem consentimento e 200 somente apos `grantNr1Consent('nr1-user')` |

## TDD

| Etapa | Resultado |
| --- | --- |
| RED | `npm run test:unit -- tests/unit/nr1-runtime-entitlement.test.ts` falhou como esperado: `expected 200 to be 403` no bootstrap sem consentimento |
| GREEN | Mesmo comando passou: 1 arquivo / 8 testes |

## Gates locais

| Gate | Resultado |
| --- | --- |
| `npm run test:unit -- tests/unit/nr1-runtime-entitlement.test.ts tests/unit/module-shells.test.ts tests/unit/nr1-gamification.test.ts` | PASS, 3 arquivos / 23 testes |
| `npx tsc --noEmit --pretty false` | PASS |
| `git diff --check` | PASS |

## Revisao Claude

Claude Opus revisou a wave em modo read-only e retornou **PASS**.

Resumo da revisao:

- P1 original corrigido: bootstrap agora exige entitlement e consentimento antes de retornar dados COPSOQ.
- Sem leak de perguntas/metadados sem consentimento.
- Answer e submit continuam exigindo consentimento.
- Consent route continua sem exigir consentimento previo, corretamente, pois e o endpoint que concede o aceite.
- Producao segue fail-closed fora de mock dev/test.
- Nenhum P0/P1 concreto identificado.

## Riscos residuais

- P3: o teste estrutural que varre guards ainda verifica consentimento estruturalmente em answer/submit; bootstrap esta coberto por teste funcional. Pode ser ampliado depois para incluir bootstrap no loop estrutural.
- P3: a tabela `user_consents` aceita multiplos registros ativos do mesmo tipo; a query atual usa `LIMIT 1`, mas uma constraint parcial futura deixaria o contrato mais limpo.

## Decisao

**PASS** para integrar no coordenador.

NR-1/Yavix real continua **HOLD por contrato/API/governanca**. Esta wave fecha apenas o gate de consentimento do runtime mock/shell; nao implementa client real, scoring, laudo, GRO/PGR ou conformidade.

