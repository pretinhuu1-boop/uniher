import PageHeader from '@/components/platform/PageHeader';
import AuthenticatedSemaforoQuiz from '@/components/quiz/AuthenticatedSemaforoQuiz';

export default function SemaforoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        context="Saúde primária"
        title="Semáforo da Saúde"
        description="Quiz de perfil, resultado por dimensão e auto-relato privado, sem acesso individual por empresa."
      />

      <AuthenticatedSemaforoQuiz />
    </div>
  );
}
