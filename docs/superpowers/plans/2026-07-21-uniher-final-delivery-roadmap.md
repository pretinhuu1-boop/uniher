# Roadmap final de entrega - reformulacao UniHER

**Versao:** 2, revisada apos auditoria independente

**Data-base:** 2026-07-21

**Checkpoint funcional:** 2026-08-14

**Release candidate integral:** 2026-09-04

**Entrega final estimada para a Doutora:** 2026-09-18

**Natureza da data:** estimativa condicional, confirmavel em 2026-07-27

## Compromisso de entrega

A estimativa defensavel para o nucleo autenticado reformulado e **18/09/2026**. O plano reserva **08 a 11/09** para UAT sobre um candidato completo e **14 a 17/09** para estabilizacao, go/no-go e preparacao da producao.

O primeiro checkpoint funcional ocorre em **14/08/2026**. Ele demonstra somente o que tiver passado gate. Sem o payload oficial Yavix, o NR-1 desse checkpoint mostra o motor de jornada com dados sinteticos, rotulado como `nao-Yavix`, `nao-laudo` e sem alegar 72 perguntas ou paridade oficial.

Em **04/09/2026** deve existir um release candidate integral dentro do escopo cujos gates externos tenham passado. Essa data nao e entrega externa: ela antecede o UAT formal.

## Premissas de capacidade

A data de 18/09 so pode ser confirmada em 27/07 se, ate 24/07, houver:

| Capacidade minima assumida | Disponibilidade |
| --- | --- |
| 1 coordenador tecnico | 100% durante toda a execucao |
| 2 engenheiros full-stack | 100% de 27/07 a 18/09, com write sets disjuntos |
| 1 QA independente | 50% ate 14/08 e 100% de 17/08 a 18/09 |
| Produto/UX | SLA de um dia util para decisoes e aceite visual |
| DPO/juridico e SST | SLA de um dia util para gates nomeados |
| Yavix/Paula | contato tecnico disponivel para sandbox, payload e resultados |
| Doutora e signatarios de UAT | disponibilidade confirmada entre 08 e 11/09 |

Os nomes, disponibilidade e substitutos devem ser preenchidos em um RACI ate 24/07. Se a capacidade real for menor, o coordenador publica replanejamento em 27/07; a data nao deve ser comunicada como compromisso antes disso.

## Escopo da estimativa final

### Incluido no nucleo

- shell desktop/mobile e navegacao por perfil;
- Admin Master, Admin Empresa, RH, Lideranca e Colaboradora com capabilities testadas;
- Saude Primaria com ciclo diario aprovado, Agenda, Semaforo privado e entrada do Concierge por entitlement;
- Educacao organizada a partir de campanhas/conteudos existentes;
- Comunidade editorial por empresa;
- Conquistas com Objetivos, Desafios e marcos privados sobre ledger elegivel;
- NR-1 real apenas se quantidade, conteudo, autenticacao, consentimento e resultado forem confirmados;
- massa sintetica/anonimizada de demonstracao e UAT por perfil;
- deploy, rollback, backup, monitoramento e evidencias de release.

### Fora do nucleo

- operacao completa do Concierge por casos;
- Viva SIPAT como produto completo;
- Desenvolvimento Humano/PDI;
- Canal de Denuncia;
- Liga com ranking nominal ou coletivo.

Esses itens podem aparecer com entitlement fechado, mas nao sao findings abertos do nucleo e nao devem ser declarados implementados sem dominio, governanca e testes proprios.

## Insumos externos com prazo 24/07

| ID | Insumo | Dono externo | Consequencia se faltar |
| --- | --- | --- | --- |
| EXT-01 | Payload versionado de `GET /form/COPSOQ41`, com hash, versao, quantidade de `QUESTION`, textos e opcoes | Yavix/Paula | Nao se afirma 72 nem paridade; checkpoint usa somente fixture sintetico |
| EXT-02 | Sandbox, tenant, credenciais e autenticacao server-side | Yavix | Proxy permanece em mock e NR-1 real sai do release candidate |
| EXT-03 | Endpoint ou matriz oficial de scoring/laudo e agregados | Yavix/SST | Resultado NR-1 e dashboard RH ficam fora do release candidate |
| EXT-04 | Consentimento, base legal, retencao, remocao e revogacao | UniHER/DPO/juridico | NR-1 e Semaforo nao promovem para producao |
| EXT-05 | Grupos minimos, supressao e audiencia dos resultados | UniHER/SST/DPO | Agregados RH permanecem bloqueados |
| EXT-06 | Respondente autorizado: somente colaboradora ou colaboradora/lideranca | Produto UniHER | Spec, quatro APIs e testes NR-1 nao podem ser alinhados definitivamente |

