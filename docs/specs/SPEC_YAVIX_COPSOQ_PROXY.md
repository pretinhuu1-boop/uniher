# SPEC — Proxy de Integração Yavix COPSOQ41 (`/api/yavix/copsoq/*`)

> Estilo Spec Kit. Documento-âncora para **front e back implementarem em paralelo**. Status: rascunho para a Onda 1 (front contra mock). Gerado 2026-06-29. Relacionado: [`INTEGRACAO_YAVIX_NR1.md`](../INTEGRACAO_YAVIX_NR1.md).

## 1. Objetivo

Definir o **contrato das rotas internas do UniHER** que medeiam a aplicação do questionário psicossocial **COPSOQ41** (NR-1) da **Yavix**, na arquitetura **A2 (embutido)**: o front-end do UniHER fala **somente** com `/api/yavix/copsoq/*` (mesma origem); o proxy server-side é quem fala com a API Yavix.

**Decisão de design — "front fino, proxy esperto":** o front envia o mínimo; o proxy absorve TODOS os gotchas da Yavix (login/token, montagem do `value{value,optionIndex,option[snapshot]}`, índice 1-based vs 0-based, checagem de completude, mapeamento de erros 401/403/404/429).

**Desacoplamento:** os bloqueadores de back-end (auth de servidor, endpoint de resultados — ver doc-âncora) **não bloqueiam o front**. Com `YAVIX_MOCK=1`, as rotas abaixo retornam dataset fixo e o front roda end-to-end sem Yavix.

## 2. Atores e autenticação

- **Colaboradora**: já autenticada no UniHER (JWT httpOnly próprio). As rotas são protegidas por `withAuth` (role `colaboradora`/`lideranca`). O `companyId` do JWT seleciona a credencial Yavix da empresa (fora do escopo do mock).
- O browser **nunca** recebe token Yavix. CSP `connect-src 'self'` permanece.

## 3. Tipos compartilhados (fonte da verdade)

Arquivo canônico: `src/lib/yavix/copsoq.types.ts`. FE e mock importam destes tipos.

```ts
export type Locale = 'pt' | 'en' | 'es';
export type I18nText = Partial<Record<Locale, string>>; // 'pt' sempre presente (fallback)
export type CopsoqStatus = 'DRAFT' | 'DONE';

export interface CopsoqOption {
  /** valor canônico vindo da Yavix (string "1".."5") */
  value: string;
  label: I18nText;
}

export interface CopsoqQuestion {
  code: number;                       // 1..120
  type: 'QUESTION' | 'ELEMENT';       // só QUESTION exige resposta
  component: 'RADIO_GROUP' | 'TEXT';
  label: I18nText;
  options: CopsoqOption[];            // vazio quando type=ELEMENT
  priority: number;
}

/** estado já respondido de uma pergunta (espelha GET /form/answers) */
export interface CopsoqSavedAnswer {
  code: number;
  optionIndex: number;                // 0-based
  value: string;                      // "1".."5"
}

export interface CopsoqBootstrap {
  sessionId: string;                  // formSessionId (opaco p/ o FE)
  status: CopsoqStatus;
  formName: 'COPSOQ41';
  hasPendingTerms: boolean;
  terms: CopsoqTerm[];                // [] se não houver pendência
  questions: CopsoqQuestion[];        // definição completa do formulário
  answers: Record<string, CopsoqSavedAnswer>; // chave "question{code}"
  locale: Locale;
}

export interface CopsoqTerm {
  id: number;                         // = formConfigId do PUT /terms/update
  title: I18nText;
  content: I18nText;
  agreementCheckMessage: string;
  version: number;
}

/** o FE manda SÓ isto ao salvar uma resposta */
export interface CopsoqAnswerInput {
  code: number;                       // 1..120, type=QUESTION
  value: string;                      // value canônico da opção escolhida ("1".."5")
}

export interface CopsoqSubmitResult {
  status: 'DONE';
}
/** 422 no submit quando incompleto */
export interface CopsoqIncomplete {
  error: 'INCOMPLETE';
  missing: number[];                  // codes de QUESTION sem resposta
}
```

## 4. Endpoints (contrato)

Base: `/api/yavix/copsoq`. Todas exigem sessão UniHER (`withAuth`). `Content-Type: application/json`.

| # | Método | Path | Request | Sucesso | Erros |
|---|--------|------|---------|---------|-------|
| B | `GET` | `/bootstrap` | — | `200` `CopsoqBootstrap` | `401`, `403`, `503` (Yavix indisponível) |
| C | `POST` | `/consent` | `{ termId: number }` | `204` | `400`, `401`, `404` (termo), `409` (já aceito) |
| A | `PATCH`| `/answer` | `CopsoqAnswerInput` | `204` | `400` (code/value inválido), `401`, `404` (sessão), `429` |
| S | `PUT` | `/submit` | — | `200` `CopsoqSubmitResult` | `401`, `404` (sessão), `422` `CopsoqIncomplete` |

