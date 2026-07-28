# Yavix results boundary HOLD scorecard

Data: 2026-07-28
Wave: 06 - `finish-yavix-results-boundary`
Branch: `codex/uniher-finish-yavix-results-boundary`
Base: `6fc197e docs: record release demo wave integration`
Decision: **HOLD por resultados/scoring/laudo oficiais**

## Escopo

Esta wave deveria definir a fronteira segura para resultados NR-1/COPSOQ: status tecnico, devolutiva individual autorizada, agregados RH/Admin, scoring, laudo e eventual apoio a GRO/PGR.

## Decisao

**Nao implementar scoring proprio, laudo, calculo de dimensoes, dashboard de risco psicossocial real ou consumo de resultados inferido.**

O contrato atual nao traz endpoint de resultados, exportacao oficial, matriz de calculo validada, granularidade permitida, k-anonimato, cut-offs, versao COPSOQ ou governanca de laudo. Sem isso, qualquer resultado real seria overpromise clinico/ocupacional e risco LGPD.

## Evidencia verificada

- `docs/superpowers/audits/2026-07-28-yavix-contract-intake-checklist.md`: Resultado/scoring/laudo segue `PENDENTE`.
- `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`: perguntas 27-31 pedem versao COPSOQ41, dimensoes, contagem real, matriz oficial, granularidade e responsabilidade pelo calculo.
- `docs/superpowers/audits/2026-07-28-uniher-release-demo-final-scorecard.md`: HOLD explicito para NR-1/Yavix real, laudo, scoring, GRO/PGR e conformidade.
- `docs/superpowers/plans/2026-07-28-uniher-yavix-completion-orchestration.md`: Task 06 marcada como HOLD ate endpoint de resultado ou matriz oficial com governanca.

## Condicoes para desbloquear

1. Endpoint, exportacao ou canal operacional oficial de resultados.
2. Definicao de quem calcula dimensoes, cut-offs e laudo.
3. Granularidade permitida: empresa, filial, setor, GHE, cargo, unidade e/ou lideranca.
4. Regras de k-anonimato, supressao e acesso por papel.
5. Separacao entre devolutiva individual autorizada e dados agregados de RH/Admin.
6. Revisao juridica/privacidade para uso em GRO/PGR e comunicacao comercial.

## Regras de fronteira futura

- RH/Admin nunca deve ver respostas individuais COPSOQ.
- Agregados precisam de supressao para pequenos grupos.
- Sem matriz oficial, UniHER nao calcula scoring.
- Sem contrato de laudo, UniHER nao promete laudo.
- Sem governanca, Semaforo/Liga/ranking nao podem consumir dados psicossociais.

## Gates desta wave

- `git diff --check`: deve passar.
- `git diff --name-only`: deve mostrar apenas este scorecard docs-only.
- Varredura de overpromise: sem laudo/scoring/GRO/PGR/conformidade declarados como prontos.

## Revisao Claude

Claude Opus revisou a wave em modo read-only e retornou **PASS**.

Resumo:

- Confirmou que a worktree e docs-only e nao altera codigo, migrations ou config.
- Confirmou que as quatro evidencias citadas existem e sustentam o HOLD.
- Confirmou que o codebase nao implementa scoring COPSOQ, laudo, GRO/PGR ou consumo de resultados reais.
- Confirmou ausencia de overpromise e nenhum P0/P1.

## Findings

- P0: resultados NR-1/COPSOQ real ficam bloqueados ate contrato oficial.
- P1: dashboards e mensagens comerciais devem continuar usando linguagem de shell/gate.
- P2: apos resposta Yavix, criar threat model e testes de k-anonimato antes de qualquer UI de resultados.

## Proxima acao

Aguardar resposta da Yavix sobre resultados/scoring/laudo. Se nao houver endpoint ou matriz oficial, manter NR-1 como bloqueado por contrato.
