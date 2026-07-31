import ExamSemaphoreQuiz from '@/components/semaforo/ExamSemaphoreQuiz';

export default function SemaforoPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase text-uni-text-400">Saude primaria</p>
        <h1 className="mt-1 text-3xl font-display font-bold text-uni-text-900">Semaforo da Saude</h1>
        <p className="mt-1 text-sm text-uni-text-500">
          Atualize a regularidade dos exames preventivos indicados para sua idade.
        </p>
      </header>

      <ExamSemaphoreQuiz />
    </div>
  );
}
