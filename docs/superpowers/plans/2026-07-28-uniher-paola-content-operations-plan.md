# UniHER Paola Content Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizar um fluxo confiavel para receber conteudos da Dra. Paola, publicar o que ja e seguro pela Comunidade e evoluir a plataforma para Educacao/Conteudos com upload integrado.

**Architecture:** Usar Comunidade editorial como canal operacional imediato, Campanhas/Notificacoes como distribuicao auxiliar e construir uma tela propria de Educacao/Conteudos sobre as APIs de licoes existentes. Manter gamificacao legada em revisao, sem pontos, XP, ranking ou promessas de aulas/certificados antes dos gates.

**Tech Stack:** Next.js App Router, React, TypeScript, SQLite/better-sqlite3, SWR, Vitest, Playwright, APIs atuais de comunidade, campanhas, notificacoes, upload e licoes.

---

## Current Truth

Fonte principal: `docs/superpowers/audits/2026-07-28-uniher-content-upload-distribution-audit.md`.

### PASS agora

- Comunidade editorial publica texto simples por empresa.
- Comunidade permite rascunho, publicar, arquivar, feed de colaboradora, suporte/salvar e auditoria.
- Campanhas criam chamadas/acoes simples e permitem adesao da colaboradora.
- Upload de imagem existe como API protegida e e usado no logo da empresa.

### PARTIAL

- Notificacoes segmentadas existem por codigo, mas precisam teste focado de envio e leitura.
- Upload geral salva imagens em `/uploads/general`, mas nao esta integrado ao editor de Comunidade.

### HOLD

- Painel visual de Educacao/Licoes para a doutora operar sozinha.
- Upload de PDF, video, audio, DOCX/PPTX ou biblioteca de arquivos.
- Qualquer promessa de trilha, certificado, aula em video ou ranking.

## Operating Decision

Para apresentar e usar com a doutora agora:

1. Receber os conteudos dela em uma planilha/pasta organizada.
2. Converter cada material em um dos formatos abaixo.
3. Publicar textos pelo editor de Comunidade.
4. Usar Campanhas para chamadas de adesao.
5. Usar Notificacoes depois do teste focado.
6. Abrir desenvolvimento da tela `Educacao / Conteudos` para licoes diarias e materiais estruturados.

## Content Classification

Cada conteudo recebido deve ser classificado antes de entrar na plataforma:

| Tipo recebido | Canal atual | Status |
| --- | --- | --- |
| Texto curto educativo | Comunidade editorial | PASS |
| Texto longo ate 8000 caracteres | Comunidade editorial | PASS |
| Reflexao diaria | API de licoes, sem painel visual | HOLD para operacao da doutora |
| Quiz/pergunta educativa | API de licoes, sem painel visual | HOLD para operacao da doutora |
| Campanha tematica | Campanhas | PASS parcial |
| Aviso ou chamada | Notificacoes | PARTIAL ate teste focado |
| Imagem pequena | Upload API + caminho local no editor | PARTIAL |
| PDF | Fora do escopo atual | HOLD |
| Video/audio | Fora do escopo atual | HOLD |
| Trilha/certificado | Fora do escopo atual | HOLD |

## File Structure

### Documentation and operation

- Create: `docs/superpowers/runbooks/2026-07-28-uniher-paola-content-operations-runbook.md`
  - Responsavel por orientar o operador a preparar, publicar e validar conteudos usando a plataforma atual.
- Create: `docs/superpowers/templates/uniher-paola-content-inventory.csv`
  - Template simples para organizar materiais recebidos da doutora.
- Modify: `docs/superpowers/audits/2026-07-28-uniher-content-upload-distribution-audit.md`
  - Atualizar apenas quando uma nova evidencia mudar o status de PASS/PARTIAL/HOLD.

### Community hardening

- Modify: `tests/e2e/community-feed.spec.ts`
  - Alinhar o contrato do teste que hoje espera `403` mas recebe `401` em sessao revogada.
