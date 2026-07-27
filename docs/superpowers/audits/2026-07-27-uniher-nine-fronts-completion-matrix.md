# UniHER - Matriz de Conclusao por 9 Frentes

Data da auditoria: 2026-07-27
Janela considerada: 2026-07-06 a 2026-07-27
Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
Modo: auditoria read-only coordenada por 9 agentes; sem implementacao, sem reset/stash/checkout, sem commit.

## Decisao Executiva

**PASS limitado para envio comercial P0 ate 2026-07-28 as 10h**, desde que o material diga claramente que a UniHER esta como plataforma autenticada navegavel, com modulos sensiveis chaveados/bloqueados.

**HOLD para declarar produto concluido, producao aprovada, compliance NR-1/Yavix, laudo, scoring, SIPAT operacional, Concierge operacional, Canal de Denuncias funcional, Desenvolvimento Humano entregue, Liga/ranking/recompensas ou aprovacao visual final da Dra. Paola.**

## Matriz por Frente

| Frente | Status para demo/envio controlado | Status para conclusao operacional | O que falta para concluir |
| --- | --- | --- | --- |
| 1. Visual/sidebar/menu | PASS limitado | HOLD | Recapturar screenshots atuais pos-remocao de numeros; validar Admin/RH/colaboradora desktop/mobile; fechar destinos/copy de Objetivos, Desafios, Educacao RH e Produtos/Modulos. |
| 2. Autenticacao/papeis/tenant | PARCIAL | HOLD | Corrigir refresh/session revocation; criar matriz canonica de papeis; fechar tenant isolation em APIs diretas; adicionar testes negativos. |
| 3. RH/Admin/dashboard/operacional | PARCIAL | HOLD | Corrigir falha de contrato CSS; decidir semantica de `dashboard?section`; validar rotas operacionais RH/Admin; revisar P8 antes de prometer gestao de modulos. |
| 4. Colaboradora/wellbeing/agenda | PASS limitado | HOLD | Corrigir idempotencia check-in legado vs wellbeing; validar POST da agenda; expor Objetivos/Desafios ou assumir como subarea; smoke visual fresco. |
| 5. Comunidade/educacao/campanhas | PARCIAL | HOLD | Validar `campaignId` contra empresa/status no join; decidir Educacao RH; baixar copy de trilhas/videoaulas/agendas; alinhar lifecycle de campanhas. |
| 6. Objetivos/desafios/conquistas/gamificacao | PASS limitado | HOLD para Liga/ranking | Manter conquistas privadas; nao ativar Liga/ranking/rewards sem politica formal, opt-in, supressao, auditoria e aprovacao produto/legal. |
| 7. NR-1/Yavix/COPSOQ | CHAVEADO | HOLD | Contrato/API real Yavix, SSO/service-token, endpoint de resultado/scoring, CPF/GHE/ciclos, matriz validada, laudo e governanca LGPD/GRO/PGR. |
| 8. Modulos sensiveis/P8 | CHAVEADO | HOLD | SIPAT, Concierge, DH e Denuncias precisam fonte/contrato/parceiro; Produtos/Modulos precisa mutacao Master Admin-only, auditoria e UI real. |
| 9. Testes/smoke/deploy/evidencia | PASS tecnico local | HOLD para prod | Congelar revisao candidata; revisar diff; rerodar build/typecheck/unit/smoke; validar URL final, env/secrets, contas demo e aprovacao visual humana. |

## P0-P3 Priorizado

### P0

- Refresh/session revocation incompleta: login bloqueia alguns estados, mas refresh pode reemitir token sem repetir todos os checks de usuario ativo, deletado/bloqueado/aprovado e empresa ativa.
- Nao declarar deploy/producao concluido sem URL final, env real e smoke prod/prod-like.
- NR-1/Yavix real nao existe: sem endpoint de resultados/scoring, matriz oficial e auth B2B/SSO, nao ha laudo, scoring ou conformidade NR-1.

### P1

- APIs de tenant/papel ainda amplas: `/api/company`, convites, lideranca e alguns writes precisam controles negativos e escopo por empresa.
- Campanhas: adesao precisa validar empresa, status ativo e elegibilidade antes de inserir participacao.
- P8/Produtos e Modulos nao e operacional: ha read API/helper/shell, mas nao ha mutacao aprovada, UI real, auditoria especifica ou autorizacao Master Admin completa.
- Evidencia visual do sidebar conflita em timestamp com a correcao de numeros; precisa recaptura.
- Educacao RH, Produtos/Modulos, Objetivos e Desafios precisam destino/copy governados para nao prometer coisa inexistente.

