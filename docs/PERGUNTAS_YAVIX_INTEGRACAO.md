# Perguntas para a Yavix — Integração UniHER × COPSOQ41 (NR-1)

> **Contexto:** a UniHER vai integrar o questionário psicossocial **COPSOQ41** (NR-1) da Yavix na sua plataforma — a colaboradora responde **dentro do app UniHER**, e o **servidor da UniHER** conversa com a API da Yavix (o navegador nunca fala direto com vocês). Antes de escrever a integração real e de enviar a planilha de cadastro preenchida, precisamos alinhar os pontos abaixo.
>
> **Prioridade:** 🔴 = bloqueia o início · ⚙️ = necessário para o piloto (cadastro/acesso) · ▶️ = necessário para a fase de runtime.
>
> _Gerado 2026-06-29. Documento interno UniHER/Axial; a Seção "Anexo" não vai para a Yavix._

---

## 1. Bloqueadores (precisamos destes para começar)

1. 🔴 **Autenticação servidor-a-servidor (B2B).** O manual descreve apenas `POST /auth/login` por **usuário** (CPF/e-mail + senha + tenant). Existe um modo de integração **server-to-server** — *client-credentials*, *API key*, *service account* ou *SSO/OIDC*? **Sem isso, como aplicamos o questionário em escala sem armazenar a senha de cada colaboradora?** (Guardar a senha de cada trabalhador é inviável para nós, por segurança e LGPD.)

2. 🔴 **Resultados / laudo.** O manual cobre o **preenchimento** (login → termos → formulário → respostas → enviar), mas **não a leitura dos resultados**. Após `status=DONE`, como obtemos o **scoring das dimensões psicossociais** (para alimentar o PGR/NR-1)? Há endpoint de **resultados por colaborador** e/ou **agregado por empresa/setor**? Se não houver API, a Yavix entrega o laudo por outro canal? *(Sem resultado, a integração não cumpre o objetivo de conformidade.)*

---

## 2. Acesso e ambiente ⚙️

3. **URLs** da `yavix-api` em **produção** e em **homologação/sandbox**.
4. **Credenciais de teste** + um **tenant de sandbox** para rodarmos o piloto sem afetar dados reais.

---

## 3. Cadastros (planilha / provisionamento) ⚙️

5. **Matching no import:** reenviar um **CPF já existente** faz **atualização (upsert)** ou **duplica**? A chave de identidade é o CPF?
6. **Integridade:** o `CNPJ FILIAL` (aba *Funcionarios*) precisa **existir** na aba *Empresas*? Um colaborador pode ser vinculado direto à **matriz**?
7. **Tenant:** o tenant lógico é a **matriz (grupo)** com filiais como sub-escopos, ou **cada CNPJ é um tenant isolado**?
8. **GHE (Grupo Homogêneo de Exposição):** é **obrigatório**? É **lista fechada/catálogo** ou **texto livre**? Como a Yavix usa esse campo? *(No piloto deixaremos em branco até esta definição.)*
9. **CELULAR:** formato esperado exato — só dígitos com DDD? com o dígito **9**? com **+55**?
10. **E-mail / primeiro acesso:** o modelo **não tem coluna de e-mail** e o login é por **CPF**. Como é o **primeiro acesso / definição de senha** da colaboradora — via SMS/WhatsApp no celular? O e-mail é dispensável mesmo?
11. **SEXO:** é **sexo biológico** (eSocial/SST) ou **gênero**? O domínio fica restrito a **F/M**?
12. **REMOVER = "Sim":** **desativa/bloqueia** o acesso preservando o histórico (soft-delete) ou **exclui** o registro?
13. **Provisionamento via API:** além da planilha + painel, existe **API** para criação/atualização em massa de empresas e usuários? *(Queremos automatizar a partir do cadastro que já temos na UniHER, em vez de planilha manual por cliente.)*
14. **Obrigatoriedade por coluna:** quais colunas a Yavix **rejeita** se vierem vazias?

---

## 4. Fluxo da API (runtime) ▶️

15. **Token:** existe **refresh token**, ou é **re-login a cada 8h**?
16. **Rate-limit:** há limite de requisições/segundo (HTTP **429**)? Qual? *(Vamos enviar muitos `PATCH /form/{id}` — uma resposta por pergunta, por colaboradora.)*
17. **Reaplicação:** `POST /form` após um questionário `DONE` **reabre**, **cria novo** ou **bloqueia**? Qual a política de **reaplicação periódica** do NR-1?
18. **RBAC:** quais **roles** podem **responder** vs **administrar**? *(Queremos evitar 403.)* O respondente comum precisa de role específica?
19. **Índices da resposta:** confirmar a semântica, no `PATCH /form/{id}`, de `value.value` (**1-based?**) vs `value.optionIndex` (**0-based?**), e se o backend valida a coerência entre os dois.
20. **Termos:** o `id` usado em `PUT /terms/update` é o campo `id` do item de `terms[]` (não o `termsAgreementId`), correto? Quando `isOutdated=true`, basta **reaceitar** pelo mesmo fluxo?
21. **Idioma:** as perguntas/opções vêm **sempre** com `pt/en/es` preenchidos, ou algum idioma pode faltar? *(Precisamos saber para o fallback.)*

---

## 5. O instrumento (COPSOQ41)

22. O que exatamente é **"COPSOQ41"**? (41 dimensões? itens-núcleo? versão BR adaptada?) Por que os `code` vão até **120**? Há outros `formName`/versões disponíveis?
23. O **cálculo / cut-offs** das dimensões é responsabilidade da **Yavix** (nossa preferência) ou a UniHER deve calcular? Se for nosso, qual a **matriz oficial** de pontuação?

---

## 6. LGPD e tratamento de dados (sensível)

24. **Contrato de tratamento:** CPF + respostas de saúde mental são **dados sensíveis** (LGPD art. 11). Quem é **controlador** e quem é **operador**? **Onde** os dados residem?
25. **Aceite de termos:** confirmamos que o aceite (`PUT /terms/update`) deve ser **ação da própria colaboradora** na nossa interface (nunca automatizado pelo servidor em nome dela), certo? Vocês exigem registro de consentimento (IP/timestamp) do lado de vocês?
26. **Retenção / exclusão:** qual a política de **retenção** do laudo, e qual o efeito de `REMOVER` sobre **respostas históricas**?

---

## Anexo — Decisões internas (Nelson · NÃO enviar à Yavix)

- **Arquitetura:** A2 (questionário embutido na UniHER) já decidido — **mas depende do bloqueador #1** (auth de servidor). Sem ele, só A1 (redirect ao portal Yavix) é viável.
- **i18n:** escopo do multiidioma — só o questionário (recomendado) vs app inteiro.
- **Laudo:** granularidade exigida — `departamento` já existe no schema; **GHE/unidade/cargo não existem** → entram na migration 047.
- **Gamificação:** XP só por **participação** (nunca pelo conteúdo das respostas).
- **Infra:** confirmar host do banco de produção (srv1373909) antes de qualquer import em massa.
- **Piloto:** preencher esta planilha com o time da UniHER, enviar à Yavix, validar o fluxo via Postman/coleção e a tela `/avaliacao-nr1` antes de escrever a fiação real (Onda 3).