- Test: `tests/e2e/community-feed.spec.ts`
  - Reexecutar suite completa de comunidade depois do ajuste.

### Notification verification

- Create: `tests/unit/admin-alerts-send-route.test.ts`
  - Testar `POST /api/admin/alerts/send` com envio por empresa, papel e departamento.
- Modify only if required: `src/app/api/admin/alerts/send/route.ts`
  - Ajustar somente se o teste provar bug real.

### Community upload integration

- Modify: `src/components/community/management/CommunityPostEditor.tsx`
  - Adicionar input de imagem com upload integrado.
- Modify: `src/app/(platform)/comunidade/gerenciar/page.tsx`
  - Enviar imagem para `/api/upload`, preencher `imagePath` e mostrar erro operacional.
- Test: `tests/unit/community-management-page.test.tsx`
  - Cobrir upload bem-sucedido e falha de upload sem perder rascunho.
- Test: `tests/e2e/community-feed.spec.ts`
  - Cobrir publicacao de post com imagem enviada.

### Education / Conteudos

- Create: `src/app/(platform)/educacao/gerenciar/page.tsx`
  - Nova tela visual para RH/Admin criarem licoes sem usar rota de gamificacao.
- Create: `src/app/(platform)/educacao/gerenciar/educacao-gerenciar.module.css`
  - CSS local da tela, se o padrao da base exigir CSS module para a superficie.
- Modify: `src/components/platform/navigation.ts`
  - Apontar Admin/RH para `Educacao / Conteudos` quando a tela estiver pronta.
- Modify: `src/app/api/rh/lessons/route.ts`
  - Somente se a UI precisar de campo seguro que a API ainda nao aceita.
- Modify: `src/app/api/rh/lessons/[id]/route.ts`
  - Somente se a UI precisar de edicao segura que a API ainda nao aceita.
- Test: `tests/unit/education-management-page.test.tsx`
  - Cobrir criar rascunho de licao, validar reflexao, salvar e bloquear `xp_reward`.
- Test: `tests/unit/privacy/gamification-safe-projection.test.ts`
  - Garantir que a nova tela nao reintroduz pontos, XP, ranking ou badges.

## Task 1: Create The Content Operations Runbook

**Files:**

- Create: `docs/superpowers/runbooks/2026-07-28-uniher-paola-content-operations-runbook.md`
- Create: `docs/superpowers/templates/uniher-paola-content-inventory.csv`

- [ ] **Step 1: Create the runbook directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path docs/superpowers/runbooks
New-Item -ItemType Directory -Force -Path docs/superpowers/templates
```

Expected: both directories exist.

- [ ] **Step 2: Add the content inventory template**

Create `docs/superpowers/templates/uniher-paola-content-inventory.csv` with this exact header:

```csv
id,titulo_original,tipo_recebido,canal_destino,status_operacional,empresa_alvo,departamento_alvo,tema,resumo,corpo_texto,caminho_imagem_local,expira_em,fonte_recebida,aprovado_por_dra_paola,observacoes
```

- [ ] **Step 3: Add the runbook**

Create `docs/superpowers/runbooks/2026-07-28-uniher-paola-content-operations-runbook.md` with this structure:

```markdown
# UniHER Paola Content Operations Runbook

**Status:** OPERATIONAL FOR COMMUNITY TEXT / HOLD FOR EDUCATION PANEL

## Entrada

Todo material recebido da Dra. Paola deve ser registrado em `docs/superpowers/templates/uniher-paola-content-inventory.csv`.

## Classificacao

- Texto educativo: publicar em Comunidade.
- Chamada de acao: criar Campanha.
- Aviso curto: enviar Notificacao depois do gate de teste.
- Reflexao/quiz/licao: aguardar tela Educacao / Conteudos.
- PDF/video/audio/documento: aguardar storage de midia.

## Publicacao Pela Comunidade

