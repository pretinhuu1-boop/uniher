# UniHER — Blueprint Arquitetural

> Documento gerado em 14/03/2026 — **Atualizado** apos implementacao completa da plataforma.
> Versao: 2.0 (plataforma completa com 17 rotas)

---

## 1. Visao do Produto

**UniHER** e uma plataforma SaaS B2B de saude feminina corporativa posicionada como **"O Duolingo da Saude Feminina no Trabalho"**.

**Problema:** Empresas investem em saude ocupacional generica, mas ignoram as necessidades especificas de saude feminina. Resultado: alto absenteismo, baixo engajamento e zero mensuracao de ROI.

**Solucao:** Plataforma gamificada que personaliza jornadas de saude para colaboradoras usando arquetipos comportamentais, missoes diarias, streaks e campanhas tematicas — entregando metricas de ROI mensuravel para o RH.

**Metricas-chave prometidas:**
- ROI de 4.8x
- Reducao de 23% no absenteismo
- Economia media de R$287k
- 92% de engajamento

---

## 2. Arquitetura Atual

### 2.1 Stack Tecnologica

| Camada       | Tecnologia                         |
|--------------|-------------------------------------|
| Framework    | Next.js 16.1.6 (App Router)         |
| UI           | React 19.2.3 + CSS Modules          |
| Linguagem    | TypeScript (strict mode)             |
| Fontes       | Cormorant Garamond + DM Sans        |
| Graficos     | Chart.js + react-chartjs-2          |
| Deploy       | Estatico (sem backend)              |

### 2.2 Estrutura de Diretorio

```
src/
  app/
    layout.tsx          # RootLayout, metadata, JSON-LD, fontes
    page.tsx            # Server component (renderiza HomeClient)
    globals.css         # Design tokens, reset, utilitarios
    sitemap.ts          # SEO
    robots.ts           # SEO
  components/
    HomeClient.tsx      # Orquestrador client-side (quiz state + lazy loading)
    layout/
      Navbar.tsx        # Navegacao + CTA quiz
      Footer.tsx        # Rodape
      Marquee.tsx       # Ticker animado
    sections/
      Hero.tsx          # Above-the-fold, avatares antes/depois, trust strip
      Profiles.tsx      # 3 cards persona (RH, Lideranca, Colaboradora)
      HowItWorks.tsx    # Fluxo de 4 etapas
      Gamification.tsx  # Mecanicas: streaks, badges, arena, semaforo
      ROI.tsx           # Dashboard simulado com metricas
      Campaigns.tsx     # Timeline de campanhas tematicas
      QuizPromo.tsx     # CTA para abrir o quiz
      Pillars.tsx       # 3 pilares cientificos
    quiz/
      QuizModal.tsx     # Container modal (overlay, teclado, scroll lock)
      QuizIntro.tsx     # Tela de boas-vindas
      QuizQuestion.tsx  # Engine de perguntas (single/multi/scale)
      QuizAnalyzing.tsx # Animacao de processamento
      QuizResults.tsx   # Resultado + radar chart + formulario de lead
      QuizErrorBoundary.tsx  # Error boundary gracioso
      RadarChart.tsx    # Chart.js radar (antes vs depois)
    ui/
      RevealOnScroll.tsx  # IntersectionObserver fade-in
      Button.tsx / Card.tsx / Badge.tsx / ProgressBar.tsx
  data/
    archetypes.ts       # 4 arquetipos com scores base e projecoes
    questions.ts        # 6 perguntas do quiz + 6 dimensoes
    campaigns.ts        # 4 campanhas tematicas
  hooks/
    useQuiz.ts          # State machine do quiz
  lib/
    quiz-engine.ts      # Calculo de arquetipo + projecoes
  types/
    index.ts            # Interfaces compartilhadas
```

### 2.3 Fluxo de Dados

```
[Usuario abre quiz]
  -> QuizModal (estado: intro)
  -> QuizIntro -> "Comecar"
  -> QuizQuestion x6 (useQuiz gerencia state)
  -> calculateArchetype(answers) -> ArchetypeKey
  -> QuizAnalyzing (animacao 3s)
  -> QuizResults
     -> RadarChart (base vs projecao 90d)
     -> Formulario de lead (nome, email, telefone, empresa)
     -> WhatsApp redirect
```

