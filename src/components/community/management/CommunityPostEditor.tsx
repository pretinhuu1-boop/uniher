import { AlertTriangle, Archive, Clock, Eye, FileText, LoaderCircle, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { COMMUNITY_TOPICS, type CommunityPostStatus } from '@/types/community';
import { cn } from '@/lib/utils';
import type {
  CommunityPostField,
  CommunityPostFieldErrors,
  CommunityPostFormValue,
} from './types';

interface CommunityPostEditorProps {
  form: CommunityPostFormValue;
  fieldErrors: CommunityPostFieldErrors;
  status: CommunityPostStatus;
  isExisting: boolean;
  companyFeedEnabled: boolean;
  isPending: boolean;
  message: { kind: 'success' | 'error'; text: string } | null;
  onChange: <Field extends CommunityPostField>(field: Field, value: CommunityPostFormValue[Field]) => void;
  onSave: () => void;
  onPublish: () => void;
  onArchive: () => void;
}

const topicLabels = {
  pausas: 'Pausas',
  sono: 'Sono',
  movimento: 'Movimento',
  cuidado: 'Cuidado',
  geral: 'Geral',
} as const;

const inputClassName = 'h-11 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] px-3 text-sm text-[var(--platform-ink)] placeholder:text-[var(--platform-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] disabled:cursor-not-allowed disabled:bg-[var(--platform-group)] disabled:opacity-70';

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return <p id={id} className="mt-1.5 text-xs font-medium text-[var(--platform-critical)]">{error}</p>;
}

