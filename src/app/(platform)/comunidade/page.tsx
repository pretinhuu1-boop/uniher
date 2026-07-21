'use client';

import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/platform/PageHeader';
import { FeedbackState } from '@/components/ui/FeedbackState';

export default function CommunityPage() {
  const { isLoading, user } = useAuth();
  const canUseCollaboratorCommunity = user?.role === 'colaboradora' || user?.also_collaborator === 1;

  if (isLoading) {
    return <FeedbackState kind="loading" title="Carregando comunidade" description="Confirmando o escopo desta experiência." />;
  }

  if (!canUseCollaboratorCommunity) {
    return <FeedbackState kind="denied" title="Comunidade indisponível para este perfil" description="A comunidade é uma experiência privada para colaboradoras da empresa." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Comunidade"
        title="Um espaço seguro para a sua empresa"
        description="O feed da empresa será liberado quando a comunidade estiver ativada para este ambiente."
      />
      <FeedbackState
        kind="empty"
        title="A comunidade ainda não foi ativada"
        description="Nenhum conteúdo foi publicado para esta empresa. Seus check-ins, semáforo e respostas da NR-1 permanecem privados."
      />
    </div>
  );
}
