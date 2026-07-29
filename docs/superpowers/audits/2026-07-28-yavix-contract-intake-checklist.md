# Yavix Contract Intake Checklist

Data: 2026-07-28
Wave: 00 - `finish-yavix-contract-packet`
Objetivo: validar se a resposta da Yavix destrava implementacao real, piloto por planilha, redirect/SSO ou mantem NR-1/Yavix bloqueado.

## Decisao rapida

| Item | Status | Evidencia exigida | Decisao se faltar |
| --- | --- | --- | --- |
| Auth B2B/SSO | PENDENTE | OpenAPI, doc, print oficial ou resposta escrita da Yavix | A2 proxy real segue HOLD |
| Resultado/scoring/laudo | PENDENTE | Endpoint, export, matriz oficial ou canal operacional | Nao prometer laudo/scoring/compliance |
| Sandbox | PENDENTE | URL, tenant e usuario de teste sem PII real | Piloto tecnico segue HOLD |
| Provisionamento | PENDENTE | API oficial ou confirmacao de planilha/painel | Nao criar client por suposicao |
| Payload COPSOQ41 | PENDENTE | JSON real/redigido, versao/hash, contagem `QUESTION`/`ELEMENT` | Usar apenas mock/shell |
| LGPD/DPA | PENDENTE | contrato, orientacao de controlador/operador, retencao e exclusao | Nao tratar dado real |

## Evidencias a arquivar quando a Yavix responder

- Nome do contato e data da resposta.
- Arquivos recebidos com SHA-256.
- URLs de homologacao e producao.
- Tipo de autenticacao e escopos.
- Politica de rate limit e expiracao de token.
- Payload `GET /form/COPSOQ41` redigido, se houver.
- Contagem de `QUESTION`, `ELEMENT`, codigos duplicados/ausentes e idiomas presentes.
- Regras de `POST /form` depois de `DONE`.
- Regras de `PUT /terms/update` e evidencia exigida para aceite.
- Regras de provisionamento: CPF, CNPJ, filial, GHE, cargo, lider, remover, upsert e reconciliacao.
- Contrato de resultado/scoring/laudo, inclusive granularidade permitida.
- Politica de retencao/exclusao e efeito de desativacao.

## Gates antes de qualquer codigo real

1. `YavixAssessmentClient` so pode ser implementado com auth segura e endpoint oficial.
2. `YavixProvisioningClient` so pode ser implementado com API oficial de provisionamento.
3. Se o MVP for XLSX, o fluxo precisa de staging, diff, aprovacao, hash, destinatario, criptografia ou link temporario e recibo.
4. Nenhuma resposta individual COPSOQ pode aparecer para RH/Admin.
5. Nenhum CPF, token, resposta sensivel ou senha pode ser gravado em log, analytics ou browser.
6. Sem contrato de resultado, NR-1/Yavix continua como shell/gate seguro.

## Possiveis decisoes apos intake

| Cenario | Decisao |
| --- | --- |
| Auth B2B/SSO + resultados + sandbox + payload oficial | Liberar plano de runtime real em worktree separada |
| Sem auth B2B/SSO, mas com redirect/SSO do usuario | Avaliar A1 redirect/SSO; manter proxy A2 em HOLD |
| Sem resultados/scoring/laudo | Manter NR-1 como modulo bloqueado por contrato |
| Sem API de provisionamento | MVP por XLSX controlado, sem endpoint presumido |
| Sem DPA/LGPD claro | Nao usar dados reais; piloto somente com dados ficticios |

