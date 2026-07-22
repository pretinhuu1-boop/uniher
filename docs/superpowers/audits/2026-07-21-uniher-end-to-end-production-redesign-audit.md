# Auditoria ponta a ponta - producao x redesign UniHER

**Data:** 2026-07-21

**Escopo:** plataforma interna autenticada, desktop e mobile

**Producao canonica:** `https://uniher.axialagents.com/`

**Redesign auditado:** branch `codex/uniher-wave3-collaborator-nr1`, commit `d90147f4b5b433adce59c5917ed15efcd8809123`

**PR:** `https://github.com/pretinhuu1-boop/uniher/pull/3`

## Decisao executiva

O redesign possui uma fundacao tecnica consistente e uma parte relevante dos fluxos administrativos, RH, colaboradora, comunidade e responsividade ja funciona. Ele ainda nao pode ser apresentado como reformulacao integral concluida nem como modulo NR-1 de producao.

Os principais motivos sao:

1. o NR-1 atual e um scaffold de demonstracao com 11 `QUESTION` obrigatorias e 1 `ELEMENT`, nao a definicao dinamica do formulario Yavix; o relato de 72 perguntas ainda precisa ser reconciliado com o payload real, enquanto o manual documenta codigos `1..120` sem confirmar uma contagem exata;
2. a integracao Yavix real, a persistencia duravel, o scoring/laudo e a cadeia de evidencias GRO/PGR nao estao implementados;
3. Semaforo, Objetivos, Desafios, Conquistas e Liga permanecem em placeholder ou bloqueio deliberado;
4. Admin Empresa e RH compartilham o mesmo papel tecnico, e a Lideranca ainda recebe rotas/copy parcialmente herdadas de RH;
5. a producao canonica nao tem `/avaliacao-nr1` e possui dados insuficientes para demonstrar todos os perfis reais.

**Status geral:** `PARCIAL / NAO PROMOVIVEL COMO PLATAFORMA FINAL`.

## Fontes de verdade

| Prioridade | Fonte | Uso nesta auditoria |
| --- | --- | --- |
| 1 | Ata e transcricao da reuniao de 15/07/2026 | Arquitetura de produto, prioridade NR-1, tres areas da colaboradora e limites dos add-ons |
| 2 | Originais Yavix recuperados e documentacao consolidada no repositorio | Contrato COPSOQ41, fluxo de oito passos, `QUESTION` x `ELEMENT`, autenticacao e bloqueios de scoring |
| 3 | Producao canonica publicada | Comportamento atualmente demonstravel ao cliente |
| 4 | Codigo, banco, testes e runtime do redesign | Estado real de implementacao, autorizacao, persistencia e cobertura |
| 5 | Imagens aprovadas desktop/mobile | Direcao visual, nao prova de funcionalidade |

Documentos Yavix usados:

- `docs/INTEGRACAO_YAVIX_NR1.md`
- `docs/specs/SPEC_YAVIX_COPSOQ_PROXY.md`
- `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`
- `docs/superpowers/audits/2026-07-21-yavix-copsoq41-source-audit.md`

Os originais `form-response-flow.html` e `Yavix-Modelo_1_Cadastros.xlsx` foram recuperados do grupo `Uniher | Yavix` e lidos integralmente. O HTML mostra uma pergunta apenas como exemplo, indica `... ate 120 perguntas` e aceita `code` em `1..120`; a planilha possui apenas as abas de provisionamento `Empresas` e `Funcionarios`. Nenhum dos dois contem os 72 enunciados ou confirma uma contagem final. O numero 72 foi informado pela stakeholder e permanece **requisito de negocio a reconciliar**. A definicao tecnica real vem dinamicamente de `GET /form/COPSOQ41`; somente itens `QUESTION` entram na completude. Quantidade, textos e opcoes finais dependem de um payload autenticado versionado, com hash e identificador do formulario.

## Producao online observada em 21/07/2026

Esta secao registra observacao externa feita no navegador autenticado durante a auditoria. Ela nao e reproduzivel apenas pelo worktree. Antes de virar evidencia de release, deve receber um recibo versionado com URL, data/hora, release SHA, status HTTP, perfil redigido e screenshots sem PII.

| Item | Resultado |
| --- | --- |
| Landing e autenticacao | Funcionam em `uniher.axialagents.com` |
| Admin Master | Login funcional e painel `/admin` acessivel |
| NR-1 | `/avaliacao-nr1` retorna 404 |
| Base demonstravel | Apenas dois usuarios de empresa, ambos no perfil Admin Empresa |
| RH, Lideranca e Colaboradora | Nao ha massa real suficiente na producao para auditoria completa por perfil |
| `uniher.vercel.app` | Landing antiga/diferente; nao e a producao canonica desta auditoria |

