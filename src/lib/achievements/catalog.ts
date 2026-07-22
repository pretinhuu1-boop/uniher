import type { PrivateAchievementCatalogItem } from '@/types/achievements';

const PRIVATE_ACHIEVEMENT_CATALOG = Object.freeze([
  {
    key: 'first-objective-started',
    title: 'Primeiro objetivo iniciado',
    description: 'Voce iniciou um objetivo pessoal aprovado e privado.',
    requiredEvent: 'objective_started',
  },
  {
    key: 'first-objective-completed',
    title: 'Primeiro objetivo concluido',
    description: 'Voce concluiu um objetivo pessoal sem pontos ou ranking.',
    requiredEvent: 'objective_completed',
  },
  {
    key: 'first-challenge-joined',
    title: 'Primeiro desafio aceito',
    description: 'Voce entrou voluntariamente em um desafio seguro da empresa.',
    requiredEvent: 'challenge_joined',
  },
  {
    key: 'first-challenge-completed',
    title: 'Primeiro desafio concluido',
    description: 'Voce concluiu um desafio da empresa sem gerar classificacao.',
    requiredEvent: 'challenge_completed',
  },
] satisfies PrivateAchievementCatalogItem[]);

export function listPrivateAchievementCatalog(): PrivateAchievementCatalogItem[] {
  return PRIVATE_ACHIEVEMENT_CATALOG.map((achievement) => ({ ...achievement }));
}

export function getPrivateAchievementCatalogItem(key: string): PrivateAchievementCatalogItem | undefined {
  const achievement = PRIVATE_ACHIEVEMENT_CATALOG.find((item) => item.key === key);
  return achievement ? { ...achievement } : undefined;
}
