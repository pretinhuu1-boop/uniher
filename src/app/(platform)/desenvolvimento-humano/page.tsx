import { BookOpenCheck, Layers3, Sparkles } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function DesenvolvimentoHumanoPage() {
  return (
    <ContainedSurfacePreview
      context="Desenvolvimento Humano"
      title="Desenvolvimento Humano"
      description="Módulo futuro para conteúdos, trilhas e ações de desenvolvimento contratadas pela empresa."
      stateTitle="Módulo futuro"
      stateDescription="Nenhuma trilha, avaliação, conteúdo ou acompanhamento individual foi ativado."
      intentTitle="Biblioteca preparada para contrato"
      intentDescription="A tela estabelece o lugar do módulo na plataforma sem criar currículo, ranking, diagnóstico ou promessa de entrega."
      steps={[
        {
          title: 'Definir oferta',
          description: 'Separar conteúdos, trilhas e ações que pertencem ao contrato de cada empresa.',
          icon: <Layers3 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Revisar conteúdo',
          description: 'Garantir autoria, contexto e adequação antes de publicar materiais.',
          icon: <BookOpenCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Ativar com cuidado',
          description: 'Abrir a experiência apenas quando compra, permissão e governança estiverem claras.',
          icon: <Sparkles size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell futuro e bloqueado por contrato.',
        'Espaço para trilhas e conteúdos aprovados depois.',
        'Copy que não promete entrega já existente.',
      ]}
      blockedItems={[
        'Conteúdos, trilhas, certificados ou avaliações reais.',
        'Uso de dados de saúde, Semáforo, NR-1, agenda ou check-in.',
        'Ranking, pontuação ou diagnóstico de colaboradoras.',
      ]}
    />
  );
}
