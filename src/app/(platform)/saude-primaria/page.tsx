import { Activity, FileCheck2, ShieldCheck } from 'lucide-react';
import { ContainedSurfacePreview } from '@/components/platform/ContainedSurfacePreview';

export default function SaudePrimariaPage() {
  return (
    <ContainedSurfacePreview
      context="Saude Primaria"
      title="Saude Primaria"
      description="Modulo visivel para organizar Semaforo, orientacoes e evolucao agregada somente depois dos gates clinico, DPO e SST."
      stateTitle="Modulo bloqueado"
      stateDescription="A superficie esta preparada, mas nao ativa dados de saude, classificacoes, alertas ou acompanhamento individual."
      intentTitle="Cuidado com fronteira clara"
      intentDescription="Esta tela define o espaco do modulo sem liberar comportamento sensivel antes dos contratos de privacidade, saude ocupacional e governanca."
      steps={[
        {
          title: 'Aprovar contrato clinico',
          description: 'Definir texto nao diagnostico, audiencia, consentimento, retencao e proibicoes de uso.',
          icon: <FileCheck2 size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Projetar agregados',
          description: 'Separar indicadores de empresa por periodo e coorte sem expor respostas individuais.',
          icon: <Activity size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
        {
          title: 'Validar supressao',
          description: 'Aplicar limite minimo de grupo antes de qualquer visualizacao RH/Admin.',
          icon: <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />,
        },
      ]}
      allowedItems={[
        'Shell de modulo bloqueado e copy honesta sobre os proximos gates.',
        'Referencia ao Semaforo apenas como superficie contida, sem dados reais.',
        'Preparacao para agregados futuros com supressao.',
      ]}
      blockedItems={[
        'Classificacao verde, amarela ou vermelha em producao.',
        'Acesso RH/Admin a registros individuais ou alertas ocupacionais.',
        'Integracao com Liga, conquistas, NR-1, agenda ou check-in/check-out.',
      ]}
    />
  );
}