A limitacao de dados da producao nao foi tratada como aprovacao implicita. Onde nao havia perfil real, o comportamento foi auditado pelo codigo, testes e runtime isolado do redesign.

## Perfis e autorizacao

O produto fala em cinco perfis operacionais, mas o codigo possui quatro valores de `role`. A autorizacao real depende da combinacao `role + isMasterAdmin + companyId + also_collaborator`, e nao apenas de `role`:

| Perfil operacional | Papel tecnico atual | Estado |
| --- | --- | --- |
| Admin Master UniHER | `admin` + `isMasterAdmin` | Funcional, com gaps pontuais |
| Admin Empresa | `rh` ou `admin` nao-master com `companyId`, conforme a superficie | Contrato inconsistente; precisa ser unificado |
| RH | `rh` | Funcional, com superficies pendentes |
| Lideranca | `lideranca` | Parcial; herda copy/acoes de RH em algumas rotas |
| Colaboradora | `colaboradora` | Parcial; jornada principal e comunidade funcionam, cinco superficies nao |

### Findings de autorizacao

| ID | Severidade | Finding | Impacto |
| --- | --- | --- | --- |
| AUTH-01 | P1 | `/avaliacao-nr1` nao aplica guard de capability/entitlement na pagina | A rota direta ignora o cadeado visual |
| AUTH-02 | P1 | Conflito de contrato: a spec proxy aceita colaboradora/lideranca, enquanto a spec visual posterior trata a jornada como exclusiva da colaboradora | Produto deve decidir o respondente autorizado e alinhar pagina, quatro APIs e testes negativos |
| AUTH-03 | P1 | `saveAnswer` e `submit` nao revalidam aceite do termo | O consentimento pode ser contornado via API |
| AUTH-04 | P1 | `GET /api/company` usa apenas `withAuth` e pode expor CNPJ, contatos e estatisticas a qualquer perfil autenticado com empresa; a pagina nao tem guard proprio | Restringir a RH/admin ou criar projecao minima separada, com testes de rota direta |
| AUTH-05 | P2 | Admin Empresa possui representacoes tecnicas concorrentes (`rh` e `admin` nao-master) | Impede uma matriz de permissoes coerente sem decisao formal |

## Inventario funcional do redesign

### Admin Master

| Rota/superficie | Estado | Gap principal |
| --- | --- | --- |
| `/admin` | Funcional | Baseline visual precisava ser atualizada apos Wave 4 |
| `/comunidade/gerenciar` | Funcional | Manter tenant isolation e feed desligado por padrao |
| `/analytics-emails` | Parcial | Visao chamada global ainda exige `companyId` |
| Notificacoes | Funcional | Sem gap bloqueante encontrado |
| Configuracoes | Parcial | Cobertura visual/estados incompleta |

### Admin Empresa / RH

| Rota/superficie | Estado | Gap principal |
| --- | --- | --- |
| `/dashboard` | Funcional | Consolidar nova IA e estados visuais finais |
| `/colaboradoras-gestao` | Funcional | Validar mobile e massa real |
| `/departamentos` | Funcional | Validar mobile e estados vazios/erro |
| `/convites` | Funcional | Validar ciclo real de convite e expiracao |
| `/campanhas` | Funcional | Revisao visual final e cadencia editorial |
| `/comunidade/gerenciar` | Funcional | Wave 4 concluida |
| `/company-profile` | Funcional/parcial | Separar permissoes de Admin Empresa e RH |
| `/desafios/gerenciar` | Placeholder | Depende do ledger elegivel e contrato de desafios |
| `/gamificacao-config` | Placeholder/contido | Nao reativar pontos ou dados sensiveis legados |
| `/historico` | Bloqueado `410` | Depende do novo ledger elegivel |

### Lideranca

| Rota/superficie | Estado | Gap principal |
| --- | --- | --- |
| `/dashboard` | Parcial | Copy ainda diz RH e oferece acao de convite fora da navegacao de Lideranca |
| `/campanhas` | Parcial | Experiencia se comporta como participacao de colaboradora e refresh e incompleto |
| Notificacoes | Funcional | Sem gap bloqueante encontrado |
| Configuracoes | Parcial | Cobertura visual/estados incompleta |

### Colaboradora

