'use client';

import { useAuth } from '@/hooks/useAuth';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { CommunityFeed } from '@/components/community/CommunityFeed';

export default function CommunityPage() {
  const { isLoading, user } = useAuth();
  const canUseCollaboratorCommunity = user?.role === 'colaboradora' || user?.also_collaborator === 1;

  if (isLoading) {
    return <FeedbackState kind="loading" title="Carregando comunidade" description="Confirmando o escopo desta experiência." />;
  }

  if (!canUseCollaboratorCommunity) {
    return <FeedbackState kind="denied" title="Comunidade indisponível para este perfil" description="A comunidade é uma experiência privada para colaboradoras da empresa." />;
  }

  return <CommunityFeed />;
}
