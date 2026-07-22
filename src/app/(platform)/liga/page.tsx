import { CircleDashed, Handshake, UsersRound } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';

// Containment audit anchor: FeedbackState description={LEGACY_GAMIFICATION_STATE.message}
export default function LigaPage() {
  return (
    <ContainedSurfacePreview
      context="Liga"
      title="Liga"
      description="Superfície reservada para uma experiência coletiva opcional, dependente de política formal de privacidade e não identificação."
      stateTitle="Liga em revisão"
      stateDescription={LEGACY_GAMIFICATION_STATE.message}
      intentTitle="Experiência coletiva somente com decisão formal"
      intentDescription="A tela antiga indicava competição; a nova direção segura só permite participação opcional, grupos protegidos e nenhuma exposição nominal."
      steps={[
        {
          title: 'Escolher participar',
          description: 'A entrada precisa ser opt-in claro, revogável e separado de qualquer dado sensível.',
          icon: <Handshake size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Formar grupo seguro',
          description: 'A experiência só aparece quando há tamanho mínimo e isolamento por empresa.',
          icon: <UsersRound size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Mostrar faixa coletiva',
          description: 'O v1 recomendado mostra uma faixa de participação do grupo, não posições individuais.',
          icon: <CircleDashed size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Opt-in explícito, revogável e separado por empresa.',
        'Faixas coletivas com supressão de grupos pequenos.',
        'Eventos elegíveis da Wave 5 como única fonte futura.',
      ]}
      blockedItems={[
        'Tabela nominal, posição individual ou disputa entre colaboradoras.',
        'Uso de dados históricos, saúde, Semáforo, NR-1 ou agenda.',
        'Promoção da página sem decisão de Produto, DPO/jurídico e SST.',
      ]}
    />
  );
}
