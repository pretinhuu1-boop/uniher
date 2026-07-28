# UniHER - plano de liberacao para producao

Data: 2026-07-28
Host auditado: `https://www.uniher.com.br`
Branch live: `codex/uniher-wave3-collaborator-nr1`
HEAD live: `cc4f95e`

## Decisao

**PASS para producao controlada da plataforma autenticada base.**

**HOLD para chamar a plataforma inteira de produto final completo.** Ainda existem modulos sensiveis em shell/gate, uma tela de gestao de gamificacao em revisao, aprovacao visual humana pendente e 26 vulnerabilidades no `npm audit` atual, incluindo 8 altas.

## Evidencia verificada nesta rodada

- `www.uniher.com.br/api/health`: healthy.
- VPS `srv1373909`: `HEAD=cc4f95e`.
- `npm run check:release-env` no host: PASS 8, HOLD 0, FAIL 0.
- Smoke autenticado por perfil: Admin, RH e Colaboradora responderam 200 nas rotas de menu auditadas.
- Smoke de Lideranca no host live: HOLD nesta auditoria. A conta esperada `lideranca.visual@eduardaeyurimarketingltda.com.br` nao existe no banco live; contas QA de lideranca existem, mas nao autenticaram com a senha padrao de homologacao.
- Semaforo privado: live em `/semaforo`, sem badge "Bloqueado" no link da rota, com formulario e exclusao disponiveis.
- `npm audit --audit-level=high --json`: 26 vulnerabilidades, 8 high, 16 moderate, 2 low.

## Pode liberar como producao controlada agora

| Area | Estado | Condicao de liberacao |
| --- | --- | --- |
| Auth/login/logout/sessao | Liberavel | Manter preflight de release e smoke por perfil antes de novos deploys. |
| Plataforma autenticada por perfis | Liberavel parcial | Admin, RH e Colaboradora navegaveis no host live. Lideranca fica fora da promessa de liberacao imediata ate existir conta validada e smoke dedicado. |
| Dashboard RH/Admin agregado | Liberavel | Apenas indicadores agregados/protegidos; nao prometer dado individual sensivel. |
| Gestao RH operacional | Liberavel | Colaboradoras, departamentos, convites, perfil da empresa e notificacoes. |
| Campanhas/educacao | Liberavel | Pode ser vendido como campanhas e conteudos; manter join e tenant gates. |
| Comunidade editorial | Liberavel | Feed/conteudo sem comentarios, ranking ou dados de saude. |
| Check-in/check-out e bem-estar privado | Liberavel | Uso pessoal da colaboradora; sem leitura individual por empresa. |
| Agenda pessoal de exames | Liberavel | Uso pessoal; RH/Admin nao recebem historico individual. |
| Objetivos pessoais | Liberavel | Privado, voluntario, sem pontuacao competitiva. |
| Desafios da empresa | Liberavel controlado | Voluntario e sem Liga/ranking; evitar linguagem de competicao. |
| Conquistas privadas | Liberavel controlado | Derivadas de eventos elegiveis; sem raridade/ranking/publicidade. |
| Semaforo privado | Liberavel controlado | Auto-relato privado, nao diagnostico, sem acesso RH/Admin/lideranca. |

## Pode ficar visivel como preview honesto

Politica anti-finding: preview honesto pode ficar visivel em demo/roadmap. Para producao de cliente real, ocultar modulos gated por `visible=0` ou restringir a Admin/RH enquanto nao houver contrato, conteudo ou parceiro aprovado. Nao deixar a colaboradora final encontrar muitos modulos bloqueados sem contexto comercial.

| Modulo | Estado atual | Copy permitida |
| --- | --- | --- |
| Concierge | Shell de contrato pendente | "Modulo planejado/reservado, aguardando contrato e fluxo operacional." |
| NR-1/Yavix | Gate `requires_contract` | "Preparado para integracao contratual; nao operacional ainda." |
| SIPAT | Shell bloqueado por fonte de conteudo | "Modulo previsto; aguardando conteudo fonte aprovado." |
| Desenvolvimento Humano | Modulo futuro | "Roadmap/futuro; nao operacional." |
| Canal de Denuncias | Partner-managed pendente | "Modulo parceiro planejado; ainda sem canal oficial configurado." |
| Liga | Revisao de privacidade | "Experiencia coletiva em estudo; ranking nominal bloqueado." |
| Produtos e Modulos | Shell admin em preparacao | "Controle administrativo em preparacao; nao usar como painel final de billing/entitlement." |

## Bloqueantes para producao completa

### P0 - Nao ativar sem gate externo

- NR-1/Yavix real: falta contrato/API/sandbox/auth/provisionamento/resultados/governanca. Nao ativar `enabled` em producao sem pacote formal.
- Canal de Denuncias interno: nao criar intake interno sem decisao juridica/DPO, anonimato, retencao, acesso por comite e auditoria.
- Concierge clinico/psicossocial/SST: nao operar sem owner, SLA, escopo de responsabilidade, emergencia e contrato.
- Ranking competitivo nominal: manter em HOLD ate politica formal de opt-in, revogacao, coorte minima e fontes permitidas.

### P1 - Antes de declarar "producao madura"

