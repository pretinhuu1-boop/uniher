import { FeedbackState } from '@/components/ui/FeedbackState';
import { SEMAFORO_REVIEW_STATE } from '@/lib/semaforo/containment';

export default function SemaforoPage() {
  return (
    <main className="min-h-screen bg-cream-50 p-6 font-body md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-display text-3xl font-bold text-uni-text-900 sm:text-4xl">
          Semáforo da Saúde
        </h1>
        <FeedbackState
          kind="empty"
          title={SEMAFORO_REVIEW_STATE.label}
          description={SEMAFORO_REVIEW_STATE.message}
        />
      </div>
    </main>
  );
}