### P2

- Agenda `POST` valida menos que `PATCH`.
- Dashboard por `section` parece alias visual, nao tela dedicada comprovada.
- Campanhas tem lifecycle inconsistente entre criar, atualizar e excluir.
- Modelo de dados NR-1 ainda nao suporta CPF, GHE, unidade, ciclos, lideranca direta e agregacao por laudo.
- Worktree esta suja/ahead; pacote formal precisa diff review e allowlist.

### P3

- Consolidar uma pasta/indice unico de evidencias para reduzir risco de envio errado.
- Documentar mais nitidamente: mock, shell, gate, parcial e operacional.
- Melhorar polimento de Agenda e rotas operacionais antes da aprovacao final.

## O Que Pode Ser Prometido

- Plataforma autenticada navegavel por perfis.
- Sidebar/menu reorganizado para Colaboradora, RH/Admin Empresa, Admin Master e Lideranca.
- Dashboard agregado protegido e sem promessa de dado individual de saude.
- Check-in/check-out privado e agenda pessoal da colaboradora em escopo limitado.
- Comunidade privada curada por empresa, com apoio agregado e nomes somente com consentimento.
- Objetivos, desafios e conquistas privados em escopo de colaboradora.
- Modulos sensiveis visiveis como shells/gates/chaves: SIPAT, NR-1/Yavix, Concierge, Desenvolvimento Humano, Canal de Denuncias, Semaforo e Liga.
- Evidencia tecnica local recente com 60/60 telas PASS e matriz visual ampla 184/184 PASS, sem tratar isso como aprovacao visual final.

## O Que Nao Pode Ser Prometido

- Producao/deploy aprovado.
- Aprovacao visual final da Dra. Paola.
- NR-1/Yavix operacional, conforme, com laudo, scoring COPSOQ, GRO/PGR ou validade juridica.
- Semaforo clinico ativo, triagem, diagnostico ou score individual.
- Concierge operacional com casos/SLA.
- SIPAT operacional com conteudo aprovado.
- Canal de Denuncias funcional com recebimento, inbox, parceiro, confidencialidade e retencao.
- Desenvolvimento Humano entregue com trilhas/conteudos.
- Liga, ranking, recompensas, badges publicos ou recomendacao gamificada.
- Tenant isolation completa ou revogacao imediata de sessao sem corrigir os P0/P1.

## Menor Caminho Ate 2026-07-28 10h

1. Preparar material da Dra. Paola como **demonstavel em revisao**, nao como produto final aprovado.
2. Congelar uma revisao candidata e revisar o diff/allowlist do que entra no pacote.
3. Recapturar screenshots essenciais: Admin Master, RH/Admin Empresa, Colaboradora e Lideranca, desktop/mobile.
4. Rerodar build, typecheck, suites focadas e smoke visual no pacote congelado.
5. Corrigir ou marcar explicitamente os P0/P1 que ficarem fora do pacote como "proxima etapa" ou "bloqueado por contrato".
6. Manter SIPAT e NR-1/Yavix chaveados/bloqueados; isso esta correto para o envio, desde que nao sejam vendidos como operacionais.

## Evidencias Principais

- `docs/superpowers/evidence/screen-smoke-2026-07-27-final/screen-smoke-report.md`: 60/60 PASS.
- `docs/superpowers/evidence/screen-smoke-2026-07-27-final/final-visual-review.md`: PASS tecnico do escopo corrigido.
- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md`: 184/184 PASS.
- `docs/superpowers/audits/2026-07-27-uniher-sidebar-route-map.md`: mapa atual de rotas/menu.
- `docs/superpowers/audits/2026-07-27-uniher-three-week-client-readiness-audit.md`: auditoria executiva para envio.
- Suites focadas executadas pelos agentes: dashboard agregado 5 arquivos/41 testes PASS; gamificacao privada 9 arquivos/66 testes PASS; wellbeing/agenda 6 arquivos/33 testes PASS; modulos/shells/navegacao 7 arquivos/67 testes PASS; NR-1/module guards 6 arquivos/56 testes PASS.
