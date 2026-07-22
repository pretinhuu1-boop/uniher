import { ClipboardCheck, EyeOff, Trash2 } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';
import { SEMAFORO_REVIEW_STATE } from '@/lib/semaforo/containment';

// Containment audit anchor: FeedbackState title={SEMAFORO_REVIEW_STATE.label} description={SEMAFORO_REVIEW_STATE.message}
export default function SemaforoPage() {
  return (
    <ContainedSurfacePreview
      context="Saúde primária"
      title="Semáforo da Saúde"
      description="Espaço reservado para auto-relato privado, não diagnóstico e sem acesso individual por empresa."
      stateTitle={SEMAFORO_REVIEW_STATE.label}
      stateDescription={SEMAFORO_REVIEW_STATE.message}
      intentTitle="Cuidado privado antes de qualquer dado"
      intentDescription="A nova tela preserva a intenção de autocuidado, mas depende de consentimento, retenção e texto clínico aprovados."
      steps={[
        {
          title: 'Aceitar o contrato',
          description: 'A colaboradora entende o limite não diagnóstico antes de usar o recurso.',
          icon: <ClipboardCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Manter visível só para si',
          description: 'Nenhum perfil da empresa acessa o conteúdo individual.',
          icon: <EyeOff size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Apagar quando quiser',
          description: 'A remoção precisa ser direta, auditável e compatível com LGPD.',
          icon: <Trash2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Auto-relato privado e não diagnóstico.',
        'Consentimento, retenção e remoção definidos antes da ativação.',
        'Nenhuma leitura por RH, liderança, Admin Empresa ou Master.',
      ]}
      blockedItems={[
        'Escalação automática, laudo, alerta clínico ou decisão ocupacional.',
        'Integração com Comunidade, NR-1, Liga ou conquistas.',
        'Qualquer uso sem gate clínico, DPO/jurídico e SST.',
      ]}
    />
  );
}
