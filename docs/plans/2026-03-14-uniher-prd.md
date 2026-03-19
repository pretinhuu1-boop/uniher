# UniHER — Product Requirements Document (PRD)

**Versao:** 1.0
**Data:** 14 de marco de 2026
**Status:** Em desenvolvimento
**Classificacao:** Confidencial

---

## Indice

1. [Visao Geral do Produto](#1-visao-geral-do-produto)
2. [Problema](#2-problema)
3. [Solucao](#3-solucao)
4. [Metricas-Chave e ROI](#4-metricas-chave-e-roi)
5. [Personas de Usuario](#5-personas-de-usuario)
6. [Arquitetura de Funcionalidades](#6-arquitetura-de-funcionalidades)
7. [Motor de Quiz e Arquetipos](#7-motor-de-quiz-e-arquetipos)
8. [Mecanicas de Gamificacao](#8-mecanicas-de-gamificacao)
9. [Stack Tecnologico](#9-stack-tecnologico)
10. [Status Atual de Desenvolvimento](#10-status-atual-de-desenvolvimento)
11. [Criterios de Sucesso](#11-criterios-de-sucesso)
12. [Roadmap Futuro](#12-roadmap-futuro)

---

## 1. Visao Geral do Produto

### O que e o UniHER

O UniHER e uma plataforma SaaS B2B de saude feminina corporativa. Posicionado como **"O Duolingo da Saude Feminina no Trabalho"**, o produto combina tres pilares fundamentais:

- **Gamificacao** — missoes diarias, streaks, badges, competicoes departamentais e sistema de niveis
- **Inteligencia Artificial** — personalizacao de jornadas de saude com base em arquetipos comportamentais
- **Ciencia Comportamental** — loops de dopamina, neuroplasticidade e intencoes de implementacao para criar habitos duradouros

### Proposta de Valor

Para **empresas** (compradores): dashboard de ROI mensuravel, reducao de absenteismo, aumento de engajamento e relatorios automatizados que comprovam o retorno do investimento em saude feminina.

Para **colaboradoras** (usuarios finais): uma jornada personalizada e divertida de cuidado com a saude, com missoes adaptadas ao seu perfil comportamental, recompensas por consistencia e visibilidade sobre suas dimensoes de saude.

### Modelo de Negocio

SaaS B2B com cobranca por colaboradora/mes. O comprador primario e o departamento de RH de empresas de medio e grande porte. O plano atual disponivel para demonstracao e o plano **Trial**.

---

## 2. Problema

### Contexto do Mercado

Empresas brasileiras investem bilhoes anualmente em saude ocupacional generica, ignorando sistematicamente as necessidades especificas de saude feminina. Esse modelo gera:

- **Absenteismo elevado** — problemas de saude feminina (como endometriose, menopausa, saude mental e prevencao ginecologica) sao subdiagnosticados e nao acompanhados
- **Engajamento zero** — programas de saude tradicionais tem adesao inferior a 15%, pois sao genericos, burocraticos e sem personalizacao
- **ROI invisivel** — empresas nao conseguem mensurar o retorno dos investimentos em saude, tornando esses programas alvos faceis de cortes orcamentarios
- **Falta de dados acionaveis** — o RH nao tem visibilidade sobre o estado de saude da populacao feminina, impedindo intervencoes preventivas

### Dor Especifica por Persona

| Persona | Dor Principal |
|---|---|
| RH (Comprador) | Sem ROI mensuravel; programas de saude sao "custos" e nao "investimentos" |
| Lideranca | Sem visibilidade do impacto da saude na produtividade do time |
| Colaboradora | Programas genericos que nao falam com suas necessidades reais |

---

## 3. Solucao

### Plataforma Gamificada com Jornadas Personalizadas

O UniHER resolve o problema atraves de uma plataforma que:

1. **Personaliza** — um quiz de 6 perguntas identifica o arquetipo comportamental da colaboradora, gerando uma jornada de saude unica com missoes, campanhas e habitos adaptados
2. **Gamifica** — missoes diarias, streaks, badges, ranking departamental e sistema de niveis criam um loop de engajamento continuo (inspirado no modelo Duolingo)
3. **Mensura** — dashboard de ROI para o RH com KPIs em tempo real, projecoes de economia e comparativos departamentais
4. **Previne** — semaforo de saude com 6 dimensoes que alerta colaboradoras e gestores sobre areas criticas antes que se tornem problemas graves

### Diferenciais Competitivos

- Unica plataforma que combina gamificacao + arquetipos comportamentais para saude feminina
- ROI calculado e apresentado em tempo real para o comprador (RH)
- Ciencia comportamental aplicada: nao e "mais um app de saude" — e um sistema de mudanca de habitos
- Modelo escalavel: sem necessidade de profissionais de saude dedicados para operacao

---

## 4. Metricas-Chave e ROI

### Metricas de Impacto (Dados de Demonstracao)

| Metrica | Valor | Descricao |
|---|---|---|
| **ROI** | **4.8x** | Retorno sobre investimento calculado |
| **Reducao de Absenteismo** | **-23%** | Reducao percentual no periodo |
| **Economia Projetada** | **R$ 287k** | Economia anual projetada para a empresa |
| **Taxa de Engajamento** | **92%** | Colaboradoras ativas nos ultimos 30 dias |

### KPIs do Dashboard RH

| KPI | Valor | Contexto |
|---|---|---|
| Colaboradoras Ativas | 812 | Ativas nos ultimos 7 dias |
| Taxa de Engajamento | 92% | Ultimos 30 dias |
| Exames em Dia | 74% | Percentual da populacao |
| Atividades Completadas | 1.247 | Desafios e badges concluidos |

### Metricas por Departamento

A plataforma acompanha metricas individuais por departamento, incluindo:

- Numero de colaboradoras
- Pontuacao total
- Nivel do departamento
- Badges conquistados
- Percentual de engajamento
- Percentual de exames em dia
- Tendencia (subindo, estavel ou descendo)

Departamentos monitorados: RH (48 colaboradoras), Marketing (124), TI (156), Financeiro (92), Comercial (80), Operacoes (312).

---

## 5. Personas de Usuario

### Persona 1: RH (Comprador)

**Perfil:** Profissional de Recursos Humanos responsavel por programas de saude e bem-estar corporativo.

**Motivacao:** Comprovar ROI dos investimentos em saude, reduzir absenteismo, aumentar engajamento e ter dados para apresentar a diretoria.

**Funcionalidades-chave:**
- Dashboard com KPIs em tempo real
- Projecao de ROI (multiplicador, economia, reducao de absenteismo)
- Graficos de engajamento temporal
- Distribuicao etaria da populacao
- Evolucao da populacao de risco (baixo/medio/alto)
- Comparativo departamental
- Destaques (melhor engajamento, melhor taxa de exames, departamento que precisa de atencao)
- Ranking de gamificacao por departamento (podio)
- Metas departamentais e conquistas
- Gestao de convites (total, pendentes, aceitos, expirados)
- Relatorios automatizados (semanal e mensal)
- Perfil da empresa (CNPJ, setor, plano, contato)

**Exemplo de usuario:** Paola (paola@uniher.com.br), Departamento RH, Nivel 9, 87.840 pontos, streak de 45 dias.

### Persona 2: Lideranca (Influenciador)

**Perfil:** Gestora ou lider de equipe que influencia a adocao da plataforma em seu departamento.

**Motivacao:** Entender o impacto da saude na produtividade do time, acompanhar benchmarks departamentais e incentivar a participacao.

**Funcionalidades-chave:**
- Visao geral do time
- Benchmarks departamentais
- Comparativos de engajamento e exames
- Ranking do departamento na arena corporativa

**Exemplo de usuario:** Fernanda (fernanda@empresa.com), Departamento TI, Nivel 7, 5.200 pontos, streak de 22 dias.

### Persona 3: Colaboradora (Usuario Final)

**Perfil:** Funcionaria da empresa que utiliza a plataforma para cuidar de sua saude de forma personalizada e gamificada.

**Motivacao:** Cuidar da saude de forma pratica, divertida e integrada a sua rotina de trabalho. Ser reconhecida por sua consistencia.

**Funcionalidades-chave:**
- Quiz de arquetipos comportamentais
- Missoes diarias personalizadas
- Streaks e sistema de pontos
- Badges e conquistas
- Semaforo de saude (6 dimensoes)
- Barra de nivel/XP
- Estatisticas rapidas (exames, conteudo, campanhas, streak)
- Secao de engajamento pessoal
- Notificacoes de badges, niveis e campanhas

**Exemplo de usuario:** Ana Maria (ana.silva@empresa.com), Departamento Marketing, Nivel 5, 2.370 pontos, streak de 12 dias.

---

## 6. Arquitetura de Funcionalidades

### 6.1 Autenticacao (Auth)

**Rota:** `/auth`

| Funcionalidade | Descricao | Status |
|---|---|---|
| Login | Entrada com email e senha (mockado para demo) | Implementado |
| Registro | Criacao de conta (mockado) | Implementado |
| Recuperacao de senha | Fluxo de reset (mockado) | Implementado |

**Nota:** Toda a autenticacao e mockada para fins de demonstracao. O sistema utiliza um `AuthProvider` com contexto React para simular sessoes de usuario.

### 6.2 Onboarding

**Rotas:** `/welcome`, `/hr-onboarding`

| Funcionalidade | Descricao |
|---|---|
| Selecao de perfil | Escolha entre 3 perfis: RH, Lideranca, Colaboradora |
| Onboarding RH | Fluxo multi-step: dados da conta + dados da empresa + contato |
| Check-in da Colaboradora | Quiz de arquetipos + configuracao inicial |

### 6.3 Dashboard RH

**Rota:** `/dashboard` (dentro do layout da plataforma)

#### KPIs Principais
- Colaboradoras ativas (com tendencia)
- Taxa de engajamento (ultimos 30 dias)
- Exames em dia (percentual da populacao)
- Atividades completadas (desafios e badges)

#### Projecao de ROI
- Multiplicador de ROI: 4.8x
- Economia projetada: R$ 287k
- Reducao de absenteismo: -23%

#### Graficos e Visualizacoes
- **Engajamento temporal** — linha com engajamento e retencao ao longo de 6 meses (Jul-Dez)
- **Distribuicao etaria** — grafico de barras com faixas: 18-25 (15%), 26-35 (32%), 36-45 (28%), 46-55 (18%), 56+ (7%)
- **Evolucao da populacao de risco** — area empilhada com categorias: baixo, medio e alto risco ao longo do tempo
- **Evolucao temporal** — tendencias de engajamento por periodo
- **Comparativo departamental** — tabela com metricas por departamento

#### Destaques
- Melhor engajamento: RH (92%)
- Melhor taxa de exames: RH (88%)
- Precisa de atencao: Operacoes (65%)

#### Gamificacao Corporativa
- **Ranking (podio):** 1o Operacoes (37.440 pts), 2o TI (18.720 pts), 3o Marketing (14.880 pts)
- **Metas departamentais** — conquistas desbloqueadas vs total por departamento
- **Conquistas** — badges e marcos departamentais

#### Gestao
- **Convites:** 850 total, 24 pendentes, 812 aceitos, 14 expirados
- **Relatorios automatizados:**
  - Semanal: resumo dos ultimos 7 dias (toda segunda as 9h)
  - Mensal: analise completa com tendencias (todo dia 1o as 9h)
  - Destinatario configuravel (padrao: paola@uniher.com.br)

### 6.4 Dashboard Colaboradora

**Rota:** `/colaboradora`

| Componente | Descricao |
|---|---|
| Saudacao + alerta de saude | Mensagem personalizada com data e alerta do semaforo |
| Estatisticas rapidas | Exames em dia (40%, 2/5), conteudo visualizado (1), campanhas ativas (1/3), streak (12 dias) |
| Barra de nivel/XP | Nivel 5, 2.370 pontos, 130 pontos para proximo nivel |
| Secao de engajamento | Streak (12 dias), taxa de abertura (33%), acoes hoje (3) |
| Badges | Colecao de 9 badges com status de desbloqueio |

### 6.5 Semaforo de Saude

**Rota:** `/semaforo`

Sistema de semaforo com 6 dimensoes de saude, cada uma com status (verde/amarelo/vermelho), score numerico e recomendacao personalizada:

| Dimensao | Status | Score | Recomendacao |
|---|---|---|---|
| Prevencao | Vermelho | 3.2 | Agende seus exames preventivos — 2 exames atrasados |
| Sono | Amarelo | 5.8 | Media de sono abaixo do ideal — dormir antes das 23h |
| Energia | Amarelo | 5.5 | Incorporar pausas de 5 min a cada 2h de trabalho |
| Saude Mental | Verde | 7.2 | Manter praticas de mindfulness |
| Habitos | Verde | 6.8 | Habitos melhorando — manter hidratacao |
| Engajamento | Verde | 8.1 | Excelente engajamento na plataforma |

### 6.6 Campanhas

**Rota:** `/campanhas`

Campanhas de saude tematicas alinhadas ao calendario nacional:

| Campanha | Tema | Progresso | Status |
|---|---|---|---|
| Outubro Rosa | Prevencao (cancer de mama) | 87% | Finalizada |
| Novembro Azul | Saude Masculina | 72% | Finalizada |
| Dezembro Laranja | Diabetes | 65% | Ativa |
| Janeiro Branco | Saude Mental | 0% | Proxima |

Campanhas futuras podem ser adicionadas conforme o calendario de saude.

### 6.7 Desafios

**Status:** Planejado

Desafios com rastreamento de progresso em tres estados:

- **Ativos** — em andamento com barra de progresso e prazo
- **Completados** — finalizados com pontos creditados
- **Bloqueados** — disponiveis apos cumprir pre-requisitos

Exemplos implementados nos dados:
- Check-in Matinal (3/5 dias, 75 pts, Habitos)
- Hidratacao Consciente (4/7 dias, 100 pts, Habitos)
- Mindfulness (1/3 sessoes, 80 pts, Saude Mental)
- Exame em Dia (0/1, 200 pts, Prevencao)
- Primeira Semana (7/7, 50 pts, Onboarding — completado)
- Sono Reparador (0/5 noites, 120 pts, Sono — bloqueado)

### 6.8 Conquistas

**Status:** Planejado

Sistema de badges com colecao e niveis de raridade:

| Raridade | Descricao |
|---|---|
| Common | Conquistas basicas de entrada |
| Rare | Marcos de consistencia e dedicacao |
| Epic | Conquistas de alto esforco |
| Legendary | Marcos extraordinarios |

**Badges implementados nos dados:**

| Badge | Descricao | Pontos | Desbloqueado |
|---|---|---|---|
| Iniciante Dedicada | Complete o primeiro check-in | 50 | Sim |
| Streak de 7 Dias | Sequencia de 7 dias ativos | 100 | Sim |
| Preventiva | Registre 3 exames em dia | 150 | Nao |
| Streak de 30 Dias | Sequencia de 30 dias ativos | 300 | Nao |
| Mestra da Saude | Alcance nivel 10 | 500 | Nao |
| Embaixadora | Convide 5 colegas | 200 | Nao |
| Campea Rosa | Complete Outubro Rosa | 250 | Nao |
| Equilibrio Zen | Todas dimensoes acima de 7 | 400 | Nao |
| Maratonista | Complete 50 desafios | 500 | Nao |

### 6.9 Historico

**Status:** Planejado

Evolucao da competicao departamental ao longo do tempo, com graficos mostrando a progressao de pontos e engajamento por departamento.

### 6.10 Perfil da Empresa

**Status:** Planejado

| Campo | Exemplo |
|---|---|
| Razao Social | OFG - ONE FUTURE GROUP |
| Nome Fantasia | OFG |
| CNPJ | 33.457.504/0001-94 |
| Setor | Saude |
| Colaboradoras | 812 |
| Membro desde | 08 de fevereiro de 2026 |
| Plano | Trial |
| Missoes ativas | 24 |
| Pontos totais | 87.840 |
| Contato | Leonardo Fachetti |

### 6.11 Configuracoes

**Status:** Planejado

- Perfil do usuario (nome, email, avatar)
- Preferencias de notificacao
- Configuracoes de privacidade

### 6.12 Notificacoes

**Status:** Planejado

Tipos de notificacao suportados:

| Tipo | Exemplo |
|---|---|
| Badge | "Novo Badge Desbloqueado! Iniciante Dedicada - +50 pontos!" |
| Level | "Subiu de Nivel! Voce alcancou o nivel 5!" |
| Campaign | "Nova Campanha! Janeiro Branco - Saude Mental comecou" |
| Challenge | "Desafio Completado! Primeira Semana concluida. +50 pontos!" |
| Alert | "Exame Pendente — 2 exames atrasados" |

Cada notificacao possui status de leitura (lida/nao lida) e timestamp.

---

## 7. Motor de Quiz e Arquetipos

### 7.1 Estrutura do Quiz

O quiz e composto por **6 perguntas** que determinam o arquetipo comportamental da colaboradora. Os tipos de pergunta sao:

| # | Tipo | Pergunta | Objetivo |
|---|---|---|---|
| 1 | Single choice | "O que mais te trava no cuidado com sua saude?" | Identificar barreira principal |
| 2 | Multi choice | "O que voce quer transformar nos proximos 90 dias?" | Mapear areas de interesse |
| 3 | Scale (1-5) | "De 1 a 5, como voce avalia sua saude hoje?" | Autoavaliacao de saude |
| 4 | Single choice | "O que te faz agir de verdade?" | Identificar driver motivacional |
| 5 | Single choice | "Se pudesse mudar UMA coisa esta semana, qual seria?" | Definir prioridade imediata |
| 6 | Single choice | "Sua faixa etaria" | Personalizar campanhas preventivas |

### 7.2 Algoritmo de Classificacao

A logica de classificacao utiliza principalmente a **pergunta 1** (barreira) e a **pergunta 3** (autoavaliacao) para determinar o arquetipo:

```
SE autoavaliacao >= 4 OU barreira == "Quero otimizar" → Guerreira em Evolucao
SE prioridade == "Equilibrar vida pessoal e profissional" → Equilibrista Zen
SE barreira == "Fico adiando exames" → Protetora Silenciosa
SENAO → Guardia Resiliente
```

### 7.3 Os 4 Arquetipos

#### Guardia Resiliente
- **Descricao:** Cuida de todos ao redor, mas esquece de si mesma. Sua saude pede atencao.
- **Scores base:** Prevencao 3.0, Sono 2.5, Energia 2.8, Saude Mental 2.2, Habitos 2.5, Engajamento 3.0
- **Missoes:** 12 | **Campanhas:** 3 | **Habitos:** 8
- **Perfil:** Maior potencial de crescimento em Saude Mental (+4.5 em 90 dias)

#### Protetora Silenciosa
- **Descricao:** Conhece seus pontos de melhoria, mas adia acoes importantes. A consciencia ja esta la.
- **Scores base:** Prevencao 2.0, Sono 3.5, Energia 2.5, Saude Mental 3.0, Habitos 2.0, Engajamento 2.5
- **Missoes:** 10 | **Campanhas:** 4 | **Habitos:** 10
- **Perfil:** Maior potencial de crescimento em Prevencao (+5.2 em 90 dias)

#### Guerreira em Evolucao
- **Descricao:** Ja tem consciencia sobre saude e quer ir mais longe. O proximo nivel esta ao alcance.
- **Scores base:** Prevencao 5.5, Sono 5.0, Energia 5.2, Saude Mental 4.8, Habitos 5.0, Engajamento 5.5
- **Missoes:** 18 | **Campanhas:** 5 | **Habitos:** 14
- **Perfil:** Crescimento moderado e equilibrado em todas as dimensoes (+2.2 a +2.8 em 90 dias)

#### Equilibrista Zen
- **Descricao:** Busca harmonia em todas as dimensoes da vida. O UniHER ajuda a manter e aprofundar esse equilibrio.
- **Scores base:** Prevencao 4.5, Sono 4.2, Energia 4.0, Saude Mental 4.5, Habitos 3.8, Engajamento 4.2
- **Missoes:** 15 | **Campanhas:** 4 | **Habitos:** 12
- **Perfil:** Maior potencial em Habitos (+4.5 em 90 dias) e Energia (+4.0 em 90 dias)

### 7.4 Projecoes de Saude

Cada arquetipo possui projecoes de crescimento para **30, 60 e 90 dias** em cada uma das 6 dimensoes. Os scores sao limitados entre 0.1 e 9.9.

**Visualizacao:** Grafico radar (Chart.js) exibindo o score base e as projecoes sobrepostas, permitindo a colaboradora visualizar sua evolucao esperada.

### 7.5 As 6 Dimensoes de Saude

1. **Prevencao** — Exames preventivos, check-ups e acompanhamento medico
2. **Sono** — Qualidade e quantidade de sono
3. **Energia** — Disposicao fisica e vitalidade no dia a dia
4. **Saude Mental** — Equilibrio emocional, estresse e ansiedade
5. **Habitos** — Alimentacao, hidratacao e atividade fisica
6. **Engajamento** — Participacao ativa na plataforma e na propria saude

---

## 8. Mecanicas de Gamificacao

### 8.1 Tres Pilares Cientificos

A gamificacao do UniHER e fundamentada em tres principios de ciencia comportamental:

#### Neuroplasticidade
Missoes diarias repetitivas criam novas conexoes neurais, transformando acoes conscientes em habitos automaticos. A plataforma utiliza frequencia e consistencia como mecanismos de mudanca.

#### Loop de Dopamina
Recompensas frequentes e previsiveis (pontos, badges, subidas de nivel) ativam o sistema de recompensa do cerebro, criando um ciclo positivo de motivacao intrinseca. O design e inspirado nos mecanismos do Duolingo.

#### Intencoes de Implementacao
Cada missao e enquadrada como uma intencao especifica ("Quando [situacao], eu vou [acao]"), baseada na pesquisa de Peter Gollwitzer. Isso aumenta significativamente a probabilidade de execucao comparado a intencoes vagas.

### 8.2 Mecanicas Implementadas

#### Streaks (Sequencias)
- Contagem de dias consecutivos de atividade
- Incentivo a consistencia diaria
- Perda de streak apos inatividade (mecanismo de aversao a perda)

#### Sistema de Pontos e Niveis
- Pontos acumulados por missoes, desafios e badges
- Barra de XP com progresso visual para o proximo nivel
- Niveis que desbloqueiam novos conteudos e desafios

#### Badges (Emblemas)
- 9 badges definidos com valores de 50 a 500 pontos
- Desbloqueio por marcos de atividade, consistencia e conquistas
- Notificacao instantanea ao desbloquear

#### Arena Departamental
- Ranking corporativo entre departamentos
- Sistema de podio (1o, 2o, 3o lugar)
- Metricas comparativas de engajamento e exames
- Conquistas departamentais com contagem de desbloqueios

#### Semaforo de Saude
- Feedback visual imediato sobre 6 dimensoes
- Codigo de cores intuitivo: verde (bom), amarelo (atencao), vermelho (urgente)
- Recomendacoes acionaveis para cada dimensao

### 8.3 Volume de Missoes por Arquetipo

| Arquetipo | Missoes | Campanhas | Habitos | Total de Atividades |
|---|---|---|---|---|
| Guardia Resiliente | 12 | 3 | 8 | 23 |
| Protetora Silenciosa | 10 | 4 | 10 | 24 |
| Guerreira em Evolucao | 18 | 5 | 14 | 37 |
| Equilibrista Zen | 15 | 4 | 12 | 31 |

---

## 9. Stack Tecnologico

### Frontend

| Tecnologia | Versao | Uso |
|---|---|---|
| **Next.js** | 16.1.6 | Framework React com App Router |
| **React** | 19.2.3 | Biblioteca de UI |
| **TypeScript** | ^5 | Tipagem estatica (modo strict) |
| **CSS Modules** | Nativo | Estilizacao com design tokens |
| **Chart.js** | ^4.5.1 | Graficos e visualizacoes de dados |
| **react-chartjs-2** | ^5.3.1 | Wrapper React para Chart.js |

### Arquitetura

- **App Router** — Roteamento baseado em pastas do Next.js 16
- **Route Groups** — `(platform)` para agrupar rotas da plataforma com layout compartilhado (Sidebar + AppLayout)
- **CSS Modules** — Cada componente possui seu arquivo `.module.css`, utilizando design tokens CSS customizados
- **Context API** — `AuthProvider` para gerenciamento de estado de autenticacao
- **Custom Hooks** — `useAuth` para acesso ao contexto de autenticacao, `useQuiz` para logica do quiz

### Organizacao do Codigo

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── (platform)/         # Route group da plataforma
│   │   ├── semaforo/       # Semaforo de saude
│   │   ├── colaboradora/   # Dashboard colaboradora
│   │   ├── campanhas/      # Campanhas de saude
│   │   └── layout.tsx      # Layout com Sidebar
│   ├── auth/               # Login/Registro
│   ├── welcome/            # Selecao de perfil
│   ├── hr-onboarding/      # Onboarding RH
│   ├── layout.tsx          # Layout raiz
│   └── page.tsx            # Landing page
├── components/
│   ├── layout/             # Navbar, Footer, Marquee
│   ├── platform/           # AuthProvider, Sidebar, AppLayout, StatCard
│   ├── quiz/               # QuizModal, QuizIntro, QuizQuestion, QuizResults, RadarChart
│   ├── sections/           # Hero, ROI, Profiles, Gamification, Campaigns, etc.
│   └── ui/                 # Button, Card, Badge, ProgressBar, RevealOnScroll
├── data/                   # Dados mockados
│   ├── archetypes.ts       # 4 arquetipos com scores e projecoes
│   ├── campaigns.ts        # Campanhas de saude
│   ├── questions.ts        # 6 perguntas do quiz
│   ├── mock-dashboard.ts   # Dados do dashboard RH
│   ├── mock-collaborator.ts # Dados da colaboradora
│   ├── mock-company.ts     # Dados da empresa
│   └── mock-users.ts       # 3 usuarios mockados
├── hooks/                  # Custom hooks
│   ├── useAuth.ts          # Hook de autenticacao
│   └── useQuiz.ts          # Hook do quiz
├── lib/                    # Logica de negocio
│   └── quiz-engine.ts      # Motor de calculo de arquetipos
└── types/                  # Definicoes TypeScript
    ├── index.ts            # Tipos do quiz
    └── platform.ts         # Tipos da plataforma
```

### Backend

**Nao ha backend.** A versao atual e um demo funcional com todos os dados mockados. Os dados estao em arquivos TypeScript estaticos na pasta `src/data/`.

---

## 10. Status Atual de Desenvolvimento

### Completo

| Modulo | Status | Detalhes |
|---|---|---|
| Landing Page | Concluido | Hero, ROI, Profiles, Gamification, Campaigns, HowItWorks, QuizPromo, Footer |
| Quiz Engine | Concluido | 6 perguntas, 4 arquetipos, projecoes 30/60/90 dias, grafico radar |
| SEO | Concluido | Sitemap e robots.txt configurados |
| Design System | Concluido | CSS Modules com design tokens, componentes UI reutilizaveis |

### Em Desenvolvimento

| Modulo | Status | Detalhes |
|---|---|---|
| Autenticacao | Implementado (mock) | Login, registro, selecao de perfil |
| Onboarding RH | Implementado | Fluxo multi-step |
| Dashboard Colaboradora | Implementado | Pagina com dados mockados |
| Semaforo de Saude | Implementado | 6 dimensoes com semaforo |
| Campanhas | Implementado | 4 campanhas com progresso |
| Layout da Plataforma | Implementado | Sidebar, AppLayout, AuthProvider |

### Planejado

| Modulo | Status | Detalhes |
|---|---|---|
| Dashboard RH | Planejado | Dados prontos, tela pendente |
| Dashboard Lideranca | Planejado | Visao do time |
| Desafios | Planejado | Dados mockados prontos |
| Conquistas | Planejado | Dados mockados prontos |
| Historico | Planejado | Evolucao departamental |
| Perfil da Empresa | Planejado | Dados mockados prontos |
| Configuracoes | Planejado | Preferencias do usuario |
| Notificacoes | Planejado | Dados mockados prontos |

---

## 11. Criterios de Sucesso

### Para a Demonstracao/Vendas

1. **Funcionalidade completa** — Todos os modulos listados devem ser funcionais e navegaveis, com dados mockados realistas
2. **Navegacao fluida** — Transicoes suaves entre todas as telas, sem quebras ou telas em branco
3. **Responsividade** — Design adaptativo para desktop e mobile, mantendo usabilidade em ambos
4. **Polish profissional** — Visual alinhado ao design system estabelecido, sem inconsistencias visuais
5. **Narrativa coerente** — O fluxo de demonstracao deve contar uma historia clara: problema → quiz → resultado → plataforma → ROI
6. **Performance** — Carregamento rapido, sem travamentos ou delays perceptiveis

### Metricas de Aceitacao

- [ ] Todas as rotas carregam sem erros
- [ ] Quiz funciona end-to-end (intro → perguntas → analise → resultado)
- [ ] Dashboard RH exibe todos os KPIs e graficos
- [ ] Dashboard Colaboradora exibe informacoes personalizadas
- [ ] Semaforo de Saude mostra 6 dimensoes com cores corretas
- [ ] Campanhas exibem progresso e status
- [ ] Sidebar navega corretamente entre todas as secoes
- [ ] Layout responsivo em telas de 320px a 1920px
- [ ] Nenhum erro no console do navegador

---

## 12. Roadmap Futuro

### Fase 1 — Infraestrutura (Pos-Demo)

| Item | Descricao | Prioridade |
|---|---|---|
| Backend | Integracao com Supabase ou Prisma para persistencia de dados | Alta |
| Autenticacao real | Implementar auth com Supabase Auth ou NextAuth.js | Alta |
| Banco de dados | Modelagem e migracao dos dados mockados para banco relacional | Alta |
| API Routes | Criar endpoints Next.js para operacoes CRUD | Alta |

### Fase 2 — Inteligencia

| Item | Descricao | Prioridade |
|---|---|---|
| Motor de IA | Engine de personalizacao com base em dados reais de uso | Alta |
| Missoes dinamicas | Geracao de missoes adaptativas por IA com base no comportamento | Media |
| Predicoes de saude | Modelos preditivos para alertas proativos | Media |
| NLP para conteudo | Personalizacao de recomendacoes textuais | Baixa |

### Fase 3 — Expansao

| Item | Descricao | Prioridade |
|---|---|---|
| App Mobile | React Native ou PWA para acesso mobile nativo | Alta |
| Integracoes RH | Conectores com sistemas de RH (TOTVS, SAP, Gupy) | Media |
| Wearables | Integracao com dispositivos de saude (Apple Health, Google Fit) | Media |
| Telemed | Integracao com plataformas de telemedicina | Baixa |

### Fase 4 — Escala

| Item | Descricao | Prioridade |
|---|---|---|
| Multi-tenant | Arquitetura multi-empresa com isolamento de dados | Alta |
| Analytics avancado | Dashboards com BI integrado | Media |
| Marketplace | Marketplace de conteudo de saude para parceiros | Baixa |
| Internacionalizacao | Suporte a multiplos idiomas (LATAM) | Baixa |

---

## Glossario

| Termo | Definicao |
|---|---|
| **Arquetipo** | Perfil comportamental determinado pelo quiz, que personaliza a jornada de saude |
| **Streak** | Sequencia de dias consecutivos de atividade na plataforma |
| **Badge** | Emblema conquistado ao atingir marcos especificos |
| **Semaforo** | Sistema visual de cores (verde/amarelo/vermelho) que indica o status de cada dimensao de saude |
| **Arena** | Competicao gamificada entre departamentos da empresa |
| **Missao** | Atividade diaria personalizada baseada no arquetipo da colaboradora |
| **Design Token** | Variavel CSS que define cores, espacamentos e tipografia do design system |
| **Mock** | Dados simulados para fins de demonstracao, sem backend real |

---

*Documento gerado em 14 de marco de 2026. UniHER — Saude feminina corporativa, reimaginada.*
