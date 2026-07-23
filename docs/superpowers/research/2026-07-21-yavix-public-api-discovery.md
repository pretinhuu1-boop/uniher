# Descoberta publica das APIs Yavix com Scrapling

Data da verificacao: 2026-07-21

## Objetivo

Localizar, em superficies publicas oficiais da Yavix, o contrato necessario para:

- provisionar empresas, matrizes e filiais;
- criar, atualizar e desativar funcionarios;
- reconciliar os cadastros do RH da UniHER com a Yavix;
- separar esse fluxo da API usada para responder o COPSOQ41.

Nenhuma autenticacao, credencial ou area privada foi utilizada. O levantamento se limitou a paginas, bundles, DNS, certificados publicos e endpoints de documentacao acessiveis sem login.

## Ferramenta e metodo

Foi usado Scrapling em modo HTTP e Spider, com respeito a `robots.txt` no crawl do site institucional.

Fontes principais:

- <https://yavix.com.br/>
- <https://api.yavix.com.br/swagger-ui>
- <https://api.yavix.com.br/openapi>
- <https://diagnostico-nr1.netlify.app/>, vinculado pelo site oficial
- Certificate Transparency para `*.yavix.com.br`, apenas para descoberta de nomes publicos

Comandos-base reproduziveis:

```powershell
uvx --from "scrapling[shell]" scrapling extract get `
  "https://yavix.com.br/" yavix-home.html

uvx --from "scrapling[shell]" scrapling extract get `
  "https://api.yavix.com.br/openapi" yavix-openapi.txt
```

Para enumerar links internos, foi usado um `Spider` limitado a `yavix.com.br`, com `robots_txt_obey = True`, concorrencia 2 e atraso de 500 ms.

## Resultado 1 - site institucional

O crawl encontrou duas paginas internas publicas:

- `/`
- `/seja-parceiro`

Ambas apontam para `diagnostico-nr1.netlify.app`, redes sociais e WhatsApp. Nao foi encontrado link para Swagger, OpenAPI, portal de integracao ou documentacao de provisionamento.

O site `diagnostico-nr1.netlify.app` e um diagnostico comercial/lead form. Seu JavaScript publico nao expoe endpoints de provisionamento da plataforma Yavix.

## Resultado 2 - API de avaliacao

O host `api.yavix.com.br` existe e expoe:

- `GET /swagger-ui` -> `200`, Swagger UI com Quarkus;
- `GET /openapi` -> `200`, OpenAPI 3.1.0;
- servidor de producao `https://api.yavix.com.br`;
- servidor declarado de desenvolvimento `https://api-dev.yavix.com.br`;
- autenticacao JWT Bearer obtida por `POST /auth/login`.

Recibo do payload OpenAPI bruto: 21.898 bytes, SHA-256 `A28652B9A32959067D535763BB0D2CF790E050BD0966D6063452995860FF185E`.

O contrato publico possui 8 caminhos e 9 operacoes:

| Metodo | Caminho | Operacao |
|---|---|---|
| POST | `/auth/login` | autenticar usuario |
| GET | `/city-states/{country}/{state}` | listar cidades |
| POST | `/form` | criar ou recuperar rascunho |
| GET | `/form/answers/{id}` | recuperar respostas |
| GET | `/form/{formName}` | obter definicao do formulario |
| PATCH | `/form/{id}` | salvar resposta |
| PUT | `/form/{id}` | finalizar formulario |
| PUT | `/terms/update` | aceitar/atualizar termo |
| GET | `/terms/verify` | verificar termos pendentes |

Tags declaradas: `Authentication`, `City States`, `Forms` e `Terms`.

Nao existem no contrato publico atual:

- endpoints de empresas, filiais ou tenants;
- endpoints de funcionarios/usuarios administrativos;
- importacao em lote;
- upsert por CNPJ ou CPF;
- remocao/desativacao;
- jobs, recibos ou reconciliacao de provisionamento;
- client credentials, API key ou service account.

Conclusao: `api.yavix.com.br` e a API de aplicacao do questionario, nao o contrato de provisionamento solicitado pelo RH.

## Resultado 3 - servico separado de implantacao

Os registros publicos de Certificate Transparency revelaram dois nomes altamente relevantes:

- `dev-implantacao.yavix.com.br`
- `dev-api-implantacao.yavix.com.br`

Foram emitidos certificados para esses hosts em abril/maio de 2026. Isso e evidencia forte de que a Yavix desenvolveu um front-end e uma API separados para implantacao/provisionamento.

No estado verificado em 2026-07-21:

- HTTPS falha antes de entregar aplicacao ou documentacao;
- HTTP responde com pagina de dominio estacionado da Hostinger;
- os caminhos usuais de OpenAPI/Swagger nao estao recuperaveis;
- portanto, o contrato de provisionamento nao pode ser inferido com seguranca desses hosts hoje.

Essa evidencia corrige a leitura anterior: nao e adequado concluir que a Yavix "nao possui" API de provisionamento. O correto e registrar que existe evidencia de um servico separado, mas seu contrato atual nao foi encontrado nas superficies publicas ativas.

## Impacto arquitetural na UniHER

A integracao deve separar dois adaptadores:

1. `YavixAssessmentClient`: login, termos, formulario, respostas e envio do COPSOQ41.
2. `YavixProvisioningClient`: empresas, filiais, funcionarios, desativacao e reconciliacao.

O fluxo recomendado para o RH continua sendo:

```text
XLSX ou formulario UniHER
  -> staging e validacao
  -> preview de diff
  -> aprovacao do RH
  -> outbox/job idempotente
  -> YavixProvisioningClient
  -> recibo por registro
  -> reconciliacao e retry seletivo
```

A planilha e entrada operacional e formato de contingencia. Ela nao deve ser modelada como destino definitivo da integracao se a API de provisionamento estiver contratualmente disponivel.

## Contrato que ainda precisa ser obtido

Solicitar a Yavix o OpenAPI/Postman atualizado da API de implantacao, contendo:

- base URLs de homologacao e producao;
- autenticacao de servidor e escopos;
- criacao e atualizacao de empresa, matriz e filial;
- criacao, atualizacao e desativacao de funcionario;
- chaves naturais e IDs externos, especialmente CNPJ e CPF;
- semantica de upsert, duplicidade e reprocessamento;
- importacao em lote ou limite de chamadas;
- respostas de erro por registro;
- idempotency key;
- consulta de status e reconciliacao;
- rate limits, timeouts e SLA;
- webhooks ou eventos disponiveis;
- ambiente e dados permitidos para o piloto UniHER.

## Decisao de gate

**Provisionamento via API: capacidade plausivel e corroborada por infraestrutura historica, mas contrato tecnico ainda BLOQUEADO.**

Nao implementar chamadas reais nem fixar payloads antes de receber o contrato vigente da API de implantacao. A modelagem interna, staging, diff, outbox e adaptador podem ser especificados sem acoplar a UniHER a endpoints presumidos.
