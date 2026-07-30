import { ClipboardCheck, FileLock2, ShieldCheck } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function Nr1Page() {
  return (
    <ContainedSurfacePreview
      context="NR-1"
      title="NR-1"
      description="Área bloqueada para gestão de riscos psicossociais somente após validação contratual e operacional."
      stateTitle="Contrato pendente"
      stateDescription="O fluxo COPSOQ e a integração Yavix permanecem bloqueados até existir contrato, consentimento e gate técnico aprovados."
      intentTitle="Contrato antes da avaliação"
      intentDescription="Esta superfície mantém o módulo bloqueado para auditoria e deep links sem montar questionário, consentimento, coleta de respostas ou envio para parceiro."
      steps={[
        {
          title: 'Validar contrato',
          description: 'Confirmar empresa, escopo NR-1, parceiro responsável e base jurídica antes de qualquer fluxo.',
          icon: <FileLock2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Aprovar consentimento',
          description: 'Separar comunicação, consentimento e limites de uso antes de apresentar perguntas COPSOQ.',
          icon: <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Liberar runtime',
          description: 'Somente módulo explicitamente habilitado pode acessar a avaliação operacional.',
          icon: <ClipboardCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Status contratável centralizado em Produtos e Módulos, sem link operacional na navegação.',
        'Estado de contrato separado da permissão de executar COPSOQ.',
        'Shell estático sem chamadas Yavix, coleta de respostas ou cálculo de risco.',
      ]}
      blockedItems={[
        'Questionário COPSOQ, consentimento, bootstrap, respostas e envio final.',
        'Qualquer leitura ou escrita em integrações Yavix.',
        'Ativação indireta por default rows, navegação, Semáforo, Liga ou dados de saúde.',
      ]}
    />
  );
}
