# UniHER Concierge, Canal de Denuncias e Liga - completion plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan.

**Data:** 2026-07-28

**Status:** PLAN READY / IMPLEMENTATION HOLD

**Coordenador:** Codex UniHER audit/orchestration
**Escopo:** transformar as frentes Concierge, Canal de Denuncias e Liga em trilhas concluiveis sem prometer funcionamento sensivel antes dos gates formais.

## Objetivo

Fechar um plano confiavel para concluir tres frentes que hoje existem como superficies visiveis, bloqueadas ou em revisao:

- Concierge operacional.
- Canal de Denuncias operacional.
- Liga/ranking competitivo.

O plano nao ativa funcionalidades nesta etapa. Ele define o que falta, em qual ordem executar, quais arquivos podem ser alterados, quais gates impedem promessa comercial e quais evidencias precisam existir antes de chamar algo de "pronto".

## Verdade Atual Verificada

### Concierge

**Estado atual:** shell bloqueado por contrato.

Evidencias locais:

- `src/app/(platform)/concierge/page.tsx` usa `ContainedSurfacePreview`.
- A tela declara "Contrato pendente".
- A tela informa que nenhum caso, status, pendencia, resposta ou indicador de performance foi ativado.
- `tests/unit/module-shells.test.ts` garante que shells bloqueados nao usam `fetch`, DB, `withAuth`, formulario, input, textarea ou `/api/`.
- `src/types/modules.ts` define `concierge` como `requires_contract`, visivel por default apenas para `admin` e `rh`.
- `src/lib/modules/company-modules.ts` trata `concierge` como modulo sensivel; mutacao comum de admin nao pode marcar modulo sensivel como `enabled`.

**Conclusao honesta:** pode ser apresentado como modulo reservado, organizado e bloqueado por contrato. Nao pode ser apresentado como operacional.

### Canal de Denuncias

**Estado atual:** shell partner-managed, sem captura de relato.

Evidencias locais:

- `src/app/(platform)/canal-denuncias/page.tsx` usa `ContainedSurfacePreview`.
- A tela declara "Parceiro pendente".
- A tela informa que nenhum relato, protocolo, caixa de entrada, fluxo de resposta ou integracao externa foi ativado.
- `tests/unit/module-shells.test.ts` garante que a tela nao tem `textarea`, `input`, `POST`, `fetch` ou API de denuncias.
- `src/types/modules.ts` define `denunciation` como `partner_managed`, visivel por default para `admin`, `rh` e `colaboradora`.
- `src/lib/modules/company-modules.ts` trata `denunciation` como modulo sensivel.

**Conclusao honesta:** pode ser apresentado como frente partner-managed planejada e protegida contra captura indevida. Nao pode ser apresentado como canal operacional.

### Liga / ranking

**Estado atual:** Liga em revisao; ranking competitivo bloqueado.

Evidencias locais:

- `src/app/(platform)/liga/page.tsx` declara experiencia coletiva opcional, sem exposicao nominal.
- `src/app/(platform)/liga/gerenciar/page.tsx` mostra `FeedbackState` de revisao.
- `src/app/api/gamification/leaderboard/route.ts` retorna `privacyReviewResponse()`.
- `src/lib/privacy/api-response.ts` define resposta 410 `privacy_review`, `private, no-store`.
- `tests/unit/privacy/gamification-api-containment.test.ts` exige que leaderboard, league e rotas correlatas retornem 410 antes de acesso ao DB.
- `tests/unit/privacy/gamification-safe-projection.test.ts` exige remocao de promessas numericas, pontos, XP e ranking das superficies aprovadas.
- `tests/unit/privacy/gamification-write-containment.test.ts` exige que servicos legados de liga/ranking falhem fechados.
- `tests/e2e/wave-1-1-privacy.spec.ts` verifica que leituras/mutacoes de gamificacao expõem apenas estado neutro indisponivel e nao alteram tabelas legadas.

**Conclusao honesta:** conquistas, objetivos e desafios privados existem sem ranking. Liga/ranking competitivo nao pode ser prometido como operacional. O caminho seguro e primeiro uma experiencia coletiva nao nominal; ranking competitivo nominal fica em HOLD ate politica formal.