Bloqueios externos nao paralisam dominios independentes, mas deslocam a data da **reformulacao concluida** quando atingem um item incluido no nucleo. Uma release reduzida pode ser aprovada separadamente, com exclusoes assinadas, mas nunca recebe o rotulo de reformulacao concluida e nunca mascara o bloqueio com scaffold.

## Caminho critico

As Waves 5-9 possuem migrations e dependencias de dados. Elas executam serialmente. Pesquisa, specs, revisao e front sem persistencia compartilhada podem ocorrer em paralelo, mas nenhuma wave dependente promove antes da anterior.

| ID canonico | Datas | Entrega | Gate de saida |
| --- | --- | --- | --- |
| R0 | 21-24/07 | Contratos, RACI, matriz de perfis/rotas e insumos Yavix | Premissas versionadas; nenhum texto inventado |
| R1 | 27-29/07 | `/api/company`, Admin Empresa/RH, Lideranca e decisao de respondente NR-1 | Capabilities e testes negativos por papel/tenant; arquivos NR-1 reservados ao owner de R2 |
| R2 | 27/07-07/08 | Motor NR-1, paginacao, autosave, retomada, submit e estados | E2E no fixture; paridade numerica somente se EXT-01 chegou |
| Wave 5 | 30/07-04/08 | Ledger elegivel, DSAR, retencao, exclusao e isolamento | Nenhuma fonte sensivel ou legada aceita |
| Wave 6 | 05-10/08 | Objetivos pessoais | Self-only, idempotencia e historico privado |
| Wave 7 | 11-14/08 | Desafios da empresa | Adesao voluntaria e nenhum progresso individual para RH |
| Wave 8 | 17-19/08 | Conquistas privadas | Somente eventos elegiveis; emissao/revogacao auditaveis |
| R6 | 20-24/08 | Implementacao de Educacao, IA final e check-out | Child specs/plans aprovados e estimados ate 14/08; ciclo diario e hub testados |
| Wave 9 | 25-28/08 | Semaforo privado, somente se EXT-04 e gate clinico passaram | Self-only, exclusao, nao diagnostico e zero escalacao automatica |
| R7 | 27/07-21/08 pesquisa/adaptadores; 31/08-02/09 persistencia e integracao | Integracao Yavix real; merge/migration serializados apos Wave 9 | Sandbox, sessao, resultado, agregados e scorecard independente validados |
| RC | 04/09 | Candidato integral do escopo aprovado congelado | Zero P0/P1/P2; somente P3 aceito com owner e data |
| UAT | 08-11/09 | Roteiro completo dos cinco perfis em desktop/mobile | Aceite formal de Produto, Doutora, DPO/SST nos dominios aplicaveis |
| Release | 14-18/09 | Correcoes, backup, deploy, smoke, monitoramento e handoff | Go/no-go assinado e producao verificada |

`R2` possui ownership exclusivo das paginas, APIs, hooks, servicos e testes NR-1. `R1` apenas congela a decisao de respondente e altera superficies nao-NR-1. `R7` pode pesquisar e implementar adaptadores isolados em paralelo; qualquer persistencia compartilhada entra na fila serial do coordenador. O intervalo de 03-04/09 e reservado ao scorecard independente e congelamento do RC.

## Trilhas e responsabilidades

| Trilha | Responsavel a nomear | Responsabilidade |
| --- | --- | --- |
| Coordenacao e integracao | Coordenador tecnico | Branch, migrations, gates, evidencias, PR e promocao |
| Produto/UX | Produto UniHER + designer | IA, copy, estados, jornada mobile e aceite visual |
| NR-1/Yavix | Engenheiro de integracao | Proxy, sessao, respostas, scoring e observabilidade |
| Privacidade/SST | DPO/juridico + SST | Consentimento, agregacao, supressao, retencao e escopo regulatorio |
| Plataforma | Engenheiros full-stack | Perfis, rotas, ledger e Waves 5-9 |
| QA independente | Revisor sem contexto de implementacao | Seguranca, E2E, visual, acessibilidade e regressao |

