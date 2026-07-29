# UniHER content upload and distribution audit

**Data:** 2026-07-28

**Status:** PASS para Comunidade editorial / PASS parcial para Campanhas / HOLD para painel de Educacao / PARTIAL para upload de midia

## Objetivo

Verificar se a plataforma ja permite colocar conteudos da Dra. Paola e distribui-los para as colaboradoras sem prometer capacidades que ainda nao estao integradas.

## Decisao executiva

O melhor canal pronto hoje para conteudo da Dra. Paola e **Comunidade > Gerenciar**:

- cria rascunho;
- valida titulo, resumo, corpo, tema, tempo de leitura, imagem local opcional e expiracao;
- publica somente se o feed da empresa estiver ativo;
- entrega o conteudo no feed da colaboradora por empresa;
- permite arquivar;
- registra auditoria de create/update/publish/archive sem gravar corpo do conteudo no receipt.

Campanhas funcionam como uma forma de distribuir acoes simples, com nome, tema, periodo, status e adesao da colaboradora. Elas nao sao um CMS de conteudo rico.

Educacao/licoes tem APIs reais para criar e distribuir licoes diarias, mas a tela de gestao visivel hoje esta bloqueada em revisao (`/gamificacao-config`). Portanto, nao deve ser vendido como painel pronto para a doutora subir aulas/licoes sozinha.

Upload de arquivo existe e e protegido para imagens, mas nao esta integrado ao editor de comunidade como seletor de arquivo. No estado atual, o editor aceita caminho local de imagem, nao upload direto de PDF, video, audio ou documento.

## Mapa de superficies

### 1. Comunidade editorial

**Status:** implementado e verificado.

Superficies:

- `src/app/(platform)/comunidade/gerenciar/page.tsx`
- `src/components/community/management/CommunityPostEditor.tsx`
- `src/app/api/rh/community/posts/route.ts`
- `src/app/api/rh/community/posts/[id]/route.ts`
- `src/app/api/collaborator/feed/route.ts`
- `src/repositories/community.repository.ts`
- `src/services/community.service.ts`

Capacidades verificadas:

- RH/Admin cria rascunho.
- RH/Admin publica quando o feed da empresa esta ativo.
- RH/Admin arquiva conteudo publicado.
- Master Admin precisa escolher empresa explicitamente.
- Colaboradora ve apenas conteudo publicado da propria empresa.
- Conteudo expirado, arquivado ou de outra empresa nao entra no feed.
- Suporte/salvar posts funciona com isolamento por empresa.
- A UI da colaboradora passou em mobile e desktop sem vazamento de identidade.

Limites:

- Corpo e texto simples; HTML e recusado.
- Imagem e um caminho local seguro iniciado por `/`.
- Nao ha upload direto de arquivo dentro do editor.
- O feed precisa estar ativo no Perfil da Empresa.

### 2. Campanhas

**Status:** implementado e verificado por testes focados; funcionalidade e simples.

Superficies:

- `src/app/(platform)/campanhas/page.tsx`
- `src/hooks/useCampaigns.ts`
- `src/app/api/campaigns/route.ts`
- `src/app/api/campaigns/[id]/route.ts`
- `src/app/api/campaigns/join/route.ts`
- `src/app/api/collaborator/campaigns/route.ts`
- `src/repositories/campaign.repository.ts`

Capacidades verificadas:

- RH/Admin cria campanha.
- RH altera status `next`, `active`, `done`.
- RH exclui campanha da propria empresa.
- Colaboradora lista campanhas da propria empresa e globais.
- Colaboradora adere apenas a campanha ativa e dentro do periodo.
- A adesao nao grava pontos/ranking e retorna estado neutro de gamificacao.

Limites:

- Campanha nao tem corpo editorial longo.
- Campanha nao tem anexos.
- Campanha nao dispara conteudo educacional automaticamente.
- Serve melhor como chamada/acao, nao como biblioteca de aulas.

### 3. Educacao / licoes diarias

**Status:** backend parcial; painel operacional em HOLD.

Superficies:

- `src/app/api/rh/lessons/route.ts`
- `src/app/api/rh/lessons/[id]/route.ts`
- `src/app/api/gamification/daily-lesson/route.ts`
- `src/components/gamification/DailyLesson.tsx`
- `src/app/(platform)/colaboradora/page.tsx`
- `src/app/(platform)/gamificacao-config/page.tsx`

Capacidades verificadas por codigo e testes de contencao:

- RH/Admin pode criar, listar, editar e excluir licoes por API.
- Licoes suportam tipos como `pilula`, `quiz`, `reflexao`, `imagem`, `historia`, `flashcard`, `desafio_dia`.
- Colaboradora recebe licao diaria em `/api/gamification/daily-lesson`.
- Conclusao de licao registra progresso sem XP/ranking.
- Conteudo sensivel de gamificacao legada continua contido.

Limites:

- A rota visual `/gamificacao-config` mostra "Gamificacao em revisao" e nao entrega o painel de licoes.
- Nao ha evidencia visual atual de RH/Admin subindo licao pelo app.
- Para a doutora usar sozinha, falta reativar/construir uma tela de Educacao separada da gamificacao legada.
- Nao prometer "aulas", "videos", "certificados" ou trilhas como prontas.

### 4. Upload de midia

**Status:** API existente e protegida; integracao editorial parcial.

Superficies:

- `src/app/api/upload/route.ts`
- `src/app/api/upload/logo/route.ts`
- `src/app/api/upload/avatar/route.ts`
- `src/lib/upload/index.ts`
- `src/app/(platform)/company-profile/page.tsx`

Capacidades verificadas:

