import { ArchetypeData, ArchetypeKey } from '@/types';

export const ARCHETYPES: Record<ArchetypeKey, ArchetypeData> = {
  guardia: {
    name: 'Guardiã Resiliente',
    description: 'Você cuida de todos ao seu redor, mas frequentemente esquece de se colocar em primeiro lugar. Sua saúde pede atenção — e o UniHER está aqui como sua aliada nessa jornada.',
    base: [3.0, 2.5, 2.8, 2.2, 2.5, 3.0],
    growth30: [1.4, 1.6, 1.2, 1.8, 1.3, 1.2],
    growth60: [2.6, 2.9, 2.2, 3.3, 2.4, 2.3],
    growth90: [3.8, 4.0, 3.2, 4.5, 3.5, 3.4],
    missions: 12, campaigns: 3, habits: 8,
  },
  protetora: {
    name: 'Protetora Silenciosa',
    description: 'Você conhece seus pontos de melhoria mas adia as ações importantes. A consciência já está lá — o UniHER vai transformar intenção em hábito real, passo a passo.',
    base: [2.0, 3.5, 2.5, 3.0, 2.0, 2.5],
    growth30: [2.0, 1.0, 1.5, 0.8, 1.8, 1.5],
    growth60: [3.8, 1.8, 2.8, 1.5, 3.3, 2.8],
    growth90: [5.2, 2.5, 4.0, 2.2, 4.8, 4.0],
    missions: 10, campaigns: 4, habits: 10,
  },
  guerreira: {
    name: 'Guerreira em Evolução',
    description: 'Você já tem consciência sobre saúde e quer ir mais longe. O próximo nível de bem-estar está ao seu alcance — e o UniHER é o combustível para chegar lá.',
    base: [5.5, 5.0, 5.2, 4.8, 5.0, 5.5],
    growth30: [0.8, 1.0, 0.9, 1.2, 0.8, 0.9],
    growth60: [1.5, 1.8, 1.6, 2.0, 1.5, 1.6],
    growth90: [2.2, 2.5, 2.3, 2.8, 2.2, 2.3],
    missions: 18, campaigns: 5, habits: 14,
  },
  equilibrista: {
    name: 'Equilibrista Zen',
    description: 'Você busca harmonia em todas as dimensões da vida. O UniHER vai ajudar a manter, aprofundar e celebrar esse equilíbrio com suporte contínuo.',
    base: [4.5, 4.2, 4.0, 4.5, 3.8, 4.2],
    growth30: [0.8, 1.2, 1.5, 0.8, 1.8, 0.8],
    growth60: [1.5, 2.0, 2.8, 1.5, 3.2, 1.5],
    growth90: [2.2, 2.8, 4.0, 2.2, 4.5, 2.2],
    missions: 15, campaigns: 4, habits: 12,
  },
};