## Contrato de cada onda

Toda onda produz:

1. spec textual aprovada;
2. write set, dependencias e migration definidos;
3. teste falhando antes da implementacao dos comportamentos criticos;
4. implementacao e fixtures sinteticos/anonimizados idempotentes;
5. unitarios, TypeScript e build;
6. E2E desktop/mobile com screenshots reais;
7. revisao independente de codigo, privacidade e visual;
8. scorecard PASS/FAIL, drift e proxima onda;
9. commit isolado e atualizacao do PR existente.

Educacao, IA final e check-out exigem child specs/plans aprovados, revisados e estimados ate 14/08; sem esse Definition of Ready, o calendario completo e replanejado. Esses itens nao podem ser silenciosamente removidos e ainda permitir o rotulo de reformulacao concluida.

## Definition of Done

### NR-1

- [ ] Payload oficial armazenado com hash, versao e contagem de `QUESTION`/`ELEMENT`.
- [ ] Se o payload contiver 72 `QUESTION`, teste de paridade exige exatamente 72; caso contrario, a divergencia volta para Produto/Yavix.
- [ ] `ELEMENT` nao conta no progresso.
- [ ] Consentimento enforced antes de bootstrap, answer e submit, com recibo transacional e revogavel.
- [ ] Autosave descarrega a ultima resposta antes de navegar/submit.
- [ ] Retomada no mesmo e em outro dispositivo e implementada e comprovada por E2E.
- [ ] Sessao e respostas persistidas por tenant, usuario e versao do formulario.
- [ ] Resultado/scoring oficial recebido ou calculado por matriz formalmente aprovada.
- [ ] RH visualiza apenas agregados permitidos; respostas individuais ficam inacessiveis.
- [ ] Artefatos de governanca GRO/PGR so sao rotulados como regulatorios apos validacao SST/juridica.

### Ledger, Objetivos, Desafios e Conquistas

- [ ] Ledger aceita somente produtores internos e eventos allowlisted; saude, NR-1, Semaforo e tabelas legadas falham fechado.
- [ ] Retencao, DSAR, hard delete ou excecao aprovada e recibo sem identificador estao testados.
- [ ] Objetivos sao self-only, monotonicamente idempotentes, arquivaveis e sem pontos/ranking.
- [ ] Desafios sao voluntarios; RH nao le nomes nem progresso individual; saida/revogacao e auditavel.
- [ ] Conquistas sao privadas, deterministicas, revogaveis e derivadas apenas do ledger elegivel.
- [ ] Nenhuma wave le ou escreve points, levels, league, badges, health_scores ou progresso legado.

### Semaforo

- [ ] Auto-relato self-only e nao diagnostico, com copy aprovada clinicamente.
- [ ] Consentimento, retencao, exclusao e historico privado testados.
- [ ] RH, Lideranca, Admin Empresa e Master nao conseguem ler o dado individual.
- [ ] Nenhuma escalacao automatica nem integracao com ledger, NR-1, Comunidade ou Liga.

### Educacao, check-out e perfis

- [ ] Hub Educacao tem catalogo, estados e navegacao definidos em child spec.
- [ ] Check-out fecha o ciclo diario conforme contrato aprovado, sem inferir diagnostico ou recompensa sensivel.
- [ ] Admin Master nao exige `companyId` indevido.
- [ ] A representacao de Admin Empresa/RH e congelada em R0 e possui matriz explicita de capabilities e testes negativos, mesmo que compartilhem o mesmo valor tecnico de `role`.
- [ ] Lideranca nao recebe copy, CTA, rota ou dado exclusivo de RH.
- [ ] Add-ons nao contratados exibem entitlement e falham fechado na API.

### Mobile e visual

- [ ] Viewports 375x812, 390x844, 768x1024 e 1440x900.
- [ ] Sem overflow, sobreposicao ou conteudo sob navegacao fixa.
- [ ] Loading, vazio, erro, negado, bloqueado e sucesso por rota relevante.
- [ ] Ativos de marca UniHER aprovados; dados de pessoa/empresa sao sinteticos ou anonimizados, sem PII hardcoded.
- [ ] Baselines mudam somente com diff intencional documentado e revisao visual.