---

## 3. Modelo de Dominio

### 3.1 Arquetipos (4)

| Arquetipo            | Trigger                                  | Score Base Medio | Missoes | Campanhas | Habitos |
|----------------------|------------------------------------------|------------------|---------|-----------|---------|
| Guardia Resiliente   | Default (fallback)                       | 2.67             | 12      | 3         | 8       |
| Protetora Silenciosa | barrier === 1 (falta de tempo)           | 2.58             | 10      | 4         | 10      |
| Guerreira em Evolucao| scale >= 4 ou barrier === 4 (sono ruim)  | 5.17             | 18      | 5         | 14      |
| Equilibrista Zen     | priority === 5 (alimentacao)             | 4.20             | 15      | 4         | 12      |

### 3.2 Dimensoes de Saude (6)

1. **Prevencao** — Exames preventivos, check-ups
2. **Sono** — Qualidade e regularidade do sono
3. **Energia** — Disposicao fisica e mental
4. **Saude Mental** — Estresse, ansiedade, equilibrio emocional
5. **Habitos** — Alimentacao, exercicio, hidratacao
6. **Engajamento** — Participacao em campanhas e comunidade

### 3.3 Quiz Engine

```
calculateArchetype(answers):
  barrier = answers[0]  // Q1: O que mais te trava
  scale   = answers[2]  // Q3: Autoavaliacao 1-5
  priority = answers[4] // Q5: Mudanca imediata

  if scale >= 4 OR barrier === 4 -> guerreira
  if priority === 5              -> equilibrista
  if barrier === 1               -> protetora
  else                           -> guardia
```

**Projecoes:** Cada arquetipo tem vetores de crescimento para 30, 60 e 90 dias sobre as 6 dimensoes, limitados entre 0.1 e 9.9.

---

## 4. Design System

### 4.1 Paleta de Cores

| Token        | Valor     | Uso                                |
|--------------|-----------|------------------------------------|
| rose-500     | #C85C7E   | Cor primaria, CTAs, acentos        |
| rose-300     | #EAB8CB   | Elementos suaves, bordas           |
| rose-700     | #8C3255   | Texto escuro sobre rosa            |
| gold-700     | #B8922A   | Destaques premium                  |
| gold-500     | #D4B060   | Acentos dourados                   |
| cream-50     | #F7F3EE   | Background principal               |
| green-600    | #3E7D5A   | Status positivo                    |
| text-900     | #2A1A1F   | Texto principal                    |
| text-600     | #6B4D57   | Texto secundario                   |

### 4.2 Tipografia

- **Display:** Cormorant Garamond (serif) — titulos, headlines
- **Body:** DM Sans (sans-serif) — texto corrido, labels, UI

### 4.3 Espacamento e Raio

- Raios: 6px (xs) ate 48px (2xl)
- Sombras: 3 niveis (sm, md, xl) com tonalidade rose
- Secoes: 96px padding vertical (64px mobile)

### 4.4 Animacoes

- `fadeUp` — Entrada de secoes (RevealOnScroll)
- `scaleIn` — Modais e cards
- `float` — Elementos decorativos
- `shimmer` — Loading states
- `marquee` — Ticker horizontal
- `prefers-reduced-motion` — Desabilita todas as animacoes

---

## 5. Personas de Usuario

### 5.1 RH (Comprador)

**Motivacao:** Comprovar ROI de investimento em saude feminina.

**Funcionalidades prometidas:**
- Dashboard com ROI em tempo real
- Relatorios automaticos de engajamento
- Campanhas segmentadas por perfil
- Alertas de risco e absenteismo
- Integracao com sistemas de RH

### 5.2 Lideranca (Influenciador)

**Motivacao:** Visibilidade sobre bem-estar do time e impacto na performance.

**Funcionalidades prometidas:**
- Visao consolidada de bem-estar
- Metricas de produtividade e retencao
- Benchmarks de mercado
- Projecoes de economia e ROI

### 5.3 Colaboradora (Usuaria Final)

**Motivacao:** Cuidar da propria saude de forma engajante e personalizada.

