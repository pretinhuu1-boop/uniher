# Relatório Executivo de Revisão de Segurança - Plataforma UniHER

**Destinatária:** Dra. Paola

**Data:** 31 de julho de 2026

**Período coordenado:** aproximadamente 04h32 às 13h25 (8h53)

**Ambiente:** plataforma UniHER e produção em `uniher.com.br`

**Classificação:** uso interno; este documento não contém senhas, tokens ou dados pessoais

## 1. Resumo executivo

Foi realizada uma revisão técnica aprofundada da segurança da plataforma UniHER, com foco em impedir acesso indevido a dados, escalada de privilégios, cruzamento de informações entre empresas e departamentos, reutilização de sessões antigas, exposição de credenciais e falhas de integridade em operações concorrentes.

A revisão começou em estado **HOLD**, pois foram identificadas vulnerabilidades críticas e altas no código e no processo de implantação. As correções foram implementadas em etapas, testadas e submetidas a revisões independentes. A liberação só ocorreu depois que a avaliação final retornou **PASS**, sem achados críticos (P0) ou altos (P1) pendentes dentro do escopo testado.

Não foi identificada exposição anônima de dados nas 65 rotas de leitura examinadas em produção. As credenciais administrativas e de demonstração conhecidas foram substituídas, as sessões correspondentes foram revogadas e a senha antiga deixou de corresponder a qualquer conta do banco de produção.

## 2. Objetivos da revisão

- Verificar se APIs públicas poderiam entregar dados privados ou operacionais.
- Impedir criação indevida de contas com privilégios administrativos.
- Garantir isolamento entre empresas, departamentos e perfis de acesso.
- Revogar sessões após bloqueio, exclusão, troca de senha ou alteração de permissão.
- Reforçar recuperação de senha, primeiro acesso, convites e rotação de tokens.
- Proteger informações de saúde e agenda contra reidentificação individual.
- Corrigir concorrência em pontuação, campanhas, desafios, uploads e operações administrativas.
- Remover credenciais previsíveis do código, dos testes e do processo de implantação.
- Atualizar dependências vulneráveis e validar a aplicação em desktop e celular.
- Preservar integralmente a landing page que já estava publicada.

## 3. Principais riscos encontrados e correções

| Área | Risco identificado | Medida aplicada | Situação final |
|---|---|---|---|
| Cadastro público | Possibilidade de solicitar privilégios acima do permitido | Cadastro público limitado a novo RH e nova empresa, sem escolha livre de papel administrativo | Corrigido |
| Sessões e autenticação | Tokens antigos poderiam continuar válidos após revogação ou troca de senha | Revalidação do usuário e da empresa no banco, versionamento de sessão e revogação de tokens antigos | Corrigido |
| Primeiro acesso e recuperação | Fluxos permitiam estados inconsistentes ou reutilização de credenciais temporárias | Troca obrigatória, links HTTPS confiáveis, consumo atômico e revogação das sessões anteriores | Corrigido |
| Empresas e departamentos | Leituras e gravações poderiam ultrapassar o escopo autorizado | Papel, empresa, departamento e estado do ator são revalidados dentro das transações | Corrigido |
| Convites | Exposição excessiva de dados e risco de abuso por tentativas repetidas | Escopo por departamento, e-mail mascarado, ausência de token bruto e limitação de tentativas | Corrigido |
| Agenda e saúde | Agregados pequenos poderiam permitir inferência sobre uma pessoa | Coorte mínima de cinco pessoas e cinco contribuintes distintos; nenhum evento individual é entregue ao gestor | Corrigido |
| Gamificação | Autoconcessão de pontos e crédito duplicado em concorrência | Pontuação calculada no servidor; operações atômicas e idempotentes | Corrigido |
| Uploads | Estouro de quota, tipo de arquivo inválido e inconsistência em falhas concorrentes | Validação de assinatura, reserva atômica de quota e compensação segura | Corrigido |
| Implantação | Seed de produção continha conta previsível e podia comprometer banco novo | Produção executa apenas migrações; seed não cria contas nem credenciais | Corrigido |
| Dependências | A análise inicial encontrou 26 ocorrências vulneráveis no grafo de pacotes | Atualizações controladas e testes de regressão | 0 vulnerabilidades no gate final |
| Credenciais | Senhas históricas permaneciam em arquivos rastreados e em contas existentes | Remoção do código atual, rotação de cinco contas e invalidação das sessões | Corrigido no estado atual |
| Infraestrutura | Risco de confiar em cabeçalhos de origem e de expor diretamente a aplicação | Nginx sobrescreve cabeçalhos; aplicação vinculada apenas a `127.0.0.1:3000` | Corrigido |

