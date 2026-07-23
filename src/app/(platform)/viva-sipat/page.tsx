import { CalendarDays, FileSearch, PlaySquare } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function VivaSipatPage() {
  return (
    <ContainedSurfacePreview
      context="Viva SIPAT"
      title="Viva SIPAT"
      description="Modulo reservado para campanhas, cronogramas, materiais, videos e acoes SIPAT quando a fonte de conteudo for localizada ou aprovada."
      stateTitle="Fonte de conteudo pendente"
      stateDescription="A arvore local nao validou conteudo SIPAT existente; esta tela nao cria aulas, campanhas, videos ou materiais novos."
      intentTitle="Espaco pronto sem conteudo inventado"
      intentDescription="A superficie atende ao menu solicitado pela Dra. Paola mantendo o requisito de reconciliar os materiais existentes antes de publicar qualquer conteudo."
      steps={[
        {
          title: 'Localizar fonte',
          description: 'Receber ou confirmar os materiais SIPAT que a operacao considera ja disponiveis.',
          icon: <FileSearch size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Organizar calendario',
          description: 'Mapear datas, campanhas e acoes somente a partir de conteudo aprovado.',
          icon: <CalendarDays size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Publicar midias',
          description: 'Disponibilizar videos e materiais depois de revisao de autoria, contrato e contexto.',
          icon: <PlaySquare size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell visivel com estado de fonte pendente.',
        'Referencia ao objetivo SIPAT sem materiais inventados.',
        'Preparacao para receber campanhas, videos e acoes aprovadas.',
      ]}
      blockedItems={[
        'Aulas, cronogramas, videos, campanhas ou materiais nao fornecidos.',
        'Promessa de conteudo ja publicado sem evidencia na arvore local.',
        'Acionamento de notificacoes, trilhas ou certificados SIPAT.',
      ]}
    />
  );
}