**Funcionalidades prometidas:**
- Quiz de perfil + plano personalizado
- Missoes diarias com streaks
- Badges, niveis e conquistas
- Radar de saude atualizado
- Conteudo curado por especialistas

---

## 6. Mecanicas de Gamificacao

### 6.1 Pilares Cientificos

1. **Neuroplasticidade Temporal** — Micro-acoes de 2 minutos nos horarios de pico (8h, 12h, 18h)
2. **Loop de Dopamina Controlada** — Recompensas variaveis a cada 3-5 acoes completadas
3. **Intencoes de Implementacao** — Formato "Quando [gatilho], vou [acao]" para ancorar habitos

### 6.2 Elementos de Jogo

- **Streaks diarios** — Sequencia de dias ativos
- **Badges e conquistas** — Marcos de progresso
- **Arena entre departamentos** — Competicao saudavel entre times
- **Semaforo de saude** — Indicador visual do estado atual
- **Missoes** — 10-18 missoes por arquetipo
- **Campanhas tematicas** — Outubro Rosa, Novembro Azul, etc.

---

## 7. Seguranca e Compliance

### 7.1 Headers HTTP (next.config.ts)

| Header                          | Valor                              |
|---------------------------------|------------------------------------|
| X-Frame-Options                 | DENY                               |
| X-Content-Type-Options          | nosniff                            |
| Referrer-Policy                 | strict-origin-when-cross-origin    |
| HSTS                            | 63072000s, includeSubDomains       |
| Cross-Origin-Opener-Policy      | same-origin                        |
| Cross-Origin-Resource-Policy    | same-origin                        |
| Permissions-Policy              | camera=(), microphone=(), etc.     |

### 7.2 Content Security Policy

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` (prod) / + `'unsafe-eval'` (dev)
- `connect-src 'self' https://wa.me`
- `frame-ancestors 'none'`
- `upgrade-insecure-requests`

### 7.3 LGPD

- Checkbox de consentimento explicito no formulario de lead
- Link para politica de privacidade (`/privacidade`)

### 7.4 Acessibilidade

- `role="dialog"`, `aria-modal` no quiz
- `role="radio"`, `role="checkbox"`, `aria-checked` nas opcoes
- `aria-label`, `aria-describedby` em campos de formulario
- `aria-invalid` em campos com erro
- `:focus-visible` com outline rosa em todos os interativos
- `prefers-reduced-motion` respeitado globalmente

---

## 8. SEO e Performance

### 8.1 Metadata

- Open Graph completo (pt_BR, imagem 1200x630)
- Twitter Card (summary_large_image)
- 4 schemas JSON-LD: Organization, WebSite, SoftwareApplication, FAQPage
- Sitemap e robots.txt automaticos
- Canonical URL: `https://uniher.com.br`

### 8.2 Performance

- Code splitting via `next/dynamic` (5 secoes below-the-fold)
- QuizModal com `ssr: false` (client-only)
- Hero, Profiles, HowItWorks carregados estaticamente (acima da dobra)
- Font display: `swap` para ambas as fontes
- CSS Modules para tree-shaking automatico de estilos

---

## 9. Estado Atual — Plataforma Completa (Demo)

### Rotas Implementadas (17 total)

| Rota | Modulo | Status |
|------|--------|--------|
| `/` | Landing page + Quiz | ✅ Completa |
| `/auth` | Login / Cadastro (mockado) | ✅ Completa |
| `/welcome` | Selecao de perfil (RH/Lideranca/Colaboradora) | ✅ Completa |
| `/hr-onboarding` | Onboarding RH multi-step (3 etapas) | ✅ Completa |
| `/dashboard` | Dashboard RH completo | ✅ Completa |
| `/colaboradora` | Dashboard Colaboradora | ✅ Completa |
| `/semaforo` | Semaforo de Saude (6 dimensoes) | ✅ Completa |
| `/campanhas` | Campanhas tematicas | ✅ Completa |
| `/desafios` | Desafios com tabs e progresso | ✅ Completa |
| `/conquistas` | Badges e conquistas | ✅ Completa |
| `/historico` | Historico de competicoes | ✅ Completa |
| `/company-profile` | Perfil da empresa | ✅ Completa |
| `/configuracoes` | Configuracoes | ✅ Completa |
| `/notificacoes` | Central de notificacoes | ✅ Completa |
| `/sitemap.xml` | SEO | ✅ |
| `/robots.txt` | SEO | ✅ |

