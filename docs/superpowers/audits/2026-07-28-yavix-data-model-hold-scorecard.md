# Yavix data model HOLD scorecard

Data: 2026-07-28
Wave: 03 - `finish-yavix-data-model`
Branch: `codex/uniher-finish-yavix-data-model`
Base: `6fc197e docs: record release demo wave integration`
Decision: **HOLD por contrato Yavix**

## Escopo

Esta wave deveria decidir se a UniHER ja pode criar modelo interno para CPF, CNPJ, filial, unidade, cargo, GHE, lideranca, ciclos NR-1/COPSOQ, outbox e recibos de reconciliacao.

## Decisao

**Nao implementar migration nem alterar schema agora.**

O checklist de intake Yavix segue `PENDENTE` nos itens que definem chaves naturais, retencao, controlador/operador, upsert, remocao, GHE e resultados. Sem isso, qualquer schema real poderia fixar uma modelagem errada, vazar PII, dificultar reconciliacao ou criar promessa de compliance sem base contratual.

## Evidencia verificada

- `docs/superpowers/audits/2026-07-28-yavix-contract-intake-checklist.md`: Auth B2B/SSO, resultados/scoring/laudo, sandbox, provisionamento, payload COPSOQ41 e LGPD/DPA continuam `PENDENTE`.
- `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`: documento enviavel solicita contrato tecnico, provisionamento, CPF/CNPJ/GHE, LGPD, resultados e payload oficial.
- `docs/superpowers/plans/2026-07-28-uniher-yavix-completion-orchestration.md`: Task 03 marcada como HOLD ate contrato ou decisao minima de piloto XLSX.

## Opcoes ainda abertas

| Opcao | Quando liberar | Proibido sem liberacao |
| --- | --- | --- |
| `D1` XLSX operacional | Yavix confirmar que piloto sera via planilha/painel e quais colunas/regras valem | Criar tabelas definitivas de CPF/GHE/ciclo sem staging e recibo |
| `API` provisioning | OpenAPI/Postman oficial de provisionamento | Inferir endpoint, payload ou semantica de upsert |
| `A1` redirect/SSO | Yavix fornecer redirect/SSO oficial seguro | Armazenar senha individual da colaboradora |
| `A2` proxy embutido real | Auth B2B/server-side oficial + sandbox + escopos | Expor token Yavix no browser ou usar login por usuaria |

## Condicoes para desbloquear

1. Confirmar chave primaria externa: CPF, externalId, email, matricula ou combinacao.
2. Confirmar relacao entre matriz, filial, CNPJ, tenant e empresa UniHER.
3. Confirmar obrigatoriedade e dominio de GHE, cargo, unidade, sexo, lider e telefone.
4. Confirmar upsert, desativacao, exclusao, retencao e reconciliacao.
5. Confirmar se ciclos NR-1/COPSOQ sao criados pela UniHER, pela Yavix ou manualmente.
6. Confirmar granularidade de resultados permitida e regra de k-anonimato/supressao.

## Gates desta wave

- `git diff --check`: deve passar.
- `git diff --name-only`: deve mostrar apenas este scorecard docs-only.
- Varredura de overpromise: sem texto dizendo que modelagem, CPF/GHE, laudo, scoring, provisionamento ou compliance estao prontos.

## Revisao Claude

Claude Opus revisou a wave em modo read-only e retornou **PASS**.

Resumo:

- Confirmou que a worktree e docs-only e que nenhuma migration/schema/codigo foi alterado.
- Confirmou que as evidencias citadas existem e sustentam o HOLD: intake checklist, perguntas Yavix e plano de orquestracao.
- Confirmou ausencia de overpromise; ocorrencias de "pronto" aparecem apenas em contexto negativo.
- Nenhum P0/P1 encontrado.

## Findings

- P0: implementar schema real agora seria prematuro e arriscado para PII/LGPD.
- P1: Waves 04-06 dependem desta decisao ou de contrato oficial.
- P2: quando a Yavix responder, criar um decision record antes de qualquer migration.

## Proxima acao

Enviar pacote Yavix e preencher o intake checklist. Se a resposta for insuficiente, manter Wave 03 em HOLD.
