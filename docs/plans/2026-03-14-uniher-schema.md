# UniHER - Schema de Dados Completo

> Documento de referencia para o modelo de dados da plataforma UniHER.
> Data: 14 de marco de 2026

---

## Sumario

1. [Modelo de Dados Atual (TypeScript)](#1-modelo-de-dados-atual-typescript)
2. [Schema do Banco de Dados (Futuro)](#2-schema-do-banco-de-dados-futuro)
3. [Relacionamentos (Diagrama ER)](#3-relacionamentos-diagrama-er)
4. [Dados Mock](#4-dados-mock)
5. [Plano de Migracao](#5-plano-de-migracao)

---

## 1. Modelo de Dados Atual (TypeScript)

O front-end utiliza interfaces TypeScript organizadas em dois arquivos principais:
`src/types/index.ts` (quiz e arquetipos) e `src/types/platform.ts` (plataforma completa).

### 1.1 Quiz e Arquetipos (`src/types/index.ts`)

#### `QuizOption`
Campo de opcao individual dentro de uma pergunta do quiz.

| Campo         | Tipo     | Descricao                          |
|---------------|----------|------------------------------------|
| `label`       | `string` | Texto da opcao                     |
| `description` | `string` | Texto complementar / explicativo   |

#### `QuizQuestion`
Pergunta do quiz de onboarding.

| Campo      | Tipo                                  | Descricao                                      |
|------------|---------------------------------------|-------------------------------------------------|
| `type`     | `'single' \| 'multi' \| 'scale'`     | Tipo de resposta (unica, multipla, escala)      |
| `question` | `string`                              | Texto da pergunta                               |
| `subtitle` | `string`                              | Subtitulo / contexto motivacional               |
| `options`  | `QuizOption[] \| string[]`            | Opcoes de resposta (objetos ou strings simples)  |

#### `ArchetypeKey`
Union type com as 4 chaves de arquetipo: `'guardia' | 'protetora' | 'guerreira' | 'equilibrista'`

#### `ArchetypeData`
Dados completos de um arquetipo de saude.

| Campo       | Tipo       | Descricao                                           |
|-------------|------------|------------------------------------------------------|
| `name`      | `string`   | Nome do arquetipo (ex: "Guardia Resiliente")         |
| `description`| `string`  | Descricao narrativa do perfil                        |
| `base`      | `number[]` | Scores iniciais nas 6 dimensoes de saude             |
| `growth30`  | `number[]` | Crescimento projetado em 30 dias                     |
| `growth60`  | `number[]` | Crescimento projetado em 60 dias                     |
| `growth90`  | `number[]` | Crescimento projetado em 90 dias                     |
| `missions`  | `number`   | Quantidade de missoes recomendadas                   |
| `campaigns` | `number`   | Quantidade de campanhas sugeridas                    |
| `habits`    | `number`   | Quantidade de habitos a desenvolver                  |

#### `QuizState`
Estado local do quiz durante o fluxo de onboarding.

| Campo             | Tipo                                              | Descricao                            |
|-------------------|----------------------------------------------------|--------------------------------------|
| `currentQuestion` | `number`                                           | Indice da pergunta atual             |
| `answers`         | `(number \| number[] \| null)[]`                   | Respostas coletadas                  |
| `archetype`       | `ArchetypeKey \| null`                             | Arquetipo calculado                  |
| `screen`          | `'intro' \| 'question' \| 'analyzing' \| 'results'` | Tela atual do fluxo                |

#### `CampaignData`
Dados de uma campanha de saude (visao colaboradora).

| Campo         | Tipo                                | Descricao                          |
|---------------|-------------------------------------|------------------------------------|
| `month`       | `string`                            | Mes e tema (ex: "Outubro - Prevencao") |
| `name`        | `string`                            | Nome da campanha                   |
| `progress`    | `number`                            | Percentual de progresso (0-100)    |
| `color`       | `string`                            | Cor/gradiente CSS                  |
| `status`      | `'done' \| 'active' \| 'next'`     | Estado atual da campanha           |
| `statusLabel` | `string`                            | Label legivel do status            |

---

### 1.2 Plataforma Completa (`src/types/platform.ts`)

#### `UserRole`
Union type: `'rh' | 'lideranca' | 'colaboradora'`

#### `MockUser`
Representa um usuario da plataforma.

| Campo        | Tipo       | Descricao                                |
|--------------|------------|------------------------------------------|
| `id`         | `string`   | Identificador unico                      |
| `name`       | `string`   | Nome do usuario                          |
| `email`      | `string`   | Email                                    |
| `role`       | `UserRole` | Papel na plataforma                      |
| `avatar?`    | `string`   | URL do avatar (opcional)                 |
| `department?`| `string`   | Nome do departamento (opcional)          |
| `level`      | `number`   | Nivel de gamificacao                     |
| `points`     | `number`   | Pontos acumulados                        |
| `streak`     | `number`   | Dias consecutivos ativos                 |
| `joinedAt`   | `string`   | Data de ingresso (ISO date)              |

#### `Department`
Departamento de uma empresa.

| Campo              | Tipo                          | Descricao                              |
|--------------------|-------------------------------|----------------------------------------|
| `id`               | `string`                      | Identificador unico                    |
| `name`             | `string`                      | Nome do departamento                   |
| `collaborators`    | `number`                      | Quantidade de colaboradoras            |
| `points`           | `number`                      | Pontos acumulados pelo departamento    |
| `level`            | `number`                      | Nivel do departamento                  |
| `badges`           | `number`                      | Quantidade de badges conquistados      |
| `engagementPercent`| `number`                      | Taxa de engajamento (%)                |
| `examsPercent`     | `number`                      | Exames em dia (%)                      |
| `trend`            | `'up' \| 'down' \| 'stable'` | Tendencia recente                      |
| `color`            | `string`                      | Cor hex para visualizacao              |

#### `DashboardKPI`
Indicador chave para o painel de RH.

| Campo             | Tipo                          | Descricao                              |
|-------------------|-------------------------------|----------------------------------------|
| `label`           | `string`                      | Nome do KPI                            |
| `value`           | `string \| number`            | Valor atual                            |
| `subtitle?`       | `string`                      | Contexto adicional                     |
| `icon`            | `string`                      | Nome do icone                          |
| `trend?`          | `string`                      | Texto de tendencia                     |
| `trendDirection?` | `'up' \| 'down' \| 'stable'` | Direcao da tendencia                   |
| `color?`          | `string`                      | Cor hex do KPI                         |

#### `ROIProjection`
Projecao de retorno sobre investimento.

| Campo                  | Tipo     | Descricao                         |
|------------------------|----------|-----------------------------------|
| `roiMultiplier`        | `number` | Multiplicador de ROI (ex: 4.8x)  |
| `savings`              | `string` | Economia projetada (ex: "R$ 287k")|
| `absenteeismReduction` | `string` | Reducao de absenteismo (ex: "-23%")|

#### `CampaignStatus`
Status de campanha na visao do dashboard de RH.

| Campo         | Tipo                                | Descricao                          |
|---------------|-------------------------------------|------------------------------------|
| `name`        | `string`                            | Nome da campanha                   |
| `month`       | `string`                            | Mes e tema                         |
| `progress`    | `number`                            | Progresso percentual               |
| `status`      | `'done' \| 'active' \| 'next'`     | Estado                             |
| `statusLabel` | `string`                            | Label legivel                      |
| `color`       | `string`                            | Cor hex                            |

#### `EngagementDataPoint`
Ponto de dados para grafico de engajamento ao longo do tempo.

| Campo        | Tipo     | Descricao                    |
|--------------|----------|------------------------------|
| `month`      | `string` | Mes abreviado                |
| `engagement` | `number` | Percentual de engajamento    |
| `retention`  | `number` | Percentual de retencao       |

#### `AgeDistribution`
Distribuicao etaria das colaboradoras.

| Campo     | Tipo     | Descricao                  |
|-----------|----------|----------------------------|
| `label`   | `string` | Faixa etaria (ex: "26-35") |
| `percent` | `number` | Percentual                 |
| `color`   | `string` | Cor hex                    |

#### `HealthRisk`
Evolucao do risco de saude ao longo do tempo.

| Campo    | Tipo     | Descricao                       |
|----------|----------|---------------------------------|
| `month`  | `string` | Mes abreviado                   |
| `low`    | `number` | Percentual de risco baixo       |
| `medium` | `number` | Percentual de risco medio       |
| `high`   | `number` | Percentual de risco alto        |

#### `Badge`
Medalha / conquista desbloqueavel.

| Campo          | Tipo     | Descricao                        |
|----------------|----------|----------------------------------|
| `id`           | `string` | Identificador unico              |
| `name`         | `string` | Nome do badge                    |
| `description`  | `string` | Descricao do criterio            |
| `icon`         | `string` | Emoji do badge                   |
| `unlockedAt?`  | `string` | Data de desbloqueio (ISO date)   |
| `points`       | `number` | Pontos concedidos ao desbloquear |

#### `Challenge`
Desafio ativo para a colaboradora.

| Campo         | Tipo                                      | Descricao                          |
|---------------|-------------------------------------------|------------------------------------|
| `id`          | `string`                                  | Identificador unico                |
| `title`       | `string`                                  | Titulo do desafio                  |
| `description` | `string`                                  | Descricao detalhada                |
| `progress`    | `number`                                  | Etapas concluidas                  |
| `total`       | `number`                                  | Total de etapas                    |
| `points`      | `number`                                  | Pontos ao completar               |
| `deadline?`   | `string`                                  | Prazo (ISO date, opcional)         |
| `status`      | `'active' \| 'completed' \| 'locked'`    | Estado atual                       |
| `category`    | `string`                                  | Categoria (Habitos, Prevencao etc) |

#### `Achievement`
Conquista rara / colecao.

| Campo          | Tipo                                           | Descricao                        |
|----------------|-------------------------------------------------|----------------------------------|
| `id`           | `string`                                        | Identificador unico              |
| `title`        | `string`                                        | Titulo                           |
| `description`  | `string`                                        | Descricao                        |
| `icon`         | `string`                                        | Emoji / icone                    |
| `unlockedAt?`  | `string`                                        | Data de desbloqueio              |
| `rarity`       | `'common' \| 'rare' \| 'epic' \| 'legendary'` | Raridade                         |

#### `CompanyProfile`
Perfil da empresa cadastrada.

| Campo              | Tipo     | Descricao                          |
|--------------------|----------|------------------------------------|
| `logo?`            | `string` | URL do logo (opcional)             |
| `name`             | `string` | Razao social                       |
| `tradeName`        | `string` | Nome fantasia                      |
| `cnpj`             | `string` | CNPJ formatado                     |
| `sector`           | `string` | Setor de atuacao                   |
| `collaboratorCount`| `number` | Numero de colaboradoras            |
| `memberSince`      | `string` | Data de cadastro (texto formatado) |
| `plan`             | `string` | Plano atual (Trial, Pro etc)       |
| `missionsActive`   | `number` | Missoes ativas                     |
| `totalPoints`      | `number` | Pontos totais da empresa           |
| `contact`          | `object` | Contato principal (name, email, phone) |

#### `ConviteStatus`
Status dos convites enviados para colaboradoras.

| Campo     | Tipo     | Descricao                    |
|-----------|----------|------------------------------|
| `total`   | `number` | Total de convites enviados   |
| `pending` | `number` | Convites pendentes           |
| `accepted`| `number` | Convites aceitos             |
| `expired` | `number` | Convites expirados           |

#### `ReportConfig`
Configuracao de relatorios automaticos.

| Campo            | Tipo                     | Descricao                        |
|------------------|--------------------------|----------------------------------|
| `type`           | `'weekly' \| 'monthly'`  | Tipo de relatorio                |
| `label`          | `string`                 | Nome do relatorio                |
| `description`    | `string`                 | Descricao do conteudo            |
| `schedule`       | `string`                 | Frequencia de envio              |
| `enabled`        | `boolean`                | Se esta ativo                    |
| `recipientEmail` | `string`                 | Email de destino                 |

#### `CollaboratorHome`
Dados da tela inicial da colaboradora.

| Campo             | Tipo     | Descricao                            |
|-------------------|----------|--------------------------------------|
| `greeting`        | `string` | Saudacao (ex: "Boa noite")           |
| `userName`        | `string` | Nome da colaboradora                 |
| `date`            | `string` | Data formatada                       |
| `healthAlert`     | `string` | Alerta do semaforo de saude          |
| `examsPercent`    | `number` | Percentual de exames em dia          |
| `examsTotal`      | `number` | Total de exames obrigatorios         |
| `contentViewed`   | `number` | Conteudos visualizados               |
| `campaignsActive` | `number` | Campanhas em andamento               |
| `campaignsTotal`  | `number` | Total de campanhas                   |
| `streakDays`      | `number` | Dias consecutivos                    |
| `level`           | `number` | Nivel atual                          |
| `points`          | `number` | Pontos atuais                        |
| `pointsNextLevel` | `number` | Pontos faltando para proximo nivel   |
| `achievementCount`| `number` | Quantidade de conquistas             |
| `engagementStats` | `object` | Estatisticas (streakDays, openRate, actionsToday) |

#### `SemaforoItem`
Dimensao do semaforo de saude individual.

| Campo            | Tipo                              | Descricao                          |
|------------------|-----------------------------------|------------------------------------|
| `dimension`      | `string`                          | Nome da dimensao                   |
| `status`         | `'green' \| 'yellow' \| 'red'`   | Status do semaforo                 |
| `score`          | `number`                          | Score numerico (0-10)              |
| `recommendation` | `string`                          | Recomendacao personalizada         |
| `icon`           | `string`                          | Emoji representativo               |

#### `NotificationItem`
Notificacao do sistema.

| Campo       | Tipo                                                       | Descricao                  |
|-------------|-------------------------------------------------------------|-----------------------------|
| `id`        | `string`                                                    | Identificador unico        |
| `type`      | `'badge' \| 'level' \| 'campaign' \| 'challenge' \| 'alert'` | Tipo da notificacao      |
| `title`     | `string`                                                    | Titulo                     |
| `message`   | `string`                                                    | Corpo da mensagem          |
| `timestamp` | `string`                                                    | Data/hora (ISO datetime)   |
| `read`      | `boolean`                                                   | Se ja foi lida             |

---

## 2. Schema do Banco de Dados (Futuro)

Schema relacional planejado para quando o backend for implementado. Usa convencoes SQL padrao com `snake_case`. Todos os `id` sao UUID v4 gerados pelo servidor.

### 2.1 `companies`

```sql
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,          -- Razao social
  trade_name    VARCHAR(255),                   -- Nome fantasia
  cnpj          VARCHAR(18) UNIQUE NOT NULL,    -- CNPJ formatado
  sector        VARCHAR(100),                   -- Setor de atuacao
  plan          VARCHAR(50) DEFAULT 'trial',    -- trial | pro | enterprise
  logo_url      TEXT,                           -- URL do logo
  contact_name  VARCHAR(255),                   -- Nome do contato principal
  contact_email VARCHAR(255),                   -- Email do contato
  contact_phone VARCHAR(20),                    -- Telefone do contato
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 `departments`

```sql
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(7) DEFAULT '#3E7D5A',    -- Cor hex para UI
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, name)
);
```

### 2.3 `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  department_id UUID REFERENCES departments(id),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('rh', 'lideranca', 'colaboradora')),
  avatar_url    TEXT,
  level         INT DEFAULT 1,
  points        INT DEFAULT 0,
  streak        INT DEFAULT 0,
  last_active   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_email ON users(email);
```

### 2.4 `archetypes`

```sql
CREATE TABLE archetypes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(20) UNIQUE NOT NULL,     -- guardia, protetora, guerreira, equilibrista
  name        VARCHAR(100) NOT NULL,           -- Nome legivel
  description TEXT NOT NULL,                   -- Descricao narrativa
  base_scores JSONB NOT NULL,                  -- Array de 6 scores iniciais
  growth_30   JSONB NOT NULL,                  -- Crescimento projetado 30 dias
  growth_60   JSONB NOT NULL,                  -- Crescimento projetado 60 dias
  growth_90   JSONB NOT NULL,                  -- Crescimento projetado 90 dias
  missions    INT DEFAULT 0,                   -- Missoes recomendadas
  campaigns   INT DEFAULT 0,                   -- Campanhas sugeridas
  habits      INT DEFAULT 0                    -- Habitos a desenvolver
);
```

### 2.5 `quiz_results`

```sql
CREATE TABLE quiz_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  archetype_id UUID REFERENCES archetypes(id),
  answers_json JSONB NOT NULL,                 -- Array com todas as respostas
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)  -- Uma unica resposta por usuario (pode ser upsert)
);

