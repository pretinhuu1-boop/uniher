'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Bookmark, Heart, LoaderCircle, ShieldCheck, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/AvatarBadge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { CommunityFeedItem } from '@/types/community';
import type { CommunityBrand, CommunitySupportersResponse } from '@/hooks/useCollaborator';

interface CommunityPostCardProps {
  item: CommunityFeedItem;
  brand: CommunityBrand;
  onSupport: (id: string) => Promise<unknown>;
  onUnsupport: (id: string) => Promise<unknown>;
  onSave: (id: string) => Promise<unknown>;
  onUnsave: (id: string) => Promise<unknown>;
  loadSupporters: (id: string, cursor?: string) => Promise<CommunitySupportersResponse>;
}

const topicLabels = {
  pausas: 'Pausas',
  sono: 'Sono',
  movimento: 'Movimento',
  cuidado: 'Cuidado',
  geral: 'Geral',
} as const;

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function publishedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Publicação recente';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function CommunityPostCard({
  item,
  brand,
  onSupport,
  onUnsupport,
  onSave,
  onUnsave,
  loadSupporters,
}: CommunityPostCardProps) {
  const [supportPending, setSupportPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [supportersOpen, setSupportersOpen] = useState(false);
  const [supporters, setSupporters] = useState<string[]>([]);
  const [supportersCursor, setSupportersCursor] = useState<string | null | undefined>(undefined);
  const [supportersLoading, setSupportersLoading] = useState(false);
  const [supportersError, setSupportersError] = useState('');
  const supportersOpenRef = useRef(false);
  const supportersRequestEpochRef = useRef(0);

  async function runAction(action: () => Promise<unknown>, setPending: (pending: boolean) => void) {
    setPending(true);
    setActionError('');
    try {
      await action();
    } catch {
      setActionError('Não foi possível concluir a ação. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  async function fetchSupporters(cursor?: string, requestEpoch = supportersRequestEpochRef.current) {
    setSupportersLoading(true);
    setSupportersError('');
    try {
      const response = await loadSupporters(item.id, cursor);
      if (supportersRequestEpochRef.current !== requestEpoch) return;
      setSupporters((current) => cursor ? [...current, ...response.names] : response.names);
      setSupportersCursor(response.nextCursor);
    } catch {
      if (supportersRequestEpochRef.current !== requestEpoch) return;
      setSupportersError('Não foi possível carregar os nomes autorizados.');
    } finally {
      if (supportersRequestEpochRef.current === requestEpoch) setSupportersLoading(false);
    }
  }

  function openSupporters() {
    supportersOpenRef.current = true;
    setSupportersOpen(true);
    if (supportersCursor === undefined) void fetchSupporters();
  }

  function invalidateSupporters() {
    supportersRequestEpochRef.current += 1;
    setSupporters([]);
    setSupportersCursor(undefined);
    setSupportersError('');
    setSupportersLoading(false);
    return supportersRequestEpochRef.current;
  }

  function closeSupporters() {
    supportersOpenRef.current = false;
    invalidateSupporters();
    setSupportersOpen(false);
  }

  async function runSupportAction() {
    setSupportPending(true);
    setActionError('');
    try {
      await (item.supportedByMe ? onUnsupport(item.id) : onSupport(item.id));
      const refreshEpoch = invalidateSupporters();
      if (supportersOpenRef.current) void fetchSupporters(undefined, refreshEpoch);
    } catch {
      setActionError('Não foi possível concluir a ação. Tente novamente.');
    } finally {
      setSupportPending(false);
    }
  }

  const anonymousCount = supportersCursor === null ? Math.max(0, item.supportCount - supporters.length) : null;

  return (
    <article className="min-w-0 overflow-hidden rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)]" aria-labelledby={`community-post-${item.id}`}>
      <header className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
        <Avatar src={brand.logoUrl ?? undefined} alt={brand.name} fallback={initials(brand.name)} size="md" className="border-[var(--platform-line)]" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-[var(--platform-ink)]">{brand.name}</p>
          <p className="mt-0.5 text-xs text-[var(--platform-muted)]">{publishedLabel(item.publishedAt)} · {item.readTimeMinutes} min de leitura</p>
        </div>
        <span className="flex-none rounded-[var(--platform-radius-pill)] bg-[color-mix(in_srgb,var(--platform-positive)_12%,var(--platform-surface))] px-3 py-1.5 text-xs font-semibold text-[var(--platform-positive)]">
          {topicLabels[item.topic]}
        </span>
      </header>

      {item.imagePath && (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-y border-[var(--platform-line)] bg-[var(--platform-group)]">
          <Image src={item.imagePath} alt="" fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 720px" />
        </div>
      )}

      <div className="min-w-0 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className={cn('min-w-0', item.imagePath ? 'pt-4' : 'border-t border-[var(--platform-line)] pt-4')}>
          <h2 id={`community-post-${item.id}`} className="break-words text-xl font-semibold leading-tight text-[var(--platform-ink)] sm:text-2xl">{item.title}</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-[var(--platform-muted)]">{item.summary}</p>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--platform-ink)]">{item.bodyText}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 border-y border-[var(--platform-line)]">
          <button
            type="button"
            onClick={() => void runSupportAction()}
            disabled={supportPending || savePending}
            aria-pressed={item.supportedByMe}
            className="inline-flex min-h-11 items-center justify-center gap-2 border-r border-[var(--platform-line)] px-3 py-2 text-sm font-semibold text-[var(--platform-positive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--platform-action)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {supportPending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Heart aria-hidden="true" className={cn('h-4 w-4', item.supportedByMe && 'fill-current')} />}
            {item.supportedByMe ? 'Apoiado' : 'Apoiar'}
          </button>
          <button
            type="button"
            onClick={() => void runAction(() => item.savedByMe ? onUnsave(item.id) : onSave(item.id), setSavePending)}
            disabled={savePending || supportPending}
            aria-pressed={item.savedByMe}
            className="inline-flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--platform-action-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--platform-action)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Bookmark aria-hidden="true" className={cn('h-4 w-4', item.savedByMe && 'fill-current')} />}
            {item.savedByMe ? 'Salvo' : 'Salvar'}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-[var(--platform-muted)]">Itens salvos ficam visíveis somente para você.</p>

        <div className="mt-4 flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--platform-group)] text-[var(--platform-positive)]">
            <Users aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--platform-ink)]">{item.supportCount} {item.supportCount === 1 ? 'pessoa apoiou' : 'pessoas apoiaram'}</p>
            <p className="text-xs text-[var(--platform-muted)]">A contagem é agregada; nomes ficam ocultos por padrão.</p>
          </div>
          {item.supportCount > 0 && !supportersOpen && (
            <Button type="button" variant="ghost" size="sm" onClick={openSupporters} className="flex-none px-3 text-xs">
              Ver apoiadoras
            </Button>
          )}
        </div>

        {supportersOpen && (
          <section className="mt-4 border-t border-[var(--platform-line)] pt-4" aria-label="Apoiadoras com nome autorizado">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--platform-ink)]">Nomes autorizados</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--platform-muted)]">Os nomes aparecem somente com consentimento. Apoios sem autorização continuam anônimos.</p>
              </div>
              <button type="button" onClick={closeSupporters} className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--platform-radius-control)] text-[var(--platform-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)]" aria-label="Fechar lista de apoiadoras" title="Fechar">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {supporters.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Nomes de apoiadoras autorizados">
                {supporters.map((name, index) => (
                  <li key={`${name}-${index}`} className="flex min-h-11 items-center gap-2 rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] px-3 py-1.5 text-sm text-[var(--platform-ink)]">
                    <Avatar fallback={initials(name)} size="xs" aria-hidden="true" />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            )}
            {supportersLoading && <p role="status" className="mt-3 text-sm text-[var(--platform-muted)]">Carregando nomes autorizados...</p>}
            {supportersError && <p role="alert" className="mt-3 text-sm text-[var(--platform-critical)]">{supportersError}</p>}
            {!supportersLoading && anonymousCount !== null && anonymousCount > 0 && (
              <p className="mt-3 text-sm text-[var(--platform-muted)]">{anonymousCount} {anonymousCount === 1 ? 'apoio permanece anônimo.' : 'apoios permanecem anônimos.'}</p>
            )}
            {!supportersLoading && supporters.length === 0 && anonymousCount === 0 && (
              <p className="mt-3 text-sm text-[var(--platform-muted)]">Nenhum nome foi autorizado para exibição.</p>
            )}
            {supportersCursor && (
              <Button type="button" variant="secondary" size="sm" onClick={() => void fetchSupporters(supportersCursor)} disabled={supportersLoading} className="mt-3">
                Carregar mais nomes
              </Button>
            )}
          </section>
        )}

        {actionError && <p role="alert" className="mt-3 text-sm text-[var(--platform-critical)]">{actionError}</p>}
        <div className="mt-4 flex items-start gap-2 border-t border-[var(--platform-line)] pt-4 text-xs leading-5 text-[var(--platform-muted)]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--platform-positive)]" />
          <p>Este espaço não exibe check-ins, semáforo ou respostas da NR-1.</p>
        </div>
      </div>
    </article>
  );
}
