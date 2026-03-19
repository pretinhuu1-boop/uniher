import { CampaignData } from '@/types';

export const CAMPAIGNS: CampaignData[] = [
  { month: 'Outubro · Prevenção', name: 'Outubro Rosa', progress: 87, color: 'linear-gradient(90deg, #EAB8CB, #C85C7E)', status: 'done', statusLabel: 'Finalizada' },
  { month: 'Novembro · Saúde Masculina', name: 'Novembro Azul', progress: 72, color: 'linear-gradient(90deg, #85B7EB, #378ADD)', status: 'done', statusLabel: 'Finalizada' },
  { month: 'Dezembro · Diabetes', name: 'Dezembro Laranja', progress: 65, color: 'linear-gradient(90deg, #FAC775, #EF9F27)', status: 'active', statusLabel: 'Ativa' },
  { month: 'Janeiro · Saúde Mental', name: 'Janeiro Branco', progress: 0, color: 'var(--border-2)', status: 'next', statusLabel: 'Próxima' },
];
