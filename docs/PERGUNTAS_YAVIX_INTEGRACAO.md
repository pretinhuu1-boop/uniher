# Perguntas para a Yavix - Integracao UniHER x COPSOQ41 (NR-1)

> **Contexto:** a UniHER esta preparando a integracao do questionario psicossocial COPSOQ41 (NR-1) da Yavix dentro da plataforma UniHER. A intencao tecnica e que o navegador fale apenas com a UniHER e que o servidor UniHER converse com a Yavix, sem expor token Yavix no browser. Antes de iniciar integracao real, precisamos confirmar os pontos abaixo.
>
> **Prioridade:** `P0` bloqueia inicio seguro; `P1` e necessario para piloto/cadastro/acesso; `P2` e necessario para runtime e escala.

---

## 1. Bloqueadores P0

1. **Autenticacao servidor-a-servidor ou SSO.** O material recebido ate agora descreve `POST /auth/login` por usuario com CPF/e-mail, senha e tenant. Existe um modo B2B para integracao, como client credentials, API key, service account, OIDC/SSO ou outro fluxo oficial? Precisamos evitar qualquer desenho que dependa de guardar senhas individuais de colaboradoras.

2. **Resultados, scoring e laudo.** O material atual cobre preenchimento do formulario, mas nao cobre leitura de resultados. Apos `status=DONE`, como a UniHER obtem o scoring das dimensoes psicossociais e/ou o laudo para apoiar PGR/NR-1? Existe endpoint por colaborador, agregado por empresa/setor/GHE, exportacao ou entrega por outro canal?

3. **Contrato tecnico atual.** Voces podem compartilhar OpenAPI, Swagger, Postman Collection ou documento equivalente atualizado para:
   - API de aplicacao do COPSOQ41;
   - API de implantacao/provisionamento, caso exista;
   - ambiente de homologacao/sandbox;
   - ambiente de producao.

---

## 2. Acesso e ambiente P1

4. Quais sao as URLs oficiais de homologacao/sandbox e producao?

5. Voces conseguem fornecer tenant de sandbox e credenciais de teste sem PII real para validarmos o piloto?

6. O token possui refresh token? Se nao houver refresh token, qual e o fluxo recomendado para sessao longa ou expiracao durante preenchimento?

7. Existem rate limits documentados, especialmente para muitas chamadas `PATCH /form/{id}`?

---

## 3. Cadastro e provisionamento P1

8. Alem da planilha e painel, existe API para criar, atualizar, desativar e reconciliar empresas, filiais e funcionarios?

9. No import por planilha ou API, reenviar CPF existente atualiza o cadastro ou cria duplicidade?

10. A chave de identidade do colaborador na Yavix e CPF? Existe algum identificador externo recomendado para integracao com a UniHER?

11. O `CNPJ FILIAL` precisa existir previamente na aba/entidade de empresas? Um colaborador pode ser vinculado direto a matriz?

12. O tenant representa a matriz/grupo com filiais abaixo, ou cada CNPJ deve ser tenant separado?

13. `REMOVER = Sim` desativa/bloqueia preservando historico ou exclui definitivamente?

14. Quais colunas da planilha sao obrigatorias e quais podem ficar vazias no piloto?

15. GHE e obrigatorio? E catalogo fechado ou texto livre? Como a Yavix usa GHE nos resultados?

16. Qual formato esperado para celular: somente digitos com DDD, com nono digito, com `+55`, ou outro padrao?

17. O modelo recebido nao possui coluna de e-mail. Como funciona o primeiro acesso da colaboradora: SMS, WhatsApp, CPF e senha temporaria, convite por outro canal?

18. O campo sexo usa dominio `F/M` por requisito SST/eSocial ou ha outro dominio?

---

## 4. Runtime COPSOQ41 P2

19. `POST /form` depois de um formulario `DONE` reabre a sessao, cria novo ciclo ou bloqueia?

20. Qual e a politica recomendada para reaplicacao periodica do NR-1?

21. Quais roles podem responder, administrar e visualizar resultado? O respondente precisa de role especifica?

22. No `PATCH /form/{id}`, confirmam que `value.value` e 1-based e `value.optionIndex` e 0-based? O backend valida coerencia entre os dois?

23. O `id` enviado em `PUT /terms/update` e o campo `id` do item retornado em `terms[]`, e nao `termsAgreementId`, correto?

24. Quando `isOutdated=true`, basta repetir o mesmo fluxo de aceite?

25. As labels e opcoes sempre vem com `pt`, `en` e `es`, ou algum idioma pode faltar?

26. Existe identificador de versao/hash do formulario COPSOQ41 para auditoria e compatibilidade entre rascunho e definicao atual?

---

## 5. Instrumento e resultados P0/P2

27. O que exatamente significa `COPSOQ41` no produto Yavix: versao brasileira, quantidade de dimensoes, itens principais ou outro criterio?

28. Os codigos de pergunta podem ir ate 120. Qual e a contagem real de perguntas `QUESTION` no payload ativo?

29. Ha outros `formName` ou versoes alem de `COPSOQ41`?

30. O calculo das dimensoes e cut-offs e responsabilidade da Yavix? Se a UniHER precisar calcular algo, qual matriz oficial, versao e criterio de validacao devem ser usados?

31. O resultado oficial tem granularidade por empresa, filial, setor, GHE, cargo, unidade e/ou lideranca?

---

## 6. LGPD, consentimento e retencao P0/P1

32. Para CPF e respostas psicossociais, quem e controlador e quem e operador dos dados?

33. Onde os dados residem e por quanto tempo ficam retidos?

34. O aceite de termos deve ser sempre acao da propria colaboradora? Quais evidencias voces exigem: IP, user-agent, timestamp, versao do termo ou outro campo?

35. Qual e o efeito de desativacao/remocao do colaborador sobre respostas historicas e laudos ja emitidos?

36. Ha DPA, contrato de tratamento de dados ou clausulas especificas para compartilhamento UniHER x Yavix?

---

## Entregaveis solicitados

Para fecharmos a proxima etapa com seguranca, pedimos:

1. OpenAPI/Postman/documentacao atual da API aplicavel.
2. URL de homologacao/sandbox e producao.
3. Tenant e credenciais de teste sem dados reais.
4. Contrato de autenticacao B2B ou SSO.
5. Contrato de resultados/scoring/laudo ou explicacao do canal alternativo.
6. Payload real ou redigido de `GET /form/COPSOQ41`, com versao/hash se existir.
7. Regras de provisionamento, upsert por CPF, `REMOVER`, GHE, tenant e CNPJ.
8. Politica de consentimento, LGPD, retencao e exclusao.
