'use client';

import { useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/platform/PageHeader';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useCollaboratorCommunityFeed,
  useCommunityBrand,
} from '@/hooks/useCollaborator';
import { CommunityPostCard } from './CommunityPostCard';
import {
  CommunityTopicTabs,
  topicForCommunityTab,
  type CommunityFeedTab,
} from './CommunityTopicTabs';
import styles from './CommunityFeed.module.css';

function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-label="Carregando publicações" role="status">
      {[0, 1].map((index) => (
        <div key={index} className="space-y-4 rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div>
          </div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

export function CommunityFeed() {
  const [activeTab, setActiveTab] = useState<CommunityFeedTab>('for-you');
  const topic = topicForCommunityTab(activeTab);
  const feed = useCollaboratorCommunityFeed(topic);
  const company = useCommunityBrand();
  const initialError = feed.error && feed.items.length === 0;

  function retryAll() {
    void feed.retry();
    if (company.error) void company.retry();
  }

  return (
    <div className={styles.feedRoot}>
      <PageHeader
        context="Comunidade"
        title="Conteúdos da sua empresa"
        description="Uma seleção editorial para apoiar pausas, sono, movimento e cuidado. Sem comentários, ranking ou dados de saúde."
      />

      <div className="mt-5">
        <CommunityTopicTabs activeTab={activeTab} onChange={setActiveTab} disabled={feed.isLoadingMore} />
      </div>

      <div id="community-feed-panel" role="tabpanel" aria-labelledby={`community-tab-${activeTab}`} className="mt-5 min-w-0">
        {feed.isLoading ? (
          <FeedSkeleton />
        ) : initialError ? (
          <FeedbackState
            kind="error"
            title="Não foi possível carregar a comunidade"
            description="Verifique sua conexão e tente novamente. Nenhum dado privado foi exibido."
            action={<Button type="button" variant="secondary" onClick={retryAll}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />Tentar novamente</Button>}
          />
        ) : !feed.settings.companyFeedEnabled ? (
          <FeedbackState
            kind="empty"
            title="Comunidade desativada pela empresa"
            description="Nenhum conteúdo da comunidade da empresa é exibido enquanto o feed estiver desativado."
          />
        ) : company.error ? (
          <FeedbackState
            kind="error"
            title="Não foi possível carregar a identidade da empresa"
            description="O conteúdo permanece oculto até que a marca real da empresa esteja disponível."
            action={<Button type="button" variant="secondary" onClick={retryAll}><RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />Tentar novamente</Button>}
          />
        ) : company.isLoading || !company.brand ? (
          <FeedSkeleton />
        ) : feed.items.length === 0 ? (
          <FeedbackState
            kind="empty"
            title="Nenhum conteúdo publicado"
            description="Não há publicações disponíveis neste tema. Seus check-ins, semáforo e respostas da NR-1 continuam privados."
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-4" aria-label="Publicações da comunidade">
              {feed.items.map((item) => (
                <CommunityPostCard
                  key={item.id}
                  item={item}
                  brand={company.brand!}
                  onSupport={feed.support}
                  onUnsupport={feed.unsupport}
                  onSave={feed.save}
                  onUnsave={feed.unsave}
                  loadSupporters={feed.loadSupporters}
                />
              ))}
            </div>

            {feed.error && (
              <FeedbackState
                kind="error"
                title="Não foi possível carregar mais publicações"
                description="As publicações já carregadas permanecem disponíveis."
                action={<Button type="button" variant="secondary" onClick={() => void feed.retry()}>Tentar novamente</Button>}
              />
            )}

            {feed.nextCursor ? (
              <div className="flex justify-center py-2">
                <Button type="button" variant="secondary" onClick={() => void feed.loadMore()} disabled={feed.isLoadingMore}>
                  {feed.isLoadingMore && <LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
                  {feed.isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            ) : (
              <p role="status" className="py-3 text-center text-sm text-[var(--platform-muted)]">Você chegou ao fim das publicações.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
