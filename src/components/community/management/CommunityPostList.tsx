import { FileText, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { cn } from '@/lib/utils';
import type { CommunityPostStatus } from '@/types/community';
import type { ManagedCommunityPost } from './types';

export type CommunityPostStatusFilter = 'all' | CommunityPostStatus;

interface CommunityPostListProps {
  posts: ManagedCommunityPost[];
  selectedId: string | null;
  statusFilter: CommunityPostStatusFilter;
  isLoading: boolean;
  error: string;
  onFilterChange: (status: CommunityPostStatusFilter) => void;
  onSelect: (post: ManagedCommunityPost) => void;
  onCreate: () => void;
  onRetry: () => void;
}

const statusLabels: Record<CommunityPostStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
};

const statusClasses: Record<CommunityPostStatus, string> = {
  draft: 'bg-[color-mix(in_srgb,var(--platform-warning)_12%,var(--platform-surface))] text-[var(--platform-warning)]',
  published: 'bg-[color-mix(in_srgb,var(--platform-positive)_12%,var(--platform-surface))] text-[var(--platform-positive)]',
  archived: 'bg-[var(--platform-group)] text-[var(--platform-muted)]',
};

export function CommunityPostList({
  posts,
  selectedId,
  statusFilter,
  isLoading,
  error,
  onFilterChange,
  onSelect,
  onCreate,
  onRetry,
}: CommunityPostListProps) {
  return (
    <section aria-labelledby="community-post-list-title" className="min-w-0 border-b border-[var(--platform-line)] lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--platform-line)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="community-post-list-title" className="font-semibold text-[var(--platform-ink)]">Conteúdos</h2>
          <p className="text-xs text-[var(--platform-muted)]">{posts.length} {posts.length === 1 ? 'item' : 'itens'} no filtro</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--platform-radius-control)] text-[var(--platform-muted)] transition-colors hover:bg-[var(--platform-group)] hover:text-[var(--platform-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)]"
          aria-label="Atualizar lista de conteúdos"
          title="Atualizar lista"
        >
          <RefreshCw aria-hidden="true" className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="border-b border-[var(--platform-line)] p-4 sm:px-5">
        <label htmlFor="community-status-filter" className="mb-1.5 block text-xs font-medium text-[var(--platform-muted)]">
          Filtrar por status
        </label>
        <select
          id="community-status-filter"
          value={statusFilter}
          onChange={(event) => onFilterChange(event.target.value as CommunityPostStatusFilter)}
          className="h-11 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] px-3 text-sm text-[var(--platform-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)]"
        >
          <option value="all">Todos</option>
          <option value="draft">Rascunhos</option>
          <option value="published">Publicados</option>
          <option value="archived">Arquivados</option>
        </select>
      </div>

      <div className="min-h-64">
        {isLoading ? (
          <div className="p-4 sm:p-5">
            <FeedbackState kind="loading" title="Carregando conteúdos" description="Buscando as publicações desta empresa." />
          </div>
        ) : error ? (
          <div className="p-4 sm:p-5">
            <FeedbackState
              kind="error"
              title="Não foi possível carregar"
              description={error}
              action={<Button type="button" variant="secondary" onClick={onRetry}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />Tentar novamente</Button>}
            />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-4 sm:p-5">
            <FeedbackState
              kind="empty"
              title="Nenhum conteúdo neste filtro"
              description="Crie um rascunho ou selecione outro status para continuar."
              action={<Button type="button" onClick={onCreate}><Plus aria-hidden="true" className="mr-2 h-4 w-4" />Novo conteúdo</Button>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--platform-line)]" aria-label="Conteúdos da comunidade">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => onSelect(post)}
                  aria-current={selectedId === post.id ? 'true' : undefined}
                  className={cn(
                    'w-full min-w-0 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--platform-action)] sm:px-5',
                    selectedId === post.id ? 'bg-[var(--platform-group)]' : 'hover:bg-[color-mix(in_srgb,var(--platform-group)_45%,transparent)]',
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] text-[var(--platform-action-strong)]">
                      <FileText aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words text-sm font-semibold text-[var(--platform-ink)]">{post.title}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusClasses[post.status])}>
                          {statusLabels[post.status]}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 block break-words text-xs leading-5 text-[var(--platform-muted)]">{post.summary}</span>
                      <span className="mt-2 block text-[11px] font-medium capitalize text-[var(--platform-muted)]">
                        {post.topic} · {post.readTimeMinutes} min
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
