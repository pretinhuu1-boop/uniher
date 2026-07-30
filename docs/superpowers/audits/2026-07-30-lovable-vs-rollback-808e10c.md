# UniHER Lovable vs rollback 808e10c

Data: 2026-07-30  
Projeto Lovable: `UniHer Health Hub` (`b2e342ba-3ad5-4a43-b61e-9c5e7242dd41`)  
Preview Lovable: `https://ofgcareexperience.lovable.app`  
Rollback de comparacao: `808e10c polish(copsoq): mensagem honesta de 503, texto do autosave, a11y do checkbox e banner do mock`

## Status do pull

- MCP Lovable instalado no Claude Code local:
  - comando executado: `claude mcp add --transport http lovable "https://mcp.lovable.dev"`
  - status atual: `Needs authentication`
  - bloqueio real observado: Claude Code local tentou rodar, mas o log indicou OAuth do Claude revogado; precisa reautenticar Claude para usar `list_files`/`read_file`.
- UI Lovable autenticada no Chrome:
  - projeto aberto e validado.
  - conta atual aparece como colaborador; a aba `Conectores` informa: colaboradores nao acessam workspace connectors.
  - editor de codigo esta `Read only`.
  - docs Lovable indicam que download completo do codebase no editor e recurso de plano pago; nesta sessao a UI so expos download/copy por arquivo.

## Evidencia local extraida

Pasta: `docs/superpowers/evidence/lovable-uniher-export-2026-07-30`

- `file-tree-labels.json`: 261 itens visiveis coletados da arvore Lovable.
- `extraction-summary.json`: metadados da extracao.
- `files/`: 14 arquivos-chave completos copiados do editor Lovable, sem copiar `.env`.

Arquivos extraidos:

- `package.json`
- `README.md`
- `tailwind.config.ts`
- `src/App.tsx`
- `src/components/dashboard/HealthSemaphore.tsx`
- `src/components/guards/UnifiedAuthGuard.tsx`
- `src/contexts/OnboardingContext.tsx`
- `src/contexts/UserContext.tsx`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/pages/Concierge.tsx`
- `src/pages/DemoHealthCheckin.tsx`
- `src/pages/HealthStatus.tsx`
- `src/pages/HRDashboard.tsx`

## Comparacao tecnica

### Rollback 808e10c

- Stack: Next.js + rotas API internas + SQLite/better-sqlite3.
- Tamanho observado: 528 arquivos no commit.
- Backend: 110 arquivos sob `src/app/api`.
- Banco: 45 migrations sob `src/lib/db/migrations`.
- Semaforo real:
  - `/api/collaborator/semaforo`
  - `/api/collaborator/semaforo/history`
  - `/api/collaborator/semaforo/recalculate`
  - `src/services/semaforo-calculator.service.ts`
  - combina dados objetivos e quiz em dimensoes como Engajamento, Habitos, Prevencao, Sono, Energia e Saude Mental.
- Quiz real:
  - `/welcome-colaboradora/quiz`
  - `/api/quiz/submit`
  - `src/repositories/quiz.repository.ts`
  - salva resultado autenticado e registra health scores.

### Lovable

- Stack: Vite + React Router + Supabase.
- Arvore coletada: 261 itens, incluindo 142 `.tsx` e 35 migrations Supabase `.sql`.
- Rotas principais em `src/App.tsx`:
  - `/welcome`, `/auth`, `/onboarding`, `/hr-onboarding`, `/leadership-onboarding`
  - `/`, `/health-status`, `/campaigns`, `/profile`, `/hr-dashboard`
  - `/telemedicine`, `/concierge`, `/partnerships`, `/settings`
  - `/engagement`, `/admin`, `/achievements`, `/challenges`
  - `/hall-of-fame`, `/company`, `/company-profile`, `/leadership`
  - `/competition-history`, `/debug`, `/demo-checkin`
- Modulos relevantes presentes na arvore:
  - semaforo: `HealthSemaphore.tsx`, `HealthStatus.tsx`, `HealthItemModal.tsx`
  - quiz/check-in: `DemoHealthCheckin.tsx`
  - concierge: `Concierge.tsx`
  - RH: `HRDashboard.tsx`, `EmailAnalytics.tsx`, `InactivityAlerts.tsx`, `InvitationTracker.tsx`, `ReportScheduler.tsx`
  - gamificacao: badges, leagues, rewards, missions, queen voting
  - Supabase: `functions`, `migrations`, `types.ts`

## Achados funcionais

1. Lovable tem UI rica que devemos reaproveitar como referencia de UX e componentes.

2. Rollback tem contratos/backend mais completos para producao. A direcao segura e portar UI/fluxos Lovable para cima dos contratos Next/SQLite existentes, nao trocar o backend por Supabase.

3. Existem dois quizzes diferentes:
   - Rollback: quiz de arquetipo/check-in, autenticado, salva resultado via `/api/quiz/submit` e alimenta health scores.
   - Lovable: `DemoHealthCheckin.tsx`, quiz de risco feminino com perguntas de idade, ginecologista, mamografia, papanicolau, historico familiar, diabetes, ciclo, saude mental, atividade fisica e tabagismo.

4. O quiz Lovable nao esta pronto como fluxo final de escalacao para concierge:
   - ele calcula `riskScore`;
   - gera risco baixo/moderado/alto;
   - cria itens de semaforo e recomendacoes;
   - no final o CTA vai para `/`, nao para `/concierge`;
   - a escalacao para concierge precisa virar contrato explicito.

5. O rollback ja possui semaforo persistente e recalculo real. O Lovable possui a experiencia visual e a coleta mais especifica de saude feminina. O merge correto e:
   - usar perguntas/regras do Lovable como entrada;
   - persistir via backend do rollback;
   - recalcular semaforo pelo servico existente;
   - criar regra de escalacao para concierge quando risco alto/itens urgentes.

## Plano seguro de merge

### Wave 1 - Semaforo/quiz/concierge

- Criar contrato `POST /api/collaborator/health-checkin` ou evoluir `/api/quiz/submit`.
- Mapear respostas Lovable para:
  - scores do semaforo rollback;
  - itens de exames/agenda;
  - recomendacoes;
  - flag de escalacao ao concierge.
- Adaptar `/semaforo` e `/colaboradora` para consumir o novo resultado.
- Inserir CTA condicional:
  - risco baixo/moderado: dashboard/semaforo;
  - risco alto ou item urgente: concierge.

### Wave 2 - RH e analytics

- Usar `HRDashboard.tsx` do Lovable como referencia visual.
- Manter contratos rollback:
  - `/api/dashboard`
  - `/api/rh/*`
  - `/api/analytics/*`
  - `/api/invites/*`
- Nao importar mock data como producao; cada card precisa fonte de API ou estado vazio honesto.

### Wave 3 - Gamificacao

- Comparar componentes Lovable de badges/leagues/rewards/missions com:
  - `/api/gamification/*`
  - `/api/rh/challenges/*`
  - `/api/rh/leagues/*`
  - `src/services/gamification.service.ts`
  - `src/services/league.service.ts`
- Reaproveitar UX, preservar motor e banco do rollback.

### Wave 4 - Governanca/contratos

- Criar matriz de rota -> componente -> API -> tabela -> estado vazio -> gate visual.
- Nenhuma secao entra se for apenas spec ou mock sem label.
- Cada merge deve ter:
  - teste unitario ou API smoke;
  - Playwright visual por papel;
  - evidencia desktop/mobile;
  - commit pequeno.

## Pendencias para export completo

1. Reautenticar Claude Code para liberar o MCP Lovable instalado.
2. Depois rodar o pull completo via MCP usando somente:
   - `list_files`
   - `read_file`
   - opcionalmente `list_edits`/`get_diff`
3. Se o usuario tiver acesso admin/owner ou plano pago, alternativa mais limpa:
   - usar GitHub Sync do Lovable;
   - ou `Download codebase` no editor.

## Decisao recomendada

Continuar trabalhando em cima do rollback `808e10c` como base canonica de produto, com a landing atual preservada. Lovable entra como fonte de UX, telas e partes de fluxo, mas cada peca precisa ser ligada aos contratos reais do rollback antes de ir para producao.
