import { Clock3, ClipboardList, UserRoundCheck } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function ConciergePage() {
  return (
    <ContainedSurfacePreview
      context="Concierge"
      title="Concierge"
      description="Area reservada para acompanhamento de casos somente para empresas que contrataram o modulo e aprovaram o fluxo operacional."
      stateTitle="Contrato pendente"
      stateDescription="Nenhum caso, status, pendencia, resposta ou indicador de performance foi ativado nesta etapa."
      intentTitle="Acompanhamento antes de workflow"
      intentDescription="A pagina fixa o limite do modulo sem criar fila de atendimento, atribuicao de responsaveis ou visualizacao de dados sensiveis."
      steps={[
        {
          title: 'Definir escopo de caso',
          description: 'Separar o que e atendimento, acompanhamento, SLA e responsabilidade clinica ou operacional.',
          icon: <ClipboardList size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Aprovar audiencia',
          description: 'Determinar quem pode ver status e indicadores sem expor detalhes individuais indevidos.',
          icon: <UserRoundCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Medir sem expor',
          description: 'Projetar tempo de resposta e pendencias em agregados apropriados.',
          icon: <Clock3 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell bloqueado para empresas com potencial contratacao do Concierge.',
        'Descricao de casos, status, pendencias e tempo de resposta apenas como alvo futuro.',
        'Separacao entre menu visivel e permissao de executar atendimento.',
      ]}
      blockedItems={[
        'Cadastro, atribuicao, triagem ou historico real de casos.',
        'Indicadores de performance do Concierge com dados de colaboradoras.',
        'Qualquer fluxo clinico, legal ou operacional sem contrato aprovado.',
      ]}
    />
  );
}