| Area/rota | Estado | Gap principal |
| --- | --- | --- |
| `/colaboradora` | Parcial forte | Home, check-in, streak e missoes existem; IA final ainda nao esta consolidada nas tres areas |
| `/comunidade` | Funcional | Feed editorial por empresa entregue na Wave 4 |
| `/agenda` | Funcional | Integrar visualmente em Saude Primaria |
| `/campanhas` | Funcional | Reposicionar como hub Educacao/conteudo |
| `/avaliacao-nr1` | Scaffold controlado | 11 perguntas, mock, sem laudo e sem integracao real |
| `/semaforo` | Placeholder contido | Contrato clinico/privacidade e armazenamento privado pendentes |
| `/objetivos` | Placeholder contido | Depende do ledger de participacao elegivel |
| `/desafios` | Placeholder contido | Depende do ledger e catalogo seguro da empresa |
| `/conquistas` | Placeholder contido | Depende de Objetivos/Desafios e marcos privados |
| `/liga` | Bloqueado | Politica de ranking, opt-in e nao identificacao pendentes |

## Paridade com a reuniao da Doutora

| Requisito | Estado no redesign | Decisao |
| --- | --- | --- |
| Tres areas: Saude Primaria, Educacao e Conquistas | Parcial | Consolidar navegacao e destinos existentes |
| Saude Primaria: check-in/check-out | Parcial | Check-in existe; check-out/protocolo diario nao esta fechado |
| Semaforo da Saude | Placeholder | Implementar como auto-relato privado e nao diagnostico apos gate clinico |
| Agenda de exames | Funcional/parcial | Integrar na nova IA e revisar jornada completa |
| Concierge com cadeado por empresa | Scaffold/entitlement visual | Falta operacao por caso, papel, consentimento e auditoria |
| Educacao como hub separado | Parcial forte | Conteudo existe; falta hub/catalogo/trilhas/cadencia final |
| Conquistas agrupando objetivos, desafios, recompensas e classificacao | Parcial/contido | Reprojetar sobre ledger nao sensivel; Liga fica separadamente bloqueada |
| NR-1 como porta de entrada | Scaffold | Prioridade maxima; nao vendavel como conformidade atual |
| Viva SIPAT | Ausente | Add-on exige spec proprio |
| Desenvolvimento Humano | Ausente como modulo | Add-on exige decisao de produto |
| Canal de Denuncia | Ausente | Dominio sensivel separado; nao cabe como tela simples |

## Auditoria NR-1 completa

### Contagem e contrato

- Mock atual: 11 itens `QUESTION` obrigatorios, codigos 2..12.
- Item informativo: 1 `ELEMENT`, codigo 1.
- Total renderizado no scaffold: 12 itens.
- Requisito operacional informado pela stakeholder nesta missao: 72 perguntas, em conflito ainda nao reconciliado com a fonte tecnica.
- Manual Yavix original: definicao dinamica, exemplo de uma pergunta, indicacao `ate 120 perguntas` e codigos aceitos em `1..120`; nao confirma contagem exata.
- XLSX Yavix original: somente cadastros de empresas e funcionarios; nao contem banco de perguntas.
- Fonte tecnica correta: payload versionado de `GET /form/COPSOQ41`.

### Findings NR-1

| ID | Severidade | Finding | Correcao exigida |
| --- | --- | --- | --- |
| NR1-01 | P0 | O manual define formulario dinamico e faixa `1..120`, mas nao confirma a quantidade nem o conteudo do formulario ativo | Armazenar payload real, hash e versao; testar exatamente a contagem de `QUESTION` recebida e reconciliar formalmente qualquer divergencia com as 72 informadas pela stakeholder |
| NR1-02 | P0 | Integracao real e persistencia duravel ausentes | Implementar proxy server-side, servico Yavix, sessao/answer durable e retomada |
| NR1-03 | P0 | Nao existe scoring, resultado, laudo ou agregado seguro | Obter endpoint/matriz oficial e construir ciclo tecnico NR-1/GRO/PGR |
| NR1-04 | P1 | Consentimento pode ser contornado | Validar termo no bootstrap, save e submit; gravar recibo transacional e revogavel |
| NR1-05 | P1 | Entitlement e guard apenas visuais | Enforce de capability/empresa/papel em pagina e todas as APIs |
| NR1-06 | P1 | Autosave pode perder a ultima resposta | Flush antes de navegar/submit; chave de sessao escopada por usuario/empresa/formulario |
| NR1-07 | P2 | Nao ha E2E completo do NR-1 | Cobrir dinamicamente todos os `QUESTION` do fixture oficial versionado, alem de retomada, consentimento, entitlement, submit, resultado e reinicio |
| NR1-08 | P2 | Migration legada ainda menciona XP/badge | Remover ou neutralizar sem reativar gamificacao sensivel |

Responder um questionario, isoladamente, nao fecha a gestao de riscos. Inventario, avaliacao tecnica, plano de acao, responsaveis, prazos, eficacia e evidencias do GRO/PGR formam uma proposta de governanca para a entrega e devem ser validados por SST/juridico antes de se tornarem requisito regulatorio afirmado pela plataforma. Agregacao anonima e supressao de grupos pequenos permanecem gates de privacidade.