## Gate de producao

| Camada | Verificacao |
| --- | --- |
| Estatistica | `npx tsc --noEmit` |
| Unidade | Suite completa, incluindo payload, consentimento, ledger e tenant |
| Dependencias | `npm audit` com zero vulnerabilidades, conforme a regra atual do projeto |
| Contrato | OpenAPI e docs autenticadas alinhadas ao runtime |
| Build | `npm run build` |
| Seguranca | capabilities, tenant isolation, IDOR, CSRF, rotas diretas e pentest focado |
| Privacidade | supressao, DSAR, exclusao, revogacao e nao exposicao individual |
| E2E | login e jornada completa dos cinco perfis operacionais |
| Visual | screenshots desktop/mobile por rota e estado |
| Dados | backup e restore testado antes das migrations de producao |
| Operacao | health, logs, alertas, monitoramento, rollback e runbook |
| Producao | smoke autenticado por perfil com fixtures controlados |

## UAT formal

O UAT usa o release candidate congelado em 04/09. O roteiro deve nomear participantes e signatarios, cobrir cinco perfis, quatro viewports, estados de erro/negado/bloqueado, jornada NR-1 aplicavel, isolamento por empresa e exclusao/retomada. P0/P1/P2 reprova o candidato. P3 so e aceito com responsavel, data e disposicao registrada.

## Marcos para comunicar

| Marco | Data | Mensagem honesta |
| --- | --- | --- |
| M1 | 24/07 | Contratos, RACI, insumos e bloqueios avaliados |
| M2 | 27/07 | Data final confirmada ou replanejada conforme capacidade/insumos |
| M3 | 14/08 | Checkpoint funcional; NR-1 oficial somente se EXT-01 chegou |
| M4 | 04/09 | Release candidate do escopo aprovado congelado para UAT |
| M5 | 11/09 | UAT concluido e go/no-go preparado |
| M6 | 18/09 | Entrega final estimada apos estabilizacao e validacao de producao |

## Mensagem recomendada para a Doutora

> A estimativa para concluir o nucleo autenticado reformulado da UniHER e 18 de setembro de 2026, com checkpoint funcional em 14 de agosto e candidato completo do escopo aprovado para validacao em 4 de setembro. O NR-1 so sera apresentado como integracao real, com a quantidade oficial de perguntas e resultados, depois de validarmos o payload Yavix, o ambiente de homologacao, a autenticacao server-side, o scoring/laudo e as regras de consentimento, retencao, agregacao e supressao. Esses insumos e a capacidade da equipe precisam ser confirmados ate 24 de julho; em 27 de julho comunicaremos a confirmacao ou o impacto no calendario. Sem o payload oficial, a demonstracao mostrara apenas o motor da jornada com dados sinteticos, claramente identificado como nao-Yavix e nao-laudo.

## Estado inicial

| Item | Estado em 21/07 |
| --- | --- |
| Wave 4 Comunidade | PASS / promovida |
| Baseline visual Admin | Regenerada; teste focado 1/1 e Playwright completo 180/180 PASS; entra neste pacote |
| Waves 5-8 | Planejadas; migrations executam serialmente |
| Educacao/IA/check-out | Child specs/plans obrigatorios antes de `R6` |
| Wave 9 Semaforo | Aguardando gate clinico/privacidade |
| Wave 10 Liga | Fora do nucleo; decisao legal/produto separada |
| NR-1 real | Bloqueado por payload, auth, scoring e gates juridicos |
| PR | Draft existente; unica linha de integracao |

## Change control

- Qualquer P0/P1/P2 impede promocao de uma wave e da reformulacao concluida.
- P3 so segue com responsavel, data e disposicao formal.
- Atraso externo em item do nucleo desloca a data da reformulacao concluida. Uma release reduzida exige decisao separada e lista publica de exclusoes; nao autoriza mock como produto final.
- Mudanca de capacidade, escopo ou dependencia atualiza a versao do roadmap e exige nova revisao independente.
- A proxima revisao obrigatoria e 27/07/2026.
