# Auditoria da fonte original Yavix - COPSOQ41

**Data da leitura:** 2026-07-21

**Origem:** arquivos compartilhados no grupo WhatsApp `Uniher | Yavix` em 2026-06-08 e recuperados novamente em 2026-07-21.

## Artefatos verificados

| Artefato | Tamanho | SHA-256 | Conteudo |
| --- | ---: | --- | --- |
| `form-response-flow.html` | 45.065 bytes | `1886A86D9C5D059BD755E072DF5B8FE589E607E7B773EE99CEBF3144C77EB09B` | Manual de integracao e collection Postman embutida |
| `Yavix-Modelo_1_Cadastros.xlsx` | 157.226 bytes | `32FB99F00F6266D7633A83035254229AAB3BF7E2C3E6412138EF4C93C74532A1` | Modelo de provisionamento com duas abas: `Empresas` e `Funcionarios` |

Os dois arquivos foram lidos integralmente. A planilha possui somente os intervalos usados `Empresas!A1:D3` e `Funcionarios!A1:L5`; ela nao contem perguntas, opcoes, scoring ou laudo.

## Contrato confirmado pelo HTML

O manual, identificado como gerado em 2026-06-07 a partir de `yavix-api` e `yavix-nr1`, descreve oito passos:

1. `POST /auth/login` com `login`, `password` e `tenant`;
2. `GET /terms/verify`;
3. `PUT /terms/update` para cada termo pendente;
4. `GET /form/COPSOQ41` para obter a definicao dinamica;
5. `POST /form` para criar ou recuperar o rascunho;
6. `GET /form/answers/{id}` para retomar respostas;
7. `PATCH /form/{id}` uma vez por resposta;
8. `PUT /form/{id}` para finalizar quando todas as `QUESTION` estiverem respondidas.

Confirmacoes relevantes para o redesign:

- a definicao de perguntas, labels e opcoes vem de `GET /form/COPSOQ41`;
- o exemplo do manual mostra apenas a pergunta de codigo `1`, seguido da indicacao `... ate 120 perguntas`;
- o `PATCH` aceita `code` no intervalo `1..120`, mas isso nao prova que existam exatamente 120 itens no formulario ativo;
- `QUESTION/RADIO_GROUP` exige resposta e `ELEMENT/TEXT` e informativo;
- labels e opcoes sao multiidioma (`pt`, `en`, `es`);
- cada resposta envia `value.value` 1-based, `optionIndex` 0-based e o snapshot completo de `option[]`;
- o frontend de referencia aplica debounce de aproximadamente 600 ms;
- `formSessionId` permite retomar um rascunho, e `status=DONE` representa formulario finalizado;
- a collection Postman embutida cobre os mesmos oito passos.

## O que a fonte nao confirma

- Nao existe lista integral dos enunciados no HTML ou no XLSX.
- Nao existe evidencia textual de exatamente **72** perguntas.
- Nao existe evidencia de exatamente **120** itens no formulario ativo; `120` e limite/faixa documentada e comentario de capacidade.
- Nao existe URL real de producao ou homologacao; o documento usa `https://<sua-api>` e a collection usa `https://sua-api.exemplo.com`.
- Nao existe client credential, service token, API key, SSO ou refresh token documentado.
- Nao existe endpoint de resultados, scoring, laudo ou agregados.
- Nao existe versao/hash do payload retornado por `GET /form/COPSOQ41`.
- Nao estao definidos o comportamento de `POST /form` depois de `DONE`, rate limits ou a politica de mudanca da definicao durante um rascunho.

## Decisao de contrato

O frontend UniHER nao deve codificar `11`, `72` ou `120` como quantidade final. Deve:

1. renderizar o array retornado pela API;
2. calcular progresso e completude somente sobre `type === 'QUESTION'`;
3. renderizar `ELEMENT` sem inclui-lo no denominador;
4. preservar `code`, opcoes e labels do payload;
5. testar paridade contra um fixture versionado do payload real;
6. bloquear promocao do NR-1 real ate obter payload, sandbox, autenticacao segura e contrato de resultados.

O relato da stakeholder de **72 perguntas** permanece um requisito de negocio a reconciliar com a Yavix, nao um contrato tecnico confirmado. O gate correto e comparar esse relato com a contagem de `QUESTION` do payload autenticado real e registrar formalmente qualquer divergencia.

## Proximo recibo obrigatorio

Solicitar a Yavix:

- base URL de homologacao;
- tenant e usuario de teste sem PII real;
- mecanismo de autenticacao apropriado para integracao;
- resposta completa de `GET /form/COPSOQ41`;
- endpoint ou matriz oficial de resultados/scoring;
- identificador de versao do formulario e politica de alteracao.

Ao receber o payload, armazenar copia redigida/versionada, SHA-256, contagem separada de `QUESTION` e `ELEMENT`, codigos ausentes/duplicados, idiomas/opcoes por item e resultado do teste de paridade.