- Corrigir/triagear supply chain: `next`, `postcss`, `sharp`, `undici`, `vite`, `ws`, `brace-expansion`, `fast-uri` aparecem entre vulnerabilidades high.
- Reexecutar smoke visual completo desktop/mobile/tablet/wide no host live depois de qualquer upgrade.
- Criar/resetar conta de Lideranca demonstravel e fazer smoke dedicado no host live antes de incluir Lideranca na promessa da release.
- Revisar copy comercial para nao prometer modulos gated como operacionais.
- Criar runbook de rollback/backup/restore e monitoramento pos-deploy.

### P2 - Produto/UX

- Trocar termos "contrato seguro" em telas funcionais privadas, quando o detector comercial puder confundir com modulo pendente.
- Revisar visual humano com Dra. Paola: smoke tecnico nao substitui aceite de produto.
- Decidir se `primary_health` deve continuar `locked` para empresa enquanto Semaforo privado esta liberado para colaboradora. Recomendacao: sim, ate existir saude primaria corporativa agregada aprovada.

## Plano de waves

### Wave 0 - Congelar release controlado

Objetivo: estabilizar o que ja esta live.

Gates:
- `npm run check:release-env` no host.
- `curl https://www.uniher.com.br/api/health`.
- Smoke autenticado Admin/RH/Colaboradora para liberacao imediata.
- Smoke autenticado Lideranca antes de qualquer demo/release que cite Lideranca como perfil liberado.
- Screenshots desktop/mobile das rotas principais.
- Backup DB antes de qualquer novo deploy.

Resultado esperado: producao controlada mantida sem ampliar escopo sensivel.

### Wave 1 - Hardening de dependencias

Objetivo: remover o bloqueante de supply chain.

Allowlist:
- `package.json`
- `package-lock.json`
- testes afetados por upgrades
- scorecard de security

Gates:
- `npm audit --audit-level=high`.
- `npm test -- --run` em suites unitarias focadas.
- `npx tsc --noEmit --pretty false`.
- `npm run build`.
- Smoke visual live ou staging apos deploy.

DoD: zero high ou justificativa formal assinada para excecoes.

### Wave 2 - Visual/product acceptance

Objetivo: transformar "tecnicamente live" em "aprovado para mostrar".

Gates:
- Matriz visual Admin/RH/Lideranca/Colaboradora.
- Mobile e desktop.
- Checklist de copy: sem promessas clinicas, legais, ranking, laudo ou modulo gated.
- Aceite humano.

DoD: lista de telas aprovadas e lista de telas escondidas/preview.

### Wave 3 - Liberar modulo partner-managed de Denuncias

Objetivo: primeiro modulo gated com menor risco operacional.

Recomendacao: configurar link/parceiro oficial; nao receber relato dentro da UniHER nesta v1.

Gates:
- parceiro/link oficial aprovado;
- logs sem parametros sensiveis;
- RH/Admin ve configuracao, nao relatos;
- colaboradora acessa canal externo oficial;
- prints e testes RBAC.

### Wave 4 - Concierge piloto

Objetivo: operacionalizar casos simples somente se contrato e owner existirem.

Gates:
- decisao: administrativo, clinico, SST ou hibrido;
- owner/SLA/horario/escalonamento;
- modelo de caso e auditoria;
- tenant isolation;
- sem puxar Semaforo, NR-1, agenda, exames ou historico de saude.

### Wave 5 - Liga coletiva segura

Objetivo: substituir "Liga em revisao" por experiencia coletiva nao nominal.

Gates:
- opt-in;
- revogacao;
- coorte minima;
- sem ranking nominal;
- fontes elegiveis sem dados sensiveis;
- DSAR;
- prints e testes de privacy containment.

### Wave 6 - NR-1/Yavix real

Objetivo: so depois de resposta oficial/contrato Yavix.

Gates:
- auth/service token/SSO oficial;
- provisioning oficial;
- payloads e resultados oficiais;
- consentimento NR-1;
- LGPD/DPO/SST;
- fail-closed mantido;
- testes com sandbox ou ambiente contratado.

## Ordem recomendada

1. Manter live controlado atual.
2. Corrigir fixture/smoke de Lideranca ou remover Lideranca da narrativa comercial imediata.
3. Definir politica de visibilidade para modulos gated em cliente real: demo visivel, producao real preferencialmente oculto.
4. Hardening de dependencias.
5. Visual/product acceptance.
6. Denuncias partner-managed.
7. Concierge piloto.
8. Liga coletiva.
9. NR-1/Yavix real.

## Checklist anti-finding para a liberacao imediata

- Nao dizer "plataforma completa" sem a palavra "controlada".
- Nao citar Lideranca como perfil liberado ate o smoke live passar.
- Nao mostrar modulos gated para cliente real sem explicar que sao roadmap/preview; preferir ocultar em uso final.
- Nao prometer NR-1/Yavix, laudo, scoring, GRO/PGR, Concierge, Denuncias, SIPAT, Desenvolvimento Humano ou Liga/ranking como operacionais.
- Nao usar `/gamificacao-config` como prova de gestao pronta; a tela ainda esta em revisao.
- Nao promover release madura enquanto houver 8 vulnerabilidades high sem correcao ou excecao formal.
- Anexar evidencia de health, release-env, smoke autenticado e screenshots ao pacote de liberacao.

## Stop conditions

- Qualquer falha em auth, tenant isolation, DSAR, health, build ou typecheck: nao promover.
- Qualquer modulo sensivel sem contrato/governanca: manter preview ou oculto.
- Qualquer upgrade com regressao visual mobile/desktop: HOLD.
- Qualquer promessa comercial maior que a evidencia tecnica: ajustar copy antes da demo.