### Componentes da Plataforma

| Componente | Arquivo | Funcao |
|------------|---------|--------|
| AuthProvider | `components/platform/AuthProvider.tsx` | Contexto de autenticacao |
| Sidebar | `components/platform/Sidebar.tsx` | Navegacao lateral |
| AppLayout | `components/platform/AppLayout.tsx` | Shell da plataforma |
| StatCard | `components/platform/StatCard.tsx` | Card de KPI reutilizavel |

### Mock Data

| Arquivo | Conteudo |
|---------|----------|
| `data/mock-users.ts` | 3 usuarios (RH, Lideranca, Colaboradora) |
| `data/mock-dashboard.ts` | KPIs, departamentos, ROI, campanhas, graficos, ranking |
| `data/mock-collaborator.ts` | Home, badges, desafios, semaforo, notificacoes |
| `data/mock-company.ts` | Perfil da empresa OFG |

### O que falta para producao

| Item | Prioridade | Complexidade |
|------|------------|--------------|
| Backend real (Supabase/Prisma) | P0 | Alta |
| Autenticacao real (NextAuth/Clerk) | P0 | Media |
| API routes (leads, users, data) | P0 | Media |
| Pagina `/privacidade` (LGPD) | P0 | Baixa |
| WhatsApp numero real | P0 | Trivial |
| Persistencia de dados | P1 | Media |
| IA personalizacao | P2 | Alta |
| App mobile (PWA) | P2 | Alta |
| Integracoes RH | P2 | Alta |

---

## 10. Roadmap para Producao

### Fase 1 — Backend + Auth (2-3 semanas)
- [ ] Supabase setup + migrations (schema ja documentado)
- [ ] NextAuth.js com Supabase adapter
- [ ] API routes para CRUD
- [ ] Substituir mock data por queries reais
- [ ] Pagina `/privacidade`

### Fase 2 — Dados Reais (2-3 semanas)
- [ ] Persistencia de quiz results
- [ ] Lead capture funcional
- [ ] Dashboard com dados reais
- [ ] Upload de logo da empresa
- [ ] Email de confirmacao

### Fase 3 — Gamificacao Real (3-4 semanas)
- [ ] Engine de missoes diarias
- [ ] Streaks persistentes
- [ ] Sistema de pontos/niveis
- [ ] Ranking em tempo real
- [ ] Desbloqueio automatico de badges

### Fase 4 — Expansao (ongoing)
- [ ] IA para personalizacao
- [ ] Push notifications
- [ ] App mobile (PWA)
- [ ] Integracoes com sistemas de RH
- [ ] Analytics/tracking (PostHog)

---

## 11. Decisoes Arquiteturais

### Por que Next.js App Router?
- SSR/SSG para SEO da landing page
- Route groups `(platform)` para layout compartilhado da plataforma
- Route Handlers para API sem servidor separado
- Deploy simplificado (Vercel)

### Por que CSS Modules (sem Tailwind)?
- Controle fino sobre design tokens
- Zero runtime CSS
- Scoping automatico previne conflitos
- Design system customizado com variaveis CSS

### Por que Chart.js?
- Radar, Line, Doughnut, Bar — todos usados na plataforma
- Leve (~60KB gzip)
- Boa integracao React (react-chartjs-2)

### Por que mock data para demo?
- Plataforma de demonstracao para vendas/investidores
- Frontend completo valida UX antes de investir em backend
- Camada de dados isolada facilita migracao futura
- Schema do banco ja documentado para implementacao

---

## 12. Documentacao Relacionada

| Documento | Arquivo |
|-----------|---------|
| PRD (Product Requirements) | `docs/plans/2026-03-14-uniher-prd.md` |
| Schema de Dados | `docs/plans/2026-03-14-uniher-schema.md` |
| Identidade Visual | `docs/plans/2026-03-14-uniher-identidade-visual.md` |
| Design da Plataforma | `docs/plans/2026-03-14-platform-design.md` |

---

*Este blueprint serve como documentacao viva do sistema UniHER. Atualizado em 14/03/2026 apos implementacao completa da plataforma demo.*