### Detalhes
- **`GET /bootstrap`** orquestra, no servidor, os passos Yavix `terms/verify` + `GET /form/COPSOQ41` + `POST /form` (idempotente, obtém `sessionId`) + `GET /form/answers/{id}`, e devolve tudo numa resposta. O FE faz **1 chamada** para montar a tela.
- **`POST /consent`** registra o aceite (`PUT /terms/update` com `formConfigId=termId`). ⚠️ **Degrau 4 / jurídico:** o aceite é feito **pela própria colaboradora** (ação dela na UI), **nunca** automatizado em nome dela pelo servidor. Também grava em `user_consents` (tipo `nr1_psychosocial`).
- **`PATCH /answer`** recebe `{code, value}`; o **proxy monta** o payload Yavix `value{value:Number(value), optionIndex: <índice 0-based da opção cujo value === value>, option: <snapshot completo das opções daquela pergunta, da definição em cache>}`. O FE **não** conhece `optionIndex` nem o snapshot.
- **`PUT /submit`** valida no servidor que todas as `type==='QUESTION'` têm resposta (cruza definição × answers). Se faltar, responde `422` com `missing[]` (codes). Só chama `PUT /form/{id}` da Yavix se completo.

## 5. Mapeamento proxy → Yavix (server-side; fora do mock)

| Rota UniHER | Passos Yavix |
|---|---|
| `GET /bootstrap` | `GET /terms/verify` · `GET /form/COPSOQ41` · `POST /form` · `GET /form/answers/{id}` |
| `POST /consent` | `PUT /terms/update {formConfigId}` |
| `PATCH /answer` | `PATCH /form/{id} {code, value{...}}` |
| `PUT /submit` | `PUT /form/{id}` |

Erros Yavix → `src/lib/errors`: `401→UnauthorizedError`, `403→ForbiddenError`, `404→NotFoundError`, `400→ValidationError`, `429→RateLimitError`, indisponível→`503`.

## 6. Regras de negócio (que o FE deve respeitar)

1. **Completude:** apenas `type==='QUESTION'` exige resposta; `ELEMENT/TEXT` é informativo (não conta no progresso nem no submit).
2. **Autosave:** `PATCH /answer` com **debounce ~600ms** após a última interação; UI otimista + indicador `salvando…/salvo`.
3. **Retomada:** persistir `sessionId` em `localStorage` (`yavix_copsoq_session`); ao montar, reidratar de `answers` do bootstrap.
4. **Recovery:** se `bootstrap`/`answer` responder `404`, limpar `sessionId` e refazer `bootstrap`.
5. **i18n:** renderizar `label[locale]` com **fallback para `pt`** quando faltar `en/es`.
6. **Paginação:** renderizar **um bloco por vez** (não as ~120 de uma vez). Progresso = respondidas / total de `QUESTION`.
7. **Gamificação:** creditar XP **só por concluir** (participação) — nunca pelo conteúdo das respostas.
8. **PII:** nunca logar CPF/token/respostas. Dado sensível (saúde mental).

## 7. Mock (`YAVIX_MOCK=1`)

`src/lib/yavix/copsoq.mock.ts` expõe um dataset fixo conforme os tipos: ~12 perguntas representativas (mistura `QUESTION` Likert 1–5 + 1 `ELEMENT/TEXT`), 1 termo pendente, escala COPSOQ (Sempre/Muitas vezes/Às vezes/Raramente/Nunca) em `pt/en/es`. As 4 rotas, quando `YAVIX_MOCK=1`, leem/gravam estado em memória do processo (Map por `userId`), permitindo testar autosave, retomada e submit sem Yavix.

## 8. Critérios de aceite (Onda 1 — front contra mock)

- [ ] `GET /bootstrap` retorna `CopsoqBootstrap` válido com `YAVIX_MOCK=1`.
- [ ] Colaboradora aceita o termo → `hasPendingTerms` vira `false` no próximo bootstrap.
- [ ] Responder uma pergunta dispara `PATCH /answer` (debounce) e o valor persiste ao recarregar (retomada).
- [ ] `PUT /submit` com pendências → `422 {missing[]}`; o FE rola até a primeira pendente.
- [ ] `PUT /submit` completo → `200 {status:'DONE'}`; tela de conclusão + XP.
- [ ] Render em `pt` e (com `en`) em ≥2 idiomas a partir de `label{}`.
- [ ] Nenhum segredo/CPF/token no browser ou em log.

## 9. Fora de escopo (depende dos bloqueadores / ondas seguintes)

- Auth de servidor real e fiação do proxy com a Yavix (Onda 3, **bloqueada** por service-token/SSO).
- Endpoint de **resultados/scoring** e laudo NR-1 (bloqueador de negócio — Onda 6).
- Provisionamento via API (hoje XLSX) e export UniHER→XLSX.
- i18n do app inteiro (aqui, só o questionário).
- Persistência das respostas no schema UniHER (migration 047) — o mock usa memória.
