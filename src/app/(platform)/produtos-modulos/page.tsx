import { ListChecks, Settings2, ToggleLeft } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function ProdutosModulosPage() {
  return (
    <ContainedSurfacePreview
      context="Produtos e Modulos"
      title="Produtos e Modulos"
      description="Area administrativa reservada para visualizar e governar modulos contratados por empresa."
      stateTitle="Controle administrativo em preparacao"
      stateDescription="A base de dados de modulos existe, mas esta tela ainda nao altera contratos, permissoes ou ativacoes."
      intentTitle="Governanca antes de toggle"
      intentDescription="A superficie separa o contrato de modulo da navegacao e impede que visibilidade de menu seja confundida com permissao de executar comportamento sensivel."
      steps={[
        {
          title: 'Listar contrato',
          description: 'Mostrar por empresa quais modulos existem e qual estado cada um ocupa.',
          icon: <ListChecks size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Validar permissao',
          description: 'Exigir trilha de auditoria, responsavel e gate de governanca antes de qualquer mudanca.',
          icon: <Settings2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Ativar com evidencia',
          description: 'Alterar estados somente quando contratos, fontes e testes estiverem aprovados.',
          icon: <ToggleLeft size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell administrativo para o futuro painel de estados de modulo.',
        'Referencia ao contrato `company_modules` criado em P1.',
        'Copy que diferencia visibilidade, estado e permissao de uso.',
      ]}
      blockedItems={[
        'Toggle real de ativacao/desativacao de modulo.',
        'Alteracao de contratos, permissoes, empresas ou usuarios.',
        'Ativacao indireta de NR-1, SIPAT, Concierge, Denuncias, Semaforo ou Liga.',
      ]}
    />
  );
}
