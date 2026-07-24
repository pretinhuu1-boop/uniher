import { Activity, FileCheck2, ShieldCheck } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function SaudePrimariaPage() {
  return (
    <ContainedSurfacePreview
      context="Saúde Primária"
      title="Saúde Primária"
      description="Módulo visível para organizar Semáforo, orientações e evolução agregada somente depois dos gates clínico, DPO e SST."
      stateTitle="Módulo bloqueado"
      stateDescription="A superfície está preparada, mas não ativa dados de saúde, classificações, alertas ou acompanhamento individual."
      intentTitle="Cuidado com fronteira clara"
      intentDescription="Esta tela define o espaço do módulo sem liberar comportamento sensível antes dos contratos de privacidade, saúde ocupacional e governança."
      steps={[
        {
          title: 'Aprovar contrato clínico',
          description: 'Definir texto não diagnóstico, audiência, consentimento, retenção e proibições de uso.',
          icon: <FileCheck2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Projetar agregados',
          description: 'Separar indicadores de empresa por período e coorte sem expor respostas individuais.',
          icon: <Activity size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Validar supressão',
          description: 'Aplicar limite mínimo de grupo antes de qualquer visualização RH/Admin.',
          icon: <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell de módulo bloqueado e copy honesta sobre os próximos gates.',
        'Referência ao Semáforo apenas como superfície contida, sem dados reais.',
        'Preparação para agregados futuros com supressão.',
      ]}
      blockedItems={[
        'Classificação verde, amarela ou vermelha em produção.',
        'Acesso RH/Admin a registros individuais ou alertas ocupacionais.',
        'Integração com Liga, conquistas, NR-1, agenda ou check-in/check-out.',
      ]}
    />
  );
}
