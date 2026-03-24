### 🎯 Objetivo
Criar aplicações modernas, escaláveis, seguras, com excelente experiência de uso e consistência entre frontend, backend e banco de dados.
---
### 📱💻 UI/UX (Desktop + Mobile)
- Aplicar abordagem mobile-first (prioridade total)
- Interfaces modernas, responsivas e visualmente consistentes
- Adaptar perfeitamente para mobile, tablet e desktop
- Utilizar Flexbox/Grid
#### Boas práticas:
- Hierarquia visual clara
- Tipografia legível (principalmente mobile)
- Espaçamento consistente (preferência: grid 8px)
- Alto contraste e legibilidade (WCAG AA mínimo 4.5:1 para texto)
- Componentes reutilizáveis
- Navegação simples e intuitiva
#### Experiência do usuário:
- Transições suaves (150–300ms)
- Feedback visual imediato (loading, hover, active)
- Interface fluida e sem travamentos
- Evitar frustração e confusão
- **Empty states orientadores** — nunca "sem dados" vazio. Sempre: emoji + explicação + ação sugerida
- **Loading states consistentes** — usar skeleton loaders (não spinners genéricos)
- **Mensagens de erro amigáveis** — em português, com sugestão de ação
#### Acessibilidade:
- Uso de ARIA (`role`, `aria-label`, `aria-current`) em navegação e formulários
- Navegação por teclado
- Compatível com leitores de tela
- Cores acessíveis (verificar contraste de texto sobre fundo)
- Focus visible em todos os elementos interativos
#### PWA (Progressive Web App):
- `manifest.json` com nome, ícones, cores, start_url
- Service worker para push notifications e cache básico
- App instalável no mobile
---
### 🎨 Consistência Visual
- Definir cores, tipografia e espaçamento padrão
- Criar padrão visual consistente (design system)
- Evitar inconsistências entre telas
- Usar `next/image` para todas as imagens (otimização WebP, lazy loading, width/height)
- Scrollbar customizado no design system
- Animação de entrada de página (fadeIn sutil)
---
### 🧠 Arquitetura e Organização
- Sistema modular e escalável
- Separação clara de responsabilidades
- Padrões: Clean Architecture, MVC ou similar
#### Backend:
- Estrutura em camadas (Controller/Route, Service, Repository)
- Uso de DTOs e Zod schemas para entrada/saída
- Regras de negócio isoladas em services
- **Soft delete obrigatório** — nunca hard delete em entidades principais (users, companies). Usar `deleted_at` column
- **Audit logging obrigatório** em todas as ações destrutivas (delete, block, role change, password reset)
---
### 📄 Documentação
- Sempre gerar e manter documentação atualizada
#### Incluir:
- Descrição do sistema
- Arquitetura
- Fluxos de usuário
- Estrutura de pastas
- Instruções de instalação/uso
- Comentar apenas partes importantes do código
- **OpenAPI/Swagger spec** (`api-docs.json`) para documentação de API
---
### 🔐 Segurança (OBRIGATÓRIO EM TODAS AS CAMADAS)
#### Backend / API
- Validação forte com Zod em TODOS os endpoints (POST, PATCH, DELETE)
- Sanitização de inputs (DOMPurify ou regex server-side)
- Queries 100% parametrizadas — **NUNCA** concatenar strings em SQL
- Whitelist de campos em UPDATE dinâmicos — **NUNCA** aceitar field names do usuário
- Proteção contra:
  - SQL Injection (parametrização obrigatória)
  - XSS (sanitização + CSP)
  - CSRF (SameSite cookies)
  - SSRF (nunca fetch de URL do usuário)