## Politica De Apresentacao Para A Dra. Paola

### Pode ser dito agora

- As tres frentes estao mapeadas na plataforma e aparecem com limites claros.
- Concierge esta reservado para empresas contratantes, com fronteira de caso/SLA/indicadores desenhada como proxima etapa.
- Canal de Denuncias esta reservado como modulo partner-managed e nao captura dados sensiveis antes de contrato/parceiro.
- Liga esta em revisao para evoluir para uma experiencia coletiva opcional, sem ranking nominal no estado atual.
- A plataforma protege essas frentes por testes, shells estaticos, module gates e respostas de privacidade.

### Nao pode ser dito agora

- "Concierge operacional".
- "Canal de Denuncias operacional".
- "Ranking competitivo funcionando".
- Que RH/Admin consegue ver relatos, casos individuais, ranking nominal ou dados sensiveis nessas frentes.
- Que a plataforma ja tem politica final de opt-in, revogacao, coorte minima, retencao, anonimato, auditoria ou conflito de interesse para esses modulos.

### Formula comercial recomendada

"Estas frentes ja estao previstas e organizadas na UniHER, mas foram mantidas bloqueadas de forma proposital por dependerem de contrato, parceiro e governanca. O que esta pronto hoje e a base da plataforma e os limites seguros; o proximo passo e aprovar o fluxo operacional de cada modulo antes de ativar coleta, atendimento ou ranking."

## Arquitetura De Conclusao

### Principios obrigatorios

- Fail-closed por default.
- Tenant isolation por `company_id`.
- Nenhum dado individual sensivel em dashboard de RH sem regra explicita.
- Nenhum `enabled` para modulo sensivel por mutacao comum de admin.
- Toda ativacao sensivel precisa de contrato, dono operacional, dono juridico/DPO e plano de suporte.
- Smoke tecnico nao substitui aprovacao visual/produto.
- Prints desktop/mobile sao gates antes de apresentar como pronto.

### Source of truth atual

- Module states: `src/types/modules.ts`.
- Module rules: `src/lib/modules/company-modules.ts`.
- Module read API: `src/app/api/company/modules/route.ts`.
- Shells: `src/app/(platform)/concierge/page.tsx`, `src/app/(platform)/canal-denuncias/page.tsx`, `src/app/(platform)/liga/page.tsx`.
- Privacy response: `src/lib/privacy/api-response.ts`.
- Gamification containment: `src/lib/gamification/containment.ts`.
- Governance plan anterior: `docs/superpowers/plans/2026-07-24-uniher-paola-p8-module-management-governance.md`.

## Lane 1 - Concierge Operacional

### Gate 0 - Decisao de produto/contrato

**Status:** pendente.

Antes de codigo operacional:

- Definir se Concierge e administrativo, clinico, psicossocial, SST ou hibrido.
- Definir quem atende: UniHER, Paola/equipe, parceiro ou empresa.
- Definir SLA, horario de atendimento, escalonamento e limites de responsabilidade.
- Definir se colaboradora pode abrir solicitacao ou se RH/Admin cria casos.
- Definir dados permitidos e proibidos no caso.
- Definir mensagens de emergencia e redirecionamento externo.

**Saida esperada:** decision record em `docs/superpowers/specs/` ou `docs/superpowers/plans/`.

### Gate 1 - Modelo minimo seguro

**Write allowlist sugerido:**

- `src/lib/db/migrations/*_concierge_cases.sql`
- `src/lib/concierge/**`
- `src/app/api/concierge/**`
- `src/app/(platform)/concierge/**`
- `src/app/(platform)/produtos-modulos/**`, se precisar exibir estado
- `tests/unit/concierge*.test.ts`
- `tests/e2e/concierge*.spec.ts`

**Modelo proposto:**

- `concierge_cases`
  - `id`
  - `company_id`
  - `opened_by_user_id`
  - `subject`
  - `category`
  - `status`
  - `priority`
  - `assigned_to_user_id`
  - `created_at`
  - `updated_at`
  - `closed_at`