- Upload aceita imagens `jpg`, `jpeg`, `png`, `webp`, `svg`.
- Limite por arquivo: 5 MB.
- Limite por usuario no endpoint geral: 50 MB.
- Valida extensao, MIME e magic bytes.
- Sanitiza nome do arquivo.
- Upload de logo esta integrado ao Perfil da Empresa.
- Testes de seguranca de path traversal passaram.

Limites:

- Nao aceita PDF, video, audio, DOCX/PPTX ou arquivos pesados.
- Nao esta integrado ao editor de Comunidade como botao de upload.
- O editor de Comunidade exige caminho local de imagem ja disponivel.
- Para subir materiais da doutora com imagem, o fluxo pratico atual ainda precisa de preparacao tecnica do asset em `public/`.

### 5. Notificacoes / alertas

**Status:** API implementada; nao foi rodada como fluxo end-to-end nesta auditoria.

Superficies:

- `src/app/api/admin/alerts/send/route.ts`
- `src/app/api/notifications/route.ts`
- `src/repositories/notification.repository.ts`

Capacidades por codigo:

- Admin/RH envia titulo e mensagem.
- Segmenta por empresa, departamento e papel.
- Tipos aceitos incluem `campaign` e `lesson`.
- Persiste notificacoes para destinatarias.
- Registra `admin_alerts` quando a tabela existe.
- Bloqueia RH de enviar para outra empresa ou para Admin Master global.

Limites:

- Nao e CMS; e aviso textual.
- Nao foi executado nesta rodada com teste focado de envio/recebimento.

## Evidencias executadas

```powershell
npm run test:unit -- tests/unit/community-api-lifecycle.test.ts tests/unit/community-repository.test.ts tests/unit/community-management-workspace.test.ts tests/unit/community-management-page.test.tsx tests/unit/community-company-setting-audit.test.ts tests/unit/community-company-identity-api.test.ts tests/unit/community-policy.test.ts tests/unit/campaign-join-security.test.ts
```

Resultado: PASS, 8 arquivos, 102 testes.

```powershell
npm run test:unit -- tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/wellbeing-events.test.ts
```

Resultado: PASS, 3 arquivos, 33 testes.

```powershell
cd tests; npx playwright test --config=playwright.config.ts --project=community-feed-ui
```

Resultado: PASS, 4 testes, viewports 375x812, 390x844, 768x900 e 1440x1000.

```powershell
cd tests; npx playwright test --config=playwright.config.ts --project=community-feed -g "creates safe draft|enforces ordered transitions|records body-free audit receipts|browser covers RH management states"
```

Resultado: PASS, 4 testes cobrindo draft, publish, archive, auditoria e workflow visual RH.

```powershell
cd tests; npx playwright test --config=playwright.config.ts --project=seguranca -g "Path traversal"
```

Resultado: PASS, 2 testes de upload/path traversal.

## Falha observada

```powershell
cd tests; npx playwright test --config=playwright.config.ts --project=community-feed --project=community-feed-ui
```

Resultado: FAIL parcial. 21 passaram, 1 falhou, 7 nao rodaram por interrupcao.

Falha:

- Teste: `company community feed > revalidates the active persisted editorial actor before writes`
- Esperado pelo teste: `403 EDITORIAL_ACTOR_FORBIDDEN`
- Recebido: `401 Token invalido ou expirado`

Classificacao: P2 / contrato de erro de teste ou middleware. O comportamento ainda falha fechado quando o usuario editorial e bloqueado; nao libera escrita. Como o fluxo principal de criar/publicar/arquivar passou em testes direcionados, isso nao bloqueia demonstrar Comunidade, mas bloqueia dizer que a suite completa de comunidade esta 100% verde.

## Findings

### P0

Nenhum P0 encontrado.

### P1

- **Painel de Educacao ainda nao esta pronto para a doutora operar sozinha.** As APIs existem, mas a tela visivel `/gamificacao-config` esta bloqueada por revisao.
- **Upload de materiais nao cobre PDF/video/audio/documentos.** Hoje e imagem pequena; conteudo rico precisa ser texto no editor, campanha simples ou asset tecnico local.

### P2

- **Suite Playwright completa de Comunidade tem divergencia `401` vs `403`.** Falha fechada, mas precisa alinhar teste ou middleware antes de declarar suite 100%.
- **Notificacoes segmentadas nao foram testadas end-to-end nesta rodada.** Codigo existe, mas falta comando focado de envio/recebimento para chamar de verificado.

### P3

- **Copy de Educacao pode confundir se misturar com gamificacao.** A proxima tela deveria se chamar Educacao/Conteudos, nao Gamificacao.

## Recomendacao

**PASS para colocar conteudos escritos da doutora via Comunidade editorial**, desde que o feed da empresa esteja ativo e os conteudos sejam texto simples com imagem local opcional.

**PASS parcial para distribuir campanhas e chamadas**, usando Campanhas e Notificacoes como apoio.

**HOLD para prometer que a doutora consegue subir qualquer material/aula/arquivo sozinha**, porque Educacao visual e upload de midia ainda estao parciais.

## Proxima wave recomendada

1. Criar uma tela real `Educacao / Conteudos` para RH/Admin, separada da gamificacao.
2. Integrar upload de imagem no editor de Comunidade e no futuro editor de Educacao.
3. Decidir se materiais da doutora incluem PDF/video/audio. Se sim, criar storage, limites, preview, permissao e auditoria proprios.
4. Adicionar teste focado para `POST /api/admin/alerts/send` e leitura em `/api/notifications`.
5. Resolver a divergencia de Playwright `401` vs `403` na comunidade.