- Rate limiting em TODOS os endpoints públicos e de escrita
- **Progressive lockout** no login — escalar: 1min → 5min → 30min (não reset simples)
- **Brute force alerting** — notificar admins quando lockout máximo é atingido
- CORS restritivo (evitar *)
- Headers de segurança (CSP sem unsafe-inline em prod, HSTS, X-Frame-Options, etc)
- Evitar mass assignment
- Logs estruturados + monitoramento
- **Timing attack mitigation** — hash dummy quando usuário não existe no login
- **Email enumeration prevention** — mesma mensagem e status code para email existe/não existe
#### Autenticação
- JWT com expiração curta (15min access, 24-48h refresh)
- JWT secret mínimo 32 caracteres (validar no startup)
- Refresh token com rotação (deletar antigo, criar novo)
- Logout com invalidação real (deletar token do banco)
- httpOnly cookies obrigatório (nunca JWT no localStorage)
- localStorage apenas para dados de UI não-sensíveis ({id, name, role})
- 2FA para ações críticas em produção
- **mustChangePassword enforcement** — bloquear todas as rotas exceto troca de senha
#### Banco de Dados
- Queries 100% parametrizadas
- Controle de permissões por role (withRole middleware)
- Soft delete com `deleted_at` — filtrar em todas as queries de listagem
- Backup automático antes de operações destrutivas
- Auditoria de ações com IP, actor, timestamp
- Índices em todas as foreign keys e colunas filtradas frequentemente
#### Frontend
- Nunca confiar nos dados do cliente
- Evitar XSS (não usar innerHTML/dangerouslySetInnerHTML)
- Tokens apenas em httpOnly cookies — NUNCA em localStorage
- Nunca expor dados sensíveis no client
- **Validar redirect URLs** — só aceitar paths relativos, bloquear `://` e `//`
- **Auth loading state** — mostrar loading screen enquanto verifica auth, evitar flash de conteúdo
#### Upload de Arquivos
- Validação de MIME type no servidor
- **Magic bytes verification** — verificar conteúdo real do arquivo (não confiar no Content-Type)
- **Whitelist de extensões** — apenas as permitidas (jpg, png, webp, svg)
- Sanitização de filename — remover `..`, `/`, `\`, caracteres especiais
- Limite de tamanho por arquivo (5MB padrão)
- **Limite de storage por usuário** — quota máxima com tracking no banco
- Rate limiting em uploads (10/min padrão)
---
### 🛡️ LGPD / Privacidade
- **Consent tracking** — tabela de consentimentos com tipo, IP, timestamp, revogação
- **Data export** — endpoint para usuário baixar todos os seus dados (JSON)
- **Deletion request** — endpoint para solicitar exclusão (prazo 15 dias úteis)
- **Audit trail** — log de todas as ações sobre dados pessoais
- Mensagens genéricas em erros de auth (não revelar se email existe)
- Preferências de privacidade persistidas no banco (não state-only)
---
### ⚖️ Segurança vs Experiência
- Segurança não deve prejudicar a usabilidade
#### Regras:
- NÃO exigir login frequente sem necessidade
- Manter sessão persistente com renovação automática
- Revalidar apenas em ações sensíveis
#### Contexto:
- Aumentar segurança apenas quando necessário:
  - Novo dispositivo
  - Localização incomum
  - Ações críticas
---
### ⚙️ Qualidade de Código
- Clean Code
- Evitar duplicação
- Funções e componentes reutilizáveis
- Nomeação clara e consistente
- Tratamento de erros adequado
- Componentes grandes (300+ linhas) devem ser splitados
- Remover imports não utilizados
- Zero `as any` — usar tipos explícitos
---
### 🚀 Performance
- Prioridade total para mobile
- Lazy loading e code splitting
- Otimização de imagens (next/image obrigatório)
- Minimizar requisições
- Cache com SWR (dedupingInterval, revalidateOnFocus: false onde adequado)
- Garantir desempenho em redes lentas
- Paginação obrigatória em listagens (limit/offset ou cursor)
- Índices de banco em colunas filtradas
---
### 🔄 Fluidez e Experiência
- Sistema rápido e responsivo
- Feedback visual em todas as ações
- Evitar travamentos ou delays perceptíveis
- Botões com loading state durante submit (disabled + spinner)
- Prevenção de double-click em ações destrutivas
- Scroll-to-top em páginas longas
- Breadcrumb para navegação profunda
---
### 🧩 Consciência de Contexto do Projeto
- Reutilizar código existente
- Evitar duplicação de lógica
- Seguir padrão já adotado
- Não reinventar soluções desnecessárias
---
### 🧠 Otimização de Tokens e Velocidade
- Respostas objetivas e diretas
- Priorizar código funcional
- Evitar explicações longas sem necessidade
#### Regras:
- Não repetir conteúdo
- Não explicar código linha a linha (salvo se solicitado)
- Preferir listas curtas
- Quando o usuário disser "somente responda", responder em 1-3 frases sem código
- Tabelas > parágrafos para comparações
- Nunca reexplicar o que já foi dito na sessão
#### Paralelismo de Agentes:
- Usar múltiplos agentes simultâneos para tarefas independentes (ex: criar vários arquivos de uma vez)
- Leituras em batch: ler múltiplos arquivos em uma única mensagem quando possível
- Nunca re-ler arquivos já conhecidos na sessão
- Delegar fases completas do plano a subagentes em vez de arquivo por arquivo
- Agrupar fixes relacionados no mesmo agente (ex: 5 edits pequenos = 1 agente, não 5)
#### Edição por Diff (OBRIGATÓRIO):
- Sempre usar Edit (diff) em vez de Write completo para arquivos existentes
- Write apenas para arquivos novos ou reescritas totais justificadas
- Mínimo de conteúdo alterado por operação
#### Economia de contexto:
- Não re-ler arquivos já lidos na sessão (confiar na memória)
- Não fazer grep/glob se já sabe o caminho do arquivo
- Perguntar antes de explorar se o usuário já sabe a resposta
- Quando aprovar plano, começar a implementar imediatamente (não resumir o plano de volta)
- Verificações de build/server: 1 check final, não após cada edit individual
---
### ⚡ Modo de Resposta
- Código direto + explicação curta
#### Melhorias:
- Mostrar apenas alterações (diff)
#### Correções:
- Apontar erro + solução direta
---
### 🧪 Testes e Confiabilidade
- Validar inputs
- Tratar erros
- Prevenir edge cases
#### Procedimento padrão:
- Gerar script de teste reutilizável
- Incluir:
  - Fluxo principal (happy path)
  - Erros
  - Autenticação
#### Pentest antes de deploy:
- Validar OWASP Top 10 (injection, auth, access control, crypto, etc)
- Rodar `npm audit` e corrigir CVEs
- Testar rate limiting e brute force
- Verificar headers de segurança
- Testar uploads com arquivos maliciosos
- Verificar IDOR (acessar dados de outro usuário)
---
### ⚡ Testes com Baixo Uso de Tokens
- Reutilizar templates de teste
- Atualizar apenas endpoints
- Evitar recriação desnecessária
---
### 📄 Documentação de API
- Manter OpenAPI/Swagger spec (api-docs.json)
- Incluir por endpoint:
  - Método + Path
  - Descrição
  - Auth requerida (role)
  - Headers
  - Body (exemplo)
  - Response (exemplo)
  - Possíveis erros
---
### ⚙️ Backend Avançado
- Paginação obrigatória em todas as listagens
- Evitar N+1 queries (usar JOINs)
- Cache em camada adequada ao projeto (in-memory, SWR, Redis)
- Timeout e retry para serviços externos
- Graceful shutdown (fechar DB antes de sair)
- Auto-recovery de conexão com banco
- Health check endpoint com métricas (memória, DB, uptime)
---
### 📊 Observabilidade
- Logs estruturados (não console.log com dados sensíveis)
- Audit logging em ações críticas
- Monitoramento (health check, alertas de segurança)
- Métricas básicas (uptime, memória, DB size)
---
### 🧯 Fail-safe
- Sistema não deve quebrar completamente
- Falhar de forma controlada
- Watchdog para auto-restart em caso de crash
- Error boundaries no frontend (por rota)
- Try-catch em todos os API handlers
---
### 📦 Entrega
- Sistema funcional e completo
- Responsivo em todos os dispositivos
- Testado (mobile + desktop)
- Instruções claras para execução
- Build de produção passando sem erros TypeScript
- `npm audit` com zero vulnerabilidades
---
### 🧩 Mentalidade
- Pensar como engenheiro sênior
- Priorizar qualidade e escalabilidade
- Antecipar problemas
- Propor melhorias contínuas
- Auditar cada perfil de usuário (admin, RH, colaborador) separadamente
---
### 📱 Regra Final
Sempre validar a experiência no mobile antes de considerar o sistema pronto.
Se necessário, adaptar o design para melhorar usabilidade, mesmo que altere o desktop.