## Dados e persistencia

| Dominio | Persistencia | Estado |
| --- | --- | --- |
| Usuarios, empresas, departamentos, convites | SQLite | Duravel |
| Campanhas, agenda, notificacoes e preferencias | SQLite | Duravel |
| Check-ins | SQLite | Duravel, sujeito a regras de privacidade existentes |
| Comunidade | SQLite | Duravel e escopada por empresa |
| NR-1 | `Map` em memoria no mock | Nao duravel |
| Historico elegivel, objetivos, desafios, conquistas | Nao implementado | Waves 5-8 |
| Semaforo v2 privado | Nao implementado | Wave 9 |
| Liga v2 | Nao implementado | Wave 10 bloqueada |

## Verificacao tecnica

| Check | Resultado |
| --- | --- |
| Unitarios executados em 21/07 no HEAD `d90147f` | PASS - 52 arquivos / 472 testes |
| TypeScript executado em 21/07 no HEAD `d90147f` | PASS - `npx tsc --noEmit` |
| Build executado em 21/07 no HEAD `d90147f` | PASS - 137 paginas/rotas; warning NFT conhecido |
| Playwright completo executado em 21/07 no HEAD `d90147f` | 179/180; unico erro foi diff de baseline visual desktop Admin |
| Causa do diff | Mudanca intencional da Wave 4 no menu Admin (`Gerenciar comunidade`) |
| Correcao integrada | Baseline desktop regenerada; projeto `platform-foundation`, teste focado 1/1 PASS; versionada no commit `36d5e16` |
| Playwright completo apos a correcao, em 21/07 | PASS - 180/180 em 3,3 minutos; teardown removeu 8 usuarios e 6 empresas de teste |
| Recibo versionado | `docs/superpowers/audits/2026-07-21-uniher-playwright-regression-receipt.md` |
| Warning conhecido | NFT tracing do Turbopack em `next.config.ts` / rota admin ops; nao falha o build |

## Findings consolidados por prioridade

### P0 - bloqueiam a promessa final

1. Quantidade/conteudo NR-1 sem payload autenticado versionado; o manual confirma faixa `1..120`, nao contagem exata, e 72 permanece requisito da stakeholder a reconciliar.
2. Integracao Yavix real sem autenticacao server-side confirmada.
3. Scoring/laudo/resultados agregados nao documentados nem implementados.
4. Cinco superficies principais ainda em placeholder/bloqueio.

### P1 - bloqueiam producao segura

1. Consentimento e entitlement NR-1 nao enforced em todas as camadas.
2. Papel Lideranca e separacao Admin Empresa/RH incompletos.
3. Autosave/retomada NR-1 podem perder estado.
4. Matriz visual por rota/perfil/estado ainda incompleta.
5. Concierge nao possui papel operacional, fila por empresa/caso ou trilha de auditoria. Para a release do nucleo, a disposicao formal e entregar somente entitlement fechado; a operacao completa sera um produto futuro, nao finding aberto desta release.

### P2 - divida controlada

1. Baselines e cobertura visual precisam acompanhar cada wave.
2. Rotas funcionais legadas ainda usam padroes visuais mistos.
3. Add-ons nao possuem specs executaveis.
4. Warning de NFT tracing permanece conhecido.

## Gate de promocao

A plataforma so pode ser chamada de **reformulacao concluida** quando:

- todas as rotas da matriz por perfil tiverem estado funcional, negado ou bloqueado intencionalmente, nunca placeholder acidental;
- NR-1 usar exatamente todos os `QUESTION` do contrato Yavix versionado, sem quantidade hardcoded, com divergencia frente ao requisito de 72 formalmente resolvida, alem de consentimento, retomada, submit e resultado;
- RH receber apenas agregados permitidos e nunca respostas individuais;
- Waves 5-9 passarem seus gates; Liga tiver decisao formal ou permanecer explicitamente fora do pacote final;
- a matriz E2E desktop/mobile cobrir 375, 390, 768 e 1440 px, sem overflow ou sobreposicao;
- unitarios, TypeScript, build, Playwright, privacidade, tenant isolation e revisao independente estiverem verdes;
- a producao tiver massa de demonstracao controlada para todos os perfis.

## Conclusao

O redesign esta em uma base recuperavel e tecnicamente melhor que a producao, mas o gap mostrado na reuniao foi real: varias secoes nao abriram porque ainda sao placeholders deliberados, e o NR-1 nao estava completo porque o scaffold foi construido apenas para validar fluxo e visual. O roadmap associado transforma esses gaps em uma sequencia executavel e estabelece uma data externa honesta, sem promover mock como produto final.
