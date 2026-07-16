import { FeedbackState } from '@/components/ui/FeedbackState';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';

export default function LegacyGamificationReviewPage() {
  return (
    <FeedbackState
      kind="denied"
      title="Desafios em revisão"
      description={LEGACY_GAMIFICATION_STATE.message}
    />
  );
}