## 4. Evidências de validação

| Verificação | Resultado |
|---|---|
| Testes unitários | 256 de 256 aprovados |
| Testes E2E de autenticação, perfis e segurança | 131 de 131 aprovados |
| Casos visuais incluídos no E2E | 21 aprovados |
| Rotas GET examinadas anonimamente | 65 de 65 com comportamento esperado |
| Contratos de método isolados | 10 de 10 aprovados |
| Auditoria de dependências | 0 vulnerabilidades |
| Compilação TypeScript | Aprovada |
| Build de produção | Aprovado, com 132 rotas geradas |
| Integridade do banco em produção | `ok`, sem violações de chave estrangeira após reparo |
| Contas com credenciais rotacionadas | 5 |
| Contas ainda compatíveis com a senha antiga | 0 |
| Health check HTTPS | HTTP 200 com resposta mínima |
| Revisão final independente | PASS, sem P0/P1 |
| Revisão final por Claude | PASS, sem P0/P1 |

Os testes em produção foram deliberadamente não destrutivos: a auditoria pública utilizou leituras anônimas, e operações de escrita ofensivas permaneceram desabilitadas.

## 5. Situação em produção

- A plataforma está online em `https://uniher.com.br`.
- A aplicação está atrás do Nginx e não expõe diretamente a porta interna 3000.
- O banco de produção apresenta integridade válida e zero violações de chave estrangeira.
- Foram feitos backups antes da implantação e depois da rotação das credenciais, com permissões restritas.
- As cinco contas protegidas passaram por novo login, identificação da sessão e logout.
- A landing page foi preservada no código e validada por capturas em desktop e celular, sem erros de console.
- A área autenticada continua redirecionando visitantes sem sessão para a tela de login.

## 6. Riscos residuais e próximos passos

Os itens abaixo não bloquearam a liberação, mas devem permanecer no plano de manutenção:

1. Credenciais antigas ainda podem existir no histórico de objetos do Git, embora tenham sido removidas da versão atual e não correspondam mais a nenhuma senha de produção. A limpeza completa exige reescrita coordenada do histórico e novos clones.
2. O disco da VPS está em aproximadamente 90% de utilização e precisa de uma janela separada de limpeza e política de retenção.
3. O Nginx mantém um aviso não bloqueante de opções duplicadas para IPv6/HTTPS.
4. Permanecem observações P2 de baixo impacto sobre visualização administrativa de usuários excluídos logicamente, espera de uma fila de objetivos e um guardião exclusivo de desenvolvimento que já falha de forma fechada.
5. Recomenda-se monitoramento contínuo de dependências, logs de autenticação, uso de disco, tentativas de convite e eventos administrativos.

## 7. Limitações

Este trabalho foi uma revisão técnica de hardening com análise de código, testes automatizados, validação visual, auditoria de dependências e verificações controladas em produção. Ele não substitui um pentest externo independente, uma perícia de incidente, uma avaliação jurídica de LGPD ou certificação formal de segurança.

Também não se afirma que um sistema conectado à internet seja absolutamente invulnerável. A conclusão significa que, dentro do escopo e dos testes executados, os riscos críticos e altos encontrados foram corrigidos e não permaneceram exposições anônimas identificadas.

## 8. Conclusão

Ao final da revisão, a plataforma UniHER passou do estado **HOLD** para **PASS de produção**. Os controles centrais de autenticação, autorização, privacidade, isolamento entre empresas, integridade transacional, implantação e proteção de credenciais foram reforçados e validados com evidências reproduzíveis.

**Resultado final:** nenhum P0 ou P1 pendente no escopo revisado, produção operacional e landing page preservada.

---

**Registro técnico final:** commit `f43c0d1` na branch `codex/security-public-api-hardening`.

**Relatório técnico de evidências:** `docs/security/2026-07-31-public-api-hardening-audit.md`.
