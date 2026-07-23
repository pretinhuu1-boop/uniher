import { BookOpenCheck, Layers3, Sparkles } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function DesenvolvimentoHumanoPage() {
  return (
    <ContainedSurfacePreview
      context="Desenvolvimento Humano"
      title="Desenvolvimento Humano"
      description="Modulo futuro para conteudos, trilhas e acoes de desenvolvimento contratadas pela empresa."
      stateTitle="Modulo futuro"
      stateDescription="Nenhuma trilha, avaliacao, conteudo ou acompanhamento individual foi ativado."
      intentTitle="Biblioteca preparada para contrato"
      intentDescription="A tela estabelece o lugar do modulo na plataforma sem criar curriculo, ranking, diagnostico ou promessa de entrega."
      steps={[
        {
          title: 'Definir oferta',
          description: 'Separar conteudos, trilhas e acoes que pertencem ao contrato de cada empresa.',
          icon: <Layers3 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Revisar conteudo',
          description: 'Garantir autoria, contexto e adequacao antes de publicar materiais.',
          icon: <BookOpenCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Ativar com cuidado',
          description: 'Abrir a experiencia apenas quando compra, permissao e governanca estiverem claras.',
          icon: <Sparkles size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell futuro e bloqueado por contrato.',
        'Espaco para trilhas e conteudos aprovados depois.',
        'Copy que nao promete entrega ja existente.',
      ]}
      blockedItems={[
        'Conteudos, trilhas, certificados ou avaliacoes reais.',
        'Uso de dados de saude, Semaforo, NR-1, agenda ou check-in.',
        'Ranking, pontuacao ou diagnostico de colaboradoras.',
      ]}
    />
  );
}