- `concierge_case_events`
  - `id`
  - `case_id`
  - `company_id`
  - `actor_user_id`
  - `event_type`
  - `body`
  - `created_at`
- `concierge_case_audit`
  - actor, company, case, previous state, next state, timestamp.

**Regras:**

- Nenhum caso aparece se `concierge` nao estiver habilitado por entitlement sensivel aprovado.
- RH/Admin so ve casos da propria empresa.
- Lideranca nao ve Concierge por default.
- Colaboradora so ve o proprio caso, se o contrato permitir abertura por colaboradora.
- Caso nao pode puxar Semaforo, NR-1, agenda, exames, Liga ou historico de saude.

### Gate 2 - UI operacional minima

**Telas:**

- `/concierge`: quadro de casos quando habilitado; shell atual quando bloqueado.
- Painel RH/Admin: lista, filtros por status/prioridade, responsavel, ultimo movimento.
- Detalhe do caso: historico, anotacoes permitidas, troca de status.
- Opcional colaboradora: abertura e acompanhamento do proprio protocolo, se aprovado.

**Nao implementar sem novo gate:**

- Chat em tempo real.
- Triage clinica.
- Diagnostico.
- Integracao com Semaforo/NR-1.
- Indicadores individuais para RH.

### Gate 3 - Testes e evidencia

**Unit/integration:**

- Modulo bloqueado retorna shell/403 e nao consulta dados.
- Empresa A nao acessa caso da Empresa B.
- Colaboradora nao lista casos de outras colaboradoras.
- Lideranca nao acessa Concierge.
- Atualizacao de status gera auditoria.
- Nenhum endpoint retorna campos proibidos ou dados de saude.

**Visual/e2e:**

- Print desktop `/concierge` bloqueado.
- Print mobile `/concierge` bloqueado.
- Print desktop `/concierge` habilitado com fixture fake.
- Print mobile `/concierge` habilitado com fixture fake.
- Smoke de RBAC com admin, rh, lideranca e colaboradora.

**Definition of Done:**

- Somente depois desses gates Concierge pode ser chamado de "operacional piloto".
- Para "operacional em producao", tambem precisa contrato e responsavel de atendimento definido.

## Lane 2 - Canal De Denuncias Operacional

### Gate 0 - Decisao partner-managed vs intake interno

**Status:** pendente.

Antes de codigo operacional:

- Escolher modelo oficial:
  - parceiro externo com link/embed/protocolo externo; ou
  - intake interno UniHER.
- Definir responsavel legal, DPO, fluxo de apuracao, conflito de interesse e retencao.
- Definir se RH/Admin da empresa pode ver algo e em quais condicoes.
- Definir anonimato, identificacao opcional, protocolo, anexos e resposta ao denunciante.
- Definir storage, criptografia, logs e exclusao.

**Recomendacao:** manter partner-managed como primeira versao. E mais seguro ativar configuracao de parceiro/link oficial do que receber denuncias dentro da UniHER antes de governanca completa.

### Gate 1A - Caminho recomendado: parceiro externo

**Write allowlist sugerido:**

- `src/lib/db/migrations/*_denunciation_partner_config.sql`
- `src/lib/denunciation/**`
- `src/app/api/admin/denunciation-config/**`
- `src/app/(platform)/canal-denuncias/**`
- `tests/unit/denunciation-partner*.test.ts`
- `tests/e2e/denunciation-partner*.spec.ts`

**Modelo minimo:**

- `denunciation_partner_configs`
  - `id`
  - `company_id`
  - `provider_name`
  - `launch_url`
  - `module_state`
  - `notes`
  - `updated_by`
  - `updated_at`

**Regras:**

- A UniHER nao recebe relatos.
- A tela so redireciona/abre o canal oficial configurado.
- RH/Admin ve apenas status de configuracao, nao relatos.
- Logs nao registram parametros sensiveis do link.

**DoD partner-managed:**

- Pode ser chamado de "Canal de Denuncias integrado por parceiro" quando o parceiro oficial estiver configurado e aprovado.
- Nao chamar de "canal interno UniHER" nem prometer inbox/protocolo interno.

### Gate 1B - Caminho alternativo: intake interno