CREATE INDEX idx_quiz_user ON quiz_results(user_id);
```

### 2.6 `badges`

```sql
CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(10) NOT NULL,            -- Emoji
  points      INT DEFAULT 0,                   -- Pontos ao desbloquear
  rarity      VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.7 `user_badges`

```sql
CREATE TABLE user_badges (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
```

### 2.8 `challenges`

```sql
CREATE TABLE challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category    VARCHAR(50) NOT NULL,            -- Habitos, Prevencao, Saude Mental, Sono, Onboarding
  points      INT DEFAULT 0,
  total_steps INT DEFAULT 1,                   -- Total de etapas para completar
  deadline    DATE,                            -- Prazo opcional
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.9 `user_challenges`

```sql
CREATE TABLE user_challenges (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress     INT DEFAULT 0,                  -- Etapas concluidas
  status       VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'locked')),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  PRIMARY KEY (user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_status ON user_challenges(status);
```

### 2.10 `campaigns`

```sql
CREATE TABLE campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,          -- Ex: "Outubro Rosa"
  month        VARCHAR(100) NOT NULL,          -- Ex: "Outubro - Prevencao"
  color        VARCHAR(100) NOT NULL,          -- Cor hex ou gradiente CSS
  status       VARCHAR(20) DEFAULT 'next' CHECK (status IN ('done', 'active', 'next')),
  status_label VARCHAR(50),                    -- Label legivel
  company_id   UUID REFERENCES companies(id),  -- NULL = campanha global
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.11 `user_campaigns`

```sql
CREATE TABLE user_campaigns (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  progress    INT DEFAULT 0,                   -- Percentual de progresso (0-100)
  joined_at   TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, campaign_id)
);

CREATE INDEX idx_user_campaigns_user ON user_campaigns(user_id);
```

### 2.12 `notifications`

```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL CHECK (type IN ('badge', 'level', 'campaign', 'challenge', 'alert')),
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
```

### 2.13 `health_scores`

```sql
CREATE TABLE health_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dimension   VARCHAR(50) NOT NULL,            -- Prevencao, Sono, Energia, Saude Mental, Habitos, Engajamento
  score       DECIMAL(3,1) NOT NULL,           -- Score de 0.0 a 10.0
  status      VARCHAR(10) CHECK (status IN ('green', 'yellow', 'red')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_scores_user ON health_scores(user_id);
CREATE INDEX idx_health_scores_latest ON health_scores(user_id, dimension, recorded_at DESC);
```

### 2.14 `leads`

```sql
CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(20),
  company     VARCHAR(255),                    -- Nome da empresa (texto livre)
  archetype   VARCHAR(20),                     -- Resultado do quiz publico
  consent     BOOLEAN DEFAULT FALSE,           -- LGPD: consentimento para contato
  source      VARCHAR(50),                     -- Origem (quiz, landing, referral)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
```

---

## 3. Relacionamentos (Diagrama ER)

```
┌─────────────┐       1:N       ┌──────────────┐
│  companies  │────────────────>│ departments  │
│             │                 │              │
│  id (PK)    │                 │  id (PK)     │
│  name       │    1:N          │  company_id  │──┐
│  cnpj       │────────┐       │  name        │  │
│  plan       │        │       │  color       │  │
└─────────────┘        │       └──────────────┘  │
                       │                          │
                       v                          │
                 ┌───────────┐                    │
                 │   users   │<───────────────────┘
                 │           │
                 │  id (PK)  │
                 │  company_id│
                 │  dept_id  │
                 │  role     │
                 │  level    │
                 │  points   │
                 │  streak   │
                 └─────┬─────┘
                       │
          ┌────────────┼────────────┬────────────────┬─────────────┐
          │            │            │                │             │
          v            v            v                v             v
   ┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐
   │quiz_results│ │user_badges│ │user_challenges│ │user_     │ │notifications│
   │            │ │          │ │              │ │campaigns │ │            │
   │ user_id    │ │ user_id  │ │ user_id      │ │ user_id  │ │ user_id    │
   │ archetype_id││ badge_id │ │ challenge_id │ │campaign_id│ │ type       │
   │ answers    │ │unlocked  │ │ progress     │ │ progress │ │ read       │
   └─────┬──────┘ └────┬─────┘ └──────┬───────┘ └────┬─────┘ └────────────┘
         │              │              │              │
         v              v              v              v
   ┌──────────┐  ┌──────────┐  ┌──────────┐   ┌──────────┐
   │archetypes│  │  badges  │  │challenges│   │campaigns │
   │          │  │          │  │          │   │          │
   │ key      │  │ name     │  │ title    │   │ name     │
   │ name     │  │ points   │  │ category │   │ month    │
   │ base     │  │ rarity   │  │ points   │   │ status   │
   │ growth*  │  │          │  │ steps    │   │ color    │
   └──────────┘  └──────────┘  └──────────┘   └──────────┘

   ┌──────────────┐               ┌──────────┐
   │health_scores │               │  leads   │
   │              │               │          │
   │ user_id (FK) │               │ name     │  (tabela independente,
   │ dimension    │               │ email    │   sem FK para users)
   │ score        │               │ archetype│
   │ status       │               │ consent  │
   │ recorded_at  │               │ source   │
   └──────────────┘               └──────────┘
```

### Resumo dos Relacionamentos

| Relacao                     | Tipo  | Descricao                                                |
|-----------------------------|-------|----------------------------------------------------------|
| companies -> departments    | 1:N   | Uma empresa tem varios departamentos                     |
| companies -> users          | 1:N   | Uma empresa tem muitos usuarios                          |
| departments -> users        | 1:N   | Um departamento tem muitos usuarios                      |
| users -> quiz_results       | 1:1   | Um usuario tem um resultado de quiz                      |
| archetypes -> quiz_results  | 1:N   | Um arquetipo pode estar em muitos resultados             |
| users <-> badges            | N:N   | Muitos usuarios podem ter muitos badges (via user_badges)|
| users <-> challenges        | N:N   | Muitos usuarios podem ter muitos desafios (via user_challenges) |
| users <-> campaigns         | N:N   | Muitos usuarios podem participar de muitas campanhas     |
| users -> notifications      | 1:N   | Um usuario recebe muitas notificacoes                    |
| users -> health_scores      | 1:N   | Um usuario tem historico de scores em varias dimensoes   |
| leads (independente)        | -     | Leads sao capturados antes do cadastro na plataforma     |

### Dimensoes de Saude (6 eixos do semaforo)

As 6 dimensoes usadas nos arrays de scores dos arquetipos e na tabela `health_scores`:

| Indice | Dimensao     | Descricao                                    |
|--------|--------------|----------------------------------------------|
| 0      | Prevencao    | Exames em dia, check-ups preventivos         |
| 1      | Sono         | Qualidade e quantidade de sono               |
| 2      | Energia      | Disposicao e vitalidade no dia a dia         |
| 3      | Saude Mental | Bem-estar emocional, estresse, ansiedade     |
| 4      | Habitos      | Alimentacao, hidratacao, movimento            |
| 5      | Engajamento  | Participacao ativa na plataforma             |

---

## 4. Dados Mock

Resumo dos dados mocados atualmente no front-end, organizados por arquivo.

### 4.1 `src/data/mock-users.ts`

3 usuarios de teste, um para cada papel:

| Chave         | Nome        | Role          | Departamento | Nivel | Pontos  | Streak |
|---------------|-------------|---------------|--------------|-------|---------|--------|
| `rh`          | Paola       | rh            | RH           | 9     | 87.840  | 45     |
| `colaboradora`| Ana Maria   | colaboradora  | Marketing    | 5     | 2.370   | 12     |
| `lideranca`   | Fernanda    | lideranca     | TI           | 7     | 5.200   | 22     |

### 4.2 `src/data/mock-company.ts`

Empresa de demonstracao:

| Campo           | Valor                       |
|-----------------|-----------------------------|
| Nome            | OFG - ONE FUTURE GROUP      |
| Nome Fantasia   | OFG                         |
| CNPJ            | 33.457.504/0001-94          |
| Setor           | Saude                       |
| Colaboradoras   | 812                         |
| Plano           | Trial                       |
| Contato         | Leonardo Fachetti            |

### 4.3 `src/data/mock-dashboard.ts`

Contem dados agregados para o painel de RH:

- **6 departamentos** (RH, Marketing, TI, Financeiro, Comercial, Operacoes) com metricas de engajamento, exames, pontos e tendencias
- **4 KPIs** do dashboard (colaboradoras ativas, engajamento, exames, atividades)
- **ROI** projetado: 4.8x multiplicador, R$ 287k economia, -23% absenteismo
- **4 campanhas** (Outubro Rosa, Novembro Azul, Dezembro Laranja, Janeiro Branco)
- **6 meses** de dados de engajamento ao longo do tempo (Jul-Dez)
- **5 faixas etarias** de distribuicao
- **6 meses** de evolucao de risco de saude
- **Convites**: 850 total, 812 aceitos, 24 pendentes, 14 expirados
- **2 relatorios** configurados (semanal e mensal)
- **Ranking** dos 3 melhores departamentos (podio)

### 4.4 `src/data/mock-collaborator.ts`

Dados da tela da colaboradora (Ana Maria):

- **Home**: nivel 5, 2.370 pontos, streak de 12 dias, 40% exames em dia
- **9 badges** (2 desbloqueados, 7 bloqueados), com pontuacao de 50 a 500
- **6 desafios** (3 ativos, 1 completo, 1 bloqueado, 1 sem deadline)
- **6 dimensoes do semaforo** (1 vermelho, 2 amarelo, 3 verde)
- **5 notificacoes** (3 nao lidas)

### 4.5 `src/data/archetypes.ts`

4 arquetipos com scores base e projecoes de crescimento:

| Chave         | Nome                   | Base media | Missoes | Campanhas | Habitos |
|---------------|------------------------|------------|---------|-----------|---------|
| `guardia`     | Guardia Resiliente     | 2.67       | 12      | 3         | 8       |
| `protetora`   | Protetora Silenciosa   | 2.58       | 10      | 4         | 10      |
| `guerreira`   | Guerreira em Evolucao  | 5.17       | 18      | 5         | 14      |
| `equilibrista`| Equilibrista Zen       | 4.20       | 15      | 4         | 12      |

### 4.6 `src/data/questions.ts`

6 perguntas do quiz de onboarding:

| #  | Tipo   | Tema                                   | Opcoes |
|----|--------|----------------------------------------|--------|
| 1  | single | Maior barreira para cuidar da saude    | 5      |
| 2  | multi  | Areas a transformar em 90 dias         | 6      |
| 3  | scale  | Autoavaliacao de saude (1-5)           | 5      |
| 4  | single | Motivacao principal                    | 4      |
| 5  | single | Prioridade para esta semana            | 6      |
| 6  | single | Faixa etaria                           | 6      |

**Dimensoes de referencia**: Prevencao, Sono, Energia, Saude Mental, Habitos, Engajamento

### 4.7 `src/data/campaigns.ts`

4 campanhas identicas as do dashboard, com gradientes CSS para a visao da colaboradora.

---

## 5. Plano de Migracao

Estrategia para migrar dos dados mock atuais para um banco de dados real.

### 5.1 Fases

#### Fase 1 - Preparacao (sem mudanca no front)

- Escolher stack de backend (recomendado: **Supabase** com PostgreSQL + Auth + Row Level Security)
- Criar o schema SQL descrito na secao 2
- Configurar autenticacao (email + magic link)
- Criar seed SQL baseado nos dados mock atuais para ambiente de desenvolvimento

#### Fase 2 - Camada de abstracacao

- Criar um diretorio `src/services/` com funcoes que atualmente retornam dados mock
- Cada servico exporta a mesma interface que os dados mock:
  - `getUserProfile()` -> retorna `MockUser`
  - `getDashboardKPIs()` -> retorna `DashboardKPI[]`
  - `getBadges(userId)` -> retorna `Badge[]`
  - etc.
- Nesta fase, as funcoes ainda retornam dados hardcoded, mas o front ja consome via servicos

#### Fase 3 - Conectar ao banco

- Substituir os retornos hardcoded por queries reais (Supabase client / Prisma / Drizzle)
- Implementar Row Level Security: cada usuario so ve dados da sua empresa
- Migrar autenticacao para o provider escolhido
- Manter dados mock como fallback para desenvolvimento local

#### Fase 4 - Dados dinamicos

- Implementar gravacao de respostas do quiz
- Implementar atualizacao de progresso em desafios e campanhas
- Implementar sistema de notificacoes em tempo real (Supabase Realtime)
- Implementar calculo automatico de streak e nivel

### 5.2 Mapeamento Mock -> Tabelas

| Dado Mock                    | Arquivo                      | Tabela(s) de destino                     |
|------------------------------|------------------------------|------------------------------------------|
| `MOCK_USERS`                 | `mock-users.ts`              | `users`                                  |
| `COMPANY`                    | `mock-company.ts`            | `companies`                              |
| `DEPARTMENTS`                | `mock-dashboard.ts`          | `departments` + aggregations de `users`  |
| `DASHBOARD_KPIS`             | `mock-dashboard.ts`          | Calculado em tempo real via queries       |
| `ROI_DATA`                   | `mock-dashboard.ts`          | Calculado via metricas agregadas          |
| `CAMPAIGNS_DASHBOARD`        | `mock-dashboard.ts`          | `campaigns`                              |
| `ENGAGEMENT_OVER_TIME`       | `mock-dashboard.ts`          | Agregacao temporal de `health_scores`     |
| `AGE_DISTRIBUTION`           | `mock-dashboard.ts`          | Agregacao de campo idade em `users`       |
| `HEALTH_RISK_EVOLUTION`      | `mock-dashboard.ts`          | Agregacao temporal de `health_scores`     |
| `CONVITES`                   | `mock-dashboard.ts`          | Nova tabela `invites` (nao modelada)      |
| `REPORTS`                    | `mock-dashboard.ts`          | Nova tabela `report_configs`              |
| `COLLABORATOR_HOME`          | `mock-collaborator.ts`       | Composto de `users` + `health_scores` + agregacoes |
| `BADGES`                     | `mock-collaborator.ts`       | `badges`                                 |
| `CHALLENGES`                 | `mock-collaborator.ts`       | `challenges` + `user_challenges`         |
| `SEMAFORO`                   | `mock-collaborator.ts`       | `health_scores` (ultimo registro por dimensao) |
| `NOTIFICATIONS`              | `mock-collaborator.ts`       | `notifications`                          |
| `ARCHETYPES`                 | `archetypes.ts`              | `archetypes`                             |
| `QUESTIONS`                  | `questions.ts`               | Pode permanecer no front (conteudo estatico) ou migrar para CMS |
| `CAMPAIGNS`                  | `campaigns.ts`               | `campaigns` + `user_campaigns`           |

### 5.3 Tabelas adicionais identificadas (nao modeladas acima)

Ao migrar, sera necessario criar tabelas adicionais:

| Tabela              | Justificativa                                          |
|---------------------|--------------------------------------------------------|
| `invites`           | Controlar convites enviados, pendentes e expirados     |
| `report_configs`    | Configuracao de relatorios por empresa                 |
| `user_exams`        | Rastrear exames individuais e datas                    |
| `activity_log`      | Log de acoes para calculo de streak e engajamento      |
| `content`           | Conteudos educativos associados a campanhas            |

### 5.4 Consideracoes de LGPD

- Todos os dados de saude (`health_scores`, `quiz_results`) sao dados sensiveis conforme LGPD Art. 5, II
- Necessario consentimento explicito e especifico (campo `consent` na tabela `leads`)
- Implementar anonimizacao para dados agregados no dashboard de RH
- RH ve apenas metricas agregadas por departamento, nunca dados individuais de colaboradoras
- Dados individuais so sao visiveis pela propria colaboradora
- Implementar direito ao esquecimento (soft delete com anonimizacao)
- Manter log de consentimento com versionamento

---

> Documento gerado em 14 de marco de 2026 para o projeto UniHER.
> Baseado na analise dos tipos TypeScript e dados mock existentes no repositorio.
