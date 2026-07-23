import { Building2, FileLock2, ShieldAlert } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function CanalDenunciasPage() {
  return (
    <ContainedSurfacePreview
      context="Canal de Denuncias"
      title="Canal de Denuncias"
      description="Shell parceiro para recebimento, acompanhamento e gestao de denuncias quando o contrato e o responsavel externo estiverem formalizados."
      stateTitle="Parceiro pendente"
      stateDescription="Nenhum relato, protocolo, caixa de entrada, fluxo de resposta ou integracao externa foi ativado."
      intentTitle="Fronteira legal antes de formulario"
      intentDescription="A pagina torna o modulo visivel sem capturar dados sensiveis ou simular um canal que depende de parceiro e contrato especificos."
      steps={[
        {
          title: 'Formalizar parceiro',
          description: 'Confirmar responsavel, SLA, escopo, armazenamento, auditoria e canal oficial.',
          icon: <Building2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Proteger relatos',
          description: 'Definir confidencialidade, acesso, retencao e trilha de auditoria antes de receber dados.',
          icon: <FileLock2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Operar com governanca',
          description: 'Separar notificacoes, status e resposta sem expor informacoes indevidas.',
          icon: <ShieldAlert size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell visivel como modulo partner-managed.',
        'Indicacao honesta de dependencia de parceiro e contrato.',
        'Separacao entre menu e recebimento real de denuncia.',
      ]}
      blockedItems={[
        'Formulario, caixa de entrada, protocolo ou upload de denuncia.',
        'Integracao com parceiro sem contrato e definicao tecnica.',
        'Acesso RH/Admin a relatos ou dados pessoais sensiveis.',
      ]}
    />
  );
}