**Status:** HOLD forte.

So abrir se a doutora/cliente escolher explicitamente operar dentro da UniHER.

**Modelo minimo proposto:**

- `denunciation_reports`
- `denunciation_report_events`
- `denunciation_report_attachments`
- `denunciation_anonymous_tokens`
- `denunciation_access_audit`

**Regras obrigatorias:**

- Acesso por comite/role especifica, nao por RH generico.
- Bloqueio por conflito de interesse.
- Protocolo anonimo sem expor identidade.
- Trilha de auditoria imutavel.
- Retencao e exportacao aprovadas.
- Anexos tratados com seguranca.

**DoD intake interno:**

- Nao basta formulario.
- Precisa revisao juridica/DPO, threat model, testes de acesso cruzado, prints, termos e operacao humana definida.

## Lane 3 - Liga / Ranking

### Gate 0 - Decisao de produto: ranking competitivo ou experiencia coletiva segura

**Status:** ranking competitivo em HOLD.

O estado atual da plataforma removeu pontuacao/ranking nominal de surfaces aprovadas e mantem APIs legadas em 410 por revisao de privacidade.

**Decisao recomendada para v1:** nao fazer ranking competitivo nominal. Fazer "Liga coletiva" com faixas de participacao agregadas, opt-in e supressao de grupos pequenos.

**Ranking competitivo nominal so pode avancar se houver decisao formal sobre:**

- Opt-in explicito.
- Revogacao.
- Coorte minima.
- Supressao de grupos pequenos.
- Formula de pontuacao.
- Eventos elegiveis.
- Proibicao de dados de saude, NR-1, Semaforo, agenda e exames.
- Retencao e exportacao.
- Tratamento de empate.
- Visibilidade por papel.
- Risco de constrangimento, pressao indevida ou discriminacao.

### Gate 1 - Liga coletiva segura

**Write allowlist sugerido:**

- `src/lib/db/migrations/*_collective_league.sql`
- `src/lib/league/**`
- `src/lib/participation/**`
- `src/app/api/liga/**`
- `src/app/(platform)/liga/**`
- `tests/unit/league-collective*.test.ts`
- `tests/e2e/league-collective*.spec.ts`

**Modelo proposto:**

- `league_seasons`
  - `id`
  - `company_id`
  - `name`
  - `starts_at`
  - `ends_at`
  - `status`
- `league_opt_ins`
  - `id`
  - `company_id`
  - `user_id`
  - `season_id`
  - `opted_in_at`
  - `revoked_at`
- `league_participation_events`
  - `id`
  - `company_id`
  - `user_id`
  - `season_id`
  - `source`
  - `event_type`
  - `occurred_at`
  - `revoked_at`
- `league_group_snapshots`
  - `id`
  - `company_id`
  - `season_id`
  - `cohort_key`
  - `participant_count`
  - `participation_band`
  - `generated_at`

**Regras:**

- Mostrar somente faixas coletivas quando coorte minima for atendida.
- Nao mostrar posicao individual.
- Nao mostrar nome de colaboradora.
- Nao usar dados legados de `user_leagues`, `custom_league_members`, pontos, XP, badges ou health scores.
- Nao usar Semaforo, NR-1, agenda, exames ou respostas sensiveis.
- Permitir revogacao e esconder efeitos futuros da pessoa.

### Gate 2 - Ranking competitivo nominal

**Status:** HARD HOLD.

So implementar se a decisao formal contrariar a recomendacao de v1 e aprovar ranking nominal.

**DoD adicional:**

- Documento de politica aprovado.
- Consentimento/opt-in versionado.
- Revogacao testada.
- Coorte minima testada.
- Formula publicada no produto.
- Exportacao DSAR inclui eventos e opt-ins.
- Teste prova que nenhuma fonte sensivel entra no score.
- Teste prova que usuario sem opt-in nao aparece.
- Teste prova que empresa B nao aparece para empresa A.
- Print desktop/mobile aprovado.

## Orquestracao Das Frentes

### Ordem recomendada

