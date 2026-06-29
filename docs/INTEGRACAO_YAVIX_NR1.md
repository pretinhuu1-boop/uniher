# Integração UniHER × Yavix (NR-1 Psicossocial / COPSOQ41)

> Documento de entendimento + plano. Gerado por análise multi-agente (5 mapeadores + síntese + revisão crítica adversarial), verificado contra o código real do repo `uniher`. 2026-06-29.

# ⚠️ CORREÇÕES DA REVISÃO CRÍTICA — LEIA ANTES (sobrepõem o doc abaixo)

> Revisor adversarial (agente separado) verificou no código real: **0 alucinações**. Em conflito, valem estas correções.

1. **Runtime A2 (proxy server-side) está BLOQUEADO, não "recomendado".** A única auth documentada da Yavix é login por usuário (CPF+senha+tenant). Sem service-token/API-key/SSO, o proxy exigiria guardar a senha de CADA colaboradora — inviável e perigoso (LGPD). **Hoje só são viáveis: A1 (redirect/SSO ao portal Yavix) e D1 (provisionamento via XLSX).** A2 é alvo futuro, condicionado à Yavix expor auth de servidor.

2. **São DOIS bloqueadores de nível 1 (não um):**
   - (a) **Auth de servidor** — como integrar sem a senha de cada trabalhador.
   - (b) **Endpoint de RESULTADOS/scoring** após `status=DONE`. Sem ele NÃO há laudo NR-1 — o objetivo de negócio. O manual só cobre PREENCHIMENTO, não LEITURA. Responder na Onda 0, antes de qualquer código.

3. **Reconciliação de identidade CPF↔e-mail (furo aberto):** UniHER chaveia por `email` (UNIQUE NOT NULL) e **não tem CPF**; a planilha Yavix chaveia por **CPF** e **não tem coluna de e-mail**. Decidir na Onda 2: `users.cpf UNIQUE` + estratégia de e-mail.

4. **Aceite de termos em nome do trabalhador (`PUT /terms/update`) = Degrau 4 / aval jurídico.** Não automatizar no orquestrador sem trava legal.

5. **Ondas 1–6 BLOQUEADAS até a Onda 0 (piloto/medição) responder:** auth de servidor, endpoint de resultados, idempotência de `POST /form` pós-DONE, limite 429, comportamento de `REMOVER`, upsert por CPF, isolamento cross-tenant. (Regra 1: medir antes de mexer.)

6. **B1 corrigida:** "cifrar senha por empresa" está errado — login é por **CPF do trabalhador**. Com service-token, não se armazena senha de usuário.

---
# IntegraÃ§Ã£o UniHER Ã— Yavix (NR-1 Psicossocial / COPSOQ41) â€” Entendimento + Plano