1. Entrar como RH/Admin.
2. Abrir `/company-profile`.
3. Confirmar que o feed da comunidade esta ativo.
4. Abrir `/comunidade/gerenciar`.
5. Criar novo conteudo.
6. Preencher titulo, resumo, corpo em texto simples, tema e tempo de leitura.
7. Salvar rascunho.
8. Revisar preview.
9. Publicar.
10. Entrar como colaboradora e conferir `/comunidade`.

## Evidencia Minima

- Print do editor com rascunho salvo.
- Print do post publicado no feed da colaboradora.
- Registro do item no inventario.
- Comando de teste aplicavel registrado no relatorio da wave.

## Limites

- Nao publicar conteudo clinico como diagnostico.
- Nao prometer trilha, certificado, videoaula, ranking ou gamificacao.
- Nao inserir HTML.
- Nao usar link externo de imagem no campo `imagePath`.
```

- [ ] **Step 4: Validate Markdown and git diff**

Run:

```powershell
git diff --check
git diff -- docs/superpowers/runbooks/2026-07-28-uniher-paola-content-operations-runbook.md docs/superpowers/templates/uniher-paola-content-inventory.csv
```

Expected: `git diff --check` exits 0.

- [ ] **Step 5: Commit**

Run:

```powershell
git add docs/superpowers/runbooks/2026-07-28-uniher-paola-content-operations-runbook.md docs/superpowers/templates/uniher-paola-content-inventory.csv
git commit -m "docs: add UniHER content operations runbook"
```

Expected: commit created with only the two documentation files.

## Task 2: Make Community E2E Suite Green Again

**Files:**

- Modify: `tests/e2e/community-feed.spec.ts`

- [ ] **Step 1: Confirm the current failure**

Run:

```powershell
cd tests
npx playwright test --config=playwright.config.ts --project=community-feed --project=community-feed-ui
```

Expected before fix: one failure in `revalidates the active persisted editorial actor before writes`, receiving `401` while the test expects `403`.

- [ ] **Step 2: Update the revoked-session expectation**

In `tests/e2e/community-feed.spec.ts`, replace the assertion inside `revalidates the active persisted editorial actor before writes` with this shape:

```ts
const response = await request.post('/api/rh/community/posts', {
  headers: authHeaders(tokens.dualRoleA),
  data: editorialInput(),
});

expect(response.status(), await response.text()).toBe(401);
expectPrivateResponse(response);
expect(await response.json()).toMatchObject({
  error: 'Token inválido ou expirado',
});
```

Rationale: `withAuth()` calls `getActiveSessionSubject()` before the editorial route handler. A blocked persisted user invalidates the active session before route-level actor validation runs. This is fail-closed and should be treated as revoked authentication, not allowed write access.

- [ ] **Step 3: Re-run the focused failing test**

Run:

```powershell
cd tests
npx playwright test --config=playwright.config.ts --project=community-feed -g "revalidates the active persisted editorial actor before writes"
```

Expected: PASS.

- [ ] **Step 4: Re-run the full community projects**

Run:

```powershell
cd tests
npx playwright test --config=playwright.config.ts --project=community-feed --project=community-feed-ui
```

Expected: all community tests PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add tests/e2e/community-feed.spec.ts
git commit -m "test: align community revoked session expectation"
```

Expected: commit contains only `tests/e2e/community-feed.spec.ts`.

## Task 3: Verify Notification Distribution End-To-End At Unit Level

**Files:**

- Create: `tests/unit/admin-alerts-send-route.test.ts`
- Modify if failing for real bug: `src/app/api/admin/alerts/send/route.ts`

- [ ] **Step 1: Write a route-level unit test**

Create `tests/unit/admin-alerts-send-route.test.ts` with tests covering:

- RH sends to colaboradoras in own company.
- RH cannot send to another company.
- RH cannot send to global admins.
- Department target must belong to the target company.
- Notifications are persisted for recipients.
- `admin_alerts` receipt stores audience metadata.

