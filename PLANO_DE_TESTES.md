# UniHER — Plano de Testes de Homologação

---

## 1. MASTER ADMIN

### Login & Acesso
- [ ] Login com `admin@uniher.com.br` / `Admin@2026`
- [ ] Redirect para `/admin` após login
- [ ] Acessar `/colaboradora` → redireciona para `/admin`
- [ ] Logout → cookies limpos → redirect para `/auth`
- [ ] Login com senha errada → mensagem genérica + rate limit após 5 tentativas

### Painel — Visão Geral
- [ ] KPIs mostram dados reais (empresas, usuárias, campanhas, DB)
- [ ] Empresas recentes listadas com plano correto
- [ ] Empty state se não houver empresas

### Painel — Empresas
- [ ] Criar empresa (nome, CNPJ, setor, plano, contato)
- [ ] Editar empresa
- [ ] Soft delete empresa → some da lista mas não apaga do banco
- [ ] Ver usuários da empresa
- [ ] Bloquear/desbloquear usuário de uma empresa
- [ ] Reset de senha → modal com botão "Copiar" persistente

### Painel — Usuários
- [ ] Listar todos os usuários (paginado)
- [ ] Buscar por nome/email
- [ ] Filtrar por role, status
- [ ] Bloquear/desbloquear
- [ ] Alterar role
- [ ] Reset de senha → modal persistente

### Painel — Admin Master
- [ ] Criar novo admin master (pede senha do admin atual)
- [ ] Admin master sem empresa vinculada (company_id = null)
- [ ] Listar admins master

### Painel — Badges
- [ ] Criar badge (nome, descrição, ícone, pontos, raridade)
- [ ] Editar badge
- [ ] Listar badges com contagem de holders

### Painel — Sistema
- [ ] Stats: DB size, uptime, memória, CPU cores
- [ ] Health check com indicadores verde/vermelho
- [ ] Botão "Backup do Banco" → cria backup em data/backups/
- [ ] Botão "Verificar Integridade" → mostra resultado
- [ ] Migrations listadas
- [ ] Painel master visível apenas em localhost

### Painel — Alertas
- [ ] Enviar alerta para todos os usuários
- [ ] Selecionar tipo de alerta

### Painel — Auditoria
- [ ] Listar logs com filtro por período
- [ ] Filtrar por ação
- [ ] Buscar por email/entidade
- [ ] Export CSV funcional

### Painel de Controle HTML
- [ ] Acessar `/uniher-control.html`
- [ ] Login necessário → tela de login aparece
- [ ] Após login → painel completo carrega
- [ ] Status Online/Offline correto
- [ ] Ver Logs do Servidor (modal com terminal)
- [ ] Ver Logs de Erros
- [ ] Portas em uso (tabela com PID)
- [ ] Uso de Disco
- [ ] Info Completa do Sistema
- [ ] Backup do Banco
- [ ] Verificar Integridade
- [ ] Limpar Logs
- [ ] Deploy checklist visível
- [ ] Gerar Nginx Config
- [ ] Gerar .env.production (secrets aleatórios)
- [ ] Comandos PM2

