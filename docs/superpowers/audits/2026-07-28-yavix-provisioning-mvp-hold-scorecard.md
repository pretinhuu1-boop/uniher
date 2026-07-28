# Yavix provisioning MVP HOLD scorecard

Data: 2026-07-28
Wave: 04 - `finish-yavix-provisioning-mvp`
Branch: `codex/uniher-finish-yavix-provisioning-mvp`
Base: `6fc197e docs: record release demo wave integration`
Decision: **HOLD por contrato/provisionamento Yavix**

## Escopo

Esta wave deveria definir e implementar o menor caminho seguro para provisionar empresas, filiais e colaboradoras na Yavix, por XLSX controlado ou API oficial.

## Decisao

**Nao implementar client, export, endpoint, outbox ou automacao de cadastro real agora.**

O material atual nao confirma API oficial de provisionamento, semantica de upsert por CPF, regra de `REMOVER`, tenant/filial/CNPJ, obrigatoriedade de GHE, canal de primeiro acesso, nem forma segura de senha/link temporario. Sem resposta oficial, qualquer MVP real arriscaria cadastro errado, PII em logs/export e promessa indevida de integracao.

## Evidencia verificada

- `docs/superpowers/audits/2026-07-28-yavix-contract-intake-checklist.md`: Provisionamento segue `PENDENTE`.
- `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`: perguntas 8-18 cobrem API/planilha, upsert, CPF, CNPJ filial, tenant, REMOVER, colunas obrigatorias, GHE, celular, primeiro acesso e sexo.
- `docs/superpowers/plans/2026-07-28-uniher-yavix-completion-orchestration.md`: Task 04 marcada como HOLD ate resposta de provisionamento.

## Caminhos validos depois da resposta

| Cenario | Implementacao futura permitida | Gate minimo |
| --- | --- | --- |
| Yavix confirmar XLSX como piloto | Staging/diff/export com hash, aprovacao RH, destinatario, criptografia ou link temporario e recibo | Sem CPF em log; arquivo gerado somente apos aprovacao |
| Yavix fornecer API oficial | `YavixProvisioningClient` separado do client COPSOQ, idempotency key, retry controlado, recibo por registro e reconciliacao | Testes de erro por registro, rate limit e replay |
| Yavix nao confirmar canal | Manter modulo bloqueado e operar apenas checklist manual | Sem endpoint presumido |

## Condicoes para desbloquear

1. Receber OpenAPI/Postman ou confirmacao escrita de que nao existe API.
2. Confirmar campos obrigatorios e dominios.
3. Confirmar upsert, duplicidade e `REMOVER=Sim`.
4. Confirmar como a colaboradora acessa a Yavix sem a UniHER armazenar senha individual.
5. Confirmar fluxo de erro parcial, recibo, auditoria e reconciliacao.
6. Confirmar DPA/LGPD e tratamento de CPF/telefone.

## Gates desta wave

- `git diff --check`: deve passar.
- `git diff --name-only`: deve mostrar apenas este scorecard docs-only.
- Varredura de overpromise: sem endpoint/API/provisionamento real declarado como pronto.

## Revisao Claude

Claude Opus revisou a wave em modo read-only e retornou **PASS**.

Resumo:

- Confirmou que o HOLD esta correto e que a worktree e docs-only.
- Confirmou que nao ha `YavixProvisioningClient`, endpoint, export, outbox ou automacao real criada nesta wave.
- Confirmou que as referencias ao provisionamento sao negativas/condicionais e nao prometem endpoint ou API pronta.
- Nenhum P0/P1 encontrado.

## Findings

- P0: provisionamento real esta bloqueado ate contrato/protocolo oficial.
- P1: nao criar `YavixProvisioningClient` por inferencia.
- P2: se XLSX for aprovado, ainda precisa de staging/diff/manual approval antes de qualquer dado real.

## Proxima acao

Aguardar resposta Yavix. Depois, abrir nova wave de implementacao com contrato anexado e hash dos documentos recebidos.