Use the same mocking style already used by `tests/unit/community-company-setting-audit.test.ts` and `tests/unit/company-modules-api.test.ts`: mock auth middleware as pass-through, create an in-memory SQLite database, and mock `getReadDb`, `getWriteQueue`, `initDb`, and rate limit.

The test fixture must create these tables:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  department_id TEXT,
  email TEXT,
  role TEXT NOT NULL,
  blocked INTEGER DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE admin_alerts (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  department_id TEXT,
  target_role TEXT,
  notification_type TEXT NOT NULL DEFAULT 'alert',
  audience_label TEXT,
  sent_by TEXT,
  title TEXT,
  message TEXT,
  recipients_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Run the new test and confirm RED or PASS**

Run:

```powershell
npm run test:unit -- tests/unit/admin-alerts-send-route.test.ts
```

Expected if the implementation is already correct: PASS. If it fails, the failure must identify one concrete route bug before production code is changed.

- [ ] **Step 3: Patch only the proven bug**

If the test fails because of implementation behavior, patch only `src/app/api/admin/alerts/send/route.ts`. Do not change notification repository, campaign code, community code, or auth middleware unless the failure proves those files own the bug.

- [ ] **Step 4: Re-run notification and privacy tests**

Run:

```powershell
npm run test:unit -- tests/unit/admin-alerts-send-route.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add tests/unit/admin-alerts-send-route.test.ts src/app/api/admin/alerts/send/route.ts
git commit -m "test: cover UniHER alert distribution"
```

Expected: commit includes the new test and only includes route code if a bug was fixed.

## Task 4: Integrate Image Upload Into Community Editor

**Files:**

- Modify: `src/components/community/management/CommunityPostEditor.tsx`
- Modify: `src/app/(platform)/comunidade/gerenciar/page.tsx`
- Modify: `tests/unit/community-management-page.test.tsx`
- Test: `tests/e2e/community-feed.spec.ts`

- [ ] **Step 1: Add a failing UI test for upload**

In `tests/unit/community-management-page.test.tsx`, add a test that:

- mocks `fetch('/api/upload')` returning `{ success: true, url: '/uploads/general/paola-card.webp', filename: 'paola-card.webp' }`;
- selects a file in the editor;
- verifies the image path input becomes `/uploads/general/paola-card.webp`;
- verifies saving the draft sends `imagePath: '/uploads/general/paola-card.webp'`.

Run:

```powershell
npm run test:unit -- tests/unit/community-management-page.test.tsx
```

Expected before implementation: FAIL because no upload control exists.

- [ ] **Step 2: Add editor props**

Modify `src/components/community/management/CommunityPostEditor.tsx` so `CommunityPostEditorProps` includes:

```ts
onImageUpload: (file: File) => Promise<string>;
```

Inside the component, add local state:

```ts
const [imageUploadError, setImageUploadError] = useState('');
const [isUploadingImage, setIsUploadingImage] = useState(false);
```

Also import `useState` from React if the file does not already import it.

- [ ] **Step 3: Add upload control near the image path field**

In the image section of `CommunityPostEditor.tsx`, add:

```tsx
<input
  id="community-post-image-upload"
  type="file"
  accept="image/png,image/jpeg,image/webp,image/svg+xml"
  className="sr-only"
  disabled={isPending || isArchived || isUploadingImage}
  onChange={async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImageUploadError('');
    setIsUploadingImage(true);
    try {
      const uploadedPath = await onImageUpload(file);
      onChange('imagePath', uploadedPath);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : 'Upload da imagem falhou.');
    } finally {
      setIsUploadingImage(false);
    }
  }}
/>
<Button
  type="button"
  variant="secondary"
  disabled={isPending || isArchived || isUploadingImage}
  onClick={() => document.getElementById('community-post-image-upload')?.click()}
>
  {isUploadingImage ? 'Enviando imagem...' : 'Enviar imagem'}
</Button>
{imageUploadError && <p className="mt-1.5 text-xs font-medium text-[var(--platform-critical)]">{imageUploadError}</p>}
```

- [ ] **Step 4: Add upload implementation in management page**

In `src/app/(platform)/comunidade/gerenciar/page.tsx`, add:

```ts
async function uploadCommunityImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const payload = await response.json() as { url?: string };
  if (!payload.url || !payload.url.startsWith('/uploads/general/')) {
    throw new Error('A API nao retornou uma imagem valida.');
  }
  return payload.url;
}
```

Pass it into `CommunityPostEditor`:

```tsx
onImageUpload={uploadCommunityImage}
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm run test:unit -- tests/unit/community-management-page.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=seguranca -g "Path traversal"
```

Expected: PASS for the unit test and existing upload security tests.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/community/management/CommunityPostEditor.tsx src/app/(platform)/comunidade/gerenciar/page.tsx tests/unit/community-management-page.test.tsx
git commit -m "feat: upload community post images"
```

Expected: commit includes only community editor upload integration and focused tests.

## Task 5: Build The Education / Conteudos Management Surface

**Files:**

- Create: `src/app/(platform)/educacao/gerenciar/page.tsx`
- Modify: `src/components/platform/navigation.ts`
- Test: `tests/unit/education-management-page.test.tsx`
- Test: `tests/unit/privacy/gamification-safe-projection.test.ts`

- [ ] **Step 1: Add a failing route/page test**

Create `tests/unit/education-management-page.test.tsx` asserting:

- the page title is `Educacao / Conteudos`;
- it fetches `/api/rh/lessons`;
- it has fields for title, description, type, theme, week, day and content;
- it does not render `XP`, `pontos`, `ranking`, `liga`, `badge` or `gamificacao`;
- it posts to `/api/rh/lessons` without `xp_reward`.

Run:

```powershell
npm run test:unit -- tests/unit/education-management-page.test.tsx
```

Expected before implementation: FAIL because the page does not exist.

- [ ] **Step 2: Create the page shell**

Create `src/app/(platform)/educacao/gerenciar/page.tsx` as a client component that:

- uses SWR to fetch `/api/rh/lessons?limit=100`;
- lists existing lessons;
- exposes a form with `title`, `description`, `type`, `theme`, `week_number`, `day_of_week`, `duration_seconds`, `campaign_context`, `content_json`;
- posts to `/api/rh/lessons`;
- shows API errors in an alert region;
- never sends `xp_reward`.

Allowed lesson types must match `src/app/api/rh/lessons/route.ts`:

```ts
const LESSON_TYPES = [
  'pilula',
  'quiz',
  'reflexao',
  'lacuna',
  'verdadeiro_falso',
  'ordenar',
  'parear',
  'historia',
  'flashcard',
  'imagem',
  'desafio_dia',
] as const;
```

Allowed themes must match `src/app/api/rh/lessons/route.ts`:

```ts
const LESSON_THEMES = [
  'hidratacao',
  'sono',
  'prevencao',
  'nutricao',
  'mental',
  'ciclo',
  'geral',
] as const;
```

- [ ] **Step 3: Add content JSON helpers**

In the new page, add a helper that produces valid JSON per common type:

```ts
function buildContentJson(type: string, body: string): Record<string, unknown> {
  const text = body.trim();
  if (type === 'reflexao') return { reflection: text };
  if (type === 'pilula') return { text };
  if (type === 'desafio_dia') return { challenge: text };
  if (type === 'imagem') return { caption: text };
  return { prompt: text };
}
```

The UI can expose one textarea named `Conteudo base` for the first version.

- [ ] **Step 4: Wire navigation**

Modify `src/components/platform/navigation.ts` so Admin/RH Educacao management points to `/educacao/gerenciar` only after the new page is present. Keep collaborator education pointing to current collaborator daily lesson surface.

- [ ] **Step 5: Run focused privacy checks**

Run:

```powershell
npm run test:unit -- tests/unit/education-management-page.test.tsx tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-write-containment.test.ts
```

Expected: PASS and no reintroduction of XP/ranking copy.

- [ ] **Step 6: Add visual smoke for the new page**

Modify the smallest existing visual smoke route list that covers authenticated RH/Admin pages. Add `/educacao/gerenciar` for RH/Admin only. Run:

```powershell
npm run test:visual-ux-smoke:local
```

Expected: PASS for the new page on desktop and mobile, with screenshots stored under the smoke evidence directory.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/app/(platform)/educacao/gerenciar/page.tsx src/components/platform/navigation.ts tests/unit/education-management-page.test.tsx
git commit -m "feat: add education content management"
```

Expected: commit includes the new page, navigation change and test.

## Task 6: Decide Rich Media Scope Before Storage Work

**Files:**

- Create: `docs/superpowers/specs/2026-07-28-uniher-paola-rich-media-scope.md`

- [ ] **Step 1: Write a media scope spec**

Create `docs/superpowers/specs/2026-07-28-uniher-paola-rich-media-scope.md` with these sections:

```markdown
# UniHER Paola Rich Media Scope

## Decision

The first production-ready content flow supports text and small images. PDF, video, audio, DOCX and PPTX remain blocked until storage, preview, privacy, antivirus policy and retention are defined.

## Allowed Now

- Plain text posts.
- Local images through `/api/upload`.
- Campaign names, themes and dates.
- Notifications with title and message.

## Blocked Until Storage Design

- PDF.
- Video.
- Audio.
- Office documents.
- Large file library.
- Certificates.

## Storage Requirements

- Per-company object ownership.
- Per-user upload audit.
- MIME and magic-byte validation.
- Size limits by file type.
- Private serving policy for authenticated content.
- Retention and deletion path.
- Backup policy.
- Malware scanning decision.
```

- [ ] **Step 2: Commit**

Run:

```powershell
git add docs/superpowers/specs/2026-07-28-uniher-paola-rich-media-scope.md
git commit -m "docs: define UniHER rich media scope"
```

Expected: docs-only commit.

## Final Verification Gate

Run after Tasks 1 through 6:

```powershell
npm run test:next-config
npm run test:unit -- tests/unit/community-api-lifecycle.test.ts tests/unit/community-repository.test.ts tests/unit/community-management-workspace.test.ts tests/unit/community-management-page.test.tsx tests/unit/community-company-setting-audit.test.ts tests/unit/community-company-identity-api.test.ts tests/unit/community-policy.test.ts tests/unit/campaign-join-security.test.ts tests/unit/admin-alerts-send-route.test.ts tests/unit/education-management-page.test.tsx tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-write-containment.test.ts
cd tests
npx playwright test --config=playwright.config.ts --project=community-feed --project=community-feed-ui
npx playwright test --config=playwright.config.ts --project=seguranca -g "Path traversal"
cd ..
npm run build
```

Expected:

- Unit tests PASS.
- Community Playwright projects PASS.
- Upload path traversal PASS.
- Build PASS.
- No `XP`, `pontos`, `ranking`, `liga`, `badge` or `gamificacao` copy in the new Educacao management page.

## Release And Presentation Decision

### PASS For Dra. Paola Now

- Publicar conteudos escritos pela Comunidade editorial.
- Usar Campanhas para chamadas e acoes.
- Preparar inventario dos materiais recebidos.

### HOLD Until Tasks Complete

- A doutora operar Educacao/Licoes pelo painel sozinha.
- Upload direto de imagens no editor.
- Notificacoes segmentadas como verificado end-to-end.
- PDF/video/audio/documentos.
- Trilhas, certificados e aulas.

## Self-Review

- Spec coverage: cobre operacao imediata, Comunidade, Campanhas, Notificacoes, Educacao e upload.
- Placeholder scan: no planned step depends on an unnamed file or unspecified command.
- Type consistency: task names and route paths match the current audit: `/comunidade/gerenciar`, `/api/rh/community/posts`, `/api/rh/lessons`, `/api/gamification/daily-lesson`, `/api/upload`, `/api/admin/alerts/send`.
