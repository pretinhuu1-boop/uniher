import { CalendarDays, FileSearch, PlaySquare } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function VivaSipatPage() {
  return (
    <ContainedSurfacePreview
      context="Viva SIPAT"
      title="Viva SIPAT"
      description="Módulo reservado para campanhas, cronogramas, materiais, vídeos e ações SIPAT quando a fonte de conteúdo for localizada ou aprovada."
      stateTitle="Fonte de conteúdo pendente"
      stateDescription="A árvore local não validou conteúdo SIPAT existente; esta tela não cria aulas, campanhas, vídeos ou materiais novos."
      intentTitle="Espaço pronto sem conteúdo inventado"
      intentDescription="A superfície atende ao menu solicitado pela Dra. Paola mantendo o requisito de reconciliar os materiais existentes antes de publicar qualquer conteúdo."
      steps={[
        {
          title: 'Localizar fonte',
          description: 'Receber ou confirmar os materiais SIPAT que a operação considera já disponíveis.',
          icon: <FileSearch size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Organizar calendário',
          description: 'Mapear datas, campanhas e ações somente a partir de conteúdo aprovado.',
          icon: <CalendarDays size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Publicar mídias',
          description: 'Disponibilizar vídeos e materiais depois de revisão de autoria, contrato e contexto.',
          icon: <PlaySquare size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell visível com estado de fonte pendente.',
        'Referência ao objetivo SIPAT sem materiais inventados.',
        'Preparação para receber campanhas, vídeos e ações aprovadas.',
      ]}
      blockedItems={[
        'Aulas, cronogramas, vídeos, campanhas ou materiais não fornecidos.',
        'Promessa de conteúdo já publicado sem evidência na árvore local.',
        'Acionamento de notificações, trilhas ou certificados SIPAT.',
      ]}
    />
  );
}