> Documento de arquitetura de integraÃ§Ã£o. Baseado nos achados estruturados (mapas de Dados/API/UX do UniHER, contrato da API Yavix, modelo XLSX de cadastros). SuposiÃ§Ãµes estÃ£o marcadas com **[SUPOSIÃ‡ÃƒO]**. Lacunas estÃ£o em "Perguntas em Aberto".
>
> **VerificaÃ§Ãµes feitas neste repo:** migrations confirmadas em `C:\Users\user\Documents\uniher\src\lib\db\migrations\` â€” sequÃªncia `001..046` com **gap real 025â€“027** (vai de `024_consent_tracking.sql` direto para `028_campaign_dates.sql`); prÃ³ximo nÃºmero livre = **047**.

---

## 1. O que Ã© a integraÃ§Ã£o (visÃ£o de negÃ³cio)

**Contexto regulatÃ³rio.** A Portaria MTE nÂº 1.419/2024 atualizou a **NR-1** para incluir **expressamente os riscos psicossociais** (estresse, assÃ©dio, burnout, violÃªncia no trabalho) no GRO/PGR. Toda empresa passa a ter de **identificar, avaliar e adotar medidas preventivas** para esses fatores. A fiscalizaÃ§Ã£o plenamente punitiva entra em vigor em **26/05/2026**. Isso cria demanda direta por instrumentos de avaliaÃ§Ã£o psicossocial aplicados em escala â€” exatamente o que a **Yavix** entrega via questionÃ¡rio **COPSOQ41**.

**O que a Yavix Ã© nessa relaÃ§Ã£o.** A Yavix Ã© um SaaS de SST que hospeda o instrumento psicossocial (COPSOQ, escala Likert 1â€“5), gerencia tenants/empresas/usuÃ¡rios, termos de aceite, sessÃµes de preenchimento (draft â†’ done) e â€” presumivelmente â€” o scoring/laudo NR-1. O **COPSOQ** Ã© o Copenhagen Psychosocial Questionnaire (padrÃ£o internacional, COPSOQ III, Burr et al. 2019).

> **[SUPOSIÃ‡ÃƒO / ALERTA]** O rÃ³tulo "COPSOQ41" **nÃ£o corresponde** a nenhuma versÃ£o oficial (as oficiais sÃ£o ~40 *short*, 45 *screening*, ~87 *middle*, ~141 *long*). O contrato define `codes 1..120`. Logo "41" Ã© provavelmente rÃ³tulo interno/adaptaÃ§Ã£o BR (talvez 41 escalas/itens-nÃºcleo) e **NÃƒO** o nÃºmero de perguntas. **Confirmar com a Yavix.**

**O que a UniHER quer.** A UniHER Ã© um app de bem-estar da colaboradora (Next.js 16 + SQLite). A integraÃ§Ã£o coloca o questionÃ¡rio NR-1 psicossocial **dentro da jornada da colaboradora UniHER**, fazendo a UniHER atuar como **camada de engajamento/UX** (jornada, gamificaÃ§Ã£o, consentimento, devolutiva) sobre o **motor de avaliaÃ§Ã£o NR-1 da Yavix** (instrumento, sessÃµes, laudo). Resultado de negÃ³cio: a UniHER passa a oferecer **conformidade NR-1** como feature, e a Yavix ganha um canal de aplicaÃ§Ã£o em escala com boa experiÃªncia.

**Dois eixos da integraÃ§Ã£o:**
1. **Cadastros (provisionamento):** levar Empresas e FuncionÃ¡rios da UniHER para a Yavix (hoje via planilha XLSX padronizada; futuramente via API, se existir).
2. **AplicaÃ§Ã£o do questionÃ¡rio (runtime):** colaboradora responde o COPSOQ41 â€” seja no portal Yavix, seja embutido na UniHER via proxy server-side.

---

## 2. Contrato da API Yavix

### 2.1 Os 8 passos (fluxo COPSOQ41)

| # | Passo | MÃ©todo | Path | Auth | I/O essencial |
|---|-------|--------|------|------|---------------|
| 1 | Login (Ãºnica rota pÃºblica) | `POST` | `/auth/login` | Nenhuma | Body `{login (CPF dÃ­gitos OU email), password (â‰¥6), tenant (slug)}` â†’ `{token, type:Bearer, userId, email, firstName, lastName, role:USER, tenantId, companyId}`. Token **8h**. `401` = credenciais invÃ¡lidas. |
| 2 | Verificar termos pendentes | `GET` | `/terms/verify` | Bearer | â†’ `{hasPendingTerms, terms:[{id, userId, termsAgreementId, version, isOutdated, isRoleRequired, configValue{title{pt},content{pt},agreementCheckMessage,version}}]}`. Se `true`, ir ao passo 3. `401`/`403`. |
| 3 | Aceitar termo (condicional, 1Ã—/termo) | `PUT` | `/terms/update` | Bearer | Body `{formConfigId}` = campo **`id`** do item (NÃƒO `termsAgreementId`). `404` = termo nÃ£o encontrado. SÃ³ se `hasPendingTerms===true`. |
| 4 | Buscar definiÃ§Ã£o do formulÃ¡rio | `GET` | `/form/{formName}` | Bearer | `formName=COPSOQ41`. â†’ `{id, formName, questions:[{code 1..120, type QUESTION\|ELEMENT, component RADIO_GROUP\|TEXT, selecionMode "SINGLE" (typo do manual), label{pt,en,es}, options:[{value "1"..,label{pt,en,es}}], priority}]}`. `ELEMENT/TEXT` = informativo (nÃ£o exige resposta). `404`. |
| 5 | Criar/recuperar sessÃ£o (idempotente) | `POST` | `/form` | Bearer | Body `{formName:"COPSOQ41"}` â†’ `{id}` = **formSessionId**. Idempotente (1 draft por user+form). Persistir id. `404` = user/tenant nÃ£o encontrado. |
| 6 | Estado das respostas (retomar) | `GET` | `/form/answers/{id}` | Bearer | `id`=formSessionId. Draft â†’ `{id, status:DRAFT, updatedAt, question{code}:{code, optionIndex (0-based), value ("1"..)}}` (sÃ³ respondidas, chaves dinÃ¢micas `question1`...). Done â†’ `{id, status:DONE, updatedAt}`. `404` = nÃ£o existe / nÃ£o Ã© do user â†’ recovery: limpar id e refazer passo 5. |
| 7 | Salvar UMA resposta (1Ã—/pergunta, debounce) | `PATCH` | `/form/{id}` | Bearer | Body `{code (1..120), value:{value (number, Ã­ndice 1-based), optionIndex (number, 0-based), option:[snapshot de TODAS as opÃ§Ãµes com label{pt,en,es}]}}`. â†’ `204`. `400` = code fora de 1..120. `404`. Front aplica debounce ~600ms. |
| 8 | Finalizar (valida completude) | `PUT` | `/form/{id}` | Bearer | Sem body. â†’ `204` (status vira DONE). `400` = nem todas as `QUESTION` respondidas (validar no cliente; o erro **nÃ£o diz quais** faltam). `404`. |

**Gotchas crÃ­ticos do contrato:**
- **`value.value` Ã© 1-based** e **`value.optionIndex` Ã© 0-based** â€” fÃ¡ceis de inverter, gerando resposta errada **silenciosamente** (sem validaÃ§Ã£o de coerÃªncia documentada). â†’ Centralizar a montagem num **Ãºnico helper testado**.
- **`value.option` exige o snapshot do array inteiro de opÃ§Ãµes** a cada PATCH â†’ manter em memÃ³ria a definiÃ§Ã£o do passo 4 e reusar; revalidar versÃ£o do form.
- **Completude sÃ³ validada no submit** (passo 8) e sem lista de pendÃªncias â†’ cliente precisa cruzar `GET /form` (`type=QUESTION`) Ã— `GET /form/answers/{id}`, distinguindo `QUESTION` (exige) de `ELEMENT/TEXT` (nÃ£o exige).
- **Sem refresh token documentado** â†’ token 8h; tratar todo `401` como "re-autenticar"; em batch, renovar proativamente antes das 8h.
- **`429`/rate-limit nÃ£o documentado** â†’ assumir e medir antes de batch.

### 2.2 Modelo de dados Yavix

- **Tenant** (`tenantId`, slug usado no login): empresa-cliente raiz do isolamento. 1 Tenant â†’ N Companies, N Users.
- **Company** (`companyId`): unidade organizacional dentro do tenant; provÃ¡vel escopo de agregaÃ§Ã£o dos resultados.
- **User** (`userId`, email, firstName, lastName, role, **CPF como login alternativo**): respondente. `role=USER` no exemplo; `403` indica RBAC.
- **TermsConfig/Agreement** (`termsAgreementId`, version, configValue, isRoleRequired): definiÃ§Ã£o versionada do termo.
- **TermsUserAgreement/PendingTerm** (`id`, userId, termsAgreementId, version, isOutdated): vÃ­nculo userâ†”termo. O `id` deste registro Ã© o `formConfigId` do PUT. `isOutdated=true` â‡’ reaceite.
- **Form/FormDefinition** (`id`, formName, questions[]): template global ao tenant, multiidioma (pt/en/es).
- **Question** (code 1..120, type, component, selecionMode, label{pt,en,es}, options[], priority).
- **FormSession/Draft** (`id`=formSessionId, status DRAFT|DONE, updatedAt, formName): instÃ¢ncia por user, criada idempotentemente.
- **Answer** (chave dinÃ¢mica `question{code}`: `{code, value, optionIndex, option[snapshot]}`): upsert por code; guarda snapshot das opÃ§Ãµes (auditoria/versionamento).

**RelaÃ§Ãµes:** Tenant 1â”€N Company; Tenant 1â”€N User; Company 1â”€N User; User 1â”€N TermsUserAgreement (N:1 TermsAgreement); User 1â”€N FormSession; Form 1â”€N Question (1â”€N Option); FormSession N:1 Form, 1â”€N Answer; Answer N:1 Question.

---

## 3. Modelo XLSX de cadastros (Empresas / Funcionarios)

A planilha Ã© o canal de provisionamento **hoje** (a API documentada **nÃ£o** tem endpoint de provisionamento). Estrutura protegida (`lockStructure`) â€” sÃ³ preencher cÃ©lulas, nÃ£o alterar colunas.

### 3.1 Aba **Empresas**

| Campo | Significado | Tipo / armazenamento | Obrig. | ValidaÃ§Ã£o |
|-------|-------------|----------------------|--------|-----------|
| **CNPJ** | CNPJ do estabelecimento (matriz OU filial); PK lÃ³gica; referenciada por `CNPJ FILIAL` (Funcionarios) e `CNPJ MATRIZ` | Texto com mÃ¡scara `XX.XXX.XXX/XXXX-XX` (shared string, **nÃ£o** nÃºmero) | Sim | Sem data-validation; validar DV + unicidade no import |
| **NOME FANTASIA** | Nome comercial | Texto livre | Recomendado/obrigatÃ³rio de fato | â€” |
| **RAZAO SOCIAL** | DenominaÃ§Ã£o jurÃ­dica (Receita) | Texto livre | Sim | â€” |
| **CNPJ MATRIZ** | CNPJ da matriz Ã  qual o estabelecimento pertence; **vazio = Ã© matriz**, preenchido = filial. Self-FK â†’ `Empresas.CNPJ` | Texto mÃ¡scara CNPJ, ou vazio | Condicional | Deveria existir como CNPJ de outra linha (matriz) |

### 3.2 Aba **Funcionarios**

| Campo | Significado | Tipo / armazenamento | Obrig. | ValidaÃ§Ã£o |
|-------|-------------|----------------------|--------|-----------|
| **NOME COMPLETO DO COLABORADOR** | Nome de exibiÃ§Ã£o | Texto | Sim | Coluna A nÃ£o coberta por `textLength`; trim + nÃ£o-vazio |
| **CPF** | **Chave de identidade + LOGIN no Yavix**; alvo da FK do lÃ­der | Texto mÃ¡scara `XXX.XXX.XXX-XX` (shared string) | Sim, Ãºnico | `textLength>1`; validar DV + unicidade global. **PII â€” nÃ£o logar** |
| **CELULAR** | Telefone (provÃ¡vel canal de 1Âº acesso/2FA) | **NÃšMERO** (ex. `11999998888`), sem mÃ¡scara/+55 â€” risco de perder zero/DDD | ProvÃ¡vel | `textLength>1` (mas digitado como nÃºmero); normalizar para string/E.164 |
| **DATA DE NASCIMENTO** | Nascimento | **DATA real** (serial Excel) | ProvÃ¡vel | Cuidar pt-BR (DD/MM/AAAA) vs ISO |
| **SEXO** | DomÃ­nio fechado | Texto enum | Sim | **dataValidation list `F,M`** (E2:E1048576) |
| **UNIDADE** | LotaÃ§Ã£o/local em texto livre (â‰  CNPJ FILIAL) | Texto livre | ProvÃ¡vel | `textLength>1`; risco ortogrÃ¡fico |
| **CPF DO LÃDER DIRETO** | CPF do gestor imediato â†’ org chart (self-FK â†’ `Funcionarios.CPF`); **vazio = topo** | Texto mÃ¡scara CPF ou vazio | Condicional | Validar que CPF do lÃ­der existe; sem ciclos |
| **SETOR** | Departamento | Texto livre | ProvÃ¡vel | `textLength>1`; risco ortogrÃ¡fico |
| **CARGO** | FunÃ§Ã£o (origem tem typo "MARKENTING") | Texto livre | ProvÃ¡vel | `textLength>1` |
| **GHE** | Grupo HomogÃªneo de ExposiÃ§Ã£o (SST/PGR) â€” agrupa por risco ocupacional; conceitualmente â‰  SETOR (no exemplo coincidem) | Texto livre | ProvÃ¡vel (se SST) | `textLength>1`; deveria ser catÃ¡logo |
| **CNPJ FILIAL** | FK colaboradorâ†’empresa (`Empresas.CNPJ`); pode apontar matriz ou filial | Texto mÃ¡scara CNPJ | Sim | `textLength>1`; sem lookup cross-sheet â€” validar no import |
| **REMOVER** | Flag de desligamento/desativaÃ§Ã£o no lote | Texto enum `Sim/NÃ£o` | Por linha (default NÃ£o) | Coberto por `textLength>1`; briefing diz Sim/NÃ£o |

### 3.3 Relacionamentos
- **Matrizâ†”Filial:** `Empresas.CNPJ MATRIZ â†’ Empresas.CNPJ` (1 matriz : N filiais).
- **Colaboradorâ†’Empresa:** `Funcionarios.CNPJ FILIAL â†’ Empresas.CNPJ` (1 empresa : N colaboradores).
- **Hierarquia:** `Funcionarios.CPF DO LÃDER DIRETO â†’ Funcionarios.CPF` (self-FK, sem ciclos; vazio = topo).
- **Chaves naturais:** `Funcionarios.CPF` (pessoa + login), `Empresas.CNPJ` (estabelecimento).
- **4 dimensÃµes independentes:** UNIDADE (local) â‰  SETOR (depto) â‰  CARGO (funÃ§Ã£o) â‰  GHE (grupo de risco).
- **Integridade NÃƒO imposta pela planilha** (sÃ³ `textLength`/lista F,M) â€” FKs precisam ser validadas no import.

### 3.4 Mapeamento XLSX â†’ Yavix
- **Empresas â†’ COMPANY/TENANT.** CNPJ = id do estabelecimento. Matriz/filial sugere **hierarquia de companies** (matriz = tenant raiz, filiais = sub-companies). **[SUPOSIÃ‡ÃƒO]** 1 conta/tenant Yavix = 1 matriz + filiais.
- **Funcionarios â†’ USER.** CPF = login. CELULAR/SEXO/NASC = atributos. CELULAR = provÃ¡vel canal de 1Âº acesso (**nÃ£o hÃ¡ coluna de e-mail** no modelo).
- **VÃ­nculo userâ†’company:** `CNPJ FILIAL`.
- **Hierarquia:** `CPF DO LÃDER DIRETO` â†’ campo manager/gestor.
- **SST:** GHE â†’ mÃ³dulo PGR/PCMSO.
- **REMOVER=Sim** â†’ provÃ¡vel soft-delete/bloqueio de login (preserva histÃ³rico).

---

## 4. Estado atual do UniHER â€” reaproveitÃ¡vel vs MUST-BUILD

> **Nota de stack:** o UniHER roda **SQLite (better-sqlite3, WAL)**, NÃƒO PostgreSQL como o `CLAUDE.md` raiz da Axial sugere. Toda escrita passa pela **WriteQueue** (`src/lib/db/write-queue.ts`) â€” INSERT/UPDATE da integraÃ§Ã£o **devem** usar `getWriteQueue().enqueue()`, nunca `getReadDb()`.

### 4.1 JÃ EXISTE e dÃ¡ para reaproveitar
- **Arquitetura 3 camadas** Route handler â†’ Service â†’ Repository, com padrÃ£o canÃ´nico em `src/app/api/quiz/submit/route.ts` (template direto para rotas proxy Yavix).
- **Auth/JWT** (`src/lib/auth/jwt.ts`, jose HS256, access 15min/refresh 48h, payload com `companyId`/`role`/`isMasterAdmin`) + wrappers `withAuth`/`withRole`/`withMasterAdmin` (`src/lib/auth/middleware.ts`) + middleware `src/proxy.ts`. â†’ `auth.companyId` seleciona a credencial Yavix da empresa.
- **PadrÃ£o de integraÃ§Ã£o externa** com retry/backoff: `src/lib/mail/index.ts` (`getResend()` lazy-singleton + `withRetry`) â€” **Ãºnico** exemplo de SDK externo; modelo para o cliente Yavix.
- **Erros padronizados** `src/lib/errors/index.ts` (`UnauthorizedError`/`ForbiddenError`/`NotFoundError`/`ValidationError`/`RateLimitError` + `handleApiError`) â€” mapear `401/403/404/400/429` da Yavix para essas classes.
- **Repository Pattern + WriteQueue + runner de migrations** (`src/lib/db/migrations/runner.ts`). Modelo de tenant: `company.repository.ts`.
- **Consentimento LGPD backend pronto:** tabela `user_consents` + `GET/POST/DELETE /api/users/me/consent` (registra IP/user_agent/timestamp, revoga anterior). Enum `terms/privacy/data_processing/email_marketing`.
- **Renderer Likert acessÃ­vel:** `src/components/quiz/QuizQuestion.tsx` suporta `type:'scale'` (Likert 1â€“5, role=radio/radiogroup) â€” reusÃ¡vel como **componente de pergunta** do COPSOQ.
- **Dashboard RH + agregadores:** `src/services/dashboard.service.ts` (`getHealthRiskEvolution`, `getDepartmentRanking`, `getAgeDistribution`) e `health-score.repository.getCompanyHealthOverview` â€” base pronta para corte por departamento. Filtros "STATUS DE SAÃšDE / DEPARTAMENTO" jÃ¡ no UI esperando dados.
- **GamificaÃ§Ã£o XP:** `daily-missions.service.ts` (`completeMission` credita points/level) â€” trivial creditar XP por concluir NR-1.
- **PadrÃ£o de persistÃªncia de estado por colaboradora/empresa:** `company_objectives` + `user_objective_progress`; `quiz_results` (UPSERT por user, `answers_json`).
- **`birth_date`** jÃ¡ existe em `users` (migration 018) â†’ mapeia DATA DE NASCIMENTO.

### 4.2 MUST-BUILD (lacunas / âŒ ausente)

**Dados / schema (migration 047+):**
- âŒ Em `companies`: **matriz/filial** â€” nÃ£o hÃ¡ `parent_company_id`/`cnpj_matriz`. â†’ nova coluna self-FK.
- âŒ Em `users`: **CPF** (grep vazio â€” nÃ£o existe em lugar nenhum), **celular prÃ³prio** (sÃ³ `emergency_contact_phone`), **SEXO**, **UNIDADE**, **lÃ­der direto** (`leader_id`/`manager_id` â€” sÃ³ existe role `lideranca` + `can_approve` por setor), **CARGO** (Zod do `PATCH /api/users/me` aceita `cargo` mas **descarta** â€” gotcha de paridade), **GHE**. â†’ novas colunas.
- âŒ **Credenciais/token Yavix por empresa** â€” `yavix_credentials` (company_id, tenant, login, senha cifrada, cached_token, token_expires_at).
- âŒ **Mapeamento user UniHER â†” user Yavix** (o JWT UniHER nÃ£o carrega userId Yavix; COPSOQ Ã© por colaboradora).
- âŒ **Tabela de respostas COPSOQ versionada por ciclo** â€” `quiz_results` tem `UNIQUE(user_id)` (1 por pessoa); NR-1 Ã© recorrente. NÃ£o hÃ¡ genÃ©rico `forms`/`assessments`.

**API / serviÃ§os:**
- âŒ **Cliente HTTP externo server-side** â€” NÃƒO EXISTE nenhum (`axios`/`fetch` server-side ausentes; sÃ³ SDKs Resend/web-push). Seria o **primeiro** do projeto.
- âŒ **Service de orquestraÃ§Ã£o** dos 8 passos + cache de token + idempotÃªncia da sessÃ£o.
- âŒ **Rotas proxy** `/api/yavix/*`.
- âŒ **MÃ³dulo central de config/env** + `.env.example` (hoje `process.env.*` inline; sem `YAVIX_API_URL`).
- âŒ **Criptografia de segredos em repouso** (para senha Yavix por empresa).

**UX:**
- âŒ **i18n** â€” 100% pt-BR **hardcoded** (sem next-intl/react-i18next). COPSOQ multiidioma Ã© green-field e a **maior lacuna de UI**.
- âŒ **Tela COPSOQ longa** (~120 itens) â€” os dois motores de quiz existentes estÃ£o travados em **6 perguntas** (`quizSubmitSchema.length(6)`, progresso `/6`). Precisa mÃ¡quina de estado paginada + autosave parcial.
- âŒ **Tela de consentimento granular no fluxo logado** (hoje sÃ³ checkbox no lead de marketing + links no /welcome).
- âŒ **AgregaÃ§Ã£o por GHE/unidade + k-anonimato** (sÃ³ hÃ¡ `departments`; sem regra de tamanho mÃ­nimo de grupo).

**[SUPOSIÃ‡ÃƒO]** Reusar/estender o quiz-engine de 6 dims Ã© inviÃ¡vel para 120 itens; o COPSOQ deve ser **renderizado a partir do `GET /form` da Yavix** (perguntas vÃªm da Yavix), nÃ£o duplicado em `src/data/questions.ts`. HÃ¡ **duas** engines (`src/lib/quiz/engine.ts` e `src/lib/quiz-engine.ts`) â€” definir a canÃ´nica antes.

---

## 5. Arquitetura de integraÃ§Ã£o proposta

### DecisÃ£o A â€” Onde a colaboradora responde o COPSOQ

**OpÃ§Ã£o A1 â€” Redirect/SSO para o portal Yavix (mÃ­nimo esforÃ§o).**
A UniHER provisiona cadastros e apenas **encaminha** a colaboradora ao app Yavix (link/SSO).
- âœ… Zero motor de formulÃ¡rio, zero i18n na UniHER, zero proxy de respostas.
- âŒ Quebra a jornada/gamificaÃ§Ã£o UniHER; depende de SSO que **nÃ£o estÃ¡ documentado**; UX fragmentada.

**OpÃ§Ã£o A2 â€” Proxy server-side no Next (RECOMENDADA).**
UniHER expÃµe `/api/yavix/*` (protegidas por `withAuth`/`withRole`); o **browser nunca fala direto com a Yavix**. Um `src/lib/yavix/client.ts` (fetch nativo + `withRetry` no padrÃ£o de `mail/index.ts`) executa os 8 passos server-side; o front renderiza o COPSOQ a partir do `GET /form`.
- âœ… Token Yavix nunca exposto ao browser; respeita a CSP (`connect-src 'self'`); jornada/gamificaÃ§Ã£o/consentimento ficam na UniHER; mapeia erros para `lib/errors`.
- âœ… Segue o template canÃ´nico (`/api/quiz/submit`).
- âŒ Precisa construir cliente HTTP (primeiro do projeto), service, schemas Zod, e mÃ¡quina de estado de formulÃ¡rio longo + i18n.
- âŒ Acopla a UniHER ao versionamento de `option[]` snapshot da Yavix.

**OpÃ§Ã£o A3 â€” Cliente direto no browser para a Yavix.**
- âŒ Exporia token; exigiria liberar domÃ­nio Yavix na CSP `connect-src`; sem proteÃ§Ã£o de credencial por empresa. **Rejeitada.**

> **RecomendaÃ§Ã£o: A2** â€” Ãºnico caminho que preserva a jornada UniHER sem expor segredos. **Bloqueada** pela DecisÃ£o C (auth de servidor).

### DecisÃ£o B â€” Onde guardar token/tenant/credencial por empresa
- **B1 â€” DB (migration 047 `yavix_credentials`):** `company_id` FK, `yavix_tenant`, `yavix_login`, `yavix_password_enc` (cifrada com chave em env), `cached_token`, `token_expires_at`. âœ… Persiste entre processos; segue padrÃ£o `company.repository`. âŒ Exige criptografia em repouso (inexistente hoje).
- **B2 â€” Token em memÃ³ria (singleton por processo, como `getResend()`):** âœ… simples. âŒ nÃ£o sobrevive a restart; ruim para multi-instÃ¢ncia.
- **RecomendaÃ§Ã£o:** **credencial em DB cifrada (B1) + cache de token em memÃ³ria com fallback ao DB**. Mapeamento userâ†”Yavix exige coluna **por usuÃ¡rio** (nÃ£o sÃ³ por empresa), pois o login Yavix Ã© por **CPF**.

### DecisÃ£o C â€” Auth de servidor (BLOQUEADOR)
A Ãºnica auth documentada Ã© `POST /auth/login` com **credenciais de usuÃ¡rio** (CPF/email + senha + tenant). **NÃ£o hÃ¡ client-credentials / API-key / service-account / SSO.** Para aplicar COPSOQ em massa sem armazenar a senha de cada trabalhador, Ã© preciso **negociar com a Yavix** um fluxo de service token / SSO / provisionamento. **Sem isso, A2 nÃ£o fecha de forma segura.** â†’ ver Perguntas em Aberto.

### DecisÃ£o D â€” SincronizaÃ§Ã£o de cadastros
- **D1 â€” XLSX/CSV (hoje, Ãºnico documentado):** preencher a planilha padrÃ£o â†’ upload no painel Yavix â†’ Yavix cria acessos. âœ… disponÃ­vel jÃ¡; Ã© o caminho do **piloto**. âŒ manual, sem idempotÃªncia garantida (upsert por CPF a confirmar).
- **D2 â€” API de provisionamento:** **nÃ£o documentada** â€” confirmar se existe.
- **RecomendaÃ§Ã£o:** **D1 para o piloto; D2 sÃ³ se a Yavix expuser endpoint.** A UniHER pode **gerar a planilha** a partir do seu prÃ³prio cadastro (export `companies`+`users` â†’ XLSX no template) como onda de automaÃ§Ã£o.

### DecisÃ£o E â€” Onde gravam os resultados (LGPD-sensÃ­vel)
COPSOQ = dado de saÃºde mental (**sensÃ­vel**). Conflito: precisa ser **identificÃ¡vel** (devolutiva individual + XP) e ao mesmo tempo sÃ³ exposto ao RH de forma **agregada/anonimizada (k-anonimato)**.
- **RecomendaÃ§Ã£o:** **NÃƒO** forÃ§ar tudo em `health_scores` (escala 0â€“10, 6 dims) â€” COPSOQ tem ~25â€“40 dims em 0â€“100 (violaria superset/nÃ£o-regressÃ£o). Criar **tabela prÃ³pria versionada por ciclo**; alimentar o dashboard via **agregador anonimizado** com supressÃ£o de grupos pequenos. Resultados/scoring devem vir do **endpoint de resultados da Yavix** (nÃ£o documentado â€” confirmar) ou ser calculados conforme matriz oficial COPSOQ (confirmar versÃ£o/cut-offs).

---

## 6. Plano em ondas pequenas e verificÃ¡veis

> Regra Axial: cada onda termina com **evidÃªncia concreta** (tool result / arquivo:linha / screenshot). AÃ§Ãµes em PROD/externas = Degrau 4 (parar e confirmar).

**Onda 0 â€” Piloto manual (sem cÃ³digo).** *Objetivo: validar o fluxo Yavix end-to-end com dados reais da UniHER.*
1. Preencher o XLSX padrÃ£o com dados reais da UniHER: 1 linha matriz (CNPJ UniHER, `CNPJ MATRIZ` vazio) + filiais se houver; 1 linha por colaboradora (CPF=login, CELULAR 11 dÃ­gitos, SEXO F/M, lÃ­deres antes dos liderados, `CNPJ FILIAL` existente em Empresas, `REMOVER=NÃ£o`). GHE: alinhar com a Yavix (provisÃ³rio = espelhar SETOR, marcado como provisÃ³rio).
2. Upload no painel Yavix â†’ Yavix gera acessos.
3. Montar **collection Postman** dos 8 passos; testar com 1 usuÃ¡rio real: `login â†’ terms/verify â†’ (terms/update) â†’ form/COPSOQ41 â†’ POST /form â†’ answers â†’ PATCH Ã—N â†’ PUT`.
   *EvidÃªncia:* token obtido, `formSessionId`, `204` em alguns PATCH, `PUT â†’ 204` (ou `400` com lista de pendÃªncias calculada pelo cliente). **PII (CPF/token) nunca em log.**
4. Registrar respostas observadas Ã s perguntas em aberto tÃ©cnicas (idempotÃªncia do POST apÃ³s DONE; 1-based vs 0-based; 429; endpoint de resultados).

**Onda 1 â€” FundaÃ§Ã£o de config + cliente HTTP (sem UI).**
- Criar mÃ³dulo central de env (`YAVIX_API_URL`, chave de criptografia) + `.env.example`.
- `src/lib/yavix/client.ts`: fetch nativo, baseURL, Bearer, timeout+retry (padrÃ£o `mail/index.ts`), map `401/403/404/400/429` â†’ `lib/errors`.
- Testes (pytest-equivalente: vitest/jest) com mock do servidor Yavix.
  *EvidÃªncia:* testes verdes do client contra mocks dos 8 passos.

**Onda 2 â€” PersistÃªncia de credenciais + token (migration 047).**
- `047_yavix_credentials.sql` (company_id, tenant, login, senha cifrada, cached_token, token_expires_at) + coluna de mapeamento por usuÃ¡rio (CPF/userId Yavix).
- `src/repositories/yavix-credentials.repository.ts` (via WriteQueue).
- Cache de token em memÃ³ria + renovaÃ§Ã£o proativa < 8h.
  *EvidÃªncia:* round-trip de login real cacheado; reuso sem novo login dentro de 8h.

**Onda 3 â€” Service de orquestraÃ§Ã£o + rotas proxy.**
- `src/services/yavix.service.ts` (8 passos, idempotÃªncia da sessÃ£o, cruzamento QUESTIONÃ—answers para completude, helper Ãºnico 1-based/0-based).
- `src/app/api/yavix/*` (`form`, `session`, `answers/[id]` GET+PATCH, `submit/[id]` PUT) com `withAuth`/`withRole`; schemas Zod em `src/lib/validation/schemas.ts`.
- Liberar `/api/yavix/*` no `proxy.ts` como **autenticada** (nÃ£o pÃºblica).
  *EvidÃªncia:* preenchimento completo de um draft via rotas UniHER (sem tocar a Yavix pelo browser).

**Onda 4 â€” UX: consentimento + tela COPSOQ longa.**
- Tela de consentimento granular ANTES do COPSOQ (adicionar tipo `nr1_psychosocial`/`health_data` a `VALID_CONSENT_TYPES`; elevar o checkbox de `QuizResultsSummary.tsx` a tela dedicada).
- Tela COPSOQ: reusar `QuizQuestion.tsx` (`scale`) com nova mÃ¡quina de estado paginada por blocos + autosave (PATCH por pergunta com debounce ~600ms) lendo perguntas do `GET /form`.
- COPSOQ como **campanha/missÃ£o periÃ³dica** (banner no `/colaboradora`), nÃ£o parte do onboarding obrigatÃ³rio.
  *EvidÃªncia:* colaboradora completa e finaliza o COPSOQ pela UniHER; draft retomÃ¡vel.

**Onda 5 â€” i18n (multiidioma).**
- Introduzir i18n (next-intl ou dicionÃ¡rio leve). **[SUPOSIÃ‡ÃƒO]** escopo mÃ­nimo = sÃ³ o questionÃ¡rio (perguntas vÃªm da Yavix em pt/en/es; resolver fallback pt). Decidir com produto se o app inteiro entra.
  *EvidÃªncia:* COPSOQ renderizado em â‰¥2 idiomas a partir dos `label{pt,en,es}`.

**Onda 6 â€” Resultados para o RH + gamificaÃ§Ã£o.**
- Agregador `getPsychosocialRiskByDepartment(companyId)` (GROUP BY department_id) com **k-anonimato** (suprimir grupos pequenos); ligar aos filtros jÃ¡ existentes do dashboard.
- Devolutiva individual para a colaboradora (card no semÃ¡foro / tela de devolutiva com contatos de apoio).
- Creditar XP por **participaÃ§Ã£o** (nÃ£o premiar conteÃºdo das respostas â€” risco de viÃ©s).
  *EvidÃªncia:* dashboard RH mostra risco psicossocial por setor anonimizado; XP creditado ao concluir.

---

## 7. Perguntas em aberto

### Para o **Nelson** (decisÃ£o de produto/estratÃ©gia)
1. **A2 (proxy embutido) vs A1 (redirect/SSO ao portal Yavix)** â€” a colaboradora responde dentro da UniHER ou no app Yavix? Define quase todo o escopo de cÃ³digo.
2. **Escopo de "multiidioma"** â€” sÃ³ o questionÃ¡rio ou o app UniHER inteiro? (i18n no app inteiro reescreve toda a navegaÃ§Ã£o.)
3. **Modelo de tenant** â€” a matriz Ã© o tenant lÃ³gico (grupo) e filiais sÃ£o sub-escopos, ou cada CNPJ Ã© tenant isolado?
4. **Gamificar o NR-1?** â€” confirmar: XP sÃ³ por participaÃ§Ã£o (badge/streak), nunca premiando o conteÃºdo das respostas (Ã©tica do instrumento diagnÃ³stico).
5. **Granularidade do laudo** â€” basta `departamento` (existe) ou o cliente exige GHE/unidade/cargo (nÃ£o existem no schema)?
6. **Onde roda o banco de produÃ§Ã£o** (`DATABASE_PATH` default Ã© `data/uniher.db` local) â€” confirmar host (srv1373909) antes de qualquer import em massa.
7. **Resolver gotchas de paridade antes do import:** `cargo` aceito-e-descartado no `PATCH /api/users/me`; duas engines de quiz; gap de migrations 025â€“027 (intencional?).

### Para a **Yavix** (destravam a integraÃ§Ã£o tÃ©cnica)
1. **Auth de servidor (BLOQUEADOR):** existe client-credentials / API-key / service-account / SSO-OIDC para B2B, ou sÃ³ login por usuÃ¡rio (CPF/senha/tenant)? Sem isso, como integrar sem armazenar a senha de cada trabalhador?
2. **URL real** (produÃ§Ã£o e homologaÃ§Ã£o) + **tenant de sandbox** + **credenciais de teste**.
3. **Refresh token** â€” existe, ou re-login a cada 8h? **Rate-limit/429** â€” quais limites de req/s para PATCH em massa?
4. **Provisionamento** â€” hÃ¡ **API** de criaÃ§Ã£o em massa de empresas/usuÃ¡rios, ou sÃ³ o painel + XLSX? Como o import faz **matching** (upsert por CPF? CNPJ FILIAL precisa existir em Empresas?).
5. **O que Ã© "COPSOQ41"** (41 dimensÃµes? itens-nÃºcleo? versÃ£o BR?) â€” por que `codes` vÃ£o atÃ© 120? HÃ¡ outros `formName`?
6. **Endpoint de resultados/scoring** apÃ³s `status=DONE` (dimensÃµes de risco para o PGR) â€” existe? Por company/tenant?
7. **ReaplicaÃ§Ã£o periÃ³dica:** `POST /form` apÃ³s um draft `DONE` reabre, cria novo, ou bloqueia? PolÃ­tica de re-aplicaÃ§Ã£o do NR-1.
8. **RBAC:** quais roles podem **responder** vs **administrar** (causa do `403`)? Respondente precisa de role especÃ­fica?
9. **SemÃ¢ntica de Ã­ndices:** `value.value` (1-based) vs `value.optionIndex` (0-based) â€” confirmar e se o backend valida coerÃªncia.
10. **1Âº acesso/senha:** o modelo XLSX **nÃ£o tem coluna de e-mail** â€” login=CPF; senha inicial via CELULAR (SMS/WhatsApp)? Formato exato do CELULAR (com/sem 9, +55)?
11. **LGPD:** contrato de tratamento (CPF + respostas de saÃºde mental = dado sensÃ­vel) â€” quem Ã© controlador/operador, onde residem os dados? (Aceite automÃ¡tico de termos em nome do trabalhador = Degrau 4, **nÃ£o automatizar** sem aval jurÃ­dico.)
12. **GHE/UNIDADE:** GHE Ã© obrigatÃ³rio? catÃ¡logo fechado ou texto livre? UNIDADE deveria ser dropdown ligado a Empresas?

---

## RECOMMENDED NEXT STEP
Executar a Onda 0 (piloto): preencher o XLSX padrao com os dados reais da UniHER (1 matriz + colaboradoras, CPF=login, lideres antes dos liderados, REMOVER=Nao) e, em paralelo, solicitar a Yavix a URL/tenant de sandbox + credenciais de teste para validar os 8 passos via collection Postman com 1 usuario real â€” sem logar CPF/token.

## OPEN QUESTIONS (sÃ­ntese)
- BLOQUEADOR Yavix: existe auth de servidor (client-credentials/API-key/service-account/SSO) ou sÃ³ login por usuÃ¡rio (CPF/senha/tenant)? Sem isso, a Opcao A2 (proxy server-side) nao fecha de forma segura sem armazenar a senha de cada trabalhador.
- Produto (Nelson): a colaboradora responde o COPSOQ dentro da UniHER (proxy A2) ou e redirecionada ao portal Yavix (A1/SSO)? Define todo o escopo de codigo e a necessidade de i18n.
- Yavix: qual a URL real (prod+homologacao), ha tenant de sandbox e credenciais de teste para a Onda 0?
- Yavix: existe endpoint de resultados/scoring apos status=DONE para alimentar o PGR e o dashboard RH, ou a UniHER precisa calcular o scoring COPSOQ (qual versao/cut-offs)?
- Yavix: ha API de provisionamento em massa (empresas/usuarios) ou so o painel + XLSX? Como e o matching no import (upsert por CPF? CNPJ FILIAL precisa existir em Empresas)?
- O que 'COPSOQ41' representa (41 dimensoes/itens-nucleo/versao BR) e por que os codes vao ate 120? Ha outros formName/versoes?
- LGPD: ha contrato de tratamento de dados (CPF + saude mental = sensivel)? Quem e controlador/operador? Aceite de termos em nome do trabalhador (PUT /terms/update) tem implicacao juridica = Degrau 4, nao automatizar sem aval.
- Produto: escopo de 'multiidioma' (so o questionario vs app inteiro) e granularidade do laudo (departamento existente vs GHE/unidade/cargo ausentes no schema) â€” definem o tamanho do refactor de i18n e de modelagem.
- Yavix: refresh token (ou re-login a cada 8h?) e rate-limit/429 para PATCH em massa, antes de qualquer batch.
- Confirmar host do banco de producao (DATABASE_PATH default e local data/uniher.db; provavel srv1373909) antes de import em massa, e resolver gotchas de paridade (cargo descartado no PATCH, duas engines de quiz, gap migrations 025-027).


# ===== REVISÃƒO CRÃTICA =====

## VERDICT
A sÃ­ntese Ã© tecnicamente sÃ³lida e bem ancorada nos achados crus â€” verifiquei no cÃ³digo real os pontos load-bearing e todos batem: gap de migrations 025â€“027 / prÃ³ximo livre 047 (confirmado em disco), `quizSubmitSchema` com `.length(6)` (schemas.ts:50), gotcha do `cargo` aceito-e-descartado (users/me/route.ts: Zod aceita na linha 18, mas destructuring linha 31 e UPDATE linhas 38-42 omitem â€” CONFIRMADO), ausÃªncia total de CPF (grep 0 ocorrÃªncias), duas engines de quiz (lib/quiz-engine.ts + lib/quiz/engine.ts), `/6` hardcoded em QuizQuestion.tsx (linhas 32 e 52), VALID_CONSENT_TYPES sem tipo de saÃºde (consent/route.ts:7), padrÃ£o withRetry/getResend em mail/index.ts, UNIQUE/ON CONFLICT(user_id) em quiz.repository.ts, e nenhum cliente HTTP server-side. NÃƒO encontrei alucinaÃ§Ãµes sobre o cÃ³digo. As fraquezas da sÃ­ntese sÃ£o de OMISSÃƒO/ÃŠNFASE, nÃ£o de fabricaÃ§Ã£o: ela suaviza o bloqueador de auth de servidor (apresenta A2 como 'recomendada' embora ela prÃ³pria admita que estÃ¡ bloqueada pela DecisÃ£o C), trata o pilar do produto inteiro â€” endpoint de RESULTADOS/scoring â€” como nota de rodapÃ© quando ele Ã© existencial (sem scoring nÃ£o hÃ¡ laudo NR-1, que Ã© o objetivo de negÃ³cio), e o plano de ondas embute risco de regressÃ£o LGPD por nÃ£o tornar o k-anonimato/anonimizaÃ§Ã£o um gate bloqueante. AprovÃ¡vel como documento de entendimento e plano, MAS precisa de correÃ§Ãµes antes de virar contrato de execuÃ§Ã£o.

## HALLUCINATIONS_OR_UNSUPPORTED
- NENHUMA alucinaÃ§Ã£o de cÃ³digo encontrada. Todas as afirmaÃ§Ãµes load-bearing sobre o UniHER foram verificadas no cÃ³digo real e conferem: gap migrations 025-027 e prÃ³ximo=047 (disco), .length(6) em schemas.ts:50, cargo aceito-e-descartado (users/me/route.ts linhas 18 vs 31/38-42), CPF inexistente (grep 0), duas engines de quiz (arquivos confirmados), /6 hardcoded (QuizQuestion.tsx:32,52), VALID_CONSENT_TYPES sem saÃºde (consent/route.ts:7), withRetry/getResend (mail/index.ts:5,24), UNIQUE/ON CONFLICT(user_id) (quiz.repository.ts:51), ausÃªncia de cliente HTTP server-side (grep em services vazio), QuizQuestion suporta type:'scale' (linha 69).
- AFIRMAÃ‡ÃƒO NÃƒO-VERIFICÃVEL PELOS ACHADOS (nÃ£o Ã© alucinaÃ§Ã£o, mas Ã© suposiÃ§Ã£o apresentada com confianÃ§a): a sÃ­ntese afirma 'access 15min/refresh 48h' para o JWT do UniHER e 'bcryptjs cost 12' â€” vem dos achados crus (API/DADOS), nÃ£o foi reconfirmado por mim neste cÃ³digo, mas Ã© consistente com o CLAUDE.md do projeto. Baixo risco.
- SUPOSIÃ‡ÃƒO RAZOÃVEL porÃ©m nÃ£o comprovada: 'A2 segue o template canÃ´nico /api/quiz/submit' â€” o template existe, mas que ele suporte um proxy de 120 itens com autosave Ã© extrapolaÃ§Ã£o; o prÃ³prio achado diz que os motores existentes estÃ£o travados em 6 perguntas. NÃ£o Ã© falso, mas a sÃ­ntese deveria deixar mais claro que Ã© um padrÃ£o de referÃªncia, nÃ£o reuso direto.
- INTERPRETAÃ‡ÃƒO de COPSOQ41 como 'NÃƒO o nÃºmero de perguntas' estÃ¡ corretamente marcada como [SUPOSIÃ‡ÃƒO] e alinhada ao achado YAVIX â€” sem problema, Ã© honesta sobre a incerteza.


## GAPS
- FLUXO DA API â€” terms/update sem idempotÃªncia clara: a sÃ­ntese diz 'aceitar termo 1x/termo' mas NÃƒO trata o caso de corrida onde dois processos (proxy em massa) aceitam o mesmo termo, nem o que o 200 vs 404 significa apÃ³s reaceite por isOutdated. O achado YAVIX levanta isOutdated=>reaceite mas a sÃ­ntese nÃ£o fecha o loop de re-verificaÃ§Ã£o apÃ³s PUT /terms/update (deveria re-chamar GET /terms/verify para confirmar hasPendingTerms=false antes de seguir ao form).
- FLUXO DA API â€” ordem dos passos 4 e 5 nÃ£o Ã© justificada: a sÃ­ntese coloca GET /form (passo 4) antes de POST /form (passo 5), mas POST /form Ã© idempotente e pode ser chamado antes; mais grave, a sÃ­ntese nÃ£o cobre o que fazer se GET /form retornar versÃ£o diferente da que estÃ¡ no snapshot option[] jÃ¡ salvo num draft retomado dias depois (o achado YAVIX marca isso como risco real de inconsistÃªncia de snapshot, a sÃ­ntese sÃ³ diz 'revalidar versÃ£o do form' sem definir COMO detectar a mudanÃ§a â€” nÃ£o hÃ¡ campo de versÃ£o no Form documentado).
- FLUXO DA API â€” recuperaÃ§Ã£o de sessÃ£o DONE: tanto o achado YAVIX quanto as perguntas em aberto reconhecem que 'POST /form apÃ³s DONE' Ã© indefinido (reabre/cria novo/bloqueia). A sÃ­ntese lista isso como pergunta para a Yavix mas o PLANO de ondas (Onda 3, idempotÃªncia da sessÃ£o) assume que dÃ¡ pra gerenciar sem essa resposta â€” Ã© uma dependÃªncia nÃ£o resolvida que pode quebrar a Onda 6 (reaplicaÃ§Ã£o periÃ³dica do NR-1).
- XLSXâ†’YAVIX â€” a reconciliaÃ§Ã£o de identidade CPFâ†”email NÃƒO estÃ¡ resolvida no plano: o achado DADOS Ã© explÃ­cito que users.email Ã© UNIQUE NOT NULL e Ã© a PK de identidade, e a planilha Yavix NÃƒO TEM coluna de e-mail. A sÃ­ntese menciona 'sem coluna de e-mail' mas nÃ£o decide como a UniHER, que exige email, vai gerar/casar usuÃ¡rios ao exportar a planilha (email sintÃ©tico? coluna cpf nova como chave alternativa?). Ã‰ um furo de mapeamento bidirecional: importar Yavixâ†’UniHER esbarra no email obrigatÃ³rio; exportar UniHERâ†’Yavix esbarra na falta de CPF no UniHER.
- XLSXâ†’YAVIX â€” import de lÃ­der em 2 passes nÃ£o estÃ¡ no plano: o achado DADOS aponta que CPF DO LÃDER DIRETO exige import em 2 passes (criar todos os users, depois resolver leader_cpfâ†’leader_id) e ordenaÃ§Ã£o (lÃ­deres antes de liderados). A Onda 0 menciona 'lÃ­deres antes dos liderados' para a planilha, mas a Onda 2 (persistÃªncia) nÃ£o modela o resolver de 2 passes nem a detecÃ§Ã£o de ciclos na hierarquia.
- XLSXâ†’YAVIX â€” UNIDADE vs CNPJ FILIAL como dimensÃµes distintas: o achado XLSX e DADOS destacam que UNIDADE (texto livre) e CNPJ FILIAL (FK formal) podem ser dimensÃµes diferentes. A sÃ­ntese mapeia ambas mas nÃ£o decide se UNIDADE vira coluna prÃ³pria ou Ã© derivada de CNPJ FILIAL â€” fica ambÃ­guo no schema da Onda 2.
- INTEGRAÃ‡ÃƒO â€” endpoint de RESULTADOS/scoring Ã© tratado como secundÃ¡rio: este Ã© o maior gap de prioridade. O objetivo de negÃ³cio (laudo NR-1 para o PGR) depende inteiramente de obter os scores das dimensÃµes psicossociais apÃ³s DONE. Ambos os achados YAVIX e UX dizem que o manual NÃƒO cobre leitura de resultados e questionam se o endpoint existe. A sÃ­ntese relega isso Ã  Onda 6 e a uma pergunta para a Yavix, mas SEM resposta a essa pergunta TODO o valor de conformidade da integraÃ§Ã£o Ã© nulo â€” deveria ser pergunta-zero/bloqueador, no mesmo nÃ­vel do auth de servidor.
- PLANO â€” ausÃªncia de gate de mediÃ§Ã£o antes da Onda 1: a Regra 1 da Axial (medir antes de mexer) exige reproduzir no sistema real. A Onda 0 faz o piloto manual, mas o plano nÃ£o torna explÃ­cito que as Ondas 1+ (escrever cliente HTTP, migration, service) estÃ£o BLOQUEADAS atÃ© a Onda 0 responder auth de servidor + endpoint de resultados + idempotÃªncia pÃ³s-DONE. Como estÃ¡, um executor pode comeÃ§ar a codar a Onda 1 sem essas respostas e construir sobre suposiÃ§Ãµes.


## MISSING_CONSIDERATIONS
- AUTH DE SERVIDOR â€” a sÃ­ntese reconhece o bloqueador (DecisÃ£o C) mas ainda recomenda A2 como caminho. Sem service-account/API-key/SSO, A2 server-side EXIGE armazenar a senha de cada trabalhador (ou um fluxo de impersonaÃ§Ã£o nÃ£o documentado). Isso Ã© incompatÃ­vel com a prÃ³pria recomendaÃ§Ã£o B1 (cifrar senha POR EMPRESA) â€” o login Yavix Ã© por CPF DO TRABALHADOR, nÃ£o por empresa. A sÃ­ntese chega a notar 'mapeamento userâ†”Yavix exige coluna por usuÃ¡rio' mas nÃ£o conecta que isso significa guardar a senha individual de cada colaboradora cifrada, o que Ã© um problema LGPD/seguranÃ§a grave e provavelmente inviÃ¡vel. A recomendaÃ§Ã£o deveria ser: NÃƒO construir A2 atÃ© a Yavix oferecer auth de servidor; atÃ© lÃ¡, sÃ³ A1 (redirect) ou D1 (XLSX) sÃ£o viÃ¡veis.
- PII/LGPD â€” aceite de termos em nome do trabalhador: o achado YAVIX marca explicitamente que automatizar PUT /terms/update em nome do trabalhador tem implicaÃ§Ã£o jurÃ­dica (consentimento) e Ã© Degrau 4. A sÃ­ntese cita isso de passagem numa pergunta em aberto, mas o PLANO (Onda 3, service orquestrando os 8 passos incluindo terms/update) embute esse aceite automÃ¡tico no fluxo server-side sem marcÃ¡-lo como bloqueado por aval jurÃ­dico. Risco de a Onda 3 implementar aceite automÃ¡tico ilegal.
- PII â€” CPF como login + dado de saÃºde mental no mesmo registro: a combinaÃ§Ã£o CPF (identifica pessoa fÃ­sica) + respostas COPSOQ (saÃºde mental = dado sensÃ­vel LGPD art. 11) num Ãºnico fluxo exige base legal robusta e minimizaÃ§Ã£o. A sÃ­ntese trata k-anonimato sÃ³ para o dashboard RH (Onda 6), mas nÃ£o cobre a minimizaÃ§Ã£o no armazenamento (a UniHER vai guardar as respostas brutas identificÃ¡veis? por quanto tempo? a Yavix Ã© a controladora ou operadora?). O achado YAVIX pergunta 'quem Ã© controlador/operador e onde residem os dados' â€” sem isso definido, gravar respostas COPSOQ no SQLite da UniHER pode ser tratamento sem base legal.
- MULTI-TENANT â€” risco de vazamento cross-tenant: o achado YAVIX alerta que tenant sÃ³ Ã© passado no login e as demais rotas confiam no JWT; se o backend Yavix nÃ£o filtrar por tenantId, GET /form/answers/{id} de outro usuÃ¡rio pode vazar. A sÃ­ntese nÃ£o inclui na Onda 0/3 um teste de isolamento (tentar ler answers de outro usuÃ¡rio/tenant e confirmar 404). Ã‰ uma verificaÃ§Ã£o de seguranÃ§a que deveria estar no piloto.
- IDIOMA â€” fallback nÃ£o garantido: o achado YAVIX diz que nÃ£o hÃ¡ garantia de que toda pergunta/opÃ§Ã£o tenha pt/en/es preenchidos. A sÃ­ntese coloca i18n na Onda 5 mas nÃ£o trata o caso de label{pt} ausente (fallback). Mais ainda: a Onda 5 vem DEPOIS da Onda 4 (tela COPSOQ funcional), entÃ£o a tela COPSOQ seria construÃ­da em pt-only e depois retrofittada â€” risco de retrabalho; i18n deveria informar a arquitetura da tela desde a Onda 4.
- SINCRONIZAÃ‡ÃƒO DE CADASTROS â€” upsert por CPF nÃ£o confirmado: o achado XLSX pergunta se reenviar CPF existente faz upsert ou duplica. A sÃ­ntese assume 'upsert por CPF a confirmar' mas o PLANO de export UniHERâ†’XLSX (Onda futura) nÃ£o tem estratÃ©gia de reconciliaÃ§Ã£o se a Yavix duplicar. Sem garantia de idempotÃªncia do import, re-exports periÃ³dicos (NR-1 Ã© recorrente) podem criar usuÃ¡rios duplicados.
- REMOVER=Sim â€” comportamento nÃ£o confirmado e nÃ£o tratado no plano: o achado XLSX/DADOS pergunta se REMOVER=Sim faz soft-delete (preserva histÃ³rico) ou hard-delete. A sÃ­ntese assume 'provÃ¡vel soft-delete' mas nÃ£o inclui no plano um teste no piloto (Onda 0) para confirmar â€” e se a UniHER exportar REMOVER=Sim e a Yavix apagar respostas COPSOQ histÃ³ricas, isso viola tanto a regra superset quanto a obrigaÃ§Ã£o de retenÃ§Ã£o do laudo NR-1.
- RATE-LIMIT 429 â€” nÃ£o medido antes do batch: o achado YAVIX nota que 429 nem aparece na tabela de erros (lacuna). Para 120 PATCH por colaboradora Ã— N colaboradoras, isso Ã© crÃ­tico. A sÃ­ntese diz 'assumir e medir antes de batch' mas a Onda 0 testa sÃ³ 1 usuÃ¡rio â€” nÃ£o hÃ¡ onda dedicada a medir o limite real de req/s antes de aplicar em massa, e a Onda 3 jÃ¡ assume PATCH em volume.


## CORRECTIONS
- Corrigir a recomendaÃ§Ã£o da DecisÃ£o A: A2 NÃƒO deve ser recomendada enquanto a DecisÃ£o C (auth de servidor) estiver aberta. A sÃ­ntese se contradiz ao marcar A2 'RECOMENDADA' e depois 'Bloqueada pela DecisÃ£o C'. Reescrever para: 'A2 Ã© o alvo arquitetural, MAS estÃ¡ bloqueada; o caminho viÃ¡vel HOJE Ã© A1 (redirect/SSO ao portal Yavix) ou apenas provisionamento via XLSX (D1), com A2 condicionada Ã  Yavix expor service-token/SSO.'
- Elevar o endpoint de RESULTADOS/scoring de 'pergunta em aberto #6 para a Yavix' para BLOQUEADOR de nÃ­vel 1 (junto com auth de servidor). Sem ele nÃ£o hÃ¡ laudo NR-1 = o objetivo de negÃ³cio da integraÃ§Ã£o nÃ£o se realiza. Deve ser respondido na Onda 0 antes de qualquer cÃ³digo.
- Reordenar/bloquear o plano: tornar explÃ­cito que Ondas 1â€“6 estÃ£o BLOQUEADAS atÃ© a Onda 0 responder (a) auth de servidor, (b) endpoint de resultados, (c) idempotÃªncia POST /form pÃ³s-DONE, (d) limite 429, (e) comportamento de REMOVER e upsert por CPF. Sem isso o plano viola a Regra 1 (medir antes de mexer).
- Corrigir a recomendaÃ§Ã£o B1: cifrar 'senha Yavix por empresa' estÃ¡ errado conceitualmente â€” o login Yavix Ã© por CPF DO TRABALHADOR, nÃ£o por empresa. Se A2 fosse adiante sem service-token, seria preciso cifrar a senha de CADA colaboradora, o que Ã© inviÃ¡vel/perigoso. Marcar B1 como dependente da resposta de auth de servidor; se houver service-token, NÃƒO se armazena senha de usuÃ¡rio nenhuma.
- Marcar o aceite automÃ¡tico de termos (PUT /terms/update no service da Onda 3) como Degrau 4 / requer aval jurÃ­dico ANTES de implementar â€” nÃ£o embutir no orquestrador automÃ¡tico sem essa trava, conforme o prÃ³prio achado YAVIX.
- Mover a consideraÃ§Ã£o de i18n/fallback para influenciar a Onda 4 (nÃ£o sÃ³ a Onda 5): a tela COPSOQ deve ser construÃ­da i18n-ready desde o inÃ­cio, com fallback pt quando label{en/es} faltar, para evitar retrabalho.
- Adicionar Ã  Onda 0 testes de: (1) isolamento cross-tenant (ler answers de outro usuÃ¡rio deve dar 404), (2) reaplicaÃ§Ã£o pÃ³s-DONE (POST /form apÃ³s finalizar), (3) comportamento de REMOVER, (4) idempotÃªncia de import por CPF â€” todos sÃ£o mediÃ§Ãµes, nÃ£o suposiÃ§Ãµes.
- Resolver no plano (Onda 2) a reconciliaÃ§Ã£o de identidade: decidir explicitamente se a UniHER ganha coluna users.cpf UNIQUE (chave de matching com Yavix) e como lida com a ausÃªncia de e-mail na planilha Yavix (email sintÃ©tico vs. exigir e-mail no cadastro UniHER antes do export). Hoje o plano deixa esse furo aberto.


## STILL_TO_MEASURE
- No sistema Yavix real (Onda 0, ainda nÃ£o feito): obter URL de produÃ§Ã£o/homologaÃ§Ã£o, tenant de sandbox e credenciais de teste; rodar os 8 passos com 1 usuÃ¡rio e capturar token, formSessionId, 204 nos PATCH, e resultado do PUT â€” SEM logar CPF/token (PII).
- Medir comportamento de POST /form apÃ³s status=DONE (reabre? cria novo? bloqueia?) â€” define a viabilidade da reaplicaÃ§Ã£o periÃ³dica do NR-1.
- Medir se existe e como se chama o endpoint de RESULTADOS/scoring por company/tenant apÃ³s DONE â€” bloqueador de negÃ³cio.
- Medir limite de rate-limit/429 da Yavix para PATCH em volume antes de qualquer batch.
- Confirmar semÃ¢ntica value.value (1-based) vs value.optionIndex (0-based) com uma resposta real e ver se o backend valida coerÃªncia â€” risco de resposta errada silenciosa.
- Confirmar comportamento de REMOVER=Sim (soft-delete vs hard-delete) e de upsert por CPF no import (atualiza vs duplica) no painel Yavix real.
- Testar isolamento cross-tenant: tentar GET /form/answers/{id} de sessÃ£o de outro usuÃ¡rio/tenant e confirmar 404.
- No cÃ³digo UniHER (nÃ£o verifiquei, mas o plano depende): confirmar se o runner de migrations (src/lib/db/migrations/runner.ts) VALIDA sequÃªncia contÃ­gua â€” se validar, o gap 025-027 quebraria; se sÃ³ ordena, Ã© benigno. A sÃ­ntese assume benigno mas nÃ£o foi medido.
- No cÃ³digo UniHER: confirmar a forma exata de criptografia disponÃ­vel (a sÃ­ntese afirma 'criptografia de segredos em repouso inexistente hoje') â€” verificar se hÃ¡ algum util de crypto antes de afirmar que seria construÃ­do do zero.
- Confirmar o host de produÃ§Ã£o do banco UniHER (DATABASE_PATH; memÃ³ria sugere srv1373909) antes de qualquer import em massa â€” a prÃ³pria sÃ­ntese levanta, mas continua nÃ£o-medido.