export function CommunityPostEditor({
  form,
  fieldErrors,
  status,
  isExisting,
  companyFeedEnabled,
  isPending,
  message,
  onChange,
  onSave,
  onPublish,
  onArchive,
}: CommunityPostEditorProps) {
  const isArchived = status === 'archived';
  const canPublish = isExisting && status === 'draft' && companyFeedEnabled && !isPending;
  const canArchive = isExisting && status === 'published' && !isPending;

  return (
    <section aria-labelledby="community-editor-title" className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-[var(--platform-line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-[var(--platform-muted)]">{isExisting ? 'Edição' : 'Novo rascunho'}</p>
          <h2 id="community-editor-title" className="break-words font-semibold text-[var(--platform-ink)]">
            {form.title.trim() || 'Conteúdo sem título'}
          </h2>
        </div>
        <span className="w-fit rounded-full bg-[var(--platform-group)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--platform-muted)]">
          {status === 'draft' ? 'Rascunho' : status === 'published' ? 'Publicado' : 'Arquivado'}
        </span>
      </div>

      {!companyFeedEnabled && (
        <div className="flex items-start gap-3 border-b border-[var(--platform-line)] bg-[color-mix(in_srgb,var(--platform-warning)_10%,var(--platform-surface))] px-4 py-3 text-[var(--platform-ink)] sm:px-5" role="status">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--platform-warning)]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Feed da comunidade desativado</p>
            <p className="mt-0.5 text-xs text-[var(--platform-muted)]">Rascunhos podem ser salvos, mas a publicação fica bloqueada. Nenhum conteúdo da comunidade da empresa é exibido às colaboradoras.</p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={cn(
            'mx-4 mt-4 rounded-[var(--platform-radius-control)] border px-3 py-2.5 text-sm sm:mx-5',
            message.kind === 'error'
              ? 'border-[var(--platform-critical)] text-[var(--platform-critical)]'
              : 'border-[var(--platform-positive)] text-[var(--platform-positive)]',
          )}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:divide-x xl:divide-[var(--platform-line)]">
        <form className="min-w-0 space-y-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onSave(); }} noValidate>
          <fieldset className="space-y-4" disabled={isPending || isArchived}>
            <div>
              <label htmlFor="community-post-title" className="mb-1.5 block text-sm font-medium text-[var(--platform-muted)]">Título</label>
              <input
                id="community-post-title"
                value={form.title}
                onChange={(event) => onChange('title', event.target.value)}
                maxLength={120}
                className={cn(inputClassName, fieldErrors.title && 'border-[var(--platform-critical)]')}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'community-post-title-error' : undefined}
                placeholder="Título objetivo para a comunidade"
              />
              <FieldError id="community-post-title-error" error={fieldErrors.title} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="community-post-summary" className="text-sm font-medium text-[var(--platform-muted)]">Resumo</label>
                <span className="text-xs text-[var(--platform-muted)]">{form.summary.length}/240</span>
              </div>
              <textarea
                id="community-post-summary"
                value={form.summary}
                onChange={(event) => onChange('summary', event.target.value)}
                maxLength={240}
                rows={3}
                className={cn(inputClassName, 'h-auto min-h-24 resize-y py-3', fieldErrors.summary && 'border-[var(--platform-critical)]')}
                aria-invalid={Boolean(fieldErrors.summary)}
                aria-describedby={fieldErrors.summary ? 'community-post-summary-error' : undefined}
                placeholder="Apresente em poucas linhas o valor desta leitura."
              />
              <FieldError id="community-post-summary-error" error={fieldErrors.summary} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="community-post-body" className="text-sm font-medium text-[var(--platform-muted)]">Conteúdo em texto</label>
                <span className="text-xs text-[var(--platform-muted)]">{form.bodyText.length}/8000</span>
              </div>
              <textarea
                id="community-post-body"
                value={form.bodyText}
                onChange={(event) => onChange('bodyText', event.target.value)}
                maxLength={8000}
                rows={10}
                className={cn(inputClassName, 'h-auto min-h-56 resize-y py-3 leading-6', fieldErrors.bodyText && 'border-[var(--platform-critical)]')}
                aria-invalid={Boolean(fieldErrors.bodyText)}
                aria-describedby={fieldErrors.bodyText ? 'community-post-body-error' : 'community-post-body-help'}
                placeholder="Escreva o conteúdo em texto simples."
              />
              <p id="community-post-body-help" className="mt-1.5 text-xs text-[var(--platform-muted)]">O conteúdo será publicado como texto simples.</p>
              <FieldError id="community-post-body-error" error={fieldErrors.bodyText} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="community-post-topic" className="mb-1.5 block text-sm font-medium text-[var(--platform-muted)]">Tema</label>
                <select
                  id="community-post-topic"
                  value={form.topic}
                  onChange={(event) => onChange('topic', event.target.value as CommunityPostFormValue['topic'])}
                  className={inputClassName}
                >
                  {COMMUNITY_TOPICS.map((topic) => <option key={topic} value={topic}>{topicLabels[topic]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="community-post-read-time" className="mb-1.5 block text-sm font-medium text-[var(--platform-muted)]">Tempo de leitura</label>
                <div className="relative">
                  <Clock aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--platform-muted)]" />
                  <input
                    id="community-post-read-time"
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    value={form.readTimeMinutes}
                    onChange={(event) => onChange('readTimeMinutes', Number(event.target.value))}
                    className={cn(inputClassName, 'pl-9', fieldErrors.readTimeMinutes && 'border-[var(--platform-critical)]')}
                    aria-invalid={Boolean(fieldErrors.readTimeMinutes)}
                    aria-describedby={fieldErrors.readTimeMinutes ? 'community-post-read-time-error' : undefined}
                  />
                </div>
                <FieldError id="community-post-read-time-error" error={fieldErrors.readTimeMinutes} />
              </div>
            </div>

            <div>
              <label htmlFor="community-post-image" className="mb-1.5 block text-sm font-medium text-[var(--platform-muted)]">Imagem do conteúdo <span className="font-normal">(opcional)</span></label>
              <input
                id="community-post-image"
                value={form.imagePath}
                onChange={(event) => onChange('imagePath', event.target.value)}
                className={cn(inputClassName, fieldErrors.imagePath && 'border-[var(--platform-critical)]')}
                aria-invalid={Boolean(fieldErrors.imagePath)}
                aria-describedby={fieldErrors.imagePath ? 'community-post-image-error' : 'community-post-image-help'}
                placeholder="/community/imagem.webp"
              />
              <p id="community-post-image-help" className="mt-1.5 text-xs text-[var(--platform-muted)]">Use uma imagem já disponível na biblioteca interna. URLs externas são recusadas.</p>
              <FieldError id="community-post-image-error" error={fieldErrors.imagePath} />
            </div>

            <div>
              <label htmlFor="community-post-expiry" className="mb-1.5 block text-sm font-medium text-[var(--platform-muted)]">Expiração <span className="font-normal">(opcional)</span></label>
              <input
                id="community-post-expiry"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) => onChange('expiresAt', event.target.value)}
                className={cn(inputClassName, fieldErrors.expiresAt && 'border-[var(--platform-critical)]')}
                aria-invalid={Boolean(fieldErrors.expiresAt)}
                aria-describedby={fieldErrors.expiresAt ? 'community-post-expiry-error' : undefined}
              />
              <FieldError id="community-post-expiry-error" error={fieldErrors.expiresAt} />
            </div>
          </fieldset>

          <div className="flex flex-col gap-2 border-t border-[var(--platform-line)] pt-4 sm:flex-row sm:flex-wrap">
            {!isArchived && (
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                {isExisting ? 'Salvar alterações' : 'Salvar rascunho'}
              </Button>
            )}
            {status === 'draft' && (
              <Button
                type="button"
                variant="secondary"
                onClick={onPublish}
                disabled={!canPublish}
                className="gap-2"
                title={!isExisting ? 'Salve o rascunho antes de publicar' : !companyFeedEnabled ? 'Ative o feed da comunidade no perfil da empresa' : undefined}
              >
                <Send aria-hidden="true" className="h-4 w-4" />Publicar
              </Button>
            )}
            {status === 'published' && (
              <Button type="button" variant="danger" onClick={onArchive} disabled={!canArchive} className="gap-2">
                <Archive aria-hidden="true" className="h-4 w-4" />Arquivar
              </Button>
            )}
          </div>
          {!isExisting && <p className="text-xs text-[var(--platform-muted)]">Salve o rascunho antes de publicar.</p>}
          {isArchived && <p className="text-sm text-[var(--platform-muted)]">Este conteúdo está arquivado e permanece disponível apenas para consulta editorial.</p>}
        </form>

        <aside aria-labelledby="community-preview-title" className="min-w-0 border-t border-[var(--platform-line)] bg-[color-mix(in_srgb,var(--platform-group)_35%,var(--platform-surface))] p-4 sm:p-5 xl:border-t-0">
          <div className="flex items-center gap-2 text-[var(--platform-action-strong)]">
            <Eye aria-hidden="true" className="h-4 w-4" />
            <h3 id="community-preview-title" className="text-sm font-semibold">Conferência editorial</h3>
          </div>
          <div className="mt-4 min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--platform-muted)]">
              <span className="capitalize">{topicLabels[form.topic]}</span>
              <span aria-hidden="true">·</span>
              <span>{form.readTimeMinutes || 0} min de leitura</span>
            </div>
            <div className="min-w-0">
              <h4 className="break-words text-xl font-semibold leading-tight text-[var(--platform-ink)]">{form.title.trim() || 'Título do conteúdo'}</h4>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-[var(--platform-muted)]">{form.summary.trim() || 'O resumo aparecerá aqui.'}</p>
            </div>
            <div className="border-t border-[var(--platform-line)] pt-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--platform-ink)]">{form.bodyText || 'Escreva o conteúdo para conferir a leitura antes de publicar.'}</p>
            </div>
            {form.imagePath.trim() && (
              <div className="flex min-w-0 items-start gap-2 border-t border-[var(--platform-line)] pt-4 text-xs text-[var(--platform-muted)]">
                <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
                <span className="min-w-0 break-all">Imagem local: {form.imagePath.trim()}</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
