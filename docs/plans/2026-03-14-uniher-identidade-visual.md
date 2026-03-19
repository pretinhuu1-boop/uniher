# UniHER -- Identidade Visual & Design System

> Documento de referencia para designers e desenvolvedores.
> Versao: 1.0 | Data: 14 de marco de 2026

---

## Sumario

1. [Marca](#1-marca)
2. [Logo](#2-logo)
3. [Paleta de Cores](#3-paleta-de-cores)
4. [Tipografia](#4-tipografia)
5. [Espacamento e Grid](#5-espacamento-e-grid)
6. [Sombras](#6-sombras)
7. [Componentes UI](#7-componentes-ui)
8. [Iconografia](#8-iconografia)
9. [Animacoes](#9-animacoes)
10. [Responsividade](#10-responsividade)
11. [Acessibilidade](#11-acessibilidade)

---

## 1. Marca

### Nome

**UniHER** -- a juncao de dois conceitos:

- **Uni** = universal, unificado, unico -- a ideia de uma plataforma que unifica o cuidado com a saude feminina
- **HER** = dela, feminino (em ingles) -- o publico-alvo, a mulher no ambiente corporativo

A grafia com "HER" em caixa alta reforca a centralidade da mulher na proposta de valor.

### Tagline

> "O Duolingo da Saude Feminina no Trabalho"

A tagline faz referencia direta ao modelo de gamificacao do Duolingo -- streaks, badges, niveis, recompensas -- aplicado ao contexto de saude feminina corporativa. Ela comunica imediatamente o modelo mental do produto para qualquer pessoa.

### Tom de voz

| Atributo         | Descricao                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Acolhedor        | Linguagem calorosa, proxima, como uma amiga que entende. Evita frieza clinica.                   |
| Profissional     | Dados e ciencia respaldando cada afirmacao. Credibilidade sem academicismo.                      |
| Empoderador      | Foco em autonomia, escolha e acao. "Voce pode", "Voce merece", "O proximo passo e seu".         |
| Nunca condescendente | Jamais paternalista. Respeita a inteligencia e a experiencia vivida de cada mulher.          |

**Exemplos de tom:**

- Correto: "Sua jornada de saude e unica. Vamos personalizar juntas."
- Evitar: "Voce precisa cuidar melhor da sua saude." (paternalista)
- Correto: "92% das colaboradoras engajadas completaram o primeiro ciclo."
- Evitar: "Todo mundo sabe que saude e importante." (generico)

---

## 2. Logo

### Conceito

O logo e formado por **3 petalas/folhas estilizadas** que, juntas, formam a silhueta de um **coracao**. Cada petala representa um pilar da plataforma:

1. **Saude fisica** (prevencao, check-ups, ciclo menstrual)
2. **Saude emocional** (estresse, burnout, bem-estar mental)
3. **Saude social** (comunidade, apoio, pertencimento)

### Versoes

| Versao              | Uso                                                      | Descricao                                    |
| ------------------- | -------------------------------------------------------- | -------------------------------------------- |
| **Principal**       | Landing page, materiais institucionais, apresentacoes    | Icone + texto "UniHER", dourado sobre cream  |
| **Reduzida (icon)** | Favicon, avatar, sidebar, app mobile                     | Apenas as 3 petalas, sem texto               |
| **Monocromatica**   | Fundos escuros, impressao P&B                            | Versao em branco puro ou em rose-500         |

### Cores do logo

| Elemento         | Cor                | Hex       |
| ---------------- | ------------------ | --------- |
| Petala principal | Dourado            | `#B8922A` |
| Petala secundaria| Rosa claro         | `#EAB8CB` |
| Petala terciaria | Rosa               | `#C85C7E` |

### Area de protecao

Manter uma margem minima equivalente a altura da letra "U" em "UniHER" ao redor do logo em todas as direcoes. Nunca comprimir, distorcer ou alterar as proporcoes.

### Tamanho minimo

- Digital: 24px de altura para a versao reduzida, 36px na sidebar
- Impresso: 10mm de altura para a versao reduzida

---

## 3. Paleta de Cores

A paleta foi desenhada para transmitir **acolhimento, feminilidade sofisticada e confianca**. Evita os rosas saturados/infantis em favor de tons que remetem a cosmeticos premium e ambientes de spa.

### 3.1 Cream (fundos e superficies)

| Token          | Hex       | Alias CSS           | Uso                                                    |
| -------------- | --------- | ------------------- | ------------------------------------------------------ |
| `--cream-50`   | `#F7F3EE` | `--cream`           | Fundo principal do body e da plataforma                |
| `--cream-100`  | `#EDE7DC` | `--cream-2`         | Fundo secundario (hover de botoes outline, topbar)     |
| `--cream-200`  | `#E8E0D4` | `--cream-3`         | Fundo terciario (tracks de progresso, back buttons)    |

O cream substitui o branco puro como cor de fundo, criando uma sensacao mais calorosa e menos esteril. O branco (`#FFFFFF`) e reservado para superficies elevadas como cards e modais.

### 3.2 Rose (cor primaria / acao)

| Token          | Hex       | Alias CSS           | Uso                                                    |
| -------------- | --------- | ------------------- | ------------------------------------------------------ |
| `--rose-50`    | `#F9EEF3` | `--rose-pale`       | Fundos sutis (nav ativo, option hover, alert areas)    |
| `--rose-100`   | `#F2DDE6` | `--rose-pale-2`     | Bordas leves, fundo hover intensificado                |
| `--rose-300`   | `#EAB8CB` | `--rose-light`      | Bordas de botoes outline, bordas de cards featured     |
| `--rose-400`   | `#E8849E` | `--rose-2`          | Cor secundaria, focus ring, podio 2o lugar             |
| `--rose-500`   | `#C85C7E` | `--rose`            | **Cor primaria**: botoes CTA, links ativos, badges,    |
|                |           |                     | eyebrows, valores destacados, theme-color              |
| `--rose-700`   | `#8C3255` | `--rose-dark`       | Hover de botoes primarios, texto em botoes outline     |

A escala de rose e o coracao do sistema. `--rose-500` e a cor de acao principal -- usada em todo CTA, indicador ativo e elemento interativo.

### 3.3 Gold (destaques e premiacoes)

| Token          | Hex       | Alias CSS           | Uso                                                    |
| -------------- | --------- | ------------------- | ------------------------------------------------------ |
| `--gold-50`    | `#FAF5E8` | `--gold-pale`       | Fundo de badges ativos, level badges                   |
| `--gold-200`   | `#E8D5A3` | `--gold-border`     | Bordas de badges gold, separadores premium             |
| `--gold-500`   | `#D4B060` | `--gold-light`      | Gradiente de barras de nivel (rose -> gold)            |
| `--gold-700`   | `#B8922A` | `--gold`            | Texto dourado em headlines, logo, level badges         |

O gold e usado com parcimonia para comunicar **valor, conquista e premium**. Aparece em textos de destaque no hero, badges de nivel e gradientes de progresso.

### 3.4 Green (acento / sucesso)

| Token          | Hex       | Alias CSS           | Uso                                                    |
| -------------- | --------- | ------------------- | ------------------------------------------------------ |
| `--green-600`  | `#3E7D5A` | `--green`           | Status concluido, badges "done", indicadores positivos |

Uso complementar no sistema de semaforo:
- Verde semaforo: `#2ECC71` (fundo `#f0fdf4`, borda `#bbf7d0`)
- Amarelo semaforo: `#F1C40F` (fundo `#fefce8`, borda `#fef08a`)
- Vermelho semaforo: `#E74C3C` (fundo `#fef2f2`, borda `#fecaca`)

### 3.5 Texto

| Token          | Hex       | Alias CSS           | Uso                                                    |
| -------------- | --------- | ------------------- | ------------------------------------------------------ |
| `--text-900`   | `#2A1A1F` | `--text`            | Texto principal: titulos, headlines, body text          |
| `--text-600`   | `#6B4D57` | `--text-2`          | Texto secundario: subtitulos, descricoes, labels       |
| `--text-400`   | `#A48090` | `--text-3`          | Texto terciario: metadados, placeholders, captions     |
| `--text-300`   | `#C4AEBA` | `--text-4`          | Texto quaternario: textos desabilitados, hints leves   |

Todos os tons de texto possuem subtom rosado, mantendo coerencia cromatica com a paleta rose.

### 3.6 Bordas

| Token          | Valor                           | Alias CSS   | Uso                                           |
| -------------- | ------------------------------- | ----------- | --------------------------------------------- |
| `--border-1`   | `rgba(180, 130, 150, 0.16)`     | `--border`  | Borda padrao de cards, inputs, separadores     |
| `--border-2`   | `rgba(180, 130, 150, 0.28)`     | --           | Borda media: botoes outline, dividers          |
| `--border-3`   | `rgba(180, 130, 150, 0.42)`     | --           | Borda forte: radio/checkbox inativos           |

As bordas usam rgba com subtom rose (180, 130, 150) em vez de cinza puro, garantindo que se integrem organicamente a paleta.

### 3.7 Fundo do body

Alem do cream-50 solido, o body possui um **overlay de gradientes radiais** fixo:

```
radial-gradient(ellipse 80% 60% at 50% 0%, rgba(234, 184, 203, 0.12), transparent 70%)
radial-gradient(ellipse 60% 50% at 80% 100%, rgba(212, 176, 96, 0.08), transparent 60%)
```

Isso cria uma aura sutil de rose no topo e gold no canto inferior direito, dando profundidade sem sobrecarregar.

---

## 4. Tipografia

### 4.1 Fontes

| Funcao     | Fonte                  | Fallback                 | CSS Variable      |
| ---------- | ---------------------- | ------------------------ | ------------------ |
| Display    | **Cormorant Garamond** | Georgia, serif           | `--ff-display`     |
| Body       | **DM Sans**            | system-ui, sans-serif    | `--ff-body`        |

### 4.2 Cormorant Garamond (Display)

Uma serif elegante e sofisticada, usada para criar hierarquia visual e transmitir refinamento.

**Pesos carregados:** 400 (Regular), 500 (Medium), 600 (SemiBold)
**Estilos:** Normal e Italico

**Onde usar:**
- Headlines e titulos de secao (`h1` a `h6`)
- Numeros grandes e metricas de destaque (scores, percentuais, contadores)
- Nomes da marca e taglines
- Titulos de cards
- Eyebrow text decorativo (em combinacao com DM Sans)

**Configuracoes padrao para headings:**
- `font-weight: 600` (ou 700 em titulos de impacto)
- `line-height: 1.2` (headings gerais) ou `1.12` (hero headline)

### 4.3 DM Sans (Body)

Uma sans-serif geometrica e limpa, otimizada para legibilidade em telas.

**Pesos carregados:** 300 (Light), 400 (Regular), 500 (Medium)

**Onde usar:**
- Texto corrido e paragrafos
- Labels de formularios e inputs
- Botoes e CTAs
- Eyebrows (labels de secao em uppercase)
- Navegacao (sidebar, navbar)
- Badges, tags e chips
- Tooltips e captions
- Todos os elementos de interface

**Configuracoes padrao para body:**
- `font-weight: 400` para texto corrido
- `font-weight: 500` para labels e botoes
- `font-weight: 600` para eyebrows e badges
- `font-weight: 700` para destaques e CTAs
- `line-height: 1.6` para texto corrido
- `letter-spacing: 0.12em` para eyebrows em uppercase

### 4.4 Escala tipografica

A escala usa `clamp()` para responsividade fluida, sem breakpoints abruptos.

| Elemento                  | Tamanho                                  | Peso | Familia  |
| ------------------------- | ---------------------------------------- | ---- | -------- |
| Hero headline             | `clamp(2rem, 5vw, 3.25rem)`             | 700  | Display  |
| Section title             | `clamp(1.75rem, 4vw, 2.75rem)`          | 700  | Display  |
| Question title (quiz)     | `clamp(1.25rem, 3.5vw, 1.6rem)`         | 700  | Display  |
| Card title                | `1.15rem`                                | 700  | Display  |
| Subtitle / section-sub    | `clamp(0.95rem, 1.8vw, 1.125rem)`       | 400  | Body     |
| Body text                 | `0.9rem` a `0.95rem`                     | 400  | Body     |
| Button text               | `0.95rem`                                | 600  | Body     |
| Sidebar nav item          | `0.875rem`                               | 400  | Body     |
| Eyebrow / section label   | `0.75rem`                                | 600  | Body     |
| Badge / tag               | `0.72rem` a `0.75rem`                    | 600  | Body     |
| Caption / meta            | `0.65rem` a `0.7rem`                     | 600  | Body     |
| Badge label (small)       | `0.6rem`                                 | 600  | Body     |

### 4.5 Renderizacao

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

Font display: `swap` para ambas as fontes, garantindo que o texto seja exibido imediatamente com a fallback e troque suavemente quando a fonte custom carregar.

---

## 5. Espacamento e Grid

### 5.1 Container

| Contexto        | Max-width  | Padding lateral       |
| --------------- | ---------- | --------------------- |
| Landing page    | `1100px`   | `24px` (desktop), `16px` (mobile) |
| Plataforma      | `1280px`   | `32px` (desktop), `16px` (mobile) |

O container e centralizado com `margin: 0 auto`.

### 5.2 Espacamento entre secoes

| Breakpoint | Padding vertical de secao |
| ---------- | ------------------------- |
| Desktop    | `96px`                    |
| Mobile     | `64px`                    |

### 5.3 Espacamento interno de componentes

| Elemento          | Padding                        |
| ----------------- | ------------------------------ |
| Card (desktop)    | `28px 24px`                    |
| Card (mobile)     | `24px 20px`                    |
| Sidebar nav item  | `10px 12px`                    |
| Button primary    | `14px 28px` a `14px 30px`      |
| Button secondary  | `13px 24px` a `14px 28px`      |
| Quiz wrapper      | `1.5rem 2rem` (desktop), `1.25rem` (mobile) |
| Trust strip       | `24px 40px`                    |
| Alert row         | `12px 16px`                    |

### 5.4 Gaps

| Contexto                | Gap       |
| ----------------------- | --------- |
| Grid de cards (3 cols)  | `20px`    |
| Opcoes de quiz          | `0.5rem`  |
| Badges grid (3x3)      | `10px`    |
| CTAs (botoes lado a lado) | `14px` |
| Nav items               | `2px`     |
| Avatar cards (hero)     | `32px` (desktop), `12px` (mobile) |

### 5.5 Border Radius

| Token          | Valor  | Alias CSS  | Uso                                               |
| -------------- | ------ | ---------- | -------------------------------------------------- |
| `--radius-xs`  | `6px`  | `--r-xs`   | Checkboxes, botoes de menu, focus ring             |
| `--radius-sm`  | `10px` | `--r-sm`   | Nav items, opcoes de quiz, badges, inputs          |
| `--radius-md`  | `16px` | `--r-md`   | Cards medios, modais                               |
| `--radius-lg`  | `24px` | `--r-lg`   | Cards grandes, avatar cards, gamification cards    |
| `--radius-xl`  | `32px` | `--r-xl`   | Cards UI, trust strip                              |
| `--radius-2xl` | `48px` | `--r-2xl`  | Botoes pill (CTA), hero buttons                    |
| `999px`        | --     | --          | Pills, eyebrows, tags, progress bars (full round)  |

Botoes primarios e secundarios usam `border-radius: 50px` ou `--radius-2xl` para o formato **pill** (totalmente arredondado).

---

## 6. Sombras

Todas as sombras possuem subtom rose (`rgba(140, 50, 85, ...)`) em vez de preto/cinza puro. Isso mantem a coerencia cromatica e evita "manchas escuras" que quebrariam a atmosfera acolhedora.

| Token          | Valor                                        | Alias CSS    | Uso                                           |
| -------------- | -------------------------------------------- | ------------ | ---------------------------------------------- |
| `--shadow-sm`  | `0 1px 6px rgba(140, 50, 85, 0.07)`         | `--shadow-3` | Estado default de trust strip, cards leves     |
| `--shadow-md`  | `0 3px 18px rgba(140, 50, 85, 0.09)`        | `--shadow-2` | Hover de cards padrao, cards featured default  |
| `--shadow-xl`  | `0 12px 48px rgba(140, 50, 85, 0.12)`       | `--shadow`   | Cards destacados, hover forte, modais          |

### Sombras especificas de botoes

Os botoes primarios possuem uma sombra **colored** propria, usando a cor do botao:

```
Default:  0 4px 20px rgba(200, 92, 126, 0.30)
Hover:    0 6px 28px rgba(200, 92, 126, 0.44)
Active:   0 2px 12px rgba(200, 92, 126, 0.30)
```

Essa sombra colorida cria a ilusao de que o botao esta "brilhando", reforando a acao.

---

## 7. Componentes UI

### 7.1 Botoes

#### Primary (CTA)

- **Background:** gradiente `linear-gradient(135deg, var(--rose-500), var(--rose-700))`, ou solido `var(--rose-500)`
- **Texto:** `#FFFFFF`, font-weight 500-600, font-size 0.95rem
- **Padding:** `14px 28px` a `14px 30px`
- **Border-radius:** `50px` / `var(--radius-2xl)` (pill)
- **Sombra:** `0 4px 20px rgba(200, 92, 126, 0.32)`
- **Hover:** `translateY(-2px)`, sombra intensificada, background `var(--rose-700)`
- **Active:** `translateY(0)`, sombra reduzida
- **Transicao:** `0.18s` a `0.25s` com `cubic-bezier(0.16, 1, 0.3, 1)`

#### Secondary (Outline)

- **Background:** transparente
- **Texto:** `var(--rose-dark)` ou `var(--text-900)`
- **Borda:** `1.5px solid var(--rose-light)` ou `1px solid var(--border-2)`
- **Padding:** `13px 24px` a `14px 28px`
- **Border-radius:** `50px` / `var(--radius-2xl)` (pill)
- **Hover:** `background: var(--rose-pale)`, borda intensifica, `translateY(-1px)`

#### Disabled

- **Opacidade:** `0.32` a `0.45`
- **Pointer-events:** `none` / `cursor: not-allowed`
- **Sombra:** removida

#### Full-width

- `width: 100%` com `justify-content: center`
- Usado em contextos mobile e dentro de modais/quiz

### 7.2 Cards

#### Card padrao

- **Background:** `#FFFFFF`
- **Borda:** `1px solid var(--border-1)`
- **Border-radius:** `var(--radius-xl)` (32px) para cards UI, `var(--radius-lg)` (24px) para cards de conteudo
- **Padding:** `28px 24px` (desktop), `24px 20px` (mobile)
- **Sombra default:** `var(--shadow-sm)`
- **Hover:** `translateY(-3px)` a `translateY(-4px)`, sombra `var(--shadow-md)` a `var(--shadow-xl)`
- **Transicao:** `0.2s` a `0.3s` com `cubic-bezier(0.16, 1, 0.3, 1)`

#### Card featured/highlight

- **Background:** `linear-gradient(155deg, var(--rose-pale) 0%, var(--gold-pale) 100%)`
- **Borda:** `rgba(200, 92, 126, 0.22)`
- Usado para destacar conteudo premium ou em destaque

#### Card wide

- `grid-column: span 2` (volta para `span 1` em mobile)
- **Background:** `linear-gradient(160deg, var(--rose-50) 0%, #fff 60%)`
- **Borda:** `var(--rose-300)`
- **Sombra:** `var(--shadow-md)`

### 7.3 Campos de input (Option Buttons / Quiz)

O sistema de quiz usa botoes estilizados como inputs ao inves de campos de formulario tradicionais:

#### Option button (radio/checkbox)

- **Background:** `#FFFFFF`
- **Borda:** `1px solid var(--border-1)`
- **Border-radius:** `var(--radius-sm)` (10px)
- **Padding:** `0.875rem 1rem`
- **Hover:** `border-color: var(--rose-300)`, `background: var(--rose-50)`
- **Ativo/Selecionado:** `border-color: var(--rose-500)`, `background: var(--rose-50)`, `box-shadow: 0 0 0 1px var(--rose-500)`

#### Indicador radio

- Circulo de `20px` com borda `2px solid var(--border-3)`
- Quando ativo: borda `var(--rose-500)`, dot interno `10px` preenchido com `var(--rose-500)`

#### Indicador checkbox

- Quadrado de `20px` com borda `2px solid var(--border-3)`, border-radius `var(--radius-xs)`
- Quando ativo: borda e fundo `var(--rose-500)`, com check mark em branco

#### Scale buttons (escala 1-5)

- Layout flex com `flex: 1` para cada opcao
- Numero em Cormorant Garamond `1.35rem`, peso 700
- Label em DM Sans `0.62rem`, peso 600, uppercase
- Mesmos estados hover/ativo dos option buttons

### 7.4 Badges / Pills

#### Status badges (pequenos)

- **Font-size:** `10px`
- **Padding:** `3px 10px`
- **Border-radius:** `10px`
- **Font-weight:** 500

| Variante | Background   | Texto          | Uso                    |
| -------- | ------------ | -------------- | ---------------------- |
| Done     | `#EAF4EE`    | `#3E7D5A`     | Tarefa concluida       |
| Active   | `--gold-pale`| `--gold`       | Em andamento           |
| Next     | `--rose-pale`| `--rose-dark`  | Proximo passo          |

#### Level badge

- **Background:** `var(--gold-50)`
- **Texto:** `var(--gold-700)`
- **Borda:** `1px solid var(--gold-200)`
- **Font-size:** `0.72rem`, peso 700
- **Padding:** `4px 12px`
- **Border-radius:** `999px`

#### Nav badge (notificacao)

- **Background:** `var(--rose-500)`
- **Texto:** branco
- **Font-size:** `0.65rem`, peso 600
- **Min-width/height:** `18px`
- **Border-radius:** `9px`

### 7.5 Barras de progresso

#### Barra padrao

- **Track:** `var(--border-2)` ou `var(--cream-100)` ou `var(--cream-200)`
- **Track height:** `4px` (padrao), `6px` (quiz), `8px` (ranking), `10px` (level)
- **Border-radius:** `2px` a `999px`
- **Fill:** `linear-gradient(90deg, var(--rose-light), var(--rose))` (padrao)
- **Fill alternativo:** `linear-gradient(90deg, var(--rose-400), var(--rose-500))` (ranking, quiz)
- **Fill nivel:** `linear-gradient(90deg, var(--rose-400), var(--gold-500))` (rose -> gold para nivel)
- **Transicao:** `width 0.4s ease` a `width 1s ease`

### 7.6 Tags / Chips

Usadas para categorias e labels:

- **Eyebrow pill (hero):** background `var(--rose-50)`, borda `var(--rose-100)`, border-radius `999px`, padding `8px 20px`, texto `var(--rose-700)`, font-size `0.8rem`
- **Section eyebrow:** sem fundo, texto `var(--rose-500)`, font-size `0.75rem`, uppercase, letter-spacing `0.12em`

### 7.7 Podio (Arena)

Componente visual de ranking com barras verticais:

- 1o lugar: `height: 80px`, background `var(--rose-500)`
- 2o lugar: `height: 60px`, background `var(--rose-400)`
- 3o lugar: `height: 44px`, background `var(--rose-300)`
- Barras com `border-radius: 8px 8px 0 0`
- Avatares circulares de `40px` com background `var(--cream-200)`

### 7.8 Alertas (Semaforo)

Cards de alerta com dot colorido indicando urgencia:

| Nivel    | Background  | Borda      | Dot color  | Dot glow                          |
| -------- | ----------- | ---------- | ---------- | --------------------------------- |
| Vermelho | `#fef2f2`   | `#fecaca`  | `#E74C3C`  | `0 0 6px rgba(231, 76, 60, 0.4)`  |
| Amarelo  | `#fefce8`   | `#fef08a`  | `#F1C40F`  | `0 0 6px rgba(241, 196, 15, 0.4)` |
| Verde    | `#f0fdf4`   | `#bbf7d0`  | `#2ECC71`  | `0 0 6px rgba(46, 204, 113, 0.4)` |

---

## 8. Iconografia

### 8.1 Estilo de icones

Todos os icones sao **SVG inline** com as seguintes caracteristicas:

- **Estilo:** stroke (contorno), nunca fill (preenchido)
- **Stroke width:** `1.5px`
- **Stroke linecap:** `round`
- **Stroke linejoin:** `round`
- **Viewbox:** `0 0 20 20`
- **Cor:** herda de `currentColor` para facil tematizacao via CSS

### 8.2 Tamanhos

| Contexto          | Tamanho    |
| ----------------- | ---------- |
| Nav icon (sidebar)| `20px`     |
| Card icon         | `20px` (dentro de container de `40px`) |
| Button inline icon| Tamanho do texto |

### 8.3 Container de icone (cards)

```
width: 40px
height: 40px
border-radius: var(--radius-sm)  /* 10px */
background: var(--rose-50)
color: var(--rose-500)
display: flex / align-items: center / justify-content: center
```

### 8.4 Padrao NavIcon

A sidebar implementa um componente `NavIcon` que mapeia nomes para SVGs inline. Os icones seguem metaforas visuais:

| Nome       | Metafora visual                              |
| ---------- | --------------------------------------------- |
| dashboard  | Grid 2x2 de quadrados com cantos arredondados |
| semaforo   | Circulo com ponteiro de relogio               |
| campanhas  | Calendario com marcadores                     |
| desafios   | Alvo concentrico (3 circulos)                 |
| conquistas | Estrela de 5 pontas                           |
| historico  | Relogio circular com ponteiro                 |
| config     | Engrenagem                                    |

### 8.5 Emojis

Emojis sao usados no sistema de gamificacao para badges e conquistas, adicionando ludicidade:

- Font-size: `1.4rem` nos badge squares
- Exemplos: coracao, estrela, trofeu, fogo (streak), medalha
- Exibidos dentro de containers com `aspect-ratio: 1`, background `var(--cream-50)`, borda `var(--border-1)`

---

## 9. Animacoes

### 9.1 Keyframes disponíveis

| Nome       | Descricao                                           | Duracao tipica |
| ---------- | --------------------------------------------------- | -------------- |
| `fadeUp`   | Opacity 0 -> 1 + translateY(24px) -> 0              | 0.3s - 0.7s    |
| `fadeIn`   | Opacity 0 -> 1                                      | 0.3s           |
| `scaleIn`  | Opacity 0 -> 1 + scale(0.92) -> 1                   | 0.3s           |
| `float`    | translateY(0) -> -8px -> 0 (loop)                    | 4s             |
| `shimmer`  | background-position -200% -> 200% (skeleton)         | 1.5s - 2s      |
| `pulse`    | Opacity 1 -> 0.5 -> 1 (loop)                         | 2s             |
| `marquee`  | translateX(0) -> -50% (scroll infinito)              | variavel       |
| `spin`     | rotate 0deg -> 360deg (loading)                       | 1s             |

### 9.2 RevealOnScroll

Componente de revelacao por scroll usando Intersection Observer:

- **Estado inicial:** `opacity: 0`, `transform: translateY(28px)`
- **Estado visivel:** `opacity: 1`, `transform: translateY(0)`
- **Transicao:** `0.7s cubic-bezier(0.16, 1, 0.3, 1)` (ease-out enfatico)
- **will-change:** `opacity, transform` (hint para GPU)

### 9.3 Transicoes padrao

| Propriedade          | Duracao  | Easing                              | Uso                           |
| -------------------- | -------- | ----------------------------------- | ----------------------------- |
| Cor / background     | `0.15s`  | `ease`                              | Links, nav items, icones      |
| Transform + shadow   | `0.18s`  | `ease` ou `cubic-bezier(0.16,1,0.3,1)` | Botoes, cards hover       |
| Width (progresso)    | `0.4s`   | `ease`                              | Barras de progresso (quiz)    |
| Width (progresso)    | `0.6s`   | `ease`                              | Barras de ranking             |
| Width (progresso)    | `1s`     | `ease`                              | ProgressBar component         |
| Sidebar              | `0.3s`   | `ease`                              | Slide in/out mobile           |

### 9.4 Micro-interacoes

- **Botao hover:** `translateY(-2px)` + sombra intensificada
- **Card hover:** `translateY(-3px)` a `translateY(-4px)` + sombra aumentada
- **Badge hover:** `scale(1.06)`
- **Pulse dot (hero):** pulsacao continua com scale `1 -> 0.8` e opacity `1 -> 0.45`
- **Float (card destaque):** flutuacao sutil de 8px a cada 4s

### 9.5 prefers-reduced-motion

Quando o usuario prefere movimento reduzido, **todas** as animacoes e transicoes sao desativadas:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

O componente RevealOnScroll tambem respeita essa preferencia, exibindo o conteudo imediatamente sem transicao.

---

## 10. Responsividade

### 10.1 Breakpoints

| Breakpoint | Valor     | Alvo                                    |
| ---------- | --------- | --------------------------------------- |
| Mobile     | `480px`   | Smartphones em retrato                  |
| Tablet     | `768px`   | Tablets, smartphones em paisagem        |
| Desktop    | `900px`   | Transicao de grid (gamification)        |
| Desktop+   | `1024px`  | Desktop padrao                          |

### 10.2 Comportamento do Grid

| Breakpoint    | Colunas do grid principal | Cards wide       |
| ------------- | ------------------------- | ---------------- |
| > 900px       | 3 colunas                 | span 2           |
| 768px - 900px | 1 coluna                  | span 1           |
| < 480px       | 1 coluna                  | span 1           |

### 10.3 Layout da plataforma

| Breakpoint | Sidebar              | Main content             | Topbar     |
| ---------- | -------------------- | ------------------------ | ---------- |
| > 768px    | Fixa, 240px, visivel | margin-left: 240px       | Oculta     |
| <= 768px   | Oculta (slide-in)    | margin-left: 0           | Visivel    |

### 10.4 Tipografia responsiva

As funcoes `clamp()` garantem escalabilidade fluida:

- Hero headline: `2rem` (mobile) a `3.25rem` (desktop)
- Section title: `1.5rem` (mobile 480px) a `2.75rem` (desktop)
- Subtitles: `0.9rem` (mobile) a `1.125rem` (desktop)

### 10.5 Ajustes mobile (480px)

- Container padding: `16px` (reduzido de `24px`)
- Section padding: `64px 0` (reduzido de `96px 0`)
- Cards padding: `24px 20px` (reduzido de `28px 24px`)
- Botoes CTA: `width: 100%` em coluna
- Avatar cards hero: `120px` (reduzido de `180px`)
- Trust strip: wrapping com dividers ocultos
- Quiz scale buttons: gaps e padding reduzidos

### 10.6 Ajustes tablet (768px)

- Sidebar: escondida com overlay `rgba(0, 0, 0, 0.4)`
- Topbar: exibida com menu hamburger
- Cards wide: voltam para span 1
- Trust strip: flex-wrap com items de min-width `100px`
- CTAs do hero: empilhados verticalmente

---

## 11. Acessibilidade

### 11.1 Focus Visible

Todos os elementos interativos possuem estilo de foco visivel:

```css
:focus-visible {
  outline: 2px solid var(--rose-400);  /* #E8849E */
  outline-offset: 2px;
  border-radius: 4px;
}
```

O outline usa `--rose-400` para manter coerencia visual com a marca enquanto permanece altamente visivel.

### 11.2 Roles e labels ARIA

- **Navegacao:** `<nav>` semantico com `aria-label` descritivo
- **Botoes:** `<button>` nativo para todas as acoes interativas (nunca `<div>` ou `<span>` clicavel)
- **Links:** `<a>` com `href` para navegacao, `<Link>` do Next.js para rotas internas
- **Formularios (quiz):** Opcoes com role implicito via estrutura semantica, estados selecionados comunicados visualmente e via classe
- **Imagens:** SVGs decorativos com `aria-hidden="true"`, SVGs informativos com `<title>` ou `aria-label`

### 11.3 Contraste de cores

| Par de cores                          | Ratio estimado | Conformidade |
| ------------------------------------- | -------------- | ------------ |
| `--text-900` (#2A1A1F) / cream (#F7F3EE) | ~12:1        | AAA          |
| `--text-600` (#6B4D57) / cream (#F7F3EE) | ~5.5:1       | AA           |
| `--rose-500` (#C85C7E) / branco (#FFF)    | ~4.2:1       | AA (large)   |
| `--rose-700` (#8C3255) / branco (#FFF)    | ~6.5:1       | AA           |
| `--gold-700` (#B8922A) / cream (#F7F3EE)  | ~4.1:1       | AA (large)   |
| `--green-600` (#3E7D5A) / #EAF4EE        | ~4.5:1       | AA           |

**Nota:** O rose-500 sobre branco atinge AA apenas para texto grande (18px+ ou 14px bold). Para texto menor, usar rose-700.

### 11.4 Movimento reduzido

Conforme documentado na secao 9.5, o sistema respeita `prefers-reduced-motion: reduce` globalmente, desativando todas as animacoes e transicoes para usuarios que configuram essa preferencia no sistema operacional.

### 11.5 Scroll behavior

```css
html { scroll-behavior: smooth; }
section[id] { scroll-margin-top: 80px; }
```

O `scroll-margin-top` compensa a navbar fixa ao navegar por ancoras. O smooth scroll e desativado via `prefers-reduced-motion`.

### 11.6 Tamanho de texto

```css
-webkit-text-size-adjust: 100%;
-moz-text-size-adjust: 100%;
text-size-adjust: 100%;
```

Previne ajustes automaticos de tamanho de texto em mobile, respeitando a escala tipografica definida.

### 11.7 Overflow

```css
h1, h2, h3, h4, h5, h6, p {
  overflow-wrap: break-word;
}
```

Previne que palavras longas quebrem o layout, especialmente em telas estreitas.

---

## Apendice: Tokens CSS completos

Referencia rapida de todos os custom properties definidos em `:root`:

```
/* Cream */    --cream-50, --cream-100, --cream-200
/* Rose */     --rose-50, --rose-100, --rose-300, --rose-400, --rose-500, --rose-700
/* Gold */     --gold-50, --gold-200, --gold-500, --gold-700
/* Green */    --green-600
/* Text */     --text-900, --text-600, --text-400, --text-300
/* Border */   --border-1, --border-2, --border-3
/* Shadow */   --shadow-sm, --shadow-md, --shadow-xl
/* Font */     --ff-display, --ff-body
/* Radius */   --radius-xs (6), --radius-sm (10), --radius-md (16),
               --radius-lg (24), --radius-xl (32), --radius-2xl (48)
```

**Aliases disponiveis para uso rapido:**

```
--cream, --cream-2, --cream-3
--rose, --rose-2, --rose-light, --rose-dark, --rose-pale, --rose-pale-2
--gold, --gold-light, --gold-pale, --gold-border
--green, --text, --text-2, --text-3, --text-4, --white
--border, --shadow, --shadow-2, --shadow-3
--r-xs, --r-sm, --r-md, --r-lg, --r-xl, --r-2xl
```

---

*Documento gerado em 14 de marco de 2026. Manter atualizado conforme evolucao do design system.*