1. **P0 - Nao prometer operacionalidade indevida.** Atualizar qualquer material comercial para dizer "planejado/gated" enquanto os gates nao passam.
2. **P1 - Decisoes de contrato/governanca.** Fechar tres decision records: Concierge, Denuncias, Liga.
3. **P1 - Module entitlement sensivel.** Reaproveitar a governanca P8 sem permitir `enabled` acidental para sensiveis.
4. **P2 - Canal partner-managed.** Menor superficie operacional segura: configurar link/parceiro oficial sem receber relatos.
5. **P2 - Concierge piloto.** Caso administrativo basico, se contrato e owner operacional estiverem definidos.
6. **P2 - Liga coletiva.** Opt-in + faixas coletivas, sem ranking nominal.
7. **P3 - Ranking competitivo nominal.** Apenas se a politica formal aprovar; caso contrario manter fora do produto.

### Agentes/lotes sugeridos

**Agente A - Governance/contracts**

- Entregar decision records.
- Validar copy comercial.
- Marcar status PASS/HOLD por frente.

**Agente B - Concierge implementation**

- Trabalhar somente depois do Gate 0.
- Retornar diff, testes, prints e riscos.

**Agente C - Denuncias implementation**

- Comecar pelo caminho partner-managed.
- Nao abrir intake interno sem aprovacao explicita.

**Agente D - Liga/privacy implementation**

- Comecar por Liga coletiva.
- Manter ranking nominal em HOLD ate politica aprovada.

**Agente E - Independent review**

- Revisar diffs de cada wave.
- Rodar testes focados.
- Conferir que shells/gates antigos nao foram quebrados.

## Gates De Anti-Regressao

Executar antes de qualquer promocao:

```powershell
npm test -- --run tests/unit/module-shells.test.ts
npm test -- --run tests/unit/company-modules.test.ts
npm test -- --run tests/unit/privacy/gamification-api-containment.test.ts
npm test -- --run tests/unit/privacy/gamification-safe-projection.test.ts
npm test -- --run tests/unit/privacy/gamification-write-containment.test.ts
```

Executar antes de demonstracao visual:

```powershell
npm run build
npm run check:release-env
```

Evidencias visuais obrigatorias:

- `/concierge` bloqueado desktop/mobile.
- `/canal-denuncias` bloqueado ou parceiro desktop/mobile.
- `/liga` revisao/coletiva desktop/mobile.
- Perfil RH/Admin.
- Perfil Colaboradora.
- Perfil Lideranca, confirmando que nao ganhou acesso indevido.

## Findings Priorizados

### P0

Nenhum P0 tecnico novo encontrado nesta rodada de planejamento, desde que a copy comercial continue sem prometer Concierge operacional, Canal operacional ou ranking competitivo.

### P1

- **Concierge ainda nao e operacional.** Existe shell e gate, mas falta contrato, owner, modelo de dados, APIs, UI de caso, auditoria e testes.
- **Canal de Denuncias ainda nao e operacional.** Existe shell partner-managed, mas falta parceiro/link oficial ou decisao formal por intake interno.
- **Ranking competitivo esta bloqueado.** Endpoints legados retornam 410 e testes exigem quarentena.

### P2

- **Module management ainda e incompleto para operacao sensivel.** A governanca P8 existe, mas ativacao sensivel precisa de entitlement especifico e auditoria.
- **Evidencia visual precisa ser refeita apos qualquer implementacao.** Smoke tecnico nao aprova visual.

### P3

- **O nome "Liga" pode gerar expectativa de ranking.** A copy deve sempre explicar "experiencia coletiva opcional" enquanto ranking nominal estiver bloqueado.

## Recomendacao De Envio

**PASS para enviar como plano e status honesto.**

**HOLD para prometer operacionalidade dessas tres frentes.**

Pode enviar para a doutora que as frentes estao organizadas, bloqueadas com governanca e prontas para a proxima wave de decisao/implementacao. Nao enviar como se Concierge, Canal de Denuncias ou ranking competitivo ja estivessem prontos.

## Stop Condition

Parar aqui ate haver aprovacao explicita para implementar uma das lanes. A primeira implementacao recomendada e Canal de Denuncias partner-managed, porque entrega valor operacional com menor risco que receber relatos dentro da UniHER.
