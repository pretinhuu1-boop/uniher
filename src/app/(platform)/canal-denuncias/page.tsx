import { Building2, FileLock2, ShieldAlert } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function CanalDenunciasPage() {
  return (
    <ContainedSurfacePreview
      context="Canal de Denúncias"
      title="Canal de Denúncias"
      description="Shell parceiro para recebimento, acompanhamento e gestão de denúncias quando o contrato e o responsável externo estiverem formalizados."
      stateTitle="Parceiro pendente"
      stateDescription="Nenhum relato, protocolo, caixa de entrada, fluxo de resposta ou integração externa foi ativado."
      intentTitle="Fronteira legal antes de formulário"
      intentDescription="A página mantém o módulo bloqueado para auditoria e deep links sem capturar dados sensíveis ou simular um canal que depende de parceiro e contrato específicos."
      steps={[
        {
          title: 'Formalizar parceiro',
          description: 'Confirmar responsável, SLA, escopo, armazenamento, auditoria e canal oficial.',
          icon: <Building2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Proteger relatos',
          description: 'Definir confidencialidade, acesso, retenção e trilha de auditoria antes de receber dados.',
          icon: <FileLock2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Operar com governança',
          description: 'Separar notificações, status e resposta sem expor informações indevidas.',
          icon: <ShieldAlert size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell acessível por URL direta como módulo partner-managed.',
        'Indicação honesta de dependência de parceiro e contrato.',
        'Separação entre catálogo de módulos e recebimento real de denúncia.',
      ]}
      blockedItems={[
        'Formulário, caixa de entrada, protocolo ou upload de denúncia.',
        'Integração com parceiro sem contrato e definição técnica.',
        'Acesso RH/Admin a relatos ou dados pessoais sensíveis.',
      ]}
    />
  );
}
