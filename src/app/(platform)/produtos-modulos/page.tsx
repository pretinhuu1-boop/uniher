import { ListChecks, Settings2, ToggleLeft } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function ProdutosModulosPage() {
  return (
    <ContainedSurfacePreview
      context="Produtos e Módulos"
      title="Produtos e Módulos"
      description="Área administrativa reservada para visualizar e governar módulos contratados por empresa."
      stateTitle="Controle administrativo em preparação"
      stateDescription="A base de dados de módulos existe, mas esta tela ainda não altera contratos, permissões ou ativações."
      intentTitle="Governança antes de toggle"
      intentDescription="A superfície separa o contrato de módulo da navegação e impede que visibilidade de menu seja confundida com permissão de executar comportamento sensível."
      steps={[
        {
          title: 'Listar contrato',
          description: 'Mostrar por empresa quais módulos existem e qual estado cada um ocupa.',
          icon: <ListChecks size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Validar permissão',
          description: 'Exigir trilha de auditoria, responsável e gate de governança antes de qualquer mudança.',
          icon: <Settings2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Ativar com evidência',
          description: 'Alterar estados somente quando contratos, fontes e testes estiverem aprovados.',
          icon: <ToggleLeft size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell administrativo para o futuro painel de estados de módulo.',
        'Referencia ao contrato `company_modules` criado em P1.',
        'Copy que diferencia visibilidade, estado e permissão de uso.',
      ]}
      blockedItems={[
        'Toggle real de ativação/desativação de módulo.',
        'Alteração de contratos, permissões, empresas ou usuários.',
        'Ativação indireta de NR-1, SIPAT, Concierge, Denúncias, Semáforo ou Liga.',
      ]}
    />
  );
}