### Segurança Master
- [ ] JWT secret ≥ 32 chars (startup rejeita se menor)
- [ ] Refresh token expira em 48h
- [ ] Rate limit progressivo: 5/min → 10/5min → 20/30min
- [ ] Após lockout 30min → notificação de segurança aparece
- [ ] Failed login logado na auditoria
- [ ] Soft delete não apaga dados reais
- [ ] API /admin/* retorna 403 para não-admin

---

## 2. ADMIN EMPRESA (RH)

### Primeiro Acesso
- [ ] Registro via `/hr-onboarding` (nome, email, senha, empresa)
- [ ] Redirect para dashboard após registro
- [ ] Se RH novo → redirect para `/onboarding-rh`
- [ ] Onboarding mostra 5 passos com tempo estimado
- [ ] "Comece aqui" no passo 1
- [ ] Progresso atualiza conforme completa passos

### Dashboard
- [ ] KPIs mostram dados da empresa (não de outras)
- [ ] Gráficos de engajamento com dados reais (ou empty state)
- [ ] Ranking de departamentos
- [ ] Campanhas ativas

### Gestão de Colaboradoras
- [ ] Acessar `/colaboradoras-gestao`
- [ ] Stats: total, ativas, bloqueadas, por departamento
- [ ] Buscar por nome/email
- [ ] Filtrar por departamento, role, status
- [ ] Bloquear/desbloquear colaboradora
- [ ] Trocar departamento (inline)
- [ ] Paginação funcional
- [ ] Só vê usuários da própria empresa

### Departamentos
- [ ] Acessar `/departamentos`
- [ ] Criar departamento (nome + cor)
- [ ] Editar departamento
- [ ] Deletar departamento
- [ ] Contagem de usuários por departamento

### Convites
- [ ] Convidar por email individual (role + departamento)
- [ ] **RH não pode convidar role "RH"** → opção não aparece no dropdown
- [ ] Bulk invite (colar múltiplos emails)
- [ ] Progresso do bulk invite visível
- [ ] Resultados: sucesso/erro por email
- [ ] Email de convite enviado (ou logado no console em dev)
- [ ] Ver convites pendentes/aceitos/expirados
- [ ] Aprovar usuário pendente
- [ ] **RH não pode aprovar outro RH** → erro 403

### Desafios
- [ ] Acessar `/desafios/gerenciar`
- [ ] Criar desafio para a empresa
- [ ] Ver desafios padrão da plataforma
- [ ] Editar/deletar apenas desafios da própria empresa

### Campanhas
- [ ] Criar campanha (nome, mês, cor)
- [ ] Ver campanhas ativas/encerradas
- [ ] Só vê campanhas da própria empresa

### Objetivos
- [ ] Criar objetivo para a empresa
- [ ] Vincular a campanha
- [ ] Definir recompensa (pontos, badge, custom)

### Ligas
- [ ] Gerenciar ligas customizadas
- [ ] Criar liga (opt-in, departamento, empresa)

### Company Profile
- [ ] Editar nome, CNPJ, setor, contato
- [ ] Upload de logo → imagem aparece
- [ ] Salvar → dados persistem

### Analytics
- [ ] Analytics de Comunicação com dados reais
- [ ] Histórico com dados reais
- [ ] Download CSV funcional

### Configurações
- [ ] Editar perfil (nome, cargo)
- [ ] Contato de emergência
- [ ] Toggles de notificação salvam no banco
- [ ] Toggles de privacidade salvam no banco

### Segurança RH
- [ ] RH não acessa `/admin` → redirect para `/dashboard`
- [ ] RH não acessa `/api/admin/*` → 403
- [ ] Analytics filtrado por empresa (não vê dados de outras)
- [ ] Histórico filtrado por empresa
- [ ] Challenges PATCH pre-filtrado por empresa
- [ ] Convites auditados

---

## 3. COLABORADORA (Funcionária)

### Aceitar Convite
- [ ] Acessar link de convite `/invite/[token]`
- [ ] Validação do token (válido, expirado, inválido)
- [ ] Preencher nome + senha (validação forte: maiúsc, minúsc, número, especial)
- [ ] Campos de senha com toggle independente
- [ ] Loading spinner no botão durante submit
- [ ] Redirect para `/pending-approval`

### Primeiro Acesso
- [ ] Se mustChangePassword → redirect para `/primeiro-acesso`
- [ ] Bloqueia acesso a outras rotas até trocar senha
- [ ] Validação de senha forte em tempo real
- [ ] Após trocar → redirect para home

### Quiz
- [ ] Acessar quiz de arquétipo
- [ ] 6 perguntas com slider
- [ ] Progresso visível
- [ ] Submit → resultado do arquétipo
- [ ] Redirect para `/colaboradora`

### Home (`/colaboradora`)
- [ ] **Check-in hero card no topo** — botão grande e visível
- [ ] Check-in funcional → XP ganho + streak atualizado
- [ ] Barra de XP diário progride
- [ ] Não permite double check-in (botão desativa)
- [ ] Stats cards (exames, conteúdo, campanhas, streak)
- [ ] Exams % mostra dado real (ou "—" se sem dados)
- [ ] Daily missions listadas
- [ ] Completar missão → feedback visual
- [ ] Challenges ativos com barra de progresso
- [ ] Incrementar progresso → atualiza
- [ ] Badges desbloqueados visíveis
- [ ] Botão de pânico (WhatsApp para contato de emergência)
- [ ] Liga: rank + liga atual
- [ ] **Toast de erro visível** quando API falha

### Desafios (`/desafios`)
- [ ] Listar desafios ativos, completados, disponíveis
- [ ] Criar desafio pessoal
- [ ] Registrar progresso
- [ ] Empty state orientador se sem desafios

### Campanhas (`/campanhas`)
- [ ] Ver campanhas disponíveis
- [ ] Participar de campanha
- [ ] Ver progresso
- [ ] Filtro por status (ativas, próximas, encerradas)
- [ ] Empty state orientador

### Conquistas (`/conquistas`)
- [ ] Listar badges (desbloqueados + bloqueados)
- [ ] Filtro: todos, desbloqueados, bloqueados
- [ ] Progresso geral (%)
- [ ] **Share → Web Share API** ou fallback WhatsApp
- [ ] Empty state orientador

### Liga (`/liga`)
- [ ] **Banner explicativo** (dismissível, salva no localStorage)
- [ ] Leaderboard com posição atual destacada
- [ ] Selecionar entre ligas
- [ ] Ligas customizadas visíveis
- [ ] Paginação no leaderboard

### Semáforo (`/semaforo`)
- [ ] **Legenda de cores** no topo (verde/amarelo/vermelho)
- [ ] 6 dimensões com score
- [ ] **Dica acionável** por dimensão baseada no score
- [ ] Histórico real (não mockado)
- [ ] "Agendar lembrete" → salva preferência real

### Notificações (`/notificacoes`)
- [ ] Listar notificações
- [ ] **Filtro por tipo** (todas, badges, campanhas, desafios, sistema, segurança)
- [ ] Marcar como lida
- [ ] Deletar
- [ ] Contagem por filtro
- [ ] Empty state por filtro

### Configurações (`/configuracoes`)
- [ ] Editar perfil
- [ ] Contato de emergência
- [ ] **Arquétipo visível** (resultado do quiz)
- [ ] Link para refazer quiz
- [ ] Toggles de notificação salvam
- [ ] Toggles de privacidade salvam
- [ ] Push notification toggle → subscribe/unsubscribe real
- [ ] Lembretes de missão configuráveis
- [ ] **Exportar meus dados** → download JSON
- [ ] **Solicitar exclusão** → confirmação + notifica admins

### Esqueci Minha Senha
- [ ] Acessar `/esqueci-senha`
- [ ] Digitar email → "Email enviado" (mesmo se não existe)
- [ ] Email com link (ou log no console em dev)
- [ ] Acessar `/redefinir-senha?token=xxx`
- [ ] Token inválido → mensagem de erro
- [ ] Token expirado → mensagem de erro
- [ ] Nova senha com validação forte
- [ ] Após reset → redirect para login
- [ ] Token usado → não funciona de novo

### Segurança Colaboradora
- [ ] Não acessa `/admin` → redirect
- [ ] Não acessa `/api/admin/*` → 403
- [ ] Não acessa `/api/rh/*` → 403
- [ ] Não vê dados de outra colaboradora
- [ ] Não consegue incrementar challenge de outro usuário
- [ ] Rate limit em todas as ações

---

## 4. TESTE INTEGRADO (Fluxo Completo)

### Fluxo E2E: Do zero à empresa funcionando
1. [ ] Admin master loga
2. [ ] Cria empresa "Teste Corp"
3. [ ] Cria departamentos (RH, Marketing, TI)
4. [ ] Cria usuário RH para a empresa
5. [ ] Logout admin → login como RH
6. [ ] RH vê onboarding → completa passos
7. [ ] RH convida 3 colaboradoras (1 por departamento)
8. [ ] Emails de convite gerados
9. [ ] Colaboradora 1 aceita convite → cria conta → pending approval
10. [ ] RH aprova colaboradora 1
11. [ ] Colaboradora 1 loga → faz quiz → resultado do arquétipo
12. [ ] Colaboradora 1 faz check-in diário → ganha XP
13. [ ] Colaboradora 1 inicia desafio → registra progresso
14. [ ] RH cria campanha → colaboradora vê e participa
15. [ ] Colaboradora desbloqueia badge → notificação aparece
16. [ ] Colaboradora compartilha badge via WhatsApp
17. [ ] RH vê analytics → dados refletem ações da colaboradora
18. [ ] RH vê histórico → pontos por departamento corretos
19. [ ] Admin master vê auditoria → todas as ações logadas
20. [ ] Admin master faz backup do banco → arquivo criado

### Fluxo de Segurança E2E
1. [ ] Tentar login com senha errada 6x → lockout 1min
2. [ ] Continuar tentando → lockout 5min
3. [ ] Continuar → lockout 30min + admin notificado
4. [ ] Tentar acessar API de admin como colaboradora → 403
5. [ ] Tentar acessar dados de outro usuário por ID → 404
6. [ ] Tentar upload de .php → rejeitado
7. [ ] Tentar upload > 5MB → rejeitado
8. [ ] Tentar SQL injection em busca → parametrizado, sem efeito
9. [ ] Tentar XSS em campo de nome → sanitizado
10. [ ] Verificar que JWT secret > 32 chars
11. [ ] Verificar que refresh token expira em 48h
12. [ ] Verificar que forgot-password não revela se email existe
13. [ ] Verificar que register não revela se email existe (status 400)

### Fluxo LGPD E2E
1. [ ] Colaboradora exporta dados → JSON com todos os dados pessoais
2. [ ] Colaboradora solicita exclusão → admins notificados
3. [ ] Verificar consent tracking (POST/GET/DELETE `/api/users/me/consent`)
4. [ ] Verificar que dados deletados (soft) não aparecem em listagens

### Fluxo de Resiliência
1. [ ] Matar processo Node → watchdog reinicia em ~3s
2. [ ] Health check retorna "healthy" após restart
3. [ ] Banco reconecta automaticamente após falha
4. [ ] Upload com file corrompido → erro tratado, não crasha
5. [ ] API com payload inválido → erro 400, não 500

### Mobile
- [ ] Login no mobile → responsivo
- [ ] Home colaboradora → check-in hero visível sem scroll
- [ ] Sidebar abre/fecha corretamente
- [ ] Sidebar fecha ao clicar em link
- [ ] Tabelas viram cards no mobile
- [ ] Modais têm botão X visível
- [ ] Touch targets ≥ 44px
- [ ] Scroll-to-top aparece em páginas longas

### Performance
- [ ] Página inicial carrega < 3s
- [ ] Dashboard carrega < 2s
- [ ] Listagens paginadas (não carregam tudo)
- [ ] Imagens otimizadas (WebP via next/image)
- [ ] `npm audit` → 0 vulnerabilidades
- [ ] Build de produção → 0 erros TypeScript
